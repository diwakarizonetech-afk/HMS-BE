from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, get_optional_current_user, require_permission, get_own_doctor_id
from app.models.appointment import Appointment, AppointmentStatus, QueueItem
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
    branch: str | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_doctor_id: str | None = Depends(get_own_doctor_id),
):
    stmt = select(Appointment)
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")

    if patient_uhid:
        stmt = stmt.where(Appointment.patient_uhid == patient_uhid)
    
    if role_norm == "doctor":
        doc_name_clean = current_user.name.lower().replace("dr.", "").strip() if current_user.name else ""
        conditions = []
        if own_doctor_id:
            conditions.append(Appointment.doctor_id == own_doctor_id)
        if current_user.id:
            conditions.append(Appointment.doctor_id == current_user.id)
        if doc_name_clean:
            conditions.append(func.lower(Appointment.doctor_name).contains(doc_name_clean))
        if conditions:
            stmt = stmt.where(or_(*conditions))
        else:
            stmt = stmt.where(Appointment.doctor_id == "__none__")
    elif doctor_id:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    if date:
        stmt = stmt.where(Appointment.date == date)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)

    # Branch scoping: filter by explicit branch query or current user's branch (unless super_admin/admin without filter)
    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != 'all':
        stmt = stmt.where(
            or_(
                func.lower(Appointment.branch) == target_branch.lower(),
                func.lower(Appointment.branch) == 'main branch',
                Appointment.branch.is_(None),
                Appointment.branch == ''
            )
        )

    stmt = stmt.order_by(Appointment.created_at.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_current_user)):
    from app.models.doctor import Doctor
    from app.models.patient import Patient
    from sqlalchemy import func

    data = payload.model_dump()
    data["created_date"] = data.get("created_date") or today_str()
    if not data.get("branch"):
        data["branch"] = (current_user.branch if current_user else None) or "Main Branch"

    from app.models.patient import Patient, PatientStatus, Gender, BloodGroup, MaritalStatus

    # Fetch/verify or auto-create Patient details in DB with unique ID
    pat = None
    if data.get("patient_uhid"):
        pat = db.scalar(select(Patient).where(Patient.uhid == data["patient_uhid"]))
    if not pat and data.get("patient_mobile"):
        pat = db.scalar(select(Patient).where(Patient.mobile == data["patient_mobile"]))

    if pat:
        data["patient_name"] = f"{pat.first_name} {pat.last_name}".strip()
        data["patient_mobile"] = pat.mobile
        data["patient_id"] = pat.id
        data["patient_uhid"] = pat.uhid
    else:
        # Create a new Patient record in database with unique ID and UHID
        year = datetime.now().year
        p_count = db.query(Patient).count() + 1
        new_uhid = data.get("patient_uhid") or f"UHID-{year}-{1000 + p_count}"
        while db.scalar(select(Patient).where(Patient.uhid == new_uhid)):
            p_count += 1
            new_uhid = f"UHID-{year}-{1000 + p_count}"

        p_name = (data.get("patient_name") or "New Patient").strip()
        name_parts = p_name.split(" ", 1)
        first_n = name_parts[0]
        last_n = name_parts[1] if len(name_parts) > 1 else ""

        raw_gender = str(data.get("gender") or "Male")
        g_val = Gender.Male
        if "female" in raw_gender.lower():
            g_val = Gender.Female
        elif "other" in raw_gender.lower():
            g_val = Gender.Other

        raw_blood = str(data.get("blood_group") or "O+")
        b_map = {
            "a+": BloodGroup.A_pos, "a-": BloodGroup.A_neg,
            "b+": BloodGroup.B_pos, "b-": BloodGroup.B_neg,
            "ab+": BloodGroup.AB_pos, "ab-": BloodGroup.AB_neg,
            "o+": BloodGroup.O_pos, "o-": BloodGroup.O_neg,
        }
        b_val = b_map.get(raw_blood.lower(), BloodGroup.O_pos)

        new_pat = Patient(
            uhid=new_uhid,
            first_name=first_n,
            last_name=last_n,
            gender=g_val,
            dob=data.get("dob") or "2000-01-01",
            age=int(data.get("age") or 25),
            blood_group=b_val,
            marital_status=MaritalStatus.Single,
            nationality="Indian",
            mobile=data.get("patient_mobile") or "0000000000",
            email=data.get("email") or "",
            address=data.get("address") or "OPD Booking",
            city=data.get("city") or "Local",
            state=data.get("state") or "Local",
            country="India",
            pincode=data.get("pincode") or "600001",
            aadhaar="",
            emergency_contact_name="",
            emergency_relationship="",
            emergency_phone="",
            status=PatientStatus.Active,
            registration_date=today_str(),
            branch=data.get("branch") or "Main Branch",
        )
        db.add(new_pat)
        db.commit()
        db.refresh(new_pat)

        data["patient_id"] = new_pat.id
        data["patient_uhid"] = new_pat.uhid
        data["patient_name"] = f"{new_pat.first_name} {new_pat.last_name}".strip()

    # Fetch/verify Doctor details from DB based on doctor_id or doctor_name
    doc = None
    if data.get("doctor_id"):
        try:
            doc = db.get(Doctor, data["doctor_id"])
        except Exception:
            doc = None
    if not doc and data.get("doctor_name"):
        d_name = data["doctor_name"].lower().strip()
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name) == d_name))

    if doc:
        data["doctor_id"] = doc.id
        data["doctor_name"] = doc.name
        if not data.get("department"):
            data["department"] = doc.department
        if doc.branch:
            data["branch"] = doc.branch
    else:
        data["doctor_id"] = None

    if "status" in data and data["status"]:
        st_raw = str(getattr(data["status"], "value", data["status"])).strip()
        for st_enum in AppointmentStatus:
            if st_enum.value.lower() == st_raw.lower():
                data["status"] = st_enum
                break

    valid_apt_keys = {
        "patient_id", "patient_uhid", "patient_name", "patient_mobile",
        "department", "doctor_id", "doctor_name", "date", "time_slot",
        "reason", "status", "created_date", "branch"
    }
    apt_data = {k: v for k, v in data.items() if k in valid_apt_keys}
    appointment = Appointment(**apt_data)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    log_audit("POST /appointments", payload, data, appointment, appointment)

    # Check if this is an online request vs directly scheduled
    apt_status_str = str(getattr(appointment.status, "value", appointment.status)).lower()
    is_requested = apt_status_str in ["requested", "pending"]

    if is_requested:
        notify_user_or_role(
            db, title="Online Appointment Request Received",
            message=f"New appointment request from {appointment.patient_name} for branch '{appointment.branch}'. Requires reception confirmation.",
            module="appointment", event_type="appointment_requested", recipient_role="reception", related_record_id=appointment.id
        )
    else:
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
        token_str = f"T-{appointment.id[:4].upper()}"
        q_item = QueueItem(
            token_number=token_str,
            patient_uhid=appointment.patient_uhid,
            patient_name=appointment.patient_name,
            doctor_name=appointment.doctor_name,
            department=appointment.department or "General Medicine",
            status="Waiting",
            waiting_time_minutes=15,
            time_issued=appointment.time_slot or datetime.now().strftime("%H:%M"),
            branch=appointment.branch,
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
    old_status = str(getattr(appointment.status, "value", appointment.status)).lower()

    apply_updates(appointment, payload)
    db.commit()
    db.refresh(appointment)
    log_audit(f"PUT /appointments/{appointment_id}", payload, payload.model_dump(exclude_unset=True), appointment, appointment)

    new_status = str(getattr(appointment.status, "value", appointment.status)).lower()

    # When reception confirms a 'requested' or 'pending' appointment to 'scheduled', generate QueueItem
    if old_status in ["requested", "pending"] and new_status in ["scheduled", "in_progress"]:
        existing_q = db.scalar(
            select(QueueItem).where(
                QueueItem.patient_uhid == appointment.patient_uhid,
                QueueItem.doctor_name == appointment.doctor_name,
                QueueItem.status == "Waiting"
            )
        )
        if not existing_q:
            token_str = f"T-{appointment.id[:4].upper()}"
            q_item = QueueItem(
                token_number=token_str,
                patient_uhid=appointment.patient_uhid,
                patient_name=appointment.patient_name,
                doctor_name=appointment.doctor_name,
                department=appointment.department or "General Medicine",
                status="Waiting",
                waiting_time_minutes=15,
                time_issued=appointment.time_slot or datetime.now().strftime("%H:%M"),
                branch=appointment.branch,
            )
            db.add(q_item)
            db.commit()

        notify_user_or_role(
            db, title="Appointment Confirmed by Reception",
            message=f"Appointment for {appointment.patient_name} with {appointment.doctor_name} has been confirmed by Reception.",
            module="appointment", event_type="appointment_booked", recipient_role="doctor", related_record_id=appointment.id
        )

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
