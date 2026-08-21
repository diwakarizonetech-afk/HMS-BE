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
        norm_sub = branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        patient_branch_clauses = [
            func.lower(Patient.branch) == branch.lower(),
        ]
        if norm_sub:
            patient_branch_clauses.append(func.lower(Patient.branch).contains(norm_sub))
        stmt = stmt.where(or_(*patient_branch_clauses))
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

    # Reuse existing patient if mobile, UHID, or full name matches
    target_uhid = (data.get("uhid") or "").strip()
    target_mobile = (data.get("mobile") or "").strip()
    target_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()

    existing = None
    if target_uhid:
        existing = db.scalar(select(Patient).where(func.lower(Patient.uhid) == target_uhid.lower()))

    if not existing and target_mobile:
        clean_mob = "".join(filter(str.isdigit, target_mobile))[-10:]
        if len(clean_mob) >= 10:
            all_pts = db.scalars(select(Patient)).all()
            for p in all_pts:
                p_mob = "".join(filter(str.isdigit, p.mobile or ""))[-10:]
                if p_mob and p_mob == clean_mob:
                    existing = p
                    break
        if not existing:
            existing = db.scalar(select(Patient).where(Patient.mobile == target_mobile))

    if not existing and target_name:
        all_pts = db.scalars(select(Patient)).all()
        for p in all_pts:
            full_n = f"{p.first_name or ''} {p.last_name or ''}".strip().lower()
            if full_n and full_n == target_name.lower():
                existing = p
                break

    if existing:
        apply_updates(existing, {k: v for k, v in data.items() if v and k != "uhid"})
        db.commit()
        db.refresh(existing)
        log_audit("POST /patients (reused)", payload, data, existing, existing)
        patient = existing
    else:
        data["uhid"] = data.get("uhid") or _generate_uhid(db)
        data["registration_date"] = data.get("registration_date") or today_str()
        data["email"] = data.get("email") or ""
        if not data.get("dob"):
            if data.get("age"):
                try:
                    calc_year = datetime.now().year - int(data["age"])
                    data["dob"] = f"{calc_year}-01-01"
                except Exception:
                    data["dob"] = "1990-01-01"
            else:
                data["dob"] = "1990-01-01"
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


@router.get("/{uhid}/history")
def get_patient_cross_branch_history(uhid: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    """Fetch complete cross-branch historical timeline for a patient: appointments, IPD admissions,
    prescriptions, lab reports, and recorded vitals."""
    from app.models.appointment import Appointment
    from app.models.ipd import IPDAdmission
    from app.models.pharmacy import Prescription
    from app.models.lab import LabReport
    from app.models.clinical import PatientVital, NursingNote
    from app.models.staff import Consultation

    clean_uhid = uhid.strip()
    patient = db.scalar(select(Patient).where(or_(func.lower(Patient.uhid) == clean_uhid.lower(), Patient.id == clean_uhid)))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    target_uhid = patient.uhid

    # 1. Appointments across all branches
    apts = db.scalars(
        select(Appointment)
        .where(or_(func.lower(Appointment.patient_uhid) == target_uhid.lower(), func.lower(Appointment.patient_uhid) == clean_uhid.lower()))
        .order_by(Appointment.created_at.desc())
    ).all()

    # 2. IPD Admissions across all branches
    adms = db.scalars(
        select(IPDAdmission)
        .where(or_(func.lower(IPDAdmission.patient_uhid) == target_uhid.lower(), func.lower(IPDAdmission.patient_uhid) == clean_uhid.lower()))
        .order_by(IPDAdmission.created_at.desc())
    ).all()

    # 3. Prescriptions across all branches
    rxs = db.scalars(
        select(Prescription)
        .where(or_(func.lower(Prescription.patient_uhid) == target_uhid.lower(), func.lower(Prescription.patient_uhid) == clean_uhid.lower()))
        .order_by(Prescription.created_at.desc())
    ).all()

    # 4. Lab Reports across all branches
    labs = db.scalars(
        select(LabReport)
        .where(or_(func.lower(LabReport.patient_uhid) == target_uhid.lower(), func.lower(LabReport.patient_uhid) == clean_uhid.lower()))
        .order_by(LabReport.created_at.desc())
    ).all()

    # 5. Vitals across all branches
    vits = db.scalars(
        select(PatientVital)
        .where(or_(func.lower(PatientVital.patient_uhid) == target_uhid.lower(), func.lower(PatientVital.patient_uhid) == clean_uhid.lower()))
        .order_by(PatientVital.created_at.desc())
    ).all()

    # 6. Nursing Notes across all branches
    notes = db.scalars(
        select(NursingNote)
        .where(or_(func.lower(NursingNote.patient_uhid) == target_uhid.lower(), func.lower(NursingNote.patient_uhid) == clean_uhid.lower()))
        .order_by(NursingNote.created_at.desc())
    ).all()

    # 7. Doctor OPD Consultations across all branches
    consults = db.scalars(
        select(Consultation)
        .where(or_(func.lower(Consultation.patient_uhid) == target_uhid.lower(), func.lower(Consultation.patient_uhid) == clean_uhid.lower()))
        .order_by(Consultation.created_at.desc())
    ).all()

    return {
        "patient": {
            "id": patient.id,
            "uhid": patient.uhid,
            "firstName": patient.first_name,
            "lastName": patient.last_name,
            "gender": patient.gender,
            "age": patient.age,
            "dob": patient.dob,
            "bloodGroup": patient.blood_group,
            "mobile": patient.mobile,
            "email": patient.email,
            "address": patient.address,
            "city": patient.city,
            "state": patient.state,
            "branch": patient.branch,
            "registrationDate": patient.registration_date,
            "status": patient.status,
            "allergies": patient.allergies,
            "existingDiseases": patient.existing_diseases,
            "insuranceProvider": patient.insurance_provider,
            "insuranceNumber": patient.insurance_number,
        },
        "consultations": [
            {
                "id": c.id,
                "appointmentId": c.appointment_id,
                "doctorId": c.doctor_id,
                "patientUhid": c.patient_uhid,
                "patientName": c.patient_name,
                "status": c.status,
                "record": c.record,
                "date": c.created_at.strftime("%Y-%m-%d") if c.created_at else "",
                "createdAt": c.created_at.isoformat() if c.created_at else "",
            }
            for c in consults
        ],
        "appointments": [
            {
                "id": a.id,
                "doctorName": a.doctor_name,
                "department": a.department,
                "date": a.date,
                "timeSlot": a.time_slot,
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "reason": a.reason,
                "branch": a.branch or "Main Branch",
                "isEmergency": a.is_emergency,
                "tokenNumber": a.token_number,
                "createdDate": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            }
            for a in apts
        ],
        "admissions": [
            {
                "id": adm.id,
                "ward": adm.ward,
                "roomNumber": adm.room_number,
                "bedNumber": adm.bed_number,
                "admissionDate": adm.admission_date,
                "attendingDoctor": adm.attending_doctor,
                "admissionReason": adm.admission_reason,
                "status": adm.status.value if hasattr(adm.status, "value") else str(adm.status),
                "branch": adm.branch or "Main Branch",
            }
            for adm in adms
        ],
        "prescriptions": [
            {
                "id": rx.id,
                "prescriptionNumber": rx.prescription_number,
                "doctorName": rx.doctor_name,
                "department": rx.department,
                "date": rx.visit_date or (rx.created_at.strftime("%Y-%m-%d") if rx.created_at else ""),
                "items": rx.items or [],
                "medicines": rx.items or [],
                "status": rx.status,
                "branch": rx.branch or "Main Branch",
            }
            for rx in rxs
        ],
        "labReports": [
            {
                "id": lr.id,
                "reportNumber": lr.report_number,
                "doctorName": lr.doctor_name,
                "department": lr.department,
                "tests": lr.tests,
                "testResults": [
                    (
                        {
                            "id": tr.get("id", ""),
                            "testName": tr.get("testName") or tr.get("test_name") or "",
                            "testCode": tr.get("testCode") or tr.get("test_code") or "",
                            "resultValue": tr.get("resultValue") or tr.get("result_value") or "",
                            "unit": tr.get("unit") or "",
                            "referenceRange": tr.get("referenceRange") or tr.get("reference_range") or "",
                            "flag": tr.get("flag", "Normal"),
                            "status": tr.get("status", "Completed"),
                        }
                        if isinstance(tr, dict)
                        else {
                            "id": getattr(tr, "id", ""),
                            "testName": getattr(tr, "test_name", getattr(tr, "testName", "")),
                            "testCode": getattr(tr, "test_code", getattr(tr, "testCode", "")),
                            "resultValue": getattr(tr, "result_value", getattr(tr, "resultValue", "")),
                            "unit": getattr(tr, "unit", ""),
                            "referenceRange": getattr(tr, "reference_range", getattr(tr, "referenceRange", "")),
                            "flag": tr.flag.value if hasattr(getattr(tr, "flag", None), "value") else str(getattr(tr, "flag", "Normal")),
                            "status": tr.status.value if hasattr(getattr(tr, "status", None), "value") else str(getattr(tr, "status", "Completed")),
                        }
                    )
                    for tr in lr.test_results
                ] if lr.test_results else [],
                "generatedDate": lr.generated_date,
                "status": lr.status.value if hasattr(lr.status, "value") else str(lr.status),
                "doctorReviewStatus": lr.doctor_review_status.value if hasattr(lr.doctor_review_status, "value") else str(lr.doctor_review_status),
                "doctorComments": lr.doctor_comments,
                "branch": lr.branch or "Main Branch",
            }
            for lr in labs
        ],
        "vitals": [
            {
                "id": v.id,
                "temperature": v.temperature,
                "bpSys": v.bp_sys,
                "bpDia": v.bp_dia,
                "bloodPressure": f"{v.bp_sys}/{v.bp_dia}" if v.bp_sys and v.bp_dia else getattr(v, "blood_pressure", ""),
                "pulse": v.pulse,
                "respiratoryRate": v.respiratory_rate,
                "spo2": v.spo2,
                "bloodSugar": getattr(v, "blood_sugar", 110),
                "recordedBy": v.recorded_by,
                "date": v.date or (v.created_at.strftime("%Y-%m-%d") if v.created_at else ""),
                "time": v.time or (v.created_at.strftime("%H:%M") if v.created_at else ""),
            }
            for v in vits
        ],
        "nursingNotes": [
            {
                "id": n.id,
                "category": n.category,
                "note": n.note,
                "nurseName": n.nurse_name,
                "ward": n.ward,
                "date": n.date or (n.created_at.strftime("%Y-%m-%d") if n.created_at else ""),
                "time": n.time or (n.created_at.strftime("%H:%M") if n.created_at else ""),
            }
            for n in notes
        ],
    }


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
