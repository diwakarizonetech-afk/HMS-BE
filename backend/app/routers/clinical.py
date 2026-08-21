from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from app.core.database import get_db
from app.core.logging_utils import log_audit
from app.deps import get_current_active_user, require_permission, get_own_nurse_ward
from app.models.clinical import PatientVital, NursingNote, MedicationLog, WardTransfer
from app.schemas.clinical import (
    PatientVitalCreate, PatientVitalOut,
    NursingNoteCreate, NursingNoteOut,
    MedicationLogCreate, MedicationLogOut,
    WardTransferCreate, WardTransferOut,
)

router = APIRouter(prefix="/clinical", tags=["Clinical"])

# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
#
# Phase 12 finding: this router (vitals, nursing notes, medication logs, ward
# transfers) was flagged in Phase 11's "Confirmed NOT yet done" list as never
# audited for permission-matrix wiring. Read every endpoint here: all four
# sub-resources are the same kind of thing already covered by the newly added
# "Clinical Documentation" module (see staff.py, where consultations/
# ipd-records were re-pointed to it this same phase) — a vital reading, a
# nursing note, a medication administration log, and a ward transfer note are
# all clinical documentation entries tied to a specific patient's care, just
# authored more often by nurses than doctors. Confirmed via
# frontend/src/services/api.ts that all four GET/POST/PUT endpoint groups are
# live (called from patient-care pages), so this wiring has real effect, not
# just theoretical coverage. GET (read) endpoints are intentionally left as
# get_current_active_user only, matching the read/write split already used
# throughout every other permission-matrix router in this codebase (e.g.
# patients.py, pharmacy.py) — View was never gated behind PermissionItem
# anywhere else either, so gating it only here would be an inconsistent,
# unrequested change. DELETE endpoints use the "Delete" action, matching the
# action taxonomy already defined in actionsList on both Permission
# Management pages.
_perm_create = Depends(require_permission("Clinical Documentation", "Create"))
_perm_edit = Depends(require_permission("Clinical Documentation", "Edit"))
_perm_delete = Depends(require_permission("Clinical Documentation", "Delete"))


# --- Vitals ---
@router.get("/vitals", response_model=list[PatientVitalOut])
def get_vitals(
    patient_uhid: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(PatientVital).order_by(PatientVital.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(PatientVital.patient_uhid == patient_uhid)
    if branch and branch.lower() != "all":
        norm_sub = branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        clauses = [func.lower(PatientVital.branch) == branch.lower()]
        if norm_sub:
            clauses.append(func.lower(PatientVital.branch).contains(norm_sub))
        stmt = stmt.where(or_(*clauses))
    return list(db.scalars(stmt).all())


@router.post("/vitals", response_model=PatientVitalOut, status_code=status.HTTP_201_CREATED)
def create_vital(payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    bp_sys = payload.get("bpSys") or payload.get("bp_sys") or 120
    bp_dia = payload.get("bpDia") or payload.get("bp_dia") or 80
    bp_str = payload.get("bloodPressure") or payload.get("blood_pressure") or f"{bp_sys}/{bp_dia}"

    if bp_str and "/" in str(bp_str) and (not payload.get("bpSys") and not payload.get("bp_sys")):
        try:
            parts = str(bp_str).split("/")
            bp_sys = float(parts[0])
            bp_dia = float(parts[1])
        except (ValueError, IndexError):
            pass

    pulse_val = payload.get("pulseRate") or payload.get("pulse_rate") or payload.get("pulse") or 72
    resp_val = payload.get("respiratoryRate") or payload.get("respiratory_rate") or payload.get("respRate") or payload.get("resp_rate") or 18

    vital = PatientVital(
        patient_uhid=payload.get("patientUhid") or payload.get("patient_uhid") or "",
        patient_name=payload.get("patientName") or payload.get("patient_name"),
        age=payload.get("age"),
        gender=payload.get("gender"),
        doctor_id=payload.get("doctorId") or payload.get("doctor_id"),
        doctor_name=payload.get("doctorName") or payload.get("doctor_name"),
        department=payload.get("department"),
        height=payload.get("height"),
        weight=payload.get("weight"),
        temperature=payload.get("temperature", 98.6),
        blood_pressure=bp_str,
        bp_sys=bp_sys,
        bp_dia=bp_dia,
        pulse_rate=pulse_val,
        pulse=pulse_val,
        respiratory_rate=resp_val,
        resp_rate=resp_val,
        spo2=payload.get("spO2") or payload.get("spo2") or 98,
        blood_sugar=payload.get("bloodSugar") or payload.get("blood_sugar"),
        pain_scale=payload.get("painScale") or payload.get("pain_scale"),
        remarks=payload.get("remarks") or payload.get("note") or "",
        recorded_by=payload.get("recordedBy") or payload.get("recorded_by") or "Nurse",
        recorded_at=payload.get("recordedAt") or payload.get("recorded_at"),
        date=payload.get("date"),
        time=payload.get("time"),
        er_encounter_id=payload.get("erEncounterId") or payload.get("er_encounter_id"),
        branch=payload.get("branch"),
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)
    log_audit("POST /clinical/vitals", payload, payload, vital, vital)
    return vital


@router.put("/vitals/{vital_id}", response_model=PatientVitalOut)
def update_vital(vital_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    vital = db.get(PatientVital, vital_id)
    if not vital:
        uhid = payload.get("patientUhid") or payload.get("patient_uhid")
        if uhid:
            vital = db.scalar(select(PatientVital).where(PatientVital.patient_uhid == uhid).order_by(PatientVital.created_at.desc()))
    if not vital:
        return create_vital(payload, db)

    mapping = {
        "patientUhid": "patient_uhid",
        "patientName": "patient_name",
        "doctorId": "doctor_id",
        "doctorName": "doctor_name",
        "bloodPressure": "blood_pressure",
        "bpSys": "bp_sys",
        "bpDia": "bp_dia",
        "pulseRate": "pulse_rate",
        "pulse": "pulse_rate",
        "respiratoryRate": "respiratory_rate",
        "respRate": "resp_rate",
        "spO2": "spo2",
        "bloodSugar": "blood_sugar",
        "painScale": "pain_scale",
        "recordedBy": "recorded_by",
        "recordedAt": "recorded_at",
        "branch": "branch",
        "remarks": "remarks",
        "note": "remarks",
        "notes": "remarks",
    }

    bp_str = payload.get("bloodPressure") or payload.get("blood_pressure")
    if bp_str and "/" in str(bp_str):
        try:
            parts = str(bp_str).split("/")
            vital.bp_sys = float(parts[0])
            vital.bp_dia = float(parts[1])
            vital.blood_pressure = str(bp_str)
        except (ValueError, IndexError):
            pass

    for k, v in payload.items():
        attr_name = mapping.get(k, k)
        if hasattr(vital, attr_name) and attr_name not in ("id", "created_at"):
            setattr(vital, attr_name, v)
            if attr_name == "pulse_rate":
                vital.pulse = v
            elif attr_name == "respiratory_rate":
                vital.resp_rate = v
            elif attr_name == "spo2":
                vital.spo2 = v

    db.commit()
    db.refresh(vital)
    log_audit(f"PUT /clinical/vitals/{vital_id}", payload, payload, vital, vital)
    return vital


@router.delete("/vitals/{vital_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vital(vital_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    vital = db.get(PatientVital, vital_id)
    if vital:
        db.delete(vital)
        db.commit()


# --- Nursing Notes ---
@router.get("/nursing-notes", response_model=list[NursingNoteOut])
def get_nursing_notes(
    patient_uhid: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(NursingNote).order_by(NursingNote.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(NursingNote.patient_uhid == patient_uhid)
    if branch and branch.lower() != "all":
        norm_sub = branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        clauses = [func.lower(NursingNote.branch) == branch.lower()]
        if norm_sub:
            clauses.append(func.lower(NursingNote.branch).contains(norm_sub))
        stmt = stmt.where(or_(*clauses))
    return list(db.scalars(stmt).all())


@router.post("/nursing-notes", response_model=NursingNoteOut, status_code=status.HTTP_201_CREATED)
def create_nursing_note(payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    obs = payload.get("observation") or payload.get("note") or payload.get("notes") or ""
    note_obj = NursingNote(
        patient_uhid=payload.get("patientUhid") or payload.get("patient_uhid") or "",
        patient_name=payload.get("patientName") or payload.get("patient_name"),
        admission_id=payload.get("admissionId") or payload.get("admission_id"),
        ward=payload.get("ward") or "General Ward",
        diagnosis=payload.get("diagnosis") or "",
        observation=obs,
        symptoms=payload.get("symptoms") or "",
        treatment_response=payload.get("treatmentResponse") or payload.get("treatment_response") or "",
        doctor_instructions=payload.get("doctorInstructions") or payload.get("doctor_instructions") or "",
        fluid_intake=payload.get("fluidIntake") or payload.get("fluid_intake"),
        fluid_output=payload.get("fluidOutput") or payload.get("fluid_output"),
        patient_condition=payload.get("patientCondition") or payload.get("patient_condition") or "Stable",
        category=payload.get("category") or payload.get("patientCondition") or "General Note",
        note=obs or "General Note",
        notes=payload.get("notes") or obs,
        nurse_name=payload.get("nurseName") or payload.get("nurse_name") or payload.get("recordedBy") or payload.get("recorded_by") or "Nurse",
        recorded_by=payload.get("recordedBy") or payload.get("recorded_by") or "Nurse",
        created_at_time=payload.get("createdAtTime") or payload.get("created_at_time"),
        date=payload.get("date"),
        time=payload.get("time"),
        er_encounter_id=payload.get("erEncounterId") or payload.get("er_encounter_id"),
        branch=payload.get("branch"),
    )
    db.add(note_obj)
    db.commit()
    db.refresh(note_obj)
    log_audit("POST /clinical/nursing-notes", payload, payload, note_obj, note_obj)
    return note_obj


@router.put("/nursing-notes/{note_id}", response_model=NursingNoteOut)
def update_nursing_note(note_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    note = db.get(NursingNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Nursing note not found")
    for k, v in payload.items():
        if hasattr(note, k):
            setattr(note, k, v)
    db.commit()
    db.refresh(note)
    log_audit(f"PUT /clinical/nursing-notes/{note_id}", payload, payload, note, note)
    return note


@router.delete("/nursing-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_nursing_note(note_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    note = db.get(NursingNote, note_id)
    if note:
        db.delete(note)
        db.commit()


# --- Medication Logs ---
@router.get("/medications", response_model=list[MedicationLogOut])
def get_medications(
    patient_uhid: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(MedicationLog).order_by(MedicationLog.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(MedicationLog.patient_uhid == patient_uhid)
    if branch and branch.lower() != "all":
        norm_sub = branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        clauses = [func.lower(MedicationLog.branch) == branch.lower()]
        if norm_sub:
            clauses.append(func.lower(MedicationLog.branch).contains(norm_sub))
        stmt = stmt.where(or_(*clauses))
    return list(db.scalars(stmt).all())


@router.post("/medications", response_model=MedicationLogOut, status_code=status.HTTP_201_CREATED)
def create_medication_log(payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    log = MedicationLog(
        patient_uhid=payload.get("patientUhid") or payload.get("patient_uhid") or "",
        patient_name=payload.get("patientName") or payload.get("patient_name"),
        admission_id=payload.get("admissionId") or payload.get("admission_id"),
        ward=payload.get("ward") or "General Ward",
        doctor_name=payload.get("doctorName") or payload.get("doctor_name"),
        medicine_name=payload.get("medicineName") or payload.get("medicine_name") or "",
        dosage=payload.get("dosage") or "1 Tablet",
        route=payload.get("route") or "Oral",
        frequency=payload.get("frequency") or "Once Daily (OD)",
        scheduled_time=payload.get("scheduledTime") or payload.get("scheduled_time") or "08:00 AM",
        administered_at=payload.get("administeredAt") or payload.get("administered_at") or payload.get("givenTime") or payload.get("given_time"),
        given_time=payload.get("givenTime") or payload.get("given_time"),
        status=payload.get("status") or "Given",
        reason_if_missed=payload.get("reasonIfMissed") or payload.get("reason_if_missed"),
        remarks=payload.get("remarks") or "",
        nurse_name=payload.get("nurseName") or payload.get("nurse_name") or "Nurse",
        er_encounter_id=payload.get("erEncounterId") or payload.get("er_encounter_id"),
        branch=payload.get("branch"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    log_audit("POST /clinical/medications", payload, payload, log, log)
    return log


@router.put("/medications/{med_id}", response_model=MedicationLogOut)
def update_medication_log(med_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    log = db.get(MedicationLog, med_id)
    if not log:
        log = MedicationLog(
            patient_uhid=payload.get("patientUhid") or payload.get("patient_uhid") or "",
            patient_name=payload.get("patientName") or payload.get("patient_name"),
            admission_id=payload.get("admissionId") or payload.get("admission_id"),
            ward=payload.get("ward") or "General Ward",
            doctor_name=payload.get("doctorName") or payload.get("doctor_name"),
            medicine_name=payload.get("medicineName") or payload.get("medicine_name") or "",
            dosage=payload.get("dosage") or "1 Tablet",
            route=payload.get("route") or "Oral",
            frequency=payload.get("frequency") or "Once Daily (OD)",
            scheduled_time=payload.get("scheduledTime") or payload.get("scheduled_time") or "08:00 AM",
            administered_at=payload.get("administeredAt") or payload.get("administered_at") or payload.get("givenTime") or payload.get("given_time"),
            given_time=payload.get("givenTime") or payload.get("given_time"),
            status=payload.get("status") or "Given",
            reason_if_missed=payload.get("reasonIfMissed") or payload.get("reason_if_missed"),
            remarks=payload.get("remarks") or "",
            nurse_name=payload.get("nurseName") or payload.get("nurse_name") or payload.get("administeredBy") or payload.get("administered_by") or "Nurse",
            er_encounter_id=payload.get("erEncounterId") or payload.get("er_encounter_id"),
            branch=payload.get("branch"),
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        log_audit(f"POST /clinical/medications/{med_id}", payload, payload, log, log)
        return log

    for k, v in payload.items():
        if hasattr(log, k):
            setattr(log, k, v)
        elif k == "givenTime":
            setattr(log, "given_time", v)
            setattr(log, "administered_at", v)
        elif k == "nurseName" or k == "administeredBy":
            setattr(log, "nurse_name", v)
    db.commit()
    db.refresh(log)
    log_audit(f"PUT /clinical/medications/{med_id}", payload, payload, log, log)
    return log


@router.delete("/medications/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication_log(med_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    log = db.get(MedicationLog, med_id)
    if log:
        db.delete(log)
        db.commit()


# --- Ward Transfers ---
@router.get("/ward-transfers", response_model=list[WardTransferOut])
def get_ward_transfers(
    patient_uhid: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    own_ward: str | None = Depends(get_own_nurse_ward),
):
    stmt = select(WardTransfer).order_by(WardTransfer.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(WardTransfer.patient_uhid == patient_uhid)
    if branch and branch.lower() != "all":
        norm_sub = branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        clauses = [func.lower(WardTransfer.branch) == branch.lower()]
        if norm_sub:
            clauses.append(func.lower(WardTransfer.branch).contains(norm_sub))
        stmt = stmt.where(or_(*clauses))
    if own_ward:
        stmt = stmt.where(
            or_(
                WardTransfer.current_ward == own_ward,
                WardTransfer.new_ward == own_ward,
                WardTransfer.current_ward.is_(None),
                WardTransfer.new_ward.is_(None),
                func.lower(WardTransfer.current_ward).contains(own_ward.lower()),
                func.lower(WardTransfer.new_ward).contains(own_ward.lower()),
            )
        )
    return list(db.scalars(stmt).all())


@router.post("/ward-transfers", response_model=WardTransferOut, status_code=status.HTTP_201_CREATED)
def create_ward_transfer(payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    transfer = WardTransfer(
        transfer_id=payload.get("transferId") or payload.get("transfer_id") or f"TRF-{db.query(WardTransfer).count() + 1}",
        patient_uhid=payload.get("patientUhid") or payload.get("patient_uhid") or "",
        patient_name=payload.get("patientName") or payload.get("patient_name") or "",
        current_ward=payload.get("currentWard") or payload.get("current_ward") or "General Ward",
        current_bed=payload.get("currentBed") or payload.get("current_bed") or "",
        new_ward=payload.get("newWard") or payload.get("new_ward") or "ICU Ward",
        new_bed=payload.get("newBed") or payload.get("new_bed") or "",
        transfer_reason=payload.get("transferReason") or payload.get("transfer_reason") or "",
        transfer_date=payload.get("transferDate") or payload.get("transfer_date") or "",
        transfer_time=payload.get("transferTime") or payload.get("transfer_time") or "",
        doctor_approval=payload.get("doctorApproval") or payload.get("doctor_approval") or "Approved",
        doctor_name=payload.get("doctorName") or payload.get("doctor_name"),
        remarks=payload.get("remarks") or "",
        transferred_by=payload.get("transferredBy") or payload.get("transferred_by") or "Nurse",
        status=payload.get("status") or "Completed",
        branch=payload.get("branch"),
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    log_audit("POST /clinical/ward-transfers", payload, payload, transfer, transfer)
    return transfer



@router.put("/ward-transfers/{transfer_id}", response_model=WardTransferOut)
def update_ward_transfer(transfer_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    transfer = db.get(WardTransfer, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Ward transfer not found")
    for k, v in payload.items():
        if hasattr(transfer, k):
            setattr(transfer, k, v)
    db.commit()
    db.refresh(transfer)
    log_audit(f"PUT /clinical/ward-transfers/{transfer_id}", payload, payload, transfer, transfer)
    return transfer


@router.delete("/ward-transfers/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ward_transfer(transfer_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    transfer = db.get(WardTransfer, transfer_id)
    if transfer:
        db.delete(transfer)
        db.commit()

