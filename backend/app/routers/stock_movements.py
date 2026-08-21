from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.user import User
from app.models.stock_movement import StockInward, StockOutward, StockTransfer, StockAdjustment, TransferStatus
from app.models.store_item import ItemMaster
from app.schemas.stock_movement import (
    StockInwardCreate,
    StockInwardUpdate,
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


def _normalize_branch(b: str | None) -> str:
    if not b:
        return ""
    return b.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()


def _stock_branch_filter(stmt, model, current_user: User, branch: str | None = None):
    """Strict branch scoping for stock movements: super_admin/admin see all (or specified branch query);
    others see strictly their branch records."""
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


def _generate_unique_movement_number(db: Session, model, number_attr: str, prefix: str, requested_number: str | None = None) -> str:
    year = datetime.now().year

    if requested_number and requested_number.strip():
        req = requested_number.strip()
        existing = db.scalar(select(model).where(getattr(model, number_attr) == req))
        if not existing:
            return req

    all_records = db.scalars(select(getattr(model, number_attr))).all()
    max_num = 0
    for code in all_records:
        if code and "-" in code:
            parts = code.split("-")
            try:
                num = int(parts[-1])
                if num > max_num:
                    max_num = num
            except (IndexError, ValueError):
                pass

    next_num = max_num + 1
    return f"{prefix}-{year}-{next_num:03d}"


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

    if data.get("inward_number"):
        existing = db.scalar(select(StockInward).where(StockInward.inward_number == data["inward_number"]))
        if existing:
            return existing

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


@router.put("/stock-inward/{inward_id}", response_model=StockInwardOut)
def update_stock_inward(
    inward_id: str,
    payload: StockInwardUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    _perm=_perm_edit,
):
    record = get_or_404(db, StockInward, inward_id, "Stock inward")
    old_qty = record.quantity
    apply_updates(record, payload)
    if payload.quantity is not None and record.item_id:
        diff = payload.quantity - old_qty
        item = db.get(ItemMaster, record.item_id)
        if item:
            item.current_stock += diff
    db.commit()
    db.refresh(record)
    log_audit(f"PUT /store/stock-inward/{inward_id}", payload, payload.model_dump(exclude_unset=True), record, record)
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
    from app.models.pharmacy import Medicine, PharmacyBatch

    data = payload.model_dump()
    data["date"] = data.get("date") or today_str()
    if not data.get("issued_to_department") and data.get("department"):
        data["issued_to_department"] = data["department"]
    if not data.get("department") and data.get("issued_to_department"):
        data["department"] = data["issued_to_department"]
    if not data.get("branch"):
        data["branch"] = current_user.branch

    item = None
    if payload.item_id:
        item = db.get(ItemMaster, payload.item_id)
    if not item and payload.item_code:
        item = db.scalar(select(ItemMaster).where(ItemMaster.item_code == payload.item_code))
    if not item and payload.item_name:
        item = db.scalar(select(ItemMaster).where(func.lower(ItemMaster.item_name) == payload.item_name.lower()))

    if item:
        data["item_id"] = item.id
        if item.current_stock < payload.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {item.item_name}: available {item.current_stock}, requested {payload.quantity}",
            )
        item.current_stock -= payload.quantity

    data["status"] = data.get("status") or "Approved"
    record = StockOutward(**data)
    db.add(record)

    # If stock is issued outward to Pharmacy, allocate directly to PharmacyBatch in the SAME branch
    target_branch = data.get("branch") or current_user.branch
    issued_dept = (data.get("issued_to_department") or data.get("department") or "").lower()

    if "pharmacy" in issued_dept:
        norm_sub = _normalize_branch(target_branch)
        batch_query = select(PharmacyBatch)
        if target_branch:
            b_clauses = [func.lower(PharmacyBatch.branch) == target_branch.lower()]
            if norm_sub:
                b_clauses.append(func.lower(PharmacyBatch.branch).contains(norm_sub))
            batch_query = batch_query.where(or_(*b_clauses))

        item_code_val = (payload.item_code or (item.item_code if item else "")).strip()
        item_name_val = (payload.item_name or (item.item_name if item else "")).strip()

        batch_query = batch_query.where(
            or_(
                func.lower(PharmacyBatch.medicine_id) == item_code_val.lower(),
                func.lower(PharmacyBatch.medicine_name) == item_name_val.lower(),
            )
        )
        batch = db.scalar(batch_query.order_by(PharmacyBatch.expiry_date.desc()))
        if batch:
            batch.available_quantity = (batch.available_quantity or 0) + payload.quantity
            batch.quantity_received = (batch.quantity_received or 0) + payload.quantity
            batch.batch_status = "Available"
        else:
            prefix = "CAN" if "cantonment" in (target_branch or "").lower() else ("SRG" if "srirangam" in (target_branch or "").lower() else "TN")
            new_batch_num = f"BAT-{prefix}-{item_code_val or 'MED'}-{datetime.now().strftime('%m%d%H%M')}"
            batch = PharmacyBatch(
                batch_number=new_batch_num,
                medicine_id=item_code_val or "MED-001",
                medicine_name=item_name_val or "Medicine",
                supplier_name="Central Store Transfer",
                manufacturing_date=datetime.now().strftime("%Y-%m-%d"),
                expiry_date="2028-12-31",
                purchase_price=item.unit_price if item else 0.0,
                selling_price=round((item.unit_price * 1.25) if item else 20.0, 2),
                quantity_received=payload.quantity,
                available_quantity=payload.quantity,
                batch_status="Available",
                branch=target_branch,
            )
            db.add(batch)

        med = db.scalar(
            select(Medicine).where(
                or_(
                    func.lower(Medicine.code) == item_code_val.lower(),
                    func.lower(Medicine.name) == item_name_val.lower(),
                )
            )
        )
        if med:
            med.current_stock = (med.current_stock or 0) + payload.quantity

    db.commit()
    db.refresh(record)

    log_audit("POST /store/stock-outward", payload, data, record, record)
    try:
        from app.services.notification_service import notify_user_or_role
        notify_user_or_role(
            db,
            title="Stock Allocated to Pharmacy",
            message=f"Store Manager issued {record.quantity} units of {record.item_name} to {record.branch} Pharmacy.",
            module="Pharmacy",
            event_type="stock_transfer_allocated",
            recipient_role="Pharmacy",
            priority="high",
            related_record_id=record.id,
        )
    except Exception:
        pass
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
    data["transfer_number"] = _generate_unique_movement_number(db, StockTransfer, "transfer_number", "TRF", data.get("transfer_number"))
    data["transfer_date"] = data.get("transfer_date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    record = StockTransfer(**data)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        data["transfer_number"] = _generate_unique_movement_number(db, StockTransfer, "transfer_number", "TRF", None)
        record = StockTransfer(**data)
        db.add(record)
        db.commit()

    db.refresh(record)
    log_audit("POST /store/stock-outward", payload, data, record, record)
    try:
        from app.services.notification_service import notify_user_or_role
        notify_user_or_role(
            db,
            title="New Stock Dispatched from Store Manager",
            message=f"Store Manager issued {record.quantity} units of {record.item_name} to Pharmacy.",
            module="Pharmacy",
            event_type="stock_transfer_dispatched",
            recipient_role="Pharmacy",
            priority="high",
        )
    except Exception as e:
        pass
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


@router.get("/pharmacy-transfers")
def list_pharmacy_transfers(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns all stock transfers / outward issues sent by the Store Manager to the Pharmacy.
    Provides total products count, total quantities sent, detailed line items, and approval status.
    """
    outward_stmt = select(StockOutward).order_by(StockOutward.created_at.desc())
    outward_stmt = _stock_branch_filter(outward_stmt, StockOutward, current_user, branch)
    outward_records = db.scalars(outward_stmt).all()
    pharmacy_outwards = [
        r for r in outward_records
        if (r.department and "pharmacy" in r.department.lower()) or (r.issued_to_department and "pharmacy" in r.issued_to_department.lower())
    ]

    transfer_stmt = select(StockTransfer).order_by(StockTransfer.created_at.desc())
    transfer_stmt = _stock_branch_filter(transfer_stmt, StockTransfer, current_user, branch)
    transfer_records = db.scalars(transfer_stmt).all()
    pharmacy_transfers = [
        r for r in transfer_records
        if (r.destination and "pharmacy" in r.destination.lower()) or (r.to_location and "pharmacy" in r.to_location.lower())
    ]

    combined = []
    seen_keys = set()

    for t in pharmacy_transfers:
        t_status = t.status.value if hasattr(t.status, "value") else str(t.status)
        status_str = "Approved" if t_status in ["Completed", "Received", "Approved"] else "Pending Approval"
        item_code = (t.item_code or "").strip().lower()
        qty = t.quantity
        date_str = str(t.transfer_date or t.date or "")
        dedup_key = f"{item_code}_{qty}_{date_str}"

        seen_keys.add(dedup_key)
        combined.append({
            "id": t.id,
            "transferNumber": t.transfer_number,
            "type": "Stock Transfer",
            "itemCode": t.item_code,
            "itemName": t.item_name,
            "quantity": t.quantity,
            "batchNumber": t.batch_number or "STORE-BATCH",
            "sender": t.requested_by or "Store Manager",
            "destination": t.destination or "Pharmacy",
            "date": t.transfer_date or t.date,
            "status": status_str,
            "createdAt": t.created_at.isoformat() if hasattr(t, "created_at") and t.created_at else t.transfer_date,
        })

    for o in pharmacy_outwards:
        item_code = (o.item_code or "").strip().lower()
        qty = o.quantity
        date_str = str(o.date or "")
        dedup_key = f"{item_code}_{qty}_{date_str}"

        if dedup_key in seen_keys:
            continue

        seen_keys.add(dedup_key)
        status_val = getattr(o, "status", None) or "Pending Approval"
        combined.append({
            "id": o.id,
            "transferNumber": o.outward_number or f"OUT-{o.id[:6]}",
            "type": "Stock Outward Issue",
            "itemCode": o.item_code,
            "itemName": o.item_name,
            "quantity": o.quantity,
            "batchNumber": o.batch_number or "STORE-BATCH",
            "sender": o.issued_by or "Store Manager",
            "destination": o.department or "Pharmacy",
            "date": o.date,
            "status": status_val,
            "createdAt": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else o.date,
        })

    combined.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)

    total_quantity_sent = sum(int(item.get("quantity") or 0) for item in combined)
    total_products_sent = len(combined)
    pending_count = sum(1 for item in combined if item["status"] == "Pending Approval")

    return {
        "transfers": combined,
        "totalProductsSent": total_products_sent,
        "totalQuantitySent": total_quantity_sent,
        "pendingCount": pending_count,
    }


@router.post("/pharmacy-transfers/{transfer_id}/approve")
def approve_pharmacy_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Approves a store stock transfer/outward issue in DB so it appears in '+ Add Medicine' dropdown.
    Does NOT auto-add to Medicine List until pharmacist sets selling price and saves in Add Medicine modal.
    """
    from app.services.notification_service import notify_user_or_role

    transfer = db.get(StockTransfer, transfer_id)
    outward = db.get(StockOutward, transfer_id) if not transfer else None

    if transfer is not None:
        item_name = transfer.item_name
        quantity = transfer.quantity
        sender = transfer.requested_by or "Store Manager"
        transfer_ref = transfer.transfer_number
        transfer.status = TransferStatus.Completed
    elif outward is not None:
        item_name = outward.item_name
        quantity = outward.quantity
        sender = outward.issued_by or "Store Manager"
        transfer_ref = outward.outward_number or transfer_id
        setattr(outward, "status", "Approved")
    else:
        raise HTTPException(status_code=404, detail="Store transfer record not found in database.")

    db.commit()

    try:
        notify_user_or_role(
            db,
            title="Stock Transfer Approved 🎉",
            message=f"Pharmacy approved {quantity} units of {item_name} (Ref #{transfer_ref}). Go to + Add Medicine to set selling price and add to inventory.",
            module="Pharmacy",
            event_type="stock_transfer_approved",
            recipient_role="Pharmacy",
            priority="high",
        )
        notify_user_or_role(
            db,
            title="Stock Transfer Approved by Pharmacy",
            message=f"Pharmacy approved {quantity} units of {item_name} (Ref #{transfer_ref}).",
            module="Store",
            event_type="stock_transfer_received",
            recipient_role="Store Manager",
            priority="medium",
        )
    except Exception:
        pass

    return {
        "message": f"Approved {quantity} units of {item_name}. Open '+ Add Medicine' to set selling price and add to inventory.",
    }


# NOTE: A generic "/stock-movements" GET+POST alias used to live here,
# reconstructing a unified feed from the four tables above and letting
# callers create inward/outward records through a single dict-typed
# endpoint. It's removed: it duplicated create_stock_inward/create_stock_outward
# but *never touched ItemMaster.current_stock*, so anything posted through it
# silently desynced stock from reality. Confirmed nothing in the frontend
# called it (fetchStockMovementsApi/createStockMovementApi were unused) before
# removing it here and from frontend/src/services/api.ts.
