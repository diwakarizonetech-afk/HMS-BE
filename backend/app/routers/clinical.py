from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

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
def get_vitals(patient_uhid: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    stmt = select(PatientVital).order_by(PatientVital.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(PatientVital.patient_uhid == patient_uhid)
    return list(db.scalars(stmt).all())


@router.post("/vitals", response_model=PatientVitalOut, status_code=status.HTTP_201_CREATED)
def create_vital(payload: PatientVitalCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    if not data.get("note") and data.get("remarks"):
        data["note"] = data["remarks"]
    vital = PatientVital(**data)
    db.add(vital)
    db.commit()
    db.refresh(vital)
    log_audit("POST /clinical/vitals", payload, data, vital, vital)
    return vital


@router.put("/vitals/{vital_id}", response_model=PatientVitalOut)
def update_vital(vital_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    vital = db.get(PatientVital, vital_id)
    if not vital:
        raise HTTPException(status_code=404, detail="Vital record not found")
    for k, v in payload.items():
        if hasattr(vital, k):
            setattr(vital, k, v)
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
# Ward-based data scoping for the nurse role (see CHANGELOG.md Phase 13 and
# get_own_nurse_ward() in deps.py). A nurse with an assigned ward only sees
# records for that ward; a nurse with no ward assigned yet (own_ward is None)
# is NOT scoped, matching the "don't scope until there's a real key" rule
# already used for the doctor role. Non-nurse roles are always unaffected
# (own_ward is None for them too).
@router.get("/nursing-notes", response_model=list[NursingNoteOut])
def get_nursing_notes(
    patient_uhid: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    own_ward: str | None = Depends(get_own_nurse_ward),
):
    stmt = select(NursingNote).order_by(NursingNote.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(NursingNote.patient_uhid == patient_uhid)
    if own_ward:
        stmt = stmt.where(NursingNote.ward == own_ward)
    return list(db.scalars(stmt).all())


@router.post("/nursing-notes", response_model=NursingNoteOut, status_code=status.HTTP_201_CREATED)
def create_nursing_note(payload: NursingNoteCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    if not data.get("note") and data.get("notes"):
        data["note"] = data["notes"]
    elif not data.get("note"):
        data["note"] = "General Note"
    note = NursingNote(**data)
    db.add(note)
    db.commit()
    db.refresh(note)
    log_audit("POST /clinical/nursing-notes", payload, data, note, note)
    return note


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
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    own_ward: str | None = Depends(get_own_nurse_ward),
):
    stmt = select(MedicationLog).order_by(MedicationLog.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(MedicationLog.patient_uhid == patient_uhid)
    if own_ward:
        stmt = stmt.where(MedicationLog.ward == own_ward)
    return list(db.scalars(stmt).all())


@router.post("/medications", response_model=MedicationLogOut, status_code=status.HTTP_201_CREATED)
def create_medication_log(payload: MedicationLogCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    log = MedicationLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    log_audit("POST /clinical/medications", payload, data, log, log)
    return log


@router.put("/medications/{med_id}", response_model=MedicationLogOut)
def update_medication_log(med_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    log = db.get(MedicationLog, med_id)
    if not log:
        raise HTTPException(status_code=404, detail="Medication log not found")
    for k, v in payload.items():
        if hasattr(log, k):
            setattr(log, k, v)
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
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    own_ward: str | None = Depends(get_own_nurse_ward),
):
    stmt = select(WardTransfer).order_by(WardTransfer.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(WardTransfer.patient_uhid == patient_uhid)
    if own_ward:
        # A transfer is relevant to a ward-assigned nurse if the patient is
        # currently in their ward OR is being transferred into it (both
        # directions of the same transfer record matter to that nurse).
        stmt = stmt.where(or_(WardTransfer.current_ward == own_ward, WardTransfer.new_ward == own_ward))
    return list(db.scalars(stmt).all())


@router.post("/ward-transfers", response_model=WardTransferOut, status_code=status.HTTP_201_CREATED)
def create_ward_transfer(payload: WardTransferCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    transfer = WardTransfer(**data)
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    log_audit("POST /clinical/ward-transfers", payload, data, transfer, transfer)
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
