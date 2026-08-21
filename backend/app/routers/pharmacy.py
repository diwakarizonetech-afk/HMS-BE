from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import select, or_, and_, func
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import random, string

from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.user import User
from app.services.notification_service import notify_user_or_role
from app.models.pharmacy import (
    MedicineCategory, Medicine, PharmacyBatch, PharmacyPurchase,
    Prescription, POSInvoice, CustomerReturn, SupplierReturn,
)
from app.models.store_item import ItemMaster

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])
_auth = Depends(get_current_active_user)
# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
_perm_create = Depends(require_permission("Pharmacy & Drugs", "Create"))
_perm_edit = Depends(require_permission("Pharmacy & Drugs", "Edit"))
_perm_delete = Depends(require_permission("Pharmacy & Drugs", "Delete"))


def _normalize_branch(b: str | None) -> str:
    if not b:
        return ""
    return b.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()


def _branch_filter(stmt, model, current_user: User, branch: str | None = None, allow_global_catalog: bool = False):
    """Apply strict branch scoping: super_admin/admin see all (or specified branch query);
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
        if allow_global_catalog:
            clauses.extend([model.branch.is_(None), model.branch == ""])
        stmt = stmt.where(or_(*clauses))
    return stmt


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
        "er_encounter_id": "erEncounterId", "is_emergency": "isEmergency",
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
def list_categories(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(MedicineCategory)
    stmt = _branch_filter(stmt, MedicineCategory, current_user, branch, allow_global_catalog=True)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/categories", status_code=201)
def create_category(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    row = MedicineCategory(
        name=payload["name"], code=payload["code"],
        description=payload.get("description", ""),
        medicine_count=payload.get("medicineCount", 0),
        branch=payload.get("branch") or current_user.branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


# ── Medicines ─────────────────────────────────────────────────

@router.get("/medicines")
def list_medicines(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)

    stmt = select(Medicine).order_by(Medicine.name)
    stmt = _branch_filter(stmt, Medicine, current_user, branch, allow_global_catalog=True)
    medicines = db.scalars(stmt).all()

    # Pre-fetch batches to compute branch-isolated stock
    batch_stmt = select(PharmacyBatch)
    if target_branch and target_branch.lower() != "all":
        norm_sub = _normalize_branch(target_branch)
        b_clauses = [func.lower(PharmacyBatch.branch) == target_branch.lower()]
        if norm_sub:
            b_clauses.append(func.lower(PharmacyBatch.branch).contains(norm_sub))
        batch_stmt = batch_stmt.where(or_(*b_clauses))

    batches = db.scalars(batch_stmt).all()

    # Sum available_quantity by medicine code / name / ID
    stock_by_med_code: Dict[str, int] = {}
    stock_by_med_name: Dict[str, int] = {}
    stock_by_med_id: Dict[str, int] = {}

    for b in batches:
        qty = max(0, b.available_quantity or 0)
        if b.medicine_id:
            stock_by_med_id[b.medicine_id] = stock_by_med_id.get(b.medicine_id, 0) + qty
            stock_by_med_code[b.medicine_id.lower().strip()] = stock_by_med_code.get(b.medicine_id.lower().strip(), 0) + qty
        if b.medicine_name:
            stock_by_med_name[b.medicine_name.lower().strip()] = stock_by_med_name.get(b.medicine_name.lower().strip(), 0) + qty

    results = []
    for med in medicines:
        row_dict = _row(med)
        c_code = (med.code or "").lower().strip()
        c_name = (med.name or "").lower().strip()
        c_id = str(med.id)

        branch_stock = 0
        if c_id in stock_by_med_id:
            branch_stock = stock_by_med_id[c_id]
        elif c_code in stock_by_med_code:
            branch_stock = stock_by_med_code[c_code]
        elif c_name in stock_by_med_name:
            branch_stock = stock_by_med_name[c_name]
        else:
            for b_name, b_qty in stock_by_med_name.items():
                if b_name == c_name or (len(c_name) > 3 and c_name in b_name) or (len(b_name) > 3 and b_name in c_name):
                    branch_stock += b_qty
                    break

        row_dict["currentStock"] = branch_stock
        results.append(row_dict)

    return results


@router.post("/medicines", status_code=201)
def create_medicine(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
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
        branch=payload.get("branch") or current_user.branch,
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
def list_batches(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(PharmacyBatch).order_by(PharmacyBatch.expiry_date)
    stmt = _branch_filter(stmt, PharmacyBatch, current_user, branch)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/batches", status_code=201)
def create_batch(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    row = PharmacyBatch(
        batch_number=payload["batchNumber"], medicine_id=payload.get("medicineId", ""),
        medicine_name=payload.get("medicineName", ""), supplier_name=payload.get("supplierName", ""),
        manufacturing_date=payload.get("manufacturingDate", ""), expiry_date=payload.get("expiryDate", ""),
        purchase_price=payload.get("purchasePrice", 0), selling_price=payload.get("sellingPrice", 0),
        quantity_received=payload.get("quantityReceived", 0), available_quantity=payload.get("availableQuantity", 0),
        batch_status=payload.get("batchStatus", "Available"),
        branch=payload.get("branch") or current_user.branch,
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
def list_purchases(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(PharmacyPurchase).order_by(PharmacyPurchase.created_at.desc())
    stmt = _branch_filter(stmt, PharmacyPurchase, current_user, branch)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/purchases", status_code=201)
def create_purchase(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    pnum = f"PO-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    row = PharmacyPurchase(
        purchase_number=payload.get("purchaseNumber", pnum),
        supplier_name=payload.get("supplierName", ""), supplier_gst=payload.get("supplierGst", ""),
        invoice_number=payload.get("invoiceNumber", ""), purchase_date=payload.get("purchaseDate", ""),
        payment_method=payload.get("paymentMethod", "Cash"),
        total_amount=payload.get("totalAmount", 0), status=payload.get("status", "Completed"),
        items=payload.get("items", []),
        branch=payload.get("branch") or current_user.branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


# ── Prescriptions ─────────────────────────────────────────────

@router.get("/prescriptions")
def list_prescriptions(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Prescription).order_by(Prescription.created_at.desc())
    stmt = _branch_filter(stmt, Prescription, current_user, branch)
    rows = list(db.scalars(stmt).all())
    return [_row(r) for r in rows]


@router.post("/prescriptions", status_code=201)
def create_prescription(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    pnum = payload.get("prescriptionNumber")
    uhid = payload.get("patientUhid")
    pname = payload.get("patientName")

    existing = None
    if pnum:
        existing = db.scalar(select(Prescription).where(func.lower(Prescription.prescription_number) == pnum.strip().lower()))
    if not existing and uhid:
        existing = db.scalar(select(Prescription).where(and_(func.lower(Prescription.patient_uhid) == uhid.strip().lower(), Prescription.status.in_(["Pending", "Verified"]))))
    if not existing and pname:
        existing = db.scalar(select(Prescription).where(and_(func.lower(Prescription.patient_name) == pname.strip().lower(), Prescription.status.in_(["Pending", "Verified"]))))

    resolved_branch = payload.get("branch") or current_user.branch
    if not resolved_branch and payload.get("doctorName"):
        from app.models.doctor import Doctor
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name) == payload.get("doctorName", "").lower().strip()))
        if doc and doc.branch:
            resolved_branch = doc.branch
    if not resolved_branch and payload.get("patientUhid"):
        from app.models.patient import Patient
        pat = db.scalar(select(Patient).where(Patient.uhid == payload.get("patientUhid", "").strip()))
        if pat and pat.branch:
            resolved_branch = pat.branch
    if not resolved_branch:
        resolved_branch = "Main Branch"

    if existing:
        existing.items = payload.get("items", existing.items)
        flag_modified(existing, "items")
        if "totalAmount" in payload:
            existing.total_amount = payload["totalAmount"]
        if "dueAmount" in payload:
            existing.due_amount = payload["dueAmount"]
        if "doctorName" in payload and payload["doctorName"]:
            existing.doctor_name = payload["doctorName"]
        if "department" in payload and payload["department"]:
            existing.department = payload["department"]
        if payload.get("erEncounterId"):
            existing.er_encounter_id = payload["erEncounterId"]
        if "isEmergency" in payload:
            existing.is_emergency = bool(payload["isEmergency"])
        if payload.get("branch"):
            existing.branch = payload["branch"]

        db.commit()
        db.refresh(existing)
        return _row(existing)

    rxnum = pnum or f"RX-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    row = Prescription(
        prescription_number=rxnum,
        patient_uhid=payload.get("patientUhid", ""), patient_name=payload.get("patientName", ""),
        patient_age=payload.get("patientAge", 0), patient_gender=payload.get("patientGender", ""),
        doctor_name=payload.get("doctorName", ""), department=payload.get("department", ""),
        visit_date=payload.get("visitDate", ""), status=payload.get("status", "Pending"),
        payment_status=payload.get("paymentStatus"), total_amount=payload.get("totalAmount", 0),
        amount_paid=payload.get("amountPaid", 0), due_amount=payload.get("dueAmount", 0),
        payment_method=payload.get("paymentMethod"), items=payload.get("items", []),
        er_encounter_id=payload.get("erEncounterId"),
        is_emergency=bool(payload.get("isEmergency")),
        branch=resolved_branch,
    )
    db.add(row); db.commit(); db.refresh(row)

    notify_user_or_role(
        db,
        title="New Prescription",
        message=f"New prescription {row.prescription_number} for {row.patient_name} from Dr. {row.doctor_name} ({row.branch}) needs dispensing.",
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

    items_dispensed_now = False
    rx_branch = payload.get("branch") or row.branch
    if "items" in payload and isinstance(payload["items"], list):
        old_items_by_id = {i.get("id"): i for i in (row.items or [])}
        for new_item in payload["items"]:
            old_item = old_items_by_id.get(new_item.get("id"))
            was_dispensed = bool(old_item.get("dispensed")) if old_item else False
            now_dispensed = bool(new_item.get("dispensed"))
            if now_dispensed and not was_dispensed:
                items_dispensed_now = True
                _deduct_stock_fefo(
                    db,
                    medicine_id=new_item.get("medicineId", ""),
                    medicine_name=new_item.get("medicineName", ""),
                    qty_needed=int(new_item.get("quantity", 0) or 0),
                    branch=rx_branch,
                )

    field_map = {
        "patientUhid": "patient_uhid", "patientName": "patient_name", "patientAge": "patient_age",
        "patientGender": "patient_gender", "doctorName": "doctor_name", "visitDate": "visit_date",
        "paymentStatus": "payment_status", "totalAmount": "total_amount",
        "amountPaid": "amount_paid", "dueAmount": "due_amount", "paymentMethod": "payment_method",
        "branch": "branch",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col): setattr(row, col, v)

    # Record sale in POSInvoice table so that prescription dispensing transactions
    # are stored and automatically show up in Report Analysis (Gross Sales, Medicine Sales, etc.)
    new_status = payload.get("status", row.status)
    if items_dispensed_now or new_status in ("Dispensed", "Partially Dispensed"):
        inv_number = f"POS-RX-{row.prescription_number}"
        existing_inv = db.scalar(select(POSInvoice).where(POSInvoice.invoice_number == inv_number))
        tot_amt = float(payload.get("amountPaid") or payload.get("totalAmount") or row.total_amount or 0.0)
        if not existing_inv and tot_amt > 0:
            inv = POSInvoice(
                invoice_number=inv_number,
                customer_name=row.patient_name or "Prescription Patient",
                customer_phone=row.patient_uhid or "N/A",
                date=datetime.now().strftime("%Y-%m-%d"),
                payment_method=payload.get("paymentMethod") or row.payment_method or "Cash",
                subtotal=tot_amt,
                total_amount=tot_amt,
                items=row.items or [],
                branch=row.branch,
            )
            db.add(inv)
        elif existing_inv:
            existing_inv.total_amount = tot_amt
            existing_inv.subtotal = tot_amt
            existing_inv.items = row.items or []
            existing_inv.branch = row.branch

    db.commit(); db.refresh(row)
    return _row(row)


# ── POS Invoices ──────────────────────────────────────────────

def _deduct_stock_fefo(db: Session, medicine_id: str, medicine_name: str, qty_needed: int, branch: str | None = None) -> None:
    """Deduct qty_needed units of a medicine strictly from batches in target branch,
    earliest expiry first (First-Expiry-First-Out). Branch-isolated."""
    if qty_needed <= 0:
        return

    med = None
    if medicine_id:
        try:
            med = db.get(Medicine, medicine_id)
        except Exception:
            med = None

    if not med and medicine_name:
        clean_name = medicine_name.strip()
        med = db.scalar(
            select(Medicine).where(
                or_(
                    func.lower(Medicine.name) == clean_name.lower(),
                    func.lower(Medicine.code) == clean_name.lower(),
                )
            )
        )
        if not med and len(clean_name) >= 3:
            first_word = clean_name.split()[0]
            med = db.scalar(
                select(Medicine).where(
                    or_(
                        Medicine.name.ilike(f"%{clean_name}%"),
                        Medicine.name.ilike(f"%{first_word}%"),
                    )
                )
            )

    item_master = None
    if med:
        im_query = select(ItemMaster).where(func.lower(ItemMaster.item_code) == med.code.lower())
        if branch and branch.lower() != "all":
            norm_sub = _normalize_branch(branch)
            im_query = im_query.where(or_(func.lower(ItemMaster.branch) == branch.lower(), func.lower(ItemMaster.branch).contains(norm_sub)))
        item_master = db.scalar(im_query)
    elif medicine_name:
        clean_name = medicine_name.strip()
        im_query = select(ItemMaster).where(
            or_(
                func.lower(ItemMaster.item_name) == clean_name.lower(),
                func.lower(ItemMaster.item_code) == clean_name.lower(),
            )
        )
        if branch and branch.lower() != "all":
            norm_sub = _normalize_branch(branch)
            im_query = im_query.where(or_(func.lower(ItemMaster.branch) == branch.lower(), func.lower(ItemMaster.branch).contains(norm_sub)))
        item_master = db.scalar(im_query)

    query = select(PharmacyBatch).where(PharmacyBatch.available_quantity > 0)
    if branch and branch.lower() != "all":
        norm_sub = _normalize_branch(branch)
        b_clauses = [func.lower(PharmacyBatch.branch) == branch.lower()]
        if norm_sub:
            b_clauses.append(func.lower(PharmacyBatch.branch).contains(norm_sub))
        query = query.where(or_(*b_clauses))

    if medicine_id and med:
        query = query.where(or_(PharmacyBatch.medicine_id == medicine_id, PharmacyBatch.medicine_id == med.id, PharmacyBatch.medicine_id == med.code))
    elif med:
        query = query.where(or_(PharmacyBatch.medicine_id == med.id, PharmacyBatch.medicine_id == med.code, func.lower(PharmacyBatch.medicine_name) == med.name.lower()))
    elif medicine_name:
        clean_name = medicine_name.strip().lower()
        query = query.where(or_(func.lower(PharmacyBatch.medicine_name) == clean_name, func.lower(PharmacyBatch.medicine_id) == clean_name))

    batches = db.scalars(query.order_by(PharmacyBatch.expiry_date)).all()

    remaining = qty_needed
    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.available_quantity, remaining)
        batch.available_quantity -= take
        if batch.available_quantity <= 0:
            batch.batch_status = "Out of Stock"
        remaining -= take

    if med:
        med.current_stock = max(0, (med.current_stock or 0) - qty_needed)
    if item_master:
        item_master.current_stock = max(0, (item_master.current_stock or 0) - qty_needed)


def _restock_fefo(db: Session, medicine_id: str, medicine_name: str, qty: int, branch: str | None = None) -> None:
    """Reverse a sale/dispense: add stock back strictly to batch in that branch."""
    if qty <= 0:
        return
    query = select(PharmacyBatch)
    if branch and branch.lower() != "all":
        norm_sub = _normalize_branch(branch)
        query = query.where(or_(func.lower(PharmacyBatch.branch) == branch.lower(), func.lower(PharmacyBatch.branch).contains(norm_sub)))

    match_clauses = []
    if medicine_id:
        match_clauses.append(PharmacyBatch.medicine_id == medicine_id)
    if medicine_name:
        match_clauses.append(func.lower(PharmacyBatch.medicine_name) == medicine_name.lower())
    if match_clauses:
        query = query.where(or_(*match_clauses))

    batch = db.scalar(query.order_by(PharmacyBatch.expiry_date.desc()))
    if batch:
        batch.available_quantity = (batch.available_quantity or 0) + qty
        if batch.batch_status == "Out of Stock":
            batch.batch_status = "Available"

    med = None
    if medicine_id:
        try:
            med = db.get(Medicine, medicine_id)
        except Exception:
            med = None
    if not med and medicine_name:
        med = db.scalar(
            select(Medicine).where(
                or_(
                    func.lower(Medicine.name) == medicine_name.lower(),
                    func.lower(Medicine.code) == medicine_name.lower(),
                )
            )
        )
    if med:
        med.current_stock = (med.current_stock or 0) + qty

    item_master = None
    if med:
        im_query = select(ItemMaster).where(func.lower(ItemMaster.item_code) == med.code.lower())
        if branch and branch.lower() != "all":
            norm_sub = _normalize_branch(branch)
            im_query = im_query.where(or_(func.lower(ItemMaster.branch) == branch.lower(), func.lower(ItemMaster.branch).contains(norm_sub)))
        item_master = db.scalar(im_query)
    elif medicine_name:
        im_query = select(ItemMaster).where(
            or_(
                func.lower(ItemMaster.item_name) == medicine_name.lower(),
                func.lower(ItemMaster.item_code) == medicine_name.lower(),
            )
        )
        if branch and branch.lower() != "all":
            norm_sub = _normalize_branch(branch)
            im_query = im_query.where(or_(func.lower(ItemMaster.branch) == branch.lower(), func.lower(ItemMaster.branch).contains(norm_sub)))
        item_master = db.scalar(im_query)
    if item_master:
        item_master.current_stock = (item_master.current_stock or 0) + qty


@router.get("/invoices")
def list_invoices(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(POSInvoice).order_by(POSInvoice.created_at.desc())
    stmt = _branch_filter(stmt, POSInvoice, current_user, branch)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/invoices", status_code=201)
def create_invoice(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    inum = f"POS-{datetime.now().year}-{''.join(random.choices(string.digits, k=5))}"
    items = payload.get("items", [])
    inv_branch = payload.get("branch") or current_user.branch

    # Deduct stock for every line item strictly from the same branch
    for item in items:
        _deduct_stock_fefo(
            db,
            medicine_id=item.get("medicineId", ""),
            medicine_name=item.get("medicineName", ""),
            qty_needed=int(item.get("quantity", 0) or 0),
            branch=inv_branch,
        )

    row = POSInvoice(
        invoice_number=payload.get("invoiceNumber", inum),
        customer_name=payload.get("customerName", ""), customer_phone=payload.get("customerPhone", ""),
        date=payload.get("date", datetime.now().strftime("%Y-%m-%d %I:%M %p")),
        payment_method=payload.get("paymentMethod", "Cash"),
        subtotal=payload.get("subtotal", 0), discount=payload.get("discount", 0),
        gst_amount=payload.get("gstAmount", 0), total_amount=payload.get("totalAmount", 0),
        items=items,
        branch=inv_branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.delete("/invoices/{item_id}", status_code=204)
def delete_invoice(item_id: str, db: Session = Depends(get_db), _=_auth, _perm=_perm_delete):
    row = db.get(POSInvoice, item_id)
    if not row: raise HTTPException(404, "Invoice not found")
    # Deleting a recorded sale must give the stock back to the same branch
    for item in (row.items or []):
        _restock_fefo(
            db,
            medicine_id=item.get("medicineId", ""),
            medicine_name=item.get("medicineName", ""),
            qty=int(item.get("quantity", 0) or 0),
            branch=row.branch,
        )
    db.delete(row); db.commit()


# ── Customer Returns ──────────────────────────────────────────

@router.get("/customer-returns")
def list_customer_returns(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(CustomerReturn).order_by(CustomerReturn.created_at.desc())
    stmt = _branch_filter(stmt, CustomerReturn, current_user, branch)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/customer-returns", status_code=201)
def create_customer_return(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    rnum = f"CRET-{datetime.now().year}-{''.join(random.choices(string.digits, k=3))}"
    ret_branch = payload.get("branch") or current_user.branch
    # A customer handing back unused medicine goes back into stock in that branch
    _restock_fefo(
        db, medicine_id="", medicine_name=payload.get("medicineName", ""),
        qty=int(payload.get("quantity", 0) or 0),
        branch=ret_branch,
    )
    row = CustomerReturn(
        return_number=payload.get("returnNumber", rnum),
        invoice_number=payload.get("invoiceNumber", ""), patient_name=payload.get("patientName", ""),
        medicine_name=payload.get("medicineName", ""), quantity=payload.get("quantity", 0),
        reason=payload.get("reason", ""), refund_amount=payload.get("refundAmount", 0),
        status=payload.get("status", "Pending"), date=payload.get("date", datetime.now().strftime("%Y-%m-%d")),
        branch=ret_branch,
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
def list_supplier_returns(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(SupplierReturn).order_by(SupplierReturn.created_at.desc())
    stmt = _branch_filter(stmt, SupplierReturn, current_user, branch)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/supplier-returns", status_code=201)
def create_supplier_return(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
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
        branch=payload.get("branch") or current_user.branch,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.get("/reports")
def get_pharmacy_reports(
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    def parse_date(date_val, created_at=None):
        if isinstance(date_val, datetime):
            return date_val
        if date_val and isinstance(date_val, str):
            clean_str = date_val.split(".")[0].replace("Z", "").strip()
            for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(clean_str, fmt)
                except ValueError:
                    pass
            try:
                return datetime.fromisoformat(clean_str)
            except Exception:
                pass
        if isinstance(created_at, datetime):
            return created_at
        return datetime.now()

    inv_stmt = select(POSInvoice).order_by(POSInvoice.created_at.desc())
    inv_stmt = _branch_filter(inv_stmt, POSInvoice, current_user, branch)
    invoices = db.scalars(inv_stmt).all()

    pur_stmt = select(PharmacyPurchase).order_by(PharmacyPurchase.created_at.desc())
    pur_stmt = _branch_filter(pur_stmt, PharmacyPurchase, current_user, branch)
    purchases = db.scalars(pur_stmt).all()

    med_stmt = select(Medicine)
    med_stmt = _branch_filter(med_stmt, Medicine, current_user, branch, allow_global_catalog=True)
    medicines = db.scalars(med_stmt).all()

    bat_stmt = select(PharmacyBatch)
    bat_stmt = _branch_filter(bat_stmt, PharmacyBatch, current_user, branch)
    batches = db.scalars(bat_stmt).all()

    cr_stmt = select(CustomerReturn)
    cr_stmt = _branch_filter(cr_stmt, CustomerReturn, current_user, branch)
    customer_returns = db.scalars(cr_stmt).all()

    sr_stmt = select(SupplierReturn)
    sr_stmt = _branch_filter(sr_stmt, SupplierReturn, current_user, branch)
    supplier_returns = db.scalars(sr_stmt).all()

    current_year = datetime.now().year
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = []

    for m_idx in range(12):
        month_name = month_names[m_idx]

        m_invoices = [
            inv for inv in invoices
            if parse_date(inv.date, inv.created_at).year == current_year and parse_date(inv.date, inv.created_at).month == m_idx + 1
        ]
        m_purchases = [
            pur for pur in purchases
            if parse_date(pur.purchase_date, pur.created_at).year == current_year and parse_date(pur.purchase_date, pur.created_at).month == m_idx + 1
        ]

        m_sales = sum(float(inv.total_amount or 0) for inv in m_invoices)
        m_purchase_cost = sum(float(pur.total_amount or 0) for pur in m_purchases)
        m_profit = max(0.0, m_sales - m_purchase_cost)

        monthly_data.append({
            "month": month_name,
            "monthIndex": m_idx,
            "sales": round(m_sales, 2),
            "purchase": round(m_purchase_cost, 2),
            "profit": round(m_profit, 2),
            "invoiceCount": len(m_invoices),
            "purchaseCount": len(m_purchases),
        })

    med_sales_map: dict[str, dict[str, Any]] = {}
    for inv in invoices:
        items = inv.items if isinstance(inv.items, list) else []
        for item in items:
            name = item.get("medicineName") or item.get("itemName") or "Medicine"
            qty = int(item.get("quantity") or 1)
            unit_p = float(item.get("unitPrice") or item.get("price") or 0)
            rev = float(item.get("total") or (qty * unit_p))
            if name not in med_sales_map:
                med_sales_map[name] = {"name": name, "category": "General", "soldQty": 0, "revenue": 0.0}
            med_sales_map[name]["soldQty"] += qty
            med_sales_map[name]["revenue"] += rev

    med_cat_lookup = {m.name.lower(): m.category for m in medicines if m.name}
    for name, data in med_sales_map.items():
        if name.lower() in med_cat_lookup:
            data["category"] = med_cat_lookup[name.lower()]

    supplier_map: dict[str, dict[str, Any]] = {}
    for pur in purchases:
        sup_name = pur.supplier_name or "Vendor"
        amt = float(pur.total_amount or 0)
        if sup_name not in supplier_map:
            supplier_map[sup_name] = {"supplier": sup_name, "totalOrders": 0, "totalPurchases": 0.0, "status": "Active"}
        supplier_map[sup_name]["totalOrders"] += 1
        supplier_map[sup_name]["totalPurchases"] += amt

    stock_purchase_value = sum(float(m.current_stock or 0) * float(m.purchase_price or 0) for m in medicines)
    stock_selling_value = sum(float(m.current_stock or 0) * float(m.selling_price or 0) for m in medicines)
    stock_total_items = sum(int(m.current_stock or 0) for m in medicines)

    now_dt = datetime.now()
    expired_batches = 0
    expiring_30_days = 0
    expiring_value = 0.0

    for b in batches:
        b_qty = int(b.available_quantity or 0)
        b_price = float(b.selling_price or b.purchase_price or 0)
        if b.expiry_date:
            b_exp = parse_date(b.expiry_date, b.created_at)
            days_remaining = (b_exp - now_dt).days
            if days_remaining <= 0:
                expired_batches += 1
            elif days_remaining <= 30:
                expiring_30_days += 1
                expiring_value += (b_qty * b_price)

    total_gross_sales = sum(float(m["sales"]) for m in monthly_data)
    total_purchase_cost = sum(float(m["purchase"]) for m in monthly_data)
    total_profit = sum(float(m["profit"]) for m in monthly_data)

    return {
        "monthlyTrend": monthly_data,
        "medicineSalesReport": list(med_sales_map.values()),
        "supplierWiseReport": list(supplier_map.values()),
        "stockValuation": {
            "purchaseValue": round(stock_purchase_value, 2),
            "sellingValue": round(stock_selling_value, 2),
            "totalItems": stock_total_items,
            "totalMedicinesCount": len(medicines),
            "potentialProfit": round(stock_selling_value - stock_purchase_value, 2),
        },
        "expirySummary": {
            "expiredBatches": expired_batches,
            "expiringWithin30Days": expiring_30_days,
            "expiringValue": round(expiring_value, 2),
            "totalBatches": len(batches),
        },
        "returnsSummary": {
            "customerReturnsCount": len(customer_returns),
            "customerRefundTotal": sum(float(cr.refund_amount or 0) for cr in customer_returns),
            "supplierReturnsCount": len(supplier_returns),
            "supplierReturnTotal": sum(float(sr.amount or 0) for sr in supplier_returns),
        },
        "totals": {
            "grossSales": round(total_gross_sales, 2),
            "purchaseCost": round(total_purchase_cost, 2),
            "netProfit": round(total_profit, 2),
            "totalInvoices": len(invoices),
            "totalPurchases": len(purchases),
        }
    }
