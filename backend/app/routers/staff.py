from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import hash_password
from app.deps import get_current_active_user, require_permission
from app.models.staff import StaffLeave, Consultation, IPDRecord
from app.models.user import User

router = APIRouter(tags=["Staff & Consultations"])
_auth = Depends(get_current_active_user)

# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
#
# Phase 12 update: "Staff Management" and "Clinical Documentation" are now
# dedicated entries in modulesList (frontend/src/pages/superadmin/auth/
# PermissionManagementPage.tsx and RoleManagementPage.tsx), added specifically
# to close the gap flagged in Phase 11 below. The backend's require_permission()/
# PermissionItem/RoleItem plumbing takes module_name as a free-text string
# (PermissionItem.module_name is a plain String(100) column, not an enum or FK
# — verified in app/models/superadmin.py), so no schema change was needed, only
# the two lines added to modulesList and the re-point below. Each endpoint
# group is now mapped to an exact module instead of an adjacent one:
#   - staff/leave-requests -> "Staff Management": leave requests are HR/staff
#     administration, not patient care or hospital setup — this is the exact
#     conceptual match "Super Admin & Setup" was only standing in for.
#   - doctors/consultations -> "Clinical Documentation": a consultation record
#     is clinical documentation for an OPD/outpatient visit.
#   - doctors/ipd-records -> "Clinical Documentation": an IPD record (daily
#     rounds/discharge notes) is the same kind of clinical documentation as a
#     consultation, just for an admitted patient rather than an outpatient
#     visit — grouping both under one module (rather than splitting IPD notes
#     off to "IPD Bed Allocation", which is about bed/ward assignment, not
#     clinical notes) keeps the module boundary about *what kind of action*
#     is being permissioned, not which router happens to implement it.
#
# (Historical note, no longer current: before this phase, staff/leave-requests
# was mapped to "Super Admin & Setup", consultations to "Patient Management",
# and ipd-records to "IPD Bed Allocation" as best-fit approximations — see
# CHANGELOG.md Phase 11 for the original reasoning and why those were flagged
# as not exact.)
_perm_leave_create = Depends(require_permission("Staff Management", "Create"))
_perm_leave_edit = Depends(require_permission("Staff Management", "Edit"))
_perm_consultation_edit = Depends(require_permission("Clinical Documentation", "Edit"))
_perm_ipd_record_edit = Depends(require_permission("Clinical Documentation", "Edit"))


def _row(r) -> dict:
    d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
    mapping = {
        "staff_id": "staffId", "staff_name": "staffName", "staff_email": "staffEmail",
        "leave_type": "leaveType", "from_date": "fromDate", "to_date": "toDate",
        "applied_on": "appliedOn", "approved_by": "approvedBy",
        "appointment_id": "appointmentId", "doctor_id": "doctorId",
        "patient_uhid": "patientUhid", "patient_name": "patientName",
        "patient_id": "patientId", "admission_id": "admissionId",
        "created_at": "createdAt", "updated_at": "updatedAt",
    }
    return {mapping.get(k, k): v for k, v in d.items()}


# ── Nurses List ───────────────────────────────────────────────

@router.get("/staff/nurses")
def list_nurses(
    branch: str | None = Query(None),
    department: str | None = Query(None),
    db: Session = Depends(get_db),
    _=_auth,
):
    stmt = select(User).where(func.lower(User.role) == "nurse", User.status == "Active")
    if branch and branch.lower() != "all":
        branch_stmt = stmt.where(
            or_(
                func.lower(User.branch) == branch.lower(),
                func.lower(User.branch) == "main branch",
                func.lower(User.branch).contains("main"),
                User.branch.is_(None),
                User.branch == "",
            )
        )
        nurses = list(db.scalars(branch_stmt.order_by(User.name.asc())).all())
    else:
        nurses = list(db.scalars(stmt.order_by(User.name.asc())).all())

    # Fallback & Merge: Ensure all active custom-created nurses across all branches are included
    all_active_nurses = list(db.scalars(select(User).where(func.lower(User.role) == "nurse", User.status == "Active").order_by(User.name.asc())).all())
    nurse_ids = {n.id for n in nurses}
    for an in all_active_nurses:
        if an.id not in nurse_ids:
            nurses.append(an)
            nurse_ids.add(an.id)

    # If no nurses exist for this branch, ensure standard active nurse accounts exist in DB
    if not nurses:
        all_nurses = list(db.scalars(select(User).where(func.lower(User.role) == "nurse")).all())
        if not all_nurses:
            default_nurses_data = [
                ("Nurse Anjali Rao", "anjali.rao@hospital.com", "ICU Ward"),
                ("Nurse Sunita Verma", "sunita.verma@hospital.com", "General Ward"),
                ("Nurse Priya Sharma", "priya.sharma@hospital.com", "Deluxe Ward"),
                ("Nurse Kavita Nair", "kavita.nair@hospital.com", "Surgical Ward"),
                ("Nurse Meena Kumari", "meena.kumari@hospital.com", "Emergency"),
                ("Nurse Sneha Patel", "sneha.patel@hospital.com", "Pediatric Ward"),
            ]
            for n_name, n_email, n_ward in default_nurses_data:
                nu = User(
                    name=n_name,
                    email=n_email,
                    hashed_password=hash_password("nurse123"),
                    role="nurse",
                    department="Nursing",
                    assigned_ward=n_ward,
                    branch=branch or "Main Branch",
                    status="Active",
                    is_active=True,
                )
                db.add(nu)
            db.commit()
            nurses = list(db.scalars(stmt.order_by(User.name.asc())).all())

    return [
        {
            "id": n.id,
            "name": n.name,
            "email": n.email,
            "department": n.department,
            "assignedWard": n.assigned_ward,
            "branch": n.branch,
            "phone": n.phone,
        }
        for n in nurses
    ]


# ── Staff Leave ───────────────────────────────────────────────

class LeaveIn(BaseModel):
    staffId: str
    staffName: str
    staffEmail: str
    role: str
    department: Optional[str] = None
    leaveType: str
    fromDate: str
    toDate: str
    days: int = 1
    reason: str
    status: str = "Pending"
    appliedOn: str = ""
    approvedBy: Optional[str] = None
    remarks: Optional[str] = None


@router.get("/staff/leave-requests")
def list_leave_requests(
    role: str | None = None,
    staff_id: str | None = None,
    db: Session = Depends(get_db),
    _=_auth,
):
    stmt = select(StaffLeave).order_by(StaffLeave.created_at.desc())
    if role:
        stmt = stmt.where(StaffLeave.role == role)
    if staff_id:
        stmt = stmt.where(StaffLeave.staff_id == staff_id)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.post("/staff/leave-requests", status_code=201)
def create_leave_request(payload: LeaveIn, db: Session = Depends(get_db), _=_auth, _perm=_perm_leave_create):
    row = StaffLeave(
        staff_id=payload.staffId, staff_name=payload.staffName, staff_email=payload.staffEmail,
        role=payload.role, department=payload.department, leave_type=payload.leaveType,
        from_date=payload.fromDate, to_date=payload.toDate, days=payload.days,
        reason=payload.reason, status=payload.status,
        applied_on=payload.appliedOn or datetime.now().strftime("%Y-%m-%d"),
        approved_by=payload.approvedBy, remarks=payload.remarks,
    )
    db.add(row); db.commit(); db.refresh(row)
    return _row(row)


@router.put("/staff/leave-requests/{item_id}")
def update_leave_request(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_leave_edit):
    row = db.get(StaffLeave, item_id)
    if not row:
        raise HTTPException(404, "Leave request not found")
    field_map = {
        "leaveType": "leave_type", "fromDate": "from_date", "toDate": "to_date",
        "appliedOn": "applied_on", "approvedBy": "approved_by",
        "staffName": "staff_name", "staffEmail": "staff_email",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(row, col):
            setattr(row, col, v)
    db.commit(); db.refresh(row)
    return _row(row)


# ── Consultations ─────────────────────────────────────────────

@router.get("/doctors/consultations")
def list_consultations(
    doctor_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Consultation).order_by(Consultation.created_at.desc())
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target_doc_id = doctor_id or (current_user.id if role_norm == "doctor" else None)
    if target_doc_id:
        conditions = [Consultation.doctor_id == target_doc_id]
        if current_user.id:
            conditions.append(Consultation.doctor_id == current_user.id)
        stmt = stmt.where(or_(*conditions))
    return [_row(r) for r in db.scalars(stmt).all()]


@router.put("/doctors/consultations/{appointment_id}")
def upsert_consultation(appointment_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_consultation_edit):
    row = db.scalar(select(Consultation).where(Consultation.appointment_id == appointment_id))
    if row:
        row.record = payload.get("record", row.record)
        row.status = payload.get("status", row.status)
        if "doctorId" in payload:
            row.doctor_id = payload["doctorId"]
    else:
        row = Consultation(
            appointment_id=appointment_id,
            doctor_id=payload.get("doctorId", ""),
            patient_uhid=payload.get("patientUhid", ""),
            patient_name=payload.get("patientName", ""),
            record=payload.get("record", {}),
            status=payload.get("status", "In Progress"),
        )
        db.add(row)
    db.commit(); db.refresh(row)
    return _row(row)


# ── IPD Records ───────────────────────────────────────────────

@router.get("/doctors/ipd-records")
@router.get("/staff/ipd-records")
def list_ipd_records(
    doctor_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(IPDRecord).order_by(IPDRecord.created_at.desc())
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target_doc_id = doctor_id or (current_user.id if role_norm == "doctor" else None)
    if target_doc_id:
        stmt = stmt.where(or_(IPDRecord.doctor_id == target_doc_id, IPDRecord.doctor_id == current_user.id))
    return [_row(r) for r in db.scalars(stmt).all()]


@router.put("/doctors/ipd-records/{patient_id}")
def upsert_ipd_record(patient_id: str, payload: dict, db: Session = Depends(get_db), _=_auth, _perm=_perm_ipd_record_edit):
    row = db.scalar(select(IPDRecord).where(IPDRecord.patient_id == patient_id))
    if row:
        row.record = payload.get("record", row.record)
        if "admissionId" in payload:
            row.admission_id = payload["admissionId"]
        if "doctorId" in payload:
            row.doctor_id = payload["doctorId"]
    else:
        row = IPDRecord(
            patient_id=patient_id,
            admission_id=payload.get("admissionId"),
            doctor_id=payload.get("doctorId", ""),
            record=payload.get("record", {}),
        )
        db.add(row)
    db.commit(); db.refresh(row)
    return _row(row)
