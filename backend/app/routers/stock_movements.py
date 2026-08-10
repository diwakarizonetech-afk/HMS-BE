from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.user import User
from app.models.stock_movement import StockInward, StockOutward, StockTransfer, StockAdjustment
from app.models.store_item import ItemMaster
from app.schemas.stock_movement import (
    StockInwardCreate,
    StockInwardOut,
    StockOutwardCreate,
    StockOutwardOut,
    StockTransferCreate,
    StockTransferUpdate,
    StockTransferOut,
    StockAdjustmentCreate,
    StockAdjustmentUpdate,
    StockAdjustmentOut,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Store: Stock Movements"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


def _stock_branch_filter(stmt, model, current_user: User, branch: str | None = None):
    """Branch scoping for stock movements: super_admin/admin see all."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target and target.lower() != "all":
        stmt = stmt.where(
            or_(
                func.lower(model.branch) == target.lower(),
                model.branch.is_(None),
                model.branch == "",
            )
        )
    return stmt


def _next_number(db: Session, model, prefix: str) -> str:
    year = datetime.now().year
    count = db.query(model).count() + 1
    return f"{prefix}-{year}-{1000 + count}"


# --- Stock Inward ---

@router.get("/stock-inward", response_model=list[StockInwardOut])
def list_stock_inward(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(StockInward).order_by(StockInward.created_at.desc())
    stmt = _stock_branch_filter(stmt, StockInward, current_user, branch)
    return db.scalars(stmt).all()


@router.post("/stock-inward", response_model=StockInwardOut, status_code=status.HTTP_201_CREATED)
def create_stock_inward(
    payload: StockInwardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["date"] = data.get("date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    record = StockInward(**data)
    db.add(record)

    if payload.item_id:
        item = db.get(ItemMaster, payload.item_id)
        if item:
            item.current_stock += payload.quantity

    db.commit()
    db.refresh(record)
    log_audit("POST /store/stock-inward", payload, data, record, record)
    notify_user_or_role(
        db, title="Stock Inward Logged",
        message=f"Stock Inward {getattr(record, 'inward_number', '')} logged for {record.item_name or 'item'} (qty: +{record.quantity}).",
        module="inventory", event_type="stock_inward", recipient_role="store", related_record_id=record.id
    )
    return record


# --- Stock Outward ---

@router.get("/stock-outward", response_model=list[StockOutwardOut])
def list_stock_outward(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(StockOutward).order_by(StockOutward.created_at.desc())
    stmt = _stock_branch_filter(stmt, StockOutward, current_user, branch)
    return db.scalars(stmt).all()


@router.post("/stock-outward", response_model=StockOutwardOut, status_code=status.HTTP_201_CREATED)
def create_stock_outward(
    payload: StockOutwardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["date"] = data.get("date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch

    if payload.item_id:
        item = db.get(ItemMaster, payload.item_id)
        if item:
            if item.current_stock < payload.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {item.item_name}: available {item.current_stock}, requested {payload.quantity}",
                )
            item.current_stock -= payload.quantity

    record = StockOutward(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    log_audit("POST /store/stock-outward", payload, data, record, record)
    notify_user_or_role(
        db, title="Stock Outward Issued",
        message=f"Stock Outward {getattr(record, 'outward_number', '')} issued for {record.item_name or 'item'} (qty: -{record.quantity}).",
        module="inventory", event_type="stock_outward", recipient_role="store", related_record_id=record.id
    )
    return record


@router.delete("/stock-inward/{inward_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_inward(
    inward_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete
):
    record = get_or_404(db, StockInward, inward_id, "Stock inward")
    # Deleting an inward entry must reverse the stock it added, or current_stock
    # would stay permanently inflated after the record disappears.
    if record.item_id:
        item = db.get(ItemMaster, record.item_id)
        if item:
            if item.current_stock - record.quantity < 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Cannot delete this inward entry: reversing it would take "
                        f"{item.item_name}'s stock below zero (current {item.current_stock}, "
                        f"entry quantity {record.quantity}). Other movements have already "
                        f"consumed this stock — adjust via Stock Adjustment instead."
                    ),
                )
            item.current_stock -= record.quantity
    db.delete(record)
    db.commit()


@router.delete("/stock-outward/{outward_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_outward(
    outward_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete
):
    record = get_or_404(db, StockOutward, outward_id, "Stock outward")
    # Deleting an outward entry must give the deducted stock back.
    if record.item_id:
        item = db.get(ItemMaster, record.item_id)
        if item:
            item.current_stock += record.quantity
    db.delete(record)
    db.commit()


# --- Stock Transfer ---

@router.get("/stock-transfer", response_model=list[StockTransferOut])
def list_stock_transfer(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(StockTransfer).order_by(StockTransfer.created_at.desc())
    stmt = _stock_branch_filter(stmt, StockTransfer, current_user, branch)
    return db.scalars(stmt).all()


@router.post("/stock-transfer", response_model=StockTransferOut, status_code=status.HTTP_201_CREATED)
def create_stock_transfer(
    payload: StockTransferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["transfer_number"] = data.get("transfer_number") or _next_number(db, StockTransfer, "TRF")
    data["transfer_date"] = data.get("transfer_date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    record = StockTransfer(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    log_audit("POST /store/stock-transfer", payload, data, record, record)
    return record


@router.put("/stock-transfer/{transfer_id}", response_model=StockTransferOut)
def update_stock_transfer(
    transfer_id: str,
    payload: StockTransferUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_edit,
):
    record = get_or_404(db, StockTransfer, transfer_id, "Stock transfer")
    apply_updates(record, payload)
    db.commit()
    db.refresh(record)
    log_audit(f"PUT /store/stock-transfer/{transfer_id}", payload, payload.model_dump(exclude_unset=True), record, record)
    return record


@router.delete("/stock-transfer/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_delete,
):
    record = get_or_404(db, StockTransfer, transfer_id, "Stock transfer")
    db.delete(record)
    db.commit()


# --- Stock Adjustment ---

@router.get("/stock-adjustment", response_model=list[StockAdjustmentOut])
def list_stock_adjustment(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(StockAdjustment).order_by(StockAdjustment.created_at.desc())
    stmt = _stock_branch_filter(stmt, StockAdjustment, current_user, branch)
    return db.scalars(stmt).all()


@router.post("/stock-adjustment", response_model=StockAdjustmentOut, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(
    payload: StockAdjustmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["adjustment_number"] = data.get("adjustment_number") or _next_number(db, StockAdjustment, "ADJ")
    data["date"] = data.get("date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    record = StockAdjustment(**data)
    db.add(record)

    if payload.item_id:
        item = db.get(ItemMaster, payload.item_id)
        if item:
            item.current_stock = payload.adjusted_quantity

    db.commit()
    db.refresh(record)
    log_audit("POST /store/stock-adjustment", payload, data, record, record)
    notify_user_or_role(
        db, title="Stock Adjustment Processed",
        message=f"Stock Adjustment {getattr(record, 'adjustment_number', '')} processed for {record.item_name or 'item'} (new stock: {record.adjusted_quantity}).",
        module="inventory", event_type="stock_adjustment", recipient_role="store", related_record_id=record.id
    )
    return record


@router.put("/stock-adjustment/{adjustment_id}", response_model=StockAdjustmentOut)
def update_stock_adjustment(
    adjustment_id: str,
    payload: StockAdjustmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_edit,
):
    record = get_or_404(db, StockAdjustment, adjustment_id, "Stock adjustment")
    apply_updates(record, payload)
    if payload.item_id or payload.adjusted_quantity is not None:
        item_id = payload.item_id or record.item_id
        if item_id:
            item = db.get(ItemMaster, item_id)
            if item and payload.adjusted_quantity is not None:
                item.current_stock = payload.adjusted_quantity
    db.commit()
    db.refresh(record)
    log_audit(f"PUT /store/stock-adjustment/{adjustment_id}", payload, payload.model_dump(exclude_unset=True), record, record)
    return record



@router.delete("/stock-adjustment/{adjustment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_adjustment(
    adjustment_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete
):
    record = get_or_404(db, StockAdjustment, adjustment_id, "Stock adjustment")
    # An adjustment overwrites current_stock with an absolute corrected value, so
    # "reversing" it means restoring the pre-adjustment count it recorded.
    if record.item_id:
        item = db.get(ItemMaster, record.item_id)
        if item:
            item.current_stock = record.current_quantity
    db.delete(record)
    db.commit()


# NOTE: A generic "/stock-movements" GET+POST alias used to live here,
# reconstructing a unified feed from the four tables above and letting
# callers create inward/outward records through a single dict-typed
# endpoint. It's removed: it duplicated create_stock_inward/create_stock_outward
# but *never touched ItemMaster.current_stock*, so anything posted through it
# silently desynced stock from reality. Confirmed nothing in the frontend
# called it (fetchStockMovementsApi/createStockMovementApi were unused) before
# removing it here and from frontend/src/services/api.ts.
