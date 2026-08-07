from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.crud_utils import get_or_404, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.purchase_order import PurchaseOrder, POItem
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut
from app.services.notification_service import notify_user_or_role

router = APIRouter(prefix="/purchase-orders", tags=["Store: Purchase Orders"])
_perm_create = Depends(require_permission("Inventory & Store", "Create"))
_perm_edit = Depends(require_permission("Inventory & Store", "Edit"))
_perm_delete = Depends(require_permission("Inventory & Store", "Delete"))


def _next_po_number(db: Session) -> str:
    year = datetime.now().year
    count = db.query(PurchaseOrder).count() + 1
    return f"PO-{year}-{1000 + count}"


def _compute_totals(items: list[POItem]) -> dict:
    sub_total = sum(i.quantity * i.unit_price for i in items)
    total_discount = sum(i.discount for i in items)
    total_gst = sum(i.gst for i in items)
    total_amount = sub_total - total_discount + total_gst
    return {
        "sub_total": sub_total,
        "total_discount": total_discount,
        "total_gst": total_gst,
        "total_amount": total_amount,
    }


@router.get("", response_model=list[PurchaseOrderOut])
def list_purchase_orders(
    status_filter: str | None = None,
    vendor_id: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items))
    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
    if vendor_id:
        stmt = stmt.where(PurchaseOrder.vendor_id == vendor_id)
    stmt = stmt.order_by(PurchaseOrder.created_at.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump(exclude={"items"})
    data["po_number"] = data.get("po_number") or _next_po_number(db)
    data["created_date"] = data.get("created_date") or today_str()

    po_items = []
    for line in payload.items:
        total = line.quantity * line.unit_price - line.discount + line.gst
        po_items.append(POItem(**line.model_dump(), total=total))

    totals = _compute_totals(po_items)
    po = PurchaseOrder(**data, **totals, items=po_items)
    db.add(po)
    db.commit()
    db.refresh(po)
    log_audit("POST /store/purchase-orders", payload, data, po, po)
    notify_user_or_role(
        db, title="New Purchase Order Created",
        message=f"Purchase Order {po.po_number} created for vendor {getattr(po, 'vendor_name', 'Vendor')}.",
        module="store", event_type="purchase_request_created", recipient_role="store", related_record_id=po.id
    )
    notify_user_or_role(
        db, title="New Purchase Request Submitted",
        message=f"Purchase Request {po.po_number} pending review.",
        module="store", event_type="purchase_request_created", recipient_role="super_admin", related_record_id=po.id
    )
    return po


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(po_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, PurchaseOrder, po_id, "Purchase order")


@router.put("/{po_id}", response_model=PurchaseOrderOut)
def update_purchase_order(
    po_id: str, payload: PurchaseOrderUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    po = get_or_404(db, PurchaseOrder, po_id, "Purchase order")
    update_data = payload.model_dump(exclude_unset=True, exclude={"items"})
    for field, value in update_data.items():
        setattr(po, field, value)

    if payload.items is not None:
        po.items.clear()
        db.flush()
        new_items = []
        for line in payload.items:
            total = line.quantity * line.unit_price - line.discount + line.gst
            new_items.append(POItem(**line.model_dump(), total=total, purchase_order_id=po.id))
        po.items = new_items
        totals = _compute_totals(new_items)
        for field, value in totals.items():
            setattr(po, field, value)

    db.commit()
    db.refresh(po)
    log_audit(f"PUT /store/purchase-orders/{po_id}", payload, update_data, po, po)
    return po


@router.post("/{po_id}/approve", response_model=PurchaseOrderOut)
def approve_purchase_order(po_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    po = get_or_404(db, PurchaseOrder, po_id, "Purchase order")
    # Approving a PO only authorizes the purchase — it must NOT touch
    # ItemMaster.current_stock. Goods haven't arrived yet at approval time;
    # stock is only added once, when a Goods Receipt (GRN) is created against
    # this PO and accepted quantities are verified (see goods_receipts.py).
    # This used to add line.quantity to current_stock here too, which
    # double-counted every item once at approval and again at GRN receipt.
    if po.status != "Approved":
        po.status = "Approved"
    db.commit()
    db.refresh(po)
    log_audit(f"POST /store/purchase-orders/{po_id}/approve", {}, {}, po, po)
    notify_user_or_role(
        db, title="Purchase Order Approved",
        message=f"Purchase Order {po.po_number} has been approved.",
        module="store", event_type="purchase_order_approved", recipient_role="store", related_record_id=po.id
    )
    return po


@router.post("/{po_id}/reject", response_model=PurchaseOrderOut)
def reject_purchase_order(po_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    po = get_or_404(db, PurchaseOrder, po_id, "Purchase order")
    po.status = "Rejected"
    db.commit()
    db.refresh(po)
    log_audit(f"POST /store/purchase-orders/{po_id}/reject", {}, {}, po, po)
    notify_user_or_role(
        db, title="Purchase Order Rejected",
        message=f"Purchase Order {po.po_number} was rejected.",
        module="store", event_type="purchase_order_rejected", recipient_role="store", related_record_id=po.id
    )
    return po



@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(po_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    po = get_or_404(db, PurchaseOrder, po_id, "Purchase order")
    db.delete(po)
    db.commit()
