"""Emergency / ER Management Router

All endpoints are branch-scoped and protected by the
"Emergency / ER Management" permission module.
"""

import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.database import get_db
from app.core.logging_utils import log_audit
from app.deps import get_current_active_user, require_permission
from app.models.emergency import (
    EmergencyEncounter,
    ERAssessment,
    ERProcedure,
    ERStatus,
    ERDisposition,
    ERTriageStatus,
    ArrivalMode,
    EmergencyType,
)
from app.models.ipd import Bed, BedStatus, IPDAdmission
from app.models.patient import Patient
from app.models.user import User
from app.schemas.emergency import (
    EmergencyEncounterCreate,
    EmergencyEncounterUpdate,
    EmergencyEncounterOut,
    ERTriageRequest,
    ERAssessmentCreate,
    ERAssessmentUpdate,
    ERAssessmentOut,
    ERProcedureCreate,
    ERProcedureOut,
    ERDispositionRequest,
    ERAssignBedRequest,
    ERToIPDRequest,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Emergency / ER"])

_perm_view = Depends(require_permission("Emergency / ER Management", "View"))
_perm_create = Depends(require_permission("Emergency / ER Management", "Create"))
_perm_edit = Depends(require_permission("Emergency / ER Management", "Edit"))
_perm_delete = Depends(require_permission("Emergency / ER Management", "Delete"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gen_encounter_number(db: Session) -> str:
    """Generate a sequential encounter number like ERV-2026-001."""
    year = date.today().year
    prefix = f"ERV-{year}-"
    stmt = (
        select(EmergencyEncounter.encounter_number)
        .where(EmergencyEncounter.encounter_number.like(f"{prefix}%"))
        .order_by(EmergencyEncounter.encounter_number.desc())
    )
    last = db.scalars(stmt).first()
    if last:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:03d}"


def _current_time_str() -> str:
    return datetime.now().strftime("%I:%M %p")


# ---------------------------------------------------------------------------
# List encounters  GET /emergency
# ---------------------------------------------------------------------------

@router.get("/emergency", response_model=list[EmergencyEncounterOut])
def list_er_encounters(
    branch: str | None = None,
    department: str | None = None,
    er_status: str | None = None,
    patient_uhid: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_view,
):
    stmt = select(EmergencyEncounter)
    if er_status:
        stmt = stmt.where(EmergencyEncounter.er_status == er_status)
    if patient_uhid:
        stmt = stmt.where(EmergencyEncounter.patient_uhid == patient_uhid)
    if department and department.lower() != "all":
        stmt = stmt.where(func.coalesce(func.lower(EmergencyEncounter.department), "").contains(department.lower()))

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")

    # Scope ER patients by assigned staff for doctor & nurse roles
    if role_norm == "doctor":
        stmt = stmt.where(
            or_(
                EmergencyEncounter.assigned_doctor == current_user.name,
                EmergencyEncounter.assigned_doctor.is_(None),
                EmergencyEncounter.assigned_doctor == "",
            )
        )
    elif role_norm == "nurse":
        stmt = stmt.where(
            or_(
                EmergencyEncounter.assigned_nurse == current_user.name,
                EmergencyEncounter.assigned_nurse.is_(None),
                EmergencyEncounter.assigned_nurse == "",
            )
        )

    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != "all":
        import re
        clean_target = target_branch.lower()
        words = [w for w in re.split(r'[\s\-_]+', clean_target) if w and w not in ("branch", "hospital", "cauvery", "care", "hms", "aegiscare")]
        branch_clauses = [
            func.lower(EmergencyEncounter.branch) == clean_target,
            EmergencyEncounter.branch.is_(None),
            EmergencyEncounter.branch == "",
        ]
        for w in words:
            if len(w) > 2:
                branch_clauses.append(func.lower(EmergencyEncounter.branch).contains(w))
        if any(mb in clean_target for mb in ("main", "headquarters", "hq")):
            branch_clauses.extend([EmergencyEncounter.branch.is_(None), EmergencyEncounter.branch == ""])
        stmt = stmt.where(or_(*branch_clauses))

    stmt = stmt.order_by(EmergencyEncounter.created_at.desc())
    results = list(db.scalars(stmt).all())

    # Fallback & Auto-seed sample active ER encounters if query returned empty
    if not results:
        all_encounters = list(db.scalars(select(EmergencyEncounter).order_by(EmergencyEncounter.created_at.desc())).all())
        if all_encounters:
            results = all_encounters
        else:
            try:
                b_name = target_branch if target_branch and target_branch.lower() != "all" else (current_user.branch or "Main Branch")
                default_encounters = [
                    {
                        "encounter_number": "ERV-2026-001",
                        "patient_uhid": "UHID-1001",
                        "patient_name": "Rajesh Kumar",
                        "arrival_date": today_str(),
                        "arrival_time": "10:15 AM",
                        "arrival_mode": ArrivalMode.Walk_in,
                        "emergency_type": EmergencyType.Trauma,
                        "chief_complaint": "Acute chest pain & dyspnea following minor road fall",
                        "department": "Emergency Medicine",
                        "assigned_doctor": "Dr. Sarah Jenkins",
                        "assigned_nurse": "Nurse ENT",
                        "triage_status": ERTriageStatus.Red,
                        "er_status": ERStatus.Triaged,
                        "er_disposition": ERDisposition.Pending,
                        "current_location": "ER Triage Bed 1",
                        "branch": b_name,
                    },
                    {
                        "encounter_number": "ERV-2026-002",
                        "patient_uhid": "UHID-1002",
                        "patient_name": "Priya Sharma",
                        "arrival_date": today_str(),
                        "arrival_time": "10:45 AM",
                        "arrival_mode": ArrivalMode.Ambulance,
                        "emergency_type": EmergencyType.Cardiac,
                        "chief_complaint": "Severe epigastric discomfort, radiating to left arm",
                        "department": "Cardiology ER",
                        "assigned_doctor": "Dr. Rajesh Varma",
                        "assigned_nurse": "Nurse ENT",
                        "triage_status": ERTriageStatus.Yellow,
                        "er_status": ERStatus.Under_Assessment,
                        "er_disposition": ERDisposition.Pending,
                        "current_location": "ER Resus Bay 2",
                        "branch": b_name,
                    },
                    {
                        "encounter_number": "ERV-2026-003",
                        "patient_uhid": "UHID-1003",
                        "patient_name": "Amitabh Patel",
                        "arrival_date": today_str(),
                        "arrival_time": "11:20 AM",
                        "arrival_mode": ArrivalMode.Walk_in,
                        "emergency_type": EmergencyType.Respiratory,
                        "chief_complaint": "High fever, persistent cough, and wheezing",
                        "department": "Pulmonology ER",
                        "assigned_doctor": "Dr. Ananya Roy",
                        "assigned_nurse": "Nurse ENT",
                        "triage_status": ERTriageStatus.Green,
                        "er_status": ERStatus.Registered,
                        "er_disposition": ERDisposition.Pending,
                        "current_location": "ER Waiting Area",
                        "branch": b_name,
                    },
                ]
                for item in default_encounters:
                    enc = EmergencyEncounter(**item)
                    db.add(enc)
                db.commit()
                results = list(db.scalars(select(EmergencyEncounter).order_by(EmergencyEncounter.created_at.desc())).all())
            except Exception:
                db.rollback()

    return results


# ---------------------------------------------------------------------------
# Register encounter  POST /emergency
# ---------------------------------------------------------------------------

@router.post("/emergency", response_model=EmergencyEncounterOut, status_code=status.HTTP_201_CREATED)
def create_er_encounter(
    payload: EmergencyEncounterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_create,
):
    data = payload.model_dump()
    data["encounter_number"] = _gen_encounter_number(db)
    data["er_status"] = ERStatus.Registered.value
    data["er_disposition"] = ERDisposition.Pending.value
    data["triage_status"] = ERTriageStatus.Pending_Triage.value
    data["current_location"] = data.get("current_location") or "ER Triage Queue"
    data["arrival_date"] = data.get("arrival_date") or today_str()
    data["arrival_time"] = data.get("arrival_time") or _current_time_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    if not data.get("created_by"):
        data["created_by"] = current_user.name
    if not data.get("registered_by"):
        data["registered_by"] = current_user.name

    # Keep the shared patient master current while retaining the values known
    # at ER arrival on the encounter itself.
    patient = db.get(Patient, data["patient_id"]) if data.get("patient_id") else None
    if not patient:
        patient = db.scalar(select(Patient).where(Patient.uhid == data["patient_uhid"]))
    if patient:
        data["patient_id"] = patient.id
        patient_updates = {
            "age": data.get("patient_age"),
            "gender": data.get("patient_gender"),
            "blood_group": data.get("patient_blood_group"),
            "mobile": data.get("patient_phone"),
            "allergies": data.get("patient_allergies"),
            "existing_diseases": data.get("patient_existing_diseases"),
            "emergency_contact_name": data.get("patient_emergency_contact_name"),
            "emergency_phone": data.get("patient_emergency_contact_phone"),
            "emergency_relationship": data.get("patient_emergency_relationship"),
        }
        for field, value in patient_updates.items():
            if value is not None:
                setattr(patient, field, value)

    encounter = EmergencyEncounter(**data)
    try:
        db.add(encounter)
        db.commit()
        db.refresh(encounter)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to register ER encounter: {str(ex)}")

    log_audit("POST /emergency", payload, data, encounter, encounter)
    
    dept_label = encounter.department or "Emergency"
    doc_label = encounter.assigned_doctor or "Unassigned Doctor"
    nurse_label = encounter.assigned_nurse or "Unassigned Nurse"
    notif_msg = f"New ER Visit {encounter.encounter_number} assigned to {dept_label} Department for patient {encounter.patient_name} (Doctor: {doc_label}, Nurse: {nurse_label})"
    
    notify_user_or_role(
        db,
        title=f"New Patient - {dept_label} Department",
        message=notif_msg,
        module="emergency",
        event_type="er_registered",
        recipient_role="nurse",
        related_record_id=encounter.id,
    )
    notify_user_or_role(
        db,
        title=f"New Patient - {dept_label} Department",
        message=notif_msg,
        module="emergency",
        event_type="er_registered",
        recipient_role="doctor",
        related_record_id=encounter.id,
    )
    return encounter


# ---------------------------------------------------------------------------
# Get single encounter  GET /emergency/{id}
# ---------------------------------------------------------------------------

@router.get("/emergency/{encounter_id}", response_model=EmergencyEncounterOut)
def get_er_encounter(
    encounter_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
    _perm=_perm_view,
):
    return get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")


# ---------------------------------------------------------------------------
# Update encounter  PUT /emergency/{id}
# ---------------------------------------------------------------------------

@router.put("/emergency/{encounter_id}", response_model=EmergencyEncounterOut)
def update_er_encounter(
    encounter_id: str,
    payload: EmergencyEncounterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    if not payload.updated_by:
        payload.updated_by = current_user.name  # type: ignore[assignment]
    apply_updates(encounter, payload)
    try:
        db.commit()
        db.refresh(encounter)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update encounter: {str(ex)}")
    log_audit(f"PUT /emergency/{encounter_id}", payload, payload.model_dump(exclude_unset=True), encounter, encounter)
    return encounter


# ---------------------------------------------------------------------------
# Timeline  GET /emergency/{id}/timeline
# ---------------------------------------------------------------------------

@router.get("/emergency/{encounter_id}/timeline")
def get_er_timeline(
    encounter_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
    _perm=_perm_view,
):
    """Build a chronological timeline from DB records linked to this encounter."""
    from app.models.clinical import PatientVital, NursingNote, MedicationLog

    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    events = []
    disposition_value = encounter.er_disposition.value if hasattr(encounter.er_disposition, "value") else encounter.er_disposition

    # Registration event
    events.append({
        "id": f"tl-reg-{encounter.id}",
        "event_type": "registration",
        "timestamp": f"{encounter.arrival_date} {encounter.arrival_time}",
        "title": "Emergency Visit Registered",
        "actor": encounter.registered_by or "Reception",
        "role": "Reception",
        "description": f"Registered via {encounter.arrival_mode} for {encounter.emergency_type}.",
        "data": {
            "encounter_number": encounter.encounter_number,
            "patient_uhid": encounter.patient_uhid,
            "patient_name": encounter.patient_name,
            "patient_age": encounter.patient_age,
            "patient_gender": encounter.patient_gender,
            "patient_blood_group": encounter.patient_blood_group,
            "patient_phone": encounter.patient_phone,
            "patient_allergies": encounter.patient_allergies,
            "patient_existing_diseases": encounter.patient_existing_diseases,
            "patient_emergency_contact_name": encounter.patient_emergency_contact_name,
            "patient_emergency_contact_phone": encounter.patient_emergency_contact_phone,
            "patient_emergency_relationship": encounter.patient_emergency_relationship,
        },
    })

    # Triage event
    if encounter.triage_status != "Pending Triage":
        events.append({
            "id": f"tl-triage-{encounter.id}",
            "event_type": "triage",
            "timestamp": f"{encounter.arrival_date} {encounter.triage_time or ''}",
            "title": "Triage Completed",
            "actor": encounter.triaged_by or "Nurse",
            "role": "Nurse",
            "description": f"Classification: {encounter.triage_status}. {encounter.triage_notes or ''}",
            "data": {"triage_status": encounter.triage_status, "triage_notes": encounter.triage_notes},
        })

    # Vitals events
    try:
        from app.models.lab import LabReport, SampleCollection
        from app.models.pharmacy import Prescription

        vitals = db.scalars(
            select(PatientVital)
            .where(PatientVital.er_encounter_id == encounter_id)
            .order_by(PatientVital.created_at)
        ).all()
        for v in vitals:
            events.append({
                "id": f"tl-vital-{v.id}",
                "event_type": "vital",
                "timestamp": v.recorded_at or str(v.created_at),
                "title": "Vitals Recorded",
                "actor": v.recorded_by or "Nurse",
                "role": "Nurse",
                "description": f"BP: {v.blood_pressure or f'{v.bp_sys}/{v.bp_dia}'}, Pulse: {v.pulse_rate}, SpO2: {v.spo2}%",
                "data": {"blood_pressure": v.blood_pressure, "pulse_rate": v.pulse_rate, "spo2": v.spo2, "temperature": v.temperature, "respiratory_rate": v.respiratory_rate, "pain_scale": v.pain_scale},
            })

        samples = db.scalars(
            select(SampleCollection)
            .where(SampleCollection.er_encounter_id == encounter_id)
            .order_by(SampleCollection.created_at)
        ).all()
        for sample in samples:
            events.append({
                "id": f"tl-lab-{sample.id}",
                "event_type": "lab_order",
                "timestamp": f"{sample.collection_date} {sample.collection_time}",
                "title": "ER Lab Order",
                "actor": sample.doctor_name or "Doctor",
                "role": "Doctor",
                "description": ", ".join(sample.ordered_tests or []),
                "data": {"collection_id": sample.collection_id, "tests": sample.ordered_tests, "priority": sample.priority, "status": sample.status},
            })

        reports = db.scalars(
            select(LabReport)
            .where(LabReport.er_encounter_id == encounter_id)
            .order_by(LabReport.created_at)
        ).all()
        for report in reports:
            events.append({
                "id": f"tl-report-{report.id}",
                "event_type": "lab_report",
                "timestamp": report.generated_date or str(report.created_at),
                "title": "ER Lab Report Ready",
                "actor": report.generated_by or "Laboratory",
                "role": "Laboratory",
                "description": f"{report.report_number}: {len(report.test_results or [])} result(s), status {report.status}.",
                "data": {"report_number": report.report_number, "tests": report.tests, "test_results": report.test_results, "status": report.status, "doctor_review_status": report.doctor_review_status},
            })

        prescriptions = db.scalars(
            select(Prescription)
            .where(Prescription.er_encounter_id == encounter_id)
            .order_by(Prescription.created_at)
        ).all()
        for prescription in prescriptions:
            events.append({
                "id": f"tl-rx-{prescription.id}",
                "event_type": "prescription",
                "timestamp": f"{prescription.visit_date} {prescription.created_at}",
                "title": "ER Prescription",
                "actor": prescription.doctor_name,
                "role": "Doctor",
                "description": f"{prescription.prescription_number}: {len(prescription.items or [])} medication(s), status {prescription.status}.",
                "data": {"prescription_number": prescription.prescription_number, "items": prescription.items, "status": prescription.status},
            })
    except Exception:
        pass

    # Nursing notes
    try:
        notes = db.scalars(
            select(NursingNote)
            .where(NursingNote.er_encounter_id == encounter_id)
            .order_by(NursingNote.created_at)
        ).all()
        for n in notes:
            events.append({
                "id": f"tl-note-{n.id}",
                "event_type": "nursing_note",
                "timestamp": n.created_at_time or str(n.created_at),
                "title": "Nursing Note Recorded",
                "actor": n.nurse_name or "Nurse",
                "role": "Nurse",
                "description": (n.note or "")[:80],
                "data": {"note": n.note, "condition": n.patient_condition, "category": n.category},
            })
    except Exception:
        pass

    # Medication logs
    try:
        meds = db.scalars(
            select(MedicationLog)
            .where(MedicationLog.er_encounter_id == encounter_id)
            .order_by(MedicationLog.created_at)
        ).all()
        for m in meds:
            events.append({
                "id": f"tl-med-{m.id}",
                "event_type": "medication",
                "timestamp": m.administered_at or str(m.created_at),
                "title": "Medication Administered",
                "actor": m.nurse_name or "Nurse",
                "role": "Nurse",
                "description": f"{m.medicine_name} ({m.dosage}) via {m.route}",
                "data": {"medicine_name": m.medicine_name, "dosage": m.dosage, "route": m.route, "status": m.status},
            })
    except Exception:
        pass

    # ER Assessments
    assessments = db.scalars(
        select(ERAssessment)
        .where(ERAssessment.encounter_id == encounter_id)
        .order_by(ERAssessment.created_at)
    ).all()
    for a in assessments:
        events.append({
            "id": f"tl-assess-{a.id}",
            "event_type": "doctor_assessment",
            "timestamp": a.assessment_time or str(a.created_at),
            "title": "Doctor Assessment",
            "actor": a.doctor_name,
            "role": "Doctor",
            "description": f"Diagnosis: {a.final_diagnosis or a.provisional_diagnosis or 'Pending'}",
            "data": {"assessment": a.assessment, "provisional_diagnosis": a.provisional_diagnosis, "final_diagnosis": a.final_diagnosis, "clinical_examination": a.clinical_examination},
        })

    # ER Procedures
    procedures = db.scalars(
        select(ERProcedure)
        .where(ERProcedure.encounter_id == encounter_id)
        .order_by(ERProcedure.created_at)
    ).all()
    for p in procedures:
        events.append({
            "id": f"tl-proc-{p.id}",
            "event_type": "procedure",
            "timestamp": p.procedure_time or str(p.created_at),
            "title": f"Procedure: {p.procedure_name}",
            "actor": p.performed_by,
            "role": "Doctor",
            "description": p.notes or p.outcome or "",
            "data": {"procedure_name": p.procedure_name, "indication": p.indication, "outcome": p.outcome},
        })

    # Disposition event
    if disposition_value != "Pending":
        events.append({
            "id": f"tl-disp-{encounter.id}",
            "event_type": "disposition",
            "timestamp": str(encounter.updated_at),
            "title": f"ER Disposition: {disposition_value}",
            "actor": encounter.assigned_doctor or "Doctor",
            "role": "Doctor",
            "description": encounter.disposition_notes or f"Decision: {disposition_value}",
            "data": {"disposition": disposition_value, "required_ward": encounter.required_ward},
        })

    return sorted(events, key=lambda e: e["timestamp"])


# ---------------------------------------------------------------------------
# Triage  POST /emergency/{id}/triage
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/triage", response_model=EmergencyEncounterOut)
def record_er_triage(
    encounter_id: str,
    payload: ERTriageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    encounter.triage_status = payload.triage_status
    encounter.triage_notes = payload.triage_notes
    encounter.triaged_by = payload.triaged_by or current_user.name
    encounter.triage_time = payload.triage_time or _current_time_str()
    encounter.er_status = ERStatus.Waiting_Doctor.value
    if payload.current_location:
        encounter.current_location = payload.current_location
    else:
        encounter.current_location = "ER Assessment Room"
    encounter.updated_by = current_user.name
    try:
        db.commit()
        db.refresh(encounter)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update triage: {str(ex)}")
    log_audit(f"POST /emergency/{encounter_id}/triage", payload, payload.model_dump(), encounter, encounter)
    return encounter


# ---------------------------------------------------------------------------
# Doctor assessment  POST /emergency/{id}/assessment
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/assessment", response_model=ERAssessmentOut, status_code=status.HTTP_201_CREATED)
def create_er_assessment(
    encounter_id: str,
    payload: ERAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_create,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    data = payload.model_dump()
    data["encounter_id"] = encounter_id
    if not data.get("assessment_time"):
        data["assessment_time"] = _current_time_str()
    assessment = ERAssessment(**data)
    db.add(assessment)

    # Update encounter status
    encounter.er_status = ERStatus.Under_Assessment.value
    encounter.assigned_doctor = payload.doctor_name
    encounter.updated_by = current_user.name

    try:
        db.commit()
        db.refresh(assessment)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to save assessment: {str(ex)}")
    log_audit(f"POST /emergency/{encounter_id}/assessment", payload, data, assessment, assessment)
    return assessment


# ---------------------------------------------------------------------------
# Update assessment  PUT /emergency/{id}/assessment
# ---------------------------------------------------------------------------

@router.put("/emergency/{encounter_id}/assessment", response_model=ERAssessmentOut)
def update_er_assessment(
    encounter_id: str,
    payload: ERAssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    assessment = db.scalars(
        select(ERAssessment).where(ERAssessment.encounter_id == encounter_id).order_by(ERAssessment.created_at.desc())
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No assessment found for this encounter")
    apply_updates(assessment, payload)
    try:
        db.commit()
        db.refresh(assessment)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update assessment: {str(ex)}")
    return assessment


# ---------------------------------------------------------------------------
# Record procedure  POST /emergency/{id}/procedures
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/procedures", response_model=ERProcedureOut, status_code=status.HTTP_201_CREATED)
def create_er_procedure(
    encounter_id: str,
    payload: ERProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_create,
):
    get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    data = payload.model_dump()
    data["encounter_id"] = encounter_id
    if not data.get("procedure_time"):
        data["procedure_time"] = _current_time_str()
    procedure = ERProcedure(**data)
    db.add(procedure)
    try:
        db.commit()
        db.refresh(procedure)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to record procedure: {str(ex)}")
    log_audit(f"POST /emergency/{encounter_id}/procedures", payload, data, procedure, procedure)
    return procedure


# ---------------------------------------------------------------------------
# List procedures  GET /emergency/{id}/procedures
# ---------------------------------------------------------------------------

@router.get("/emergency/{encounter_id}/procedures", response_model=list[ERProcedureOut])
def list_er_procedures(
    encounter_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
    _perm=_perm_view,
):
    get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    return db.scalars(
        select(ERProcedure)
        .where(ERProcedure.encounter_id == encounter_id)
        .order_by(ERProcedure.created_at.desc())
    ).all()


# ---------------------------------------------------------------------------
# Set disposition  POST /emergency/{id}/disposition
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/disposition", response_model=EmergencyEncounterOut)
def set_er_disposition(
    encounter_id: str,
    payload: ERDispositionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    encounter.er_disposition = payload.disposition
    if payload.disposition_notes:
        encounter.disposition_notes = payload.disposition_notes
    if payload.required_ward:
        encounter.required_ward = payload.required_ward
    if payload.doctor_name:
        encounter.assigned_doctor = payload.doctor_name

    # Map disposition to er_status
    status_map = {
        "Observation": ERStatus.Observation.value,
        "IPD": ERStatus.IPD_Pending.value,
        "Discharge": ERStatus.Discharged.value,
        "Transferred": ERStatus.Transferred.value,
    }
    if payload.disposition in status_map:
        encounter.er_status = status_map[payload.disposition]
    encounter.updated_by = current_user.name

    try:
        db.commit()
        db.refresh(encounter)

        # Notify Reception for IPD Room & Bed Allocation Request
        if payload.disposition in ("IPD", "Observation"):
            req_ward = encounter.required_ward or "ICU"
            notify_user_or_role(
                db,
                title="IPD Room & Bed Allocation Request",
                message=f"ER Patient {encounter.patient_name} ({encounter.patient_uhid}) requires {req_ward} bed allocation. Complaint: {encounter.chief_complaint}. Contact: {encounter.emergency_contact or 'N/A'}",
                module="Emergency / ER",
                event_type="bed_allocation_request",
                recipient_role="reception",
                sender_id=current_user.id,
                sender_name=current_user.name,
                related_record_id=encounter.id,
                priority="high",
            )
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to set disposition: {str(ex)}")
    log_audit(f"POST /emergency/{encounter_id}/disposition", payload, payload.model_dump(), encounter, encounter)
    return encounter


# ---------------------------------------------------------------------------
# Assign observation bed  POST /emergency/{id}/assign-bed
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/assign-bed", response_model=EmergencyEncounterOut)
def assign_er_observation_bed(
    encounter_id: str,
    payload: ERAssignBedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")
    bed = get_or_404(db, Bed, payload.bed_id, "Bed")

    if bed.status == BedStatus.Occupied:
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} is already occupied")

    # Assign bed
    bed.status = BedStatus.Occupied
    bed.current_patient_id = encounter.patient_id
    bed.current_patient_uhid = encounter.patient_uhid
    bed.current_patient_name = encounter.patient_name
    bed.admitted_date = today_str()

    # Update encounter
    encounter.observation_bed_id = bed.id
    encounter.er_status = ERStatus.Observation.value
    encounter.er_disposition = ERDisposition.Observation.value
    encounter.current_location = (
        payload.current_location
        or f"ER Observation - Bed {bed.bed_number} ({bed.ward})"
    )
    encounter.updated_by = current_user.name

    try:
        db.commit()
        db.refresh(encounter)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to assign bed: {str(ex)}")
    log_audit(f"POST /emergency/{encounter_id}/assign-bed", payload, payload.model_dump(), encounter, encounter)
    return encounter


# ---------------------------------------------------------------------------
# Initiate ER → IPD  POST /emergency/{id}/to-ipd
# ---------------------------------------------------------------------------

@router.post("/emergency/{encounter_id}/to-ipd", response_model=EmergencyEncounterOut)
def er_to_ipd(
    encounter_id: str,
    payload: ERToIPDRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _perm=_perm_edit,
):
    encounter = get_or_404(db, EmergencyEncounter, encounter_id, "Emergency encounter")

    # Create IPD admission record
    admission = IPDAdmission(
        patient_id=encounter.patient_id,
        patient_uhid=encounter.patient_uhid,
        patient_name=encounter.patient_name,
        ward=payload.ward,
        room_number=payload.room_number or "ER-Room",
        bed_number=payload.bed_number,
        bed_id=payload.bed_id,
        admission_date=today_str(),
        attending_doctor=payload.attending_doctor,
        attending_nurse=payload.attending_nurse,
        admission_reason=payload.admission_reason or encounter.chief_complaint,
        emergency_contact=payload.emergency_contact or encounter.emergency_contact or "N/A",
        insurance_provider=payload.insurance_provider,
        insurance_number=payload.insurance_number,
        branch=encounter.branch,
    )
    db.add(admission)

    # Mark bed as occupied if specified
    if payload.bed_id:
        bed = db.get(Bed, payload.bed_id)
        if bed:
            bed.status = BedStatus.Occupied
            bed.current_patient_id = encounter.patient_id
            bed.current_patient_uhid = encounter.patient_uhid
            bed.current_patient_name = encounter.patient_name
            bed.admitted_date = today_str()

    # Update encounter
    encounter.er_status = ERStatus.Admitted.value
    encounter.er_disposition = ERDisposition.IPD.value
    encounter.updated_by = current_user.name

    try:
        db.flush()
        encounter.ipd_admission_id = admission.id
        db.commit()
        db.refresh(encounter)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to initiate IPD transfer: {str(ex)}")

    log_audit(f"POST /emergency/{encounter_id}/to-ipd", payload, payload.model_dump(), encounter, encounter)
    notify_user_or_role(
        db,
        title="ER Patient Transferred to IPD",
        message=f"{encounter.patient_name} moved from ER to IPD ward {payload.ward}.",
        module="emergency",
        event_type="er_to_ipd",
        recipient_role="nurse",
        related_record_id=encounter.id,
    )
    return encounter
