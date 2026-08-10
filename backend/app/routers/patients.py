from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit

from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.notification import NotificationType
from app.models.patient import Patient, EmergencyContactItem
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientOut,
    EmergencyContactCreate,
    EmergencyContactOut,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(prefix="/patients", tags=["Patients"])
_perm_create = Depends(require_permission("Patient Management", "Create"))
_perm_edit = Depends(require_permission("Patient Management", "Edit"))
_perm_delete = Depends(require_permission("Patient Management", "Delete"))


def _generate_uhid(db: Session) -> str:
    year = datetime.now().year
    count = db.query(Patient).count() + 1
    candidate = f"UHID-{year}-{1000 + count}"
    while db.scalar(select(Patient).where(Patient.uhid == candidate)):
        count += 1
        candidate = f"UHID-{year}-{1000 + count}"
    return candidate


@router.get("", response_model=list[PatientOut])
def list_patients(
    q: str | None = Query(None, description="Search by name, UHID, mobile, or aadhaar"),
    status_filter: str | None = Query(None, alias="status"),
    branch: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(Patient)
    if branch and branch.lower() != 'all':
        stmt = stmt.where(
            or_(
                func.lower(Patient.branch) == branch.lower(),
                func.lower(Patient.branch) == 'main branch',
                Patient.branch.is_(None),
                Patient.branch == ''
            )
        )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
                Patient.uhid.ilike(like),
                Patient.mobile.ilike(like),
                Patient.aadhaar.ilike(like),
            )
        )
    if status_filter:
        stmt = stmt.where(Patient.status == status_filter)
    stmt = stmt.order_by(Patient.created_at.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def register_patient(payload: PatientCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["uhid"] = data.get("uhid") or _generate_uhid(db)
    data["registration_date"] = data.get("registration_date") or today_str()
    patient = Patient(**data)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    log_audit("POST /patients", payload, data, patient, patient)

    is_emergency = getattr(patient, 'status', '').lower() == 'emergency' or getattr(patient, 'category', '').lower() == 'emergency'
    if is_emergency:
        notify_user_or_role(
            db, title="EMERGENCY PATIENT REGISTERED",
            message=f"Emergency patient {patient.first_name} {patient.last_name} ({patient.uhid}) registered!",
            module="emergency", event_type="emergency_registered", recipient_role="doctor", priority="urgent", notification_type=NotificationType.warning, related_record_id=patient.id
        )
        notify_user_or_role(
            db, title="EMERGENCY PATIENT REGISTERED",
            message=f"Emergency patient {patient.first_name} {patient.last_name} ({patient.uhid}) registered!",
            module="emergency", event_type="emergency_registered", recipient_role="nurse", priority="urgent", notification_type=NotificationType.warning, related_record_id=patient.id
        )
        notify_user_or_role(
            db, title="EMERGENCY PATIENT REGISTERED",
            message=f"Emergency patient {patient.first_name} {patient.last_name} ({patient.uhid}) registered!",
            module="emergency", event_type="emergency_registered", recipient_role="reception", priority="urgent", notification_type=NotificationType.warning, related_record_id=patient.id
        )
    else:
        notify_user_or_role(
            db, title="Patient Registered",
            message=f"Patient {patient.first_name} {patient.last_name} ({patient.uhid}) was registered successfully.",
            module="reception", event_type="patient_registered", recipient_role="reception", related_record_id=patient.id
        )
    return patient


@router.get("/lookup", response_model=list[PatientOut])
def lookup_patients(
    q: str | None = Query(None, description="Search by name, UHID, or mobile"),
    mobile: str | None = Query(None, description="Search by mobile"),
    db: Session = Depends(get_db),
):
    stmt = select(Patient)
    query_val = mobile or q
    if query_val:
        clean_q = query_val.strip()
        like = f"%{clean_q}%"
        stmt = stmt.where(
            or_(
                Patient.mobile.ilike(like),
                Patient.uhid.ilike(like),
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
            )
        )
    stmt = stmt.order_by(Patient.created_at.desc()).limit(20)
    return db.scalars(stmt).all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, Patient, patient_id, "Patient")


@router.get("/by-uhid/{uhid}", response_model=PatientOut)
def get_patient_by_uhid(uhid: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    patient = db.scalar(select(Patient).where(Patient.uhid == uhid))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str, payload: PatientUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    patient = get_or_404(db, Patient, patient_id, "Patient")
    apply_updates(patient, payload)
    db.commit()
    db.refresh(patient)
    log_audit(f"PUT /patients/{patient_id}", payload, payload.model_dump(exclude_unset=True), patient, patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    patient = get_or_404(db, Patient, patient_id, "Patient")
    db.delete(patient)
    db.commit()


# --- Emergency contacts (sub-resource) ---

@router.get("/{patient_id}/emergency-contacts", response_model=list[EmergencyContactOut])
def list_emergency_contacts(patient_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    get_or_404(db, Patient, patient_id, "Patient")
    stmt = select(EmergencyContactItem).where(EmergencyContactItem.patient_id == patient_id)
    return db.scalars(stmt).all()


@router.post(
    "/{patient_id}/emergency-contacts",
    response_model=EmergencyContactOut,
    status_code=status.HTTP_201_CREATED,
)
def add_emergency_contact(
    patient_id: str,
    payload: EmergencyContactCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user), _perm=_perm_create,
):
    patient = get_or_404(db, Patient, patient_id, "Patient")
    contact = EmergencyContactItem(
        patient_id=patient.id,
        patient_uhid=patient.uhid,
        patient_name=f"{patient.first_name} {patient.last_name}",
        contact_name=payload.contact_name,
        relationship_=payload.relationship_,
        phone=payload.phone,
        priority=payload.priority,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    log_audit(f"POST /patients/{patient_id}/emergency-contacts", payload, payload.model_dump(), contact, contact)
    return contact


@router.delete("/{patient_id}/emergency-contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_emergency_contact(
    patient_id: str, contact_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete
):
    contact = get_or_404(db, EmergencyContactItem, contact_id, "Emergency contact")
    db.delete(contact)
    db.commit()


@router.get("/emergency-contacts/all", response_model=list[EmergencyContactOut])
def list_all_emergency_contacts(db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return db.scalars(select(EmergencyContactItem)).all()
