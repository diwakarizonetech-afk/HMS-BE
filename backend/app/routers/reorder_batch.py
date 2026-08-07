from datetime import date, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.batch import BatchItem, StoreActivity
from app.models.store_item import ItemMaster
from app.schemas.batch import (
    BatchItemCreate,
    BatchItemUpdate,
    BatchItemOut,
    StoreActivityCreate,
    StoreActivityOut,
    ReorderItemOut,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Store: Reorder, Batches & Activity"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


# --- Reorder management (derived from ItemMaster stock levels) ---

@router.get("/reorder-management", response_model=list[ReorderItemOut])
def reorder_management(db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    items = db.scalars(select(ItemMaster).where(ItemMaster.status == "Active")).all()
    results = []
    for item in items:
        if item.current_stock <= item.min_stock:
            reorder_status = "Critical"
        elif item.current_stock <= item.reorder_level:
            reorder_status = "Reorder Warning"
        else:
            reorder_status = "Normal"

        if reorder_status == "Normal":
            continue

        required_qty = max(item.max_stock - item.current_stock, 0)
        results.append(
            ReorderItemOut(
                id=item.id,
                item_code=item.item_code,
                item_name=item.item_name,
                category=item.category,
                current_stock=item.current_stock,
                minimum_stock=item.min_stock,
                reorder_level=item.reorder_level,
                required_quantity=required_qty,
                status=reorder_status,
            )
        )
    return results


# --- Batch / expiry tracking ---

@router.get("/batches", response_model=list[BatchItemOut])
def list_batches(
    near_expiry_only: bool = False, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    batches = db.scalars(select(BatchItem)).all()
    today = date.today()
    for b in batches:
        try:
            expiry = datetime.strptime(b.expiry_date, "%Y-%m-%d").date()
            b.days_to_expiry = (expiry - today).days
        except (ValueError, TypeError):
            b.days_to_expiry = 0

        if b.days_to_expiry < 0:
            b.status = "Expired"
        elif b.days_to_expiry <= 30:
            b.status = "Near Expiry"
        else:
            b.status = "Normal"
    db.commit()

    if near_expiry_only:
        batches = [b for b in batches if b.status in ("Near Expiry", "Expired")]
    return batches


@router.post("/batches", response_model=BatchItemOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchItemCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    batch = BatchItem(**payload.model_dump(), days_to_expiry=0, status="Normal")
    db.add(batch)
    db.commit()
    db.refresh(batch)
    if batch.status in ("Near Expiry", "Expired"):
        notify_user_or_role(
            db, title=f"BATCH {batch.status.upper()} WARNING",
            message=f"Batch {batch.batch_number} for item '{batch.item_name}' is {batch.status.lower()} (expires {batch.expiry_date}).",
            module="store", event_type="batch_expiry", recipient_role="store", priority="high", related_record_id=batch.id
        )
    return batch


@router.put("/batches/{batch_id}", response_model=BatchItemOut)
def update_batch(
    batch_id: str, payload: BatchItemUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    batch = get_or_404(db, BatchItem, batch_id, "Batch")
    apply_updates(batch, payload)
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(batch_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    batch = get_or_404(db, BatchItem, batch_id, "Batch")
    db.delete(batch)
    db.commit()


# --- Store activity log ---

@router.get("/store-activity", response_model=list[StoreActivityOut])
def list_store_activity(limit: int = 100, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    stmt = select(StoreActivity).order_by(StoreActivity.created_at.desc()).limit(limit)
    return db.scalars(stmt).all()


@router.post("/store-activity", response_model=StoreActivityOut, status_code=status.HTTP_201_CREATED)
def log_store_activity(
    payload: StoreActivityCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["date"] = data.get("date") or today_str()
    activity = StoreActivity(**data)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


# --- Reorder Batches Aliases ---

@router.get("/reorder-batches")
def list_reorder_batches(db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return reorder_management(db=db, _=None)


@router.post("/reorder-batches/generate", status_code=status.HTTP_201_CREATED)
def generate_reorder_batch(db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    items = reorder_management(db=db, _=None)
    activity = StoreActivity(
        date=today_str(),
        activity_type="Reorder Auto-Generated",
        description=f"Generated reorder list containing {len(items)} items requiring replenishment.",
        user_name="System Administrator",
    )
    db.add(activity)
    db.commit()
    if len(items) > 0:
        notify_user_or_role(
            db, title="Reorder Replenishment Batch Generated",
            message=f"Auto-generated reorder replenishment list containing {len(items)} items requiring purchase.",
            module="store", event_type="low_stock", recipient_role="store", priority="medium"
        )
    return {"status": "success", "count": len(items), "items": items}
