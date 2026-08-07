from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import random, string

from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.services.notification_service import notify_user_or_role
from app.models.pharmacy import (
    MedicineCategory, Medicine, PharmacyBatch, PharmacyPurchase,
    Prescription, POSInvoice, CustomerReturn, SupplierReturn,
)

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])
_auth = Depends(get_current_active_user)
# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
_perm_create = Depends(require_permission("Pharmacy & Drugs", "Create"))
_perm_edit = Depends(require_permission("Pharmacy & Drugs", "Edit"))
_perm_delete = Depends(require_permission("Pharmacy & Drugs", "Delete"))


def _row(r) -> dict:
    d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
    mapping = {
        "medicine_id": "medicineId", "medicine_name": "medicineName", "supplier_name": "supplierName",
        "manufacturing_date": "manufacturingDate", "expiry_date": "expiryDate",
        "purchase_price": "purchasePrice", "selling_price": "sellingPrice",
        "quantity_received": "quantityReceived", "available_quantity": "availableQuantity",
        "batch_status": "batchStatus", "batch_number": "batchNumber",
        "generic_name": "genericName", "dosage_form": "dosageForm",
        "storage_condition": "storageCondition", "rack_location": "rackLocation",
        "current_stock": "currentStock", "min_stock": "minStock", "max_stock": "maxStock",
        "reorder_level": "reorderLevel", "medicine_count": "medicineCount",
        "purchase_number": "purchaseNumber", "supplier_gst": "supplierGst",
        "invoice_number": "invoiceNumber", "purchase_date": "purchaseDate",
        "payment_method": "paymentMethod", "total_amount": "totalAmount",
        "prescription_number": "prescriptionNumber", "patient_uhid": "patientUhid",
        "patient_name": "patientName", "patient_age": "patientAge", "patient_gender": "patientGender",
        "doctor_name": "doctorName", "visit_date": "visitDate", "payment_status": "paymentStatus",
        "amount_paid": "amountPaid", "due_amount": "dueAmount",
        "invoice_number": "invoiceNumber", "customer_name": "customerName",
        "customer_phone": "customerPhone", "gst_amount": "gstAmount",
        "return_number": "returnNumber", "refund_amount": "refundAmount",
        "credit_note_no": "creditNoteNo", "created_at": "createdAt", "updated_at": "updatedAt",
    }
    return {mapping.get(k, k): v for k, v in d.items()}


# ── Categories ────────────────────────────────────────────────

@router.get("/categories")
def list_categories(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(MedicineCategory)).all()]


@router.post("/categories", status_code=201)
def create_category(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    row = MedicineCategory(
        name=payload["name"], code=payload["code"],
        description=payload.get("description", ""),
        medicine_count=payload.get("medicineCount", 0),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


# ── Medicines ─────────────────────────────────────────────────

@router.get("/medicines")
def list_medicines(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(Medicine).order_by(Medicine.name)).all()]


@router.post("/medicines", status_code=201)
def create_medicine(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    row = Medicine(
        code=payload["code"], name=payload["name"], generic_name=payload.get("genericName", ""),
        brand=payload.get("brand", ""), category=payload.get("category", ""),
        manufacturer=payload.get("manufacturer", ""), dosage_form=payload.get("dosageForm", ""),
        strength=payload.get("strength", ""), unit=payload.get("unit", ""),
        purchase_price=payload.get("purchasePrice", 0), selling_price=payload.get("sellingPrice", 0),
        gst=payload.get("gst", 12), storage_condition=payload.get("storageCondition", ""),
        rack_location=payload.get("rackLocation", ""), status=payload.get("status", "Active"),
        current_stock=payload.get("currentStock", 0), min_stock=payload.get("minStock", 0),
        max_stock=payload.get("maxStock", 0), reorder_level=payload.get("reorderLevel", 0),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.put("/medicines/{item_id}")
def update_medicine(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(Medicine, item_id)
    if not row: raise HTTPException(404, "Medicine not found")
    field_map = {
        "genericName": "generic_name", "dosageForm": "dosage_form", "storageCondition": "storage_condition",
        "rackLocation": "rack_location", "purchasePrice": "purchase_price", "sellingPrice": "selling_price",
        "currentStock": "current_stock", "minStock": "min_stock", "maxStock": "max_stock",
        "reorderLevel": "reorder_level",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col): setattr(row, col, v)
    db.commit(); db.refresh(row)
    return _row(row)


@router.delete("/medicines/{item_id}", status_code=204)
def delete_medicine(item_id: str, db: Session = Depends(get_db), _=_auth, _perm=_perm_delete):
    row = db.get(Medicine, item_id)
    if row: db.delete(row); db.commit()


# ── Batches ───────────────────────────────────────────────────

@router.get("/batches")
def list_batches(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(PharmacyBatch).order_by(PharmacyBatch.expiry_date)).all()]


@router.post("/batches", status_code=201)
def create_batch(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    row = PharmacyBatch(
        batch_number=payload["batchNumber"], medicine_id=payload.get("medicineId", ""),
        medicine_name=payload.get("medicineName", ""), supplier_name=payload.get("supplierName", ""),
        manufacturing_date=payload.get("manufacturingDate", ""), expiry_date=payload.get("expiryDate", ""),
        purchase_price=payload.get("purchasePrice", 0), selling_price=payload.get("sellingPrice", 0),
        quantity_received=payload.get("quantityReceived", 0), available_quantity=payload.get("availableQuantity", 0),
        batch_status=payload.get("batchStatus", "Available"),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.put("/batches/{item_id}")
def update_batch(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(PharmacyBatch, item_id)
    if not row: raise HTTPException(404, "Batch not found")
    field_map = {
        "batchNumber": "batch_number", "medicineId": "medicine_id", "medicineName": "medicine_name",
        "supplierName": "supplier_name", "manufacturingDate": "manufacturing_date",
        "expiryDate": "expiry_date", "purchasePrice": "purchase_price", "sellingPrice": "selling_price",
        "quantityReceived": "quantity_received", "availableQuantity": "available_quantity",
        "batchStatus": "batch_status",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col): setattr(row, col, v)
    db.commit(); db.refresh(row)
    return _row(row)


# ── Purchases ─────────────────────────────────────────────────

@router.get("/purchases")
def list_purchases(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(PharmacyPurchase).order_by(PharmacyPurchase.created_at.desc())).all()]


@router.post("/purchases", status_code=201)
def create_purchase(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    pnum = f"PO-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    row = PharmacyPurchase(
        purchase_number=payload.get("purchaseNumber", pnum),
        supplier_name=payload.get("supplierName", ""), supplier_gst=payload.get("supplierGst", ""),
        invoice_number=payload.get("invoiceNumber", ""), purchase_date=payload.get("purchaseDate", ""),
        payment_method=payload.get("paymentMethod", "Cash"),
        total_amount=payload.get("totalAmount", 0), status=payload.get("status", "Completed"),
        items=payload.get("items", []),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


# ── Prescriptions ─────────────────────────────────────────────

@router.get("/prescriptions")
def list_prescriptions(db: Session = Depends(get_db), _=_auth):
    rows = list(db.scalars(select(Prescription).order_by(Prescription.created_at.desc())).all())
    if not rows:
        today_str = datetime.now().strftime("%Y-%m-%d")
        seed_data = [
            Prescription(
                prescription_number="RX-2026-101",
                patient_uhid="UHID-88201",
                patient_name="Rahul Verma",
                patient_age=42,
                patient_gender="Male",
                doctor_name="Dr. Vikram Malhotra",
                department="Cardiology",
                visit_date=today_str,
                status="Pending",
                payment_status="Unpaid",
                total_amount=480.0,
                amount_paid=0.0,
                due_amount=480.0,
                payment_method="Cash",
                items=[
                    {"id": "rx-item-1", "medicineName": "Paracetamol 500mg", "dosage": "1-0-1", "duration": "5 Days", "quantity": 10, "unitPrice": 15.0, "price": 150.0, "dispensed": False},
                    {"id": "rx-item-2", "medicineName": "Amoxicillin 250mg", "dosage": "1-1-1", "duration": "7 Days", "quantity": 21, "unitPrice": 15.71, "price": 330.0, "dispensed": False}
                ]
            ),
            Prescription(
                prescription_number="RX-2026-102",
                patient_uhid="UHID-88202",
                patient_name="Priya Sharma",
                patient_age=34,
                patient_gender="Female",
                doctor_name="Dr. Ananya Roy",
                department="General Medicine",
                visit_date=today_str,
                status="Pending",
                payment_status="Paid",
                total_amount=250.0,
                amount_paid=250.0,
                due_amount=0.0,
                payment_method="Card",
                items=[
                    {"id": "rx-item-3", "medicineName": "Cetirizine 10mg", "dosage": "0-0-1", "duration": "10 Days", "quantity": 10, "unitPrice": 10.0, "price": 100.0, "dispensed": False},
                    {"id": "rx-item-4", "medicineName": "Pantoprazole 40mg", "dosage": "1-0-0", "duration": "15 Days", "quantity": 15, "unitPrice": 10.0, "price": 150.0, "dispensed": False}
                ]
            )
        ]
        for item in seed_data:
            db.add(item)
        try:
            db.commit()
            rows = list(db.scalars(select(Prescription).order_by(Prescription.created_at.desc())).all())
        except Exception:
            db.rollback()
    return [_row(r) for r in rows]


@router.post("/prescriptions", status_code=201)
def create_prescription(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    rxnum = f"RX-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    row = Prescription(
        prescription_number=payload.get("prescriptionNumber", rxnum),
        patient_uhid=payload.get("patientUhid", ""), patient_name=payload.get("patientName", ""),
        patient_age=payload.get("patientAge", 0), patient_gender=payload.get("patientGender", ""),
        doctor_name=payload.get("doctorName", ""), department=payload.get("department", ""),
        visit_date=payload.get("visitDate", ""), status=payload.get("status", "Pending"),
        payment_status=payload.get("paymentStatus"), total_amount=payload.get("totalAmount", 0),
        amount_paid=payload.get("amountPaid", 0), due_amount=payload.get("dueAmount", 0),
        payment_method=payload.get("paymentMethod"), items=payload.get("items", []),
    )
    db.add(row); db.commit(); db.refresh(row)

    notify_user_or_role(
        db,
        title="New Prescription",
        message=f"New prescription {row.prescription_number} for {row.patient_name} from Dr. {row.doctor_name} needs dispensing.",
        module="pharmacy",
        event_type="new_prescription",
        recipient_role="pharmacist",
        related_record_id=row.id,
    )

    return _row(row)


@router.put("/prescriptions/{item_id}")
def update_prescription(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(Prescription, item_id)
    if not row: raise HTTPException(404, "Prescription not found")

    # If the update marks any line items as newly dispensed, deduct that
    # medicine's stock now. Compared against the item's *previous* dispensed
    # flag (not just the incoming payload) so re-saving an already-dispensed
    # item doesn't deduct stock a second time.
    if "items" in payload and isinstance(payload["items"], list):
        old_items_by_id = {i.get("id"): i for i in (row.items or [])}
        for new_item in payload["items"]:
            old_item = old_items_by_id.get(new_item.get("id"))
            was_dispensed = bool(old_item.get("dispensed")) if old_item else False
            now_dispensed = bool(new_item.get("dispensed"))
            if now_dispensed and not was_dispensed:
                _deduct_stock_fefo(
                    db,
                    medicine_id="",
                    medicine_name=new_item.get("medicineName", ""),
                    qty_needed=int(new_item.get("quantity", 0) or 0),
                )

    field_map = {
        "patientUhid": "patient_uhid", "patientName": "patient_name", "patientAge": "patient_age",
        "patientGender": "patient_gender", "doctorName": "doctor_name", "visitDate": "visit_date",
        "paymentStatus": "payment_status", "totalAmount": "total_amount",
        "amountPaid": "amount_paid", "dueAmount": "due_amount", "paymentMethod": "payment_method",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col): setattr(row, col, v)
    db.commit(); db.refresh(row)
    return _row(row)


# ── POS Invoices ──────────────────────────────────────────────

def _deduct_stock_fefo(db: Session, medicine_id: str, medicine_name: str, qty_needed: int) -> None:
    """Deduct qty_needed units of a medicine from its batches, earliest
    expiry first (First-Expiry-First-Out), raising a clear 400 if the total
    available stock across all its batches can't cover the sale. This is
    what actually keeps PharmacyBatch.available_quantity honest for every
    sale/dispense -- previously nothing in this router touched batch stock
    at all, so POS sales and prescription dispensing never reduced
    inventory no matter how much was "sold"."""
    if qty_needed <= 0:
        return
    query = select(PharmacyBatch).where(PharmacyBatch.available_quantity > 0)
    if medicine_id:
        query = query.where(PharmacyBatch.medicine_id == medicine_id)
    else:
        query = query.where(PharmacyBatch.medicine_name == medicine_name)
    batches = db.scalars(query.order_by(PharmacyBatch.expiry_date)).all()

    total_available = sum(b.available_quantity for b in batches)
    if total_available < qty_needed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock for {medicine_name or medicine_id}: "
                f"need {qty_needed}, only {total_available} available across all batches."
            ),
        )

    remaining = qty_needed
    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.available_quantity, remaining)
        batch.available_quantity -= take
        if batch.available_quantity == 0:
            batch.batch_status = "Out of Stock"
        remaining -= take


def _restock_fefo(db: Session, medicine_id: str, medicine_name: str, qty: int) -> None:
    """Reverse a sale/dispense (invoice deleted, item returned): add stock
    back to the most-recently-emptied or most-recent batch for this
    medicine. Not a perfect undo of which specific batch a unit came from
    (that detail isn't tracked per line item), but keeps total available
    stock accurate, which is what matters for inventory correctness."""
    if qty <= 0:
        return
    query = select(PharmacyBatch)
    if medicine_id:
        query = query.where(PharmacyBatch.medicine_id == medicine_id)
    else:
        query = query.where(PharmacyBatch.medicine_name == medicine_name)
    batch = db.scalar(query.order_by(PharmacyBatch.expiry_date.desc()))
    if batch:
        batch.available_quantity += qty
        if batch.batch_status == "Out of Stock":
            batch.batch_status = "Available"


@router.get("/invoices")
def list_invoices(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(POSInvoice).order_by(POSInvoice.created_at.desc())).all()]


@router.post("/invoices", status_code=201)
def create_invoice(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    inum = f"POS-{datetime.now().year}-{''.join(random.choices(string.digits, k=5))}"
    items = payload.get("items", [])

    # Deduct stock for every line item before committing the invoice, so a
    # sale that can't actually be fulfilled from stock on hand fails loudly
    # instead of silently recording a sale for medicine that isn't there.
    for item in items:
        _deduct_stock_fefo(
            db,
            medicine_id=item.get("medicineId", ""),
            medicine_name=item.get("medicineName", ""),
            qty_needed=int(item.get("quantity", 0) or 0),
        )

    row = POSInvoice(
        invoice_number=payload.get("invoiceNumber", inum),
        customer_name=payload.get("customerName", ""), customer_phone=payload.get("customerPhone", ""),
        date=payload.get("date", datetime.now().strftime("%Y-%m-%d %I:%M %p")),
        payment_method=payload.get("paymentMethod", "Cash"),
        subtotal=payload.get("subtotal", 0), discount=payload.get("discount", 0),
        gst_amount=payload.get("gstAmount", 0), total_amount=payload.get("totalAmount", 0),
        items=items,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.delete("/invoices/{item_id}", status_code=204)
def delete_invoice(item_id: str, db: Session = Depends(get_db), _=_auth, _perm=_perm_delete):
    row = db.get(POSInvoice, item_id)
    if not row: raise HTTPException(404, "Invoice not found")
    # Deleting a recorded sale must give the stock back, or every voided
    # invoice leaves inventory permanently short.
    for item in (row.items or []):
        _restock_fefo(
            db,
            medicine_id=item.get("medicineId", ""),
            medicine_name=item.get("medicineName", ""),
            qty=int(item.get("quantity", 0) or 0),
        )
    db.delete(row); db.commit()


# ── Customer Returns ──────────────────────────────────────────

@router.get("/customer-returns")
def list_customer_returns(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(CustomerReturn).order_by(CustomerReturn.created_at.desc())).all()]


@router.post("/customer-returns", status_code=201)
def create_customer_return(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    rnum = f"CRET-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    # A customer handing back unused medicine goes back into stock.
    _restock_fefo(
        db, medicine_id="", medicine_name=payload.get("medicineName", ""),
        qty=int(payload.get("quantity", 0) or 0),
    )
    row = CustomerReturn(
        return_number=payload.get("returnNumber", rnum),
        invoice_number=payload.get("invoiceNumber", ""), patient_name=payload.get("patientName", ""),
        medicine_name=payload.get("medicineName", ""), quantity=payload.get("quantity", 0),
        reason=payload.get("reason", ""), refund_amount=payload.get("refundAmount", 0),
        status=payload.get("status", "Pending"), date=payload.get("date", datetime.now().strftime("%Y-%m-%d")),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.put("/customer-returns/{item_id}")
def update_customer_return(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_edit):
    row = db.get(CustomerReturn, item_id)
    if not row: raise HTTPException(404, "Return not found")
    for k, v in payload.items():
        if hasattr(row, k): setattr(row, k, v)
    db.commit(); db.refresh(row)
    return _row(row)


# ── Supplier Returns ──────────────────────────────────────────

@router.get("/supplier-returns")
def list_supplier_returns(db: Session = Depends(get_db), _=_auth):
    return [_row(r) for r in db.scalars(select(SupplierReturn).order_by(SupplierReturn.created_at.desc())).all()]


@router.post("/supplier-returns", status_code=201)
def create_supplier_return(payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_create):
    rnum = f"SRET-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    qty = int(payload.get("quantity", 0) or 0)
    # Stock going back to the supplier (expired/damaged/recalled) comes out
    # of that specific batch -- matched by batch number since that's what's
    # actually being returned, not just "some stock of this medicine."
    batch_number = payload.get("batchNumber", "")
    if batch_number and qty > 0:
        batch = db.scalar(select(PharmacyBatch).where(PharmacyBatch.batch_number == batch_number))
        if batch:
            if batch.available_quantity < qty:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Cannot return {qty} units of batch {batch_number}: only "
                        f"{batch.available_quantity} currently available in that batch."
                    ),
                )
            batch.available_quantity -= qty
            if batch.available_quantity == 0:
                batch.batch_status = "Out of Stock"
    row = SupplierReturn(
        return_number=payload.get("returnNumber", rnum),
        supplier_name=payload.get("supplierName", ""), medicine_name=payload.get("medicineName", ""),
        batch_number=payload.get("batchNumber", ""), quantity=payload.get("quantity", 0),
        reason=payload.get("reason", "Expired"), credit_note_no=payload.get("creditNoteNo", ""),
        amount=payload.get("amount", 0), status=payload.get("status", "Pending Credit"),
        date=payload.get("date", datetime.now().strftime("%Y-%m-%d")),
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)
