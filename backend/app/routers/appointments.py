from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission, get_own_doctor_id
from app.models.appointment import Appointment, QueueItem
from app.models.user import User, UserRole
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.services.notification_service import notify_user_or_role

router = APIRouter(prefix="/appointments", tags=["Appointments"])
_perm_create = Depends(require_permission("Appointment Mgmt", "Create"))
_perm_edit = Depends(require_permission("Appointment Mgmt", "Edit"))
_perm_delete = Depends(require_permission("Appointment Mgmt", "Delete"))


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    patient_uhid: str | None = Query(None),
    doctor_id: str | None = Query(None),
    date: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_doctor_id: str | None = Depends(get_own_doctor_id),
):
    stmt = select(Appointment)
    if patient_uhid:
        stmt = stmt.where(Appointment.patient_uhid == patient_uhid)
    # Department-based data scoping: a user logged in with the doctor role only
    # ever sees their own appointments, regardless of what doctor_id filter (if
    # any) is passed in — this is an access-control boundary, not just a
    # convenience default, so it overrides rather than merely defaults the
    # requested filter. Every other role (reception, admin, etc.) is unaffected.
    if current_user.role == UserRole.doctor:
        stmt = stmt.where(Appointment.doctor_id == own_doctor_id) if own_doctor_id else stmt.where(Appointment.doctor_id == "__none__")
    elif doctor_id:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    if date:
        stmt = stmt.where(Appointment.date == date)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
    stmt = stmt.order_by(Appointment.created_at.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["created_date"] = data.get("created_date") or today_str()
    appointment = Appointment(**data)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    log_audit("POST /appointments", payload, data, appointment, appointment)
    notify_user_or_role(
        db, title="New Appointment Booked",
        message=f"Appointment booked for {appointment.patient_name} with {appointment.doctor_name} ({appointment.date} at {appointment.time_slot}).",
        module="appointment", event_type="appointment_booked", recipient_role="reception", related_record_id=appointment.id
    )
    notify_user_or_role(
        db, title="New Patient Appointment Scheduled",
        message=f"Appointment scheduled for patient {appointment.patient_name} on {appointment.date} at {appointment.time_slot}.",
        module="appointment", event_type="appointment_booked", recipient_role="doctor", related_record_id=appointment.id
    )
    # Automatically place the booked appointment into the live OPD queue
    token_str = f"T-{str(appointment.id)[:4].upper()}"
    q_item = QueueItem(
        token_number=token_str,
        patient_uhid=appointment.patient_uhid,
        patient_name=appointment.patient_name,
        doctor_name=appointment.doctor_name,
        department=appointment.department or "General Medicine",
        status="Waiting",
        waiting_time_minutes=15,
        time_issued=appointment.time_slot or datetime.now().strftime("%H:%M"),
    )
    db.add(q_item)
    db.commit()

    return appointment


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, Appointment, appointment_id, "Appointment")


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_edit,
):
    appointment = get_or_404(db, Appointment, appointment_id, "Appointment")
    apply_updates(appointment, payload)
    db.commit()
    db.refresh(appointment)
    log_audit(f"PUT /appointments/{appointment_id}", payload, payload.model_dump(exclude_unset=True), appointment, appointment)
    return appointment


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule_appointment(
    appointment_id: str,
    date: str,
    time_slot: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_create,
):
    appointment = get_or_404(db, Appointment, appointment_id, "Appointment")
    appointment.date = date
    appointment.time_slot = time_slot
    appointment.status = "Rescheduled"
    db.commit()
    db.refresh(appointment)
    log_audit(f"POST /appointments/{appointment_id}/reschedule", {"date": date, "time_slot": time_slot}, {"date": date, "time_slot": time_slot}, appointment, appointment)
    notify_user_or_role(
        db, title="Appointment Rescheduled",
        message=f"Appointment for {appointment.patient_name} rescheduled to {date} at {time_slot}.",
        module="appointment", event_type="appointment_rescheduled", recipient_role="doctor", related_record_id=appointment.id
    )
    notify_user_or_role(
        db, title="Appointment Rescheduled",
        message=f"Appointment for {appointment.patient_name} rescheduled to {date} at {time_slot}.",
        module="appointment", event_type="appointment_rescheduled", recipient_role="reception", related_record_id=appointment.id
    )
    return appointment


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(appointment_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    appointment = get_or_404(db, Appointment, appointment_id, "Appointment")
    appointment.status = "Cancelled"
    db.commit()
    db.refresh(appointment)
    log_audit(f"POST /appointments/{appointment_id}/cancel", {}, {}, appointment, appointment)
    notify_user_or_role(
        db, title="Appointment Cancelled",
        message=f"Appointment for {appointment.patient_name} on {appointment.date} was cancelled.",
        module="appointment", event_type="appointment_cancelled", recipient_role="doctor", related_record_id=appointment.id
    )
    notify_user_or_role(
        db, title="Appointment Cancelled",
        message=f"Appointment for {appointment.patient_name} on {appointment.date} was cancelled.",
        module="appointment", event_type="appointment_cancelled", recipient_role="reception", related_record_id=appointment.id
    )
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    appointment = get_or_404(db, Appointment, appointment_id, "Appointment")
    db.delete(appointment)
    db.commit()
