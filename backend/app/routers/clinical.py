from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.logging_utils import log_audit
from app.models.clinical import PatientVital, NursingNote, MedicationLog, WardTransfer
from app.schemas.clinical import (
    PatientVitalCreate, PatientVitalOut,
    NursingNoteCreate, NursingNoteOut,
    MedicationLogCreate, MedicationLogOut,
    WardTransferCreate, WardTransferOut,
)

router = APIRouter(prefix="/clinical", tags=["Clinical"])


# --- Vitals ---
@router.get("/vitals", response_model=list[PatientVitalOut])
def get_vitals(patient_uhid: str | None = None, db: Session = Depends(get_db)):
    stmt = select(PatientVital).order_by(PatientVital.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(PatientVital.patient_uhid == patient_uhid)
    return list(db.scalars(stmt).all())


@router.post("/vitals", response_model=PatientVitalOut, status_code=status.HTTP_201_CREATED)
def create_vital(payload: PatientVitalCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("note") and data.get("remarks"):
        data["note"] = data["remarks"]
    vital = PatientVital(**data)
    db.add(vital)
    db.commit()
    db.refresh(vital)
    log_audit("POST /clinical/vitals", payload, data, vital, vital)
    return vital


# --- Nursing Notes ---
@router.get("/nursing-notes", response_model=list[NursingNoteOut])
def get_nursing_notes(patient_uhid: str | None = None, db: Session = Depends(get_db)):
    stmt = select(NursingNote).order_by(NursingNote.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(NursingNote.patient_uhid == patient_uhid)
    return list(db.scalars(stmt).all())


@router.post("/nursing-notes", response_model=NursingNoteOut, status_code=status.HTTP_201_CREATED)
def create_nursing_note(payload: NursingNoteCreate, db: Session = Depends(get_db)):
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


# --- Medication Logs ---
@router.get("/medications", response_model=list[MedicationLogOut])
def get_medications(patient_uhid: str | None = None, db: Session = Depends(get_db)):
    stmt = select(MedicationLog).order_by(MedicationLog.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(MedicationLog.patient_uhid == patient_uhid)
    return list(db.scalars(stmt).all())


@router.post("/medications", response_model=MedicationLogOut, status_code=status.HTTP_201_CREATED)
def create_medication_log(payload: MedicationLogCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    log = MedicationLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    log_audit("POST /clinical/medications", payload, data, log, log)
    return log


@router.put("/medications/{med_id}", response_model=MedicationLogOut)
def update_medication_log(med_id: str, payload: dict, db: Session = Depends(get_db)):
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


# --- Ward Transfers ---
@router.get("/ward-transfers", response_model=list[WardTransferOut])
def get_ward_transfers(patient_uhid: str | None = None, db: Session = Depends(get_db)):
    stmt = select(WardTransfer).order_by(WardTransfer.created_at.desc())
    if patient_uhid:
        stmt = stmt.where(WardTransfer.patient_uhid == patient_uhid)
    return list(db.scalars(stmt).all())


@router.post("/ward-transfers", response_model=WardTransferOut, status_code=status.HTTP_201_CREATED)
def create_ward_transfer(payload: WardTransferCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    transfer = WardTransfer(**data)
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    log_audit("POST /clinical/ward-transfers", payload, data, transfer, transfer)
    return transfer


@router.put("/ward-transfers/{transfer_id}", response_model=WardTransferOut)
def update_ward_transfer(transfer_id: str, payload: dict, db: Session = Depends(get_db)):
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
def delete_ward_transfer(transfer_id: str, db: Session = Depends(get_db)):
    transfer = db.get(WardTransfer, transfer_id)
    if transfer:
        db.delete(transfer)
        db.commit()
