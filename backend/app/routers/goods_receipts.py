from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.goods_receipt import GoodsReceipt, GRNItem
from app.models.store_item import ItemMaster
from app.models.purchase_order import PurchaseOrder
from app.schemas.goods_receipt import GoodsReceiptCreate, GoodsReceiptUpdate, GoodsReceiptOut
from app.services.notification_service import notify_user_or_role

router = APIRouter(prefix="/goods-receipts", tags=["Store: Goods Receipt (GRN)"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


def _next_grn_number(db: Session) -> str:
    year = datetime.now().year
    count = db.query(GoodsReceipt).count() + 1
    return f"GRN-{year}-{1000 + count}"


@router.get("", response_model=list[GoodsReceiptOut])
def list_grns(db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    stmt = select(GoodsReceipt).options(selectinload(GoodsReceipt.items)).order_by(GoodsReceipt.created_at.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=GoodsReceiptOut, status_code=status.HTTP_201_CREATED)
def create_grn(payload: GoodsReceiptCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump(exclude={"items"})
    data["grn_number"] = data.get("grn_number") or _next_grn_number(db)

    grn_items = [GRNItem(**line.model_dump()) for line in payload.items]
    grn = GoodsReceipt(**data, items=grn_items)
    db.add(grn)

    # Increment stock for accepted quantities against the item master
    for line in payload.items:
        if line.item_id:
            item = db.get(ItemMaster, line.item_id)
            if item:
                item.current_stock += line.accepted_quantity

    # Close the loop on the PO lifecycle: once goods against a PO have been
    # received and verified, the PO is fulfilled.
    if data.get("purchase_order_id"):
        po = db.get(PurchaseOrder, data["purchase_order_id"])
        if po and po.status == "Approved":
            po.status = "Fulfilled"

    db.commit()
    db.refresh(grn)
    log_audit("POST /store/goods-receipts", payload, data, grn, grn)
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
    # Deleting a GRN must reverse the stock it added on creation, or every
    # accepted item stays permanently over-counted.
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
    if grn.purchase_order_id:
        po = db.get(PurchaseOrder, grn.purchase_order_id)
        if po and po.status == "Fulfilled":
            po.status = "Approved"
    db.delete(grn)
    db.commit()
