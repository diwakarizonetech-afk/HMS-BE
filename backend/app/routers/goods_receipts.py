from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.user import User
from app.models.goods_receipt import GoodsReceipt, GRNItem
from app.models.store_item import ItemMaster
from app.models.pharmacy import Medicine, PharmacyBatch
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.stock_movement import StockInward
from app.schemas.goods_receipt import GoodsReceiptCreate, GoodsReceiptUpdate, GoodsReceiptOut
from app.services.notification_service import notify_user_or_role

import uuid

router = APIRouter(prefix="/goods-receipts", tags=["Store: Goods Receipt (GRN)"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


def _is_valid_uuid(val: str | None) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _generate_unique_grn_number(db: Session, requested_grn_number: str | None = None) -> str:
    year = datetime.now().year

    if requested_grn_number and requested_grn_number.strip():
        req = requested_grn_number.strip()
        existing = db.scalar(select(GoodsReceipt).where(GoodsReceipt.grn_number == req))
        if not existing:
            return req

    all_grns = db.scalars(select(GoodsReceipt.grn_number)).all()
    max_num = 0
    for code in all_grns:
        if code and "-" in code:
            parts = code.split("-")
            try:
                num = int(parts[-1])
                if num > max_num:
                    max_num = num
            except (IndexError, ValueError):
                pass

    next_num = max_num + 1
    return f"GRN-{year}-{next_num:03d}"


def _normalize_branch(b: str | None) -> str:
    if not b:
        return ""
    return b.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()


def _grn_branch_filter(stmt, model, current_user: User, branch: str | None = None):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target and target.lower() != "all":
        norm_sub = _normalize_branch(target)
        clauses = [
            func.lower(model.branch) == target.lower(),
        ]
        if norm_sub:
            clauses.append(func.lower(model.branch).contains(norm_sub))
        stmt = stmt.where(or_(*clauses))
    return stmt


@router.get("", response_model=list[GoodsReceiptOut])
def list_grns(branch: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stmt = select(GoodsReceipt).options(selectinload(GoodsReceipt.items)).order_by(GoodsReceipt.created_at.desc())
    stmt = _grn_branch_filter(stmt, GoodsReceipt, current_user, branch)
    return db.scalars(stmt).all()


@router.post("", response_model=GoodsReceiptOut, status_code=status.HTTP_201_CREATED)
def create_grn(payload: GoodsReceiptCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    raw_data = payload.model_dump(exclude={"items"})
    raw_data["grn_number"] = _generate_unique_grn_number(db, raw_data.get("grn_number"))
    if not raw_data.get("branch"):
        raw_data["branch"] = current_user.branch

    # Clean po_id and purchase_order_id
    po_id = raw_data.pop("po_id", None)
    if not raw_data.get("purchase_order_id") and po_id:
        if _is_valid_uuid(po_id):
            raw_data["purchase_order_id"] = po_id

    if raw_data.get("purchase_order_id") and not _is_valid_uuid(raw_data["purchase_order_id"]):
        raw_data["purchase_order_id"] = None

    # Filter dictionary keys to match GoodsReceipt table columns only
    valid_grn_cols = {c.name for c in GoodsReceipt.__table__.columns}
    grn_data = {k: v for k, v in raw_data.items() if k in valid_grn_cols}

    grn_items = []
    valid_item_cols = {c.name for c in GRNItem.__table__.columns}
    for line in payload.items:
        line_dict = line.model_dump()
        if line_dict.get("item_id") and not _is_valid_uuid(line_dict["item_id"]):
            line_dict["item_id"] = None
        clean_item_data = {k: v for k, v in line_dict.items() if k in valid_item_cols}
        grn_items.append(GRNItem(**clean_item_data))

    grn = GoodsReceipt(**grn_data, items=grn_items)
    db.add(grn)

    # Increment stock for accepted quantities against the item master
    for idx, line in enumerate(payload.items, start=1):
        item = None
        item_id_val = line.item_id if _is_valid_uuid(line.item_id) else None
        if item_id_val:
            try:
                item = db.scalar(select(ItemMaster).where(ItemMaster.id == item_id_val))
            except Exception:
                db.rollback()
                item = None
        if not item and line.item_code:
            try:
                item = db.scalar(select(ItemMaster).where(func.lower(ItemMaster.item_code) == line.item_code.lower()))
            except Exception:
                db.rollback()
                item = None
        if not item and line.item_name:
            try:
                item = db.scalar(select(ItemMaster).where(func.lower(ItemMaster.item_name) == line.item_name.lower()))
            except Exception:
                db.rollback()
                item = None

        if item and line.accepted_quantity > 0:
            item.current_stock += line.accepted_quantity

        # Log Stock Inward receipt for store inventory management
        code_str = line.item_code or f"ITEM{idx}"
        batch_num = f"BAT-{grn_data['grn_number']}-{code_str}"
        stock_inw = StockInward(
            inward_number=f"INW-{grn_data['grn_number']}-{code_str}-{idx}",
            po_number=grn_data.get("po_number") or "",
            item_id=item.id if item else None,
            item_code=line.item_code or "ITEM",
            item_name=line.item_name or "Item",
            quantity=line.accepted_quantity,
            unit_price=getattr(item, 'unit_price', 0.0) if item else 0.0,
            batch_number=batch_num,
            expiry_date="2027-12-31",
            supplier=grn_data.get("vendor_name", "Store Vendor"),
            supplier_name=grn_data.get("vendor_name", "Store Vendor"),
            warehouse="Central Store Bay 1",
            received_by="Store Officer",
            date=grn_data.get("received_date", today_str()),
            branch=grn_data.get("branch"),
        )
        db.add(stock_inw)

    # Close the loop on the PO lifecycle: once goods against a PO have been
    # received and verified, the PO is fulfilled.
    if grn_data.get("purchase_order_id"):
        po = db.get(PurchaseOrder, grn_data["purchase_order_id"])
        if po:
            po.status = POStatus.Fulfilled

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        grn_data["grn_number"] = _generate_unique_grn_number(db, None)
        grn = GoodsReceipt(**grn_data, items=grn_items)
        db.add(grn)
        db.commit()

    db.refresh(grn)
    log_audit("POST /store/goods-receipts", payload, grn_data, grn, grn)
    notify_user_or_role(
        db, title="Goods Receipt (GRN) Completed",
        message=f"GRN {grn.grn_number} verified & received. Stock inventory updated.",
        module="store", event_type="grn_completed", recipient_role="store", related_record_id=grn.id
    )
    return grn


@router.get("/{grn_id}", response_model=GoodsReceiptOut)
def get_grn(grn_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, GoodsReceipt, grn_id, "Goods receipt")


@router.put("/{grn_id}", response_model=GoodsReceiptOut)
def update_grn(
    grn_id: str, payload: GoodsReceiptUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    grn = get_or_404(db, GoodsReceipt, grn_id, "Goods receipt")
    apply_updates(grn, payload)
    db.commit()
    db.refresh(grn)
    log_audit(f"PUT /store/goods-receipts/{grn_id}", payload, payload.model_dump(exclude_unset=True), grn, grn)
    return grn


@router.delete("/{grn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grn(grn_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    grn = get_or_404(db, GoodsReceipt, grn_id, "Goods receipt")
    # Deleting a GRN must reverse the stock it added on creation across store & pharmacy.
    for line in grn.items:
        if line.item_id:
            item = db.get(ItemMaster, line.item_id)
            if item:
                if item.current_stock - line.accepted_quantity < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Cannot delete GRN {grn.grn_number}: reversing it would take "
                            f"{item.item_name}'s stock below zero. Other movements have "
                            f"already consumed this stock — use Stock Adjustment instead."
                        ),
                    )
                item.current_stock -= line.accepted_quantity
                # Reverse stock in Medicine and PharmacyBatch
                med = db.scalar(
                    select(Medicine).where(
                        or_(
                            Medicine.code == item.item_code,
                            func.lower(Medicine.name) == item.item_name.lower(),
                        )
                    )
                )
                if med:
                    med.current_stock = max(0, med.current_stock - line.accepted_quantity)
                batch_num = f"BATCH-{grn.grn_number}-{item.item_code}"
                batch = db.scalar(select(PharmacyBatch).where(PharmacyBatch.batch_number == batch_num))
                if batch:
                    batch.available_quantity = max(0, batch.available_quantity - line.accepted_quantity)
                    if batch.available_quantity == 0:
                        batch.batch_status = "Out of Stock"
    if grn.purchase_order_id:
        po = db.get(PurchaseOrder, grn.purchase_order_id)
        if po and po.status == POStatus.Fulfilled:
            po.status = POStatus.Approved
    db.delete(grn)
    db.commit()
