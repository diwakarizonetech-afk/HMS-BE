from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.staff import StaffLeave, Consultation, IPDRecord

router = APIRouter(tags=["Staff & Consultations"])
_auth = Depends(get_current_active_user)


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
def create_leave_request(payload: LeaveIn, db: Session = Depends(get_db), _=_auth):
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
def update_leave_request(item_id: str, payload: dict, db: Session = Depends(get_db), _=_auth):
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
    _=_auth,
):
    stmt = select(Consultation).order_by(Consultation.created_at.desc())
    if doctor_id:
        stmt = stmt.where(Consultation.doctor_id == doctor_id)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.put("/doctors/consultations/{appointment_id}")
def upsert_consultation(appointment_id: str, payload: dict, db: Session = Depends(get_db), _=_auth):
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
def list_ipd_records(
    doctor_id: str | None = None,
    db: Session = Depends(get_db),
    _=_auth,
):
    stmt = select(IPDRecord).order_by(IPDRecord.created_at.desc())
    if doctor_id:
        stmt = stmt.where(IPDRecord.doctor_id == doctor_id)
    return [_row(r) for r in db.scalars(stmt).all()]


@router.put("/doctors/ipd-records/{patient_id}")
def upsert_ipd_record(patient_id: str, payload: dict, db: Session = Depends(get_db), _=_auth):
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
