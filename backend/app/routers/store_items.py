from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.user import User
from app.models.store_item import ItemMaster, Vendor
from app.schemas.store_item import (
    ItemMasterCreate,
    ItemMasterUpdate,
    ItemMasterOut,
    VendorCreate,
    VendorUpdate,
    VendorOut,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Store: Items & Vendors"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


def _store_branch_filter(stmt, model, current_user: User, branch: str | None = None):
    """Branch scoping: super_admin/admin see all; others see their branch + NULL records."""
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


# --- Item master ---

@router.get("/items", response_model=list[ItemMasterOut])
def list_items(
    category: str | None = Query(None),
    q: str | None = Query(None, description="Search by item code or name"),
    low_stock_only: bool = False,
    branch: str | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(ItemMaster)
    if category:
        stmt = stmt.where(ItemMaster.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((ItemMaster.item_code.ilike(like)) | (ItemMaster.item_name.ilike(like)))
    stmt = _store_branch_filter(stmt, ItemMaster, current_user, branch)
    stmt = stmt.offset(skip).limit(limit)
    items = db.scalars(stmt).all()
    if low_stock_only:
        items = [i for i in items if i.current_stock <= i.reorder_level]
    return items


@router.post("/items", response_model=ItemMasterOut, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemMasterCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    if not data.get("current_stock") and data.get("opening_stock"):
        data["current_stock"] = data["opening_stock"]
    if not data.get("branch"):
        data["branch"] = current_user.branch
    item = ItemMaster(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit("POST /store/items", payload, data, item, item)
    if item.current_stock <= item.reorder_level:
        notify_user_or_role(
            db, title="LOW STOCK WARNING",
            message=f"Item '{item.item_name}' stock ({item.current_stock}) has dropped below reorder level ({item.reorder_level}).",
            module="inventory", event_type="low_stock", recipient_role="store", priority="high", related_record_id=item.id
        )
        notify_user_or_role(
            db, title="LOW STOCK WARNING",
            message=f"Item '{item.item_name}' stock ({item.current_stock}) has dropped below reorder level ({item.reorder_level}).",
            module="inventory", event_type="low_stock", recipient_role="super_admin", priority="high", related_record_id=item.id
        )
    return item


@router.get("/items/{item_id}", response_model=ItemMasterOut)
def get_item(item_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, ItemMaster, item_id, "Item")


@router.put("/items/{item_id}", response_model=ItemMasterOut)
def update_item(
    item_id: str, payload: ItemMasterUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    item = get_or_404(db, ItemMaster, item_id, "Item")
    apply_updates(item, payload)
    db.commit()
    db.refresh(item)
    log_audit(f"PUT /store/items/{item_id}", payload, payload.model_dump(exclude_unset=True), item, item)
    if item.current_stock <= item.reorder_level:
        notify_user_or_role(
            db, title="LOW STOCK WARNING",
            message=f"Item '{item.item_name}' stock ({item.current_stock}) has dropped below reorder level ({item.reorder_level}).",
            module="inventory", event_type="low_stock", recipient_role="store", priority="high", related_record_id=item.id
        )
        notify_user_or_role(
            db, title="LOW STOCK WARNING",
            message=f"Item '{item.item_name}' stock ({item.current_stock}) has dropped below reorder level ({item.reorder_level}).",
            module="inventory", event_type="low_stock", recipient_role="super_admin", priority="high", related_record_id=item.id
        )
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    item = get_or_404(db, ItemMaster, item_id, "Item")
    db.delete(item)
    db.commit()


# --- Vendors ---

@router.get("/vendors", response_model=list[VendorOut])
def list_vendors(
    q: str | None = Query(None),
    branch: str | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Vendor)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Vendor.vendor_name.ilike(like)) | (Vendor.vendor_code.ilike(like)))
    stmt = _store_branch_filter(stmt, Vendor, current_user, branch)
    stmt = stmt.offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.post("/vendors", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    vendor = Vendor(**data)
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    log_audit("POST /store/vendors", payload, data, vendor, vendor)
    return vendor


@router.get("/vendors/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, Vendor, vendor_id, "Vendor")


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: str, payload: VendorUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    vendor = get_or_404(db, Vendor, vendor_id, "Vendor")
    apply_updates(vendor, payload)
    db.commit()
    db.refresh(vendor)
    log_audit(f"PUT /store/vendors/{vendor_id}", payload, payload.model_dump(exclude_unset=True), vendor, vendor)
    return vendor


@router.delete("/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(vendor_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    vendor = get_or_404(db, Vendor, vendor_id, "Vendor")
    db.delete(vendor)
    db.commit()
