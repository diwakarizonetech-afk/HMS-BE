from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.ipd import Bed, IPDAdmission
from app.models.patient import Patient, PatientStatus
from app.schemas.ipd import (
    BedCreate,
    BedUpdate,
    BedOut,
    BedAllocateRequest,
    IPDAdmissionCreate,
    IPDAdmissionUpdate,
    IPDAdmissionOut,
)
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["IPD & Beds"])
_perm_create = Depends(require_permission("IPD Bed Allocation", "Create"))
_perm_edit = Depends(require_permission("IPD Bed Allocation", "Edit"))
_perm_delete = Depends(require_permission("IPD Bed Allocation", "Delete"))


# --- Beds ---

@router.get("/beds", response_model=list[BedOut])
def list_beds(
    ward: str | None = None,
    bed_status: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(Bed)
    if ward:
        stmt = stmt.where(Bed.ward == ward)
    if bed_status:
        stmt = stmt.where(Bed.status == bed_status)
    return db.scalars(stmt).all()


@router.post("/beds", response_model=BedOut, status_code=status.HTTP_201_CREATED)
def create_bed(payload: BedCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    bed = Bed(**payload.model_dump())
    try:
        db.add(bed)
        db.commit()
        db.refresh(bed)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to create bed: {str(ex)}")
    log_audit("POST /beds", payload, payload.model_dump(), bed, bed)
    return bed


@router.get("/beds/{bed_id}", response_model=BedOut)
def get_bed(bed_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, Bed, bed_id, "Bed")


@router.put("/beds/{bed_id}", response_model=BedOut)
def update_bed(bed_id: str, payload: BedUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    bed = get_or_404(db, Bed, bed_id, "Bed")
    apply_updates(bed, payload)
    try:
        db.commit()
        db.refresh(bed)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to update bed: {str(ex)}")
    log_audit(f"PUT /beds/{bed_id}", payload, payload.model_dump(exclude_unset=True), bed, bed)
    return bed


@router.post("/beds/{bed_id}/allocate", response_model=BedOut)
def allocate_bed(
    bed_id: str, payload: BedAllocateRequest, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    bed = get_or_404(db, Bed, bed_id, "Bed")
    if bed.status != "Available":
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} is not available (status: {bed.status})")
    patient = get_or_404(db, Patient, payload.patient_id, "Patient")

    bed.status = "Occupied"
    bed.current_patient_id = patient.id
    bed.current_patient_uhid = patient.uhid
    bed.current_patient_name = f"{patient.first_name} {patient.last_name}"
    bed.admitted_date = today_str()
    db.commit()
    db.refresh(bed)
    log_audit(f"POST /beds/{bed_id}/allocate", payload, payload.model_dump(), bed, bed)
    notify_user_or_role(
        db, title="Bed Allocated",
        message=f"Bed {bed.bed_number} ({bed.ward}) allocated to patient {bed.current_patient_name}.",
        module="ipd", event_type="bed_allocated", recipient_role="nurse", related_record_id=bed.id
    )
    notify_user_or_role(
        db, title="Bed Allocated",
        message=f"Bed {bed.bed_number} ({bed.ward}) allocated to patient {bed.current_patient_name}.",
        module="ipd", event_type="bed_allocated", recipient_role="doctor", related_record_id=bed.id
    )
    return bed


@router.post("/beds/{bed_id}/release", response_model=BedOut)
def release_bed(bed_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    bed = get_or_404(db, Bed, bed_id, "Bed")
    bed.status = "Cleaning"
    bed.current_patient_id = None
    bed.current_patient_uhid = None
    bed.current_patient_name = None
    bed.admitted_date = None
    db.commit()
    db.refresh(bed)
    log_audit(f"POST /beds/{bed_id}/release", {}, {}, bed, bed)
    return bed


@router.delete("/beds/{bed_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bed(bed_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    bed = get_or_404(db, Bed, bed_id, "Bed")
    db.delete(bed)
    db.commit()


# --- IPD admissions ---

@router.get("/ipd-admissions", response_model=list[IPDAdmissionOut])
@router.get("/admissions", response_model=list[IPDAdmissionOut])
def list_admissions(
    status_filter: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    stmt = select(IPDAdmission)
    if status_filter:
        stmt = stmt.where(IPDAdmission.status == status_filter)
    stmt = stmt.order_by(IPDAdmission.created_at.desc())
    return db.scalars(stmt).all()


@router.post("/ipd-admissions", response_model=IPDAdmissionOut, status_code=status.HTTP_201_CREATED)
def admit_patient(
    payload: IPDAdmissionCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["admission_date"] = data.get("admission_date") or today_str()
    admission = IPDAdmission(**data)
    db.add(admission)

    # Mark the referenced bed as occupied, and patient as admitted, if resolvable
    if admission.bed_id:
        bed = db.get(Bed, admission.bed_id)
        if bed and bed.status == "Available":
            bed.status = "Occupied"
            bed.current_patient_id = admission.patient_id
            bed.current_patient_uhid = admission.patient_uhid
            bed.current_patient_name = admission.patient_name
            bed.admitted_date = admission.admission_date

    if admission.patient_id:
        patient = db.get(Patient, admission.patient_id)
        if patient:
            patient.status = PatientStatus.Admitted

    db.commit()
    db.refresh(admission)
    log_audit("POST /ipd-admissions", payload, data, admission, admission)
    notify_user_or_role(
        db, title="New IPD Patient Admitted",
        message=f"Patient {admission.patient_name} admitted to ward/bed. Attending doctor: {admission.attending_doctor_name or 'Staff'}.",
        module="ipd", event_type="patient_admitted", recipient_role="nurse", related_record_id=admission.id
    )
    notify_user_or_role(
        db, title="New IPD Patient Assigned",
        message=f"Patient {admission.patient_name} admitted under doctor care.",
        module="ipd", event_type="patient_admitted", recipient_role="doctor", related_record_id=admission.id
    )
    notify_user_or_role(
        db, title="IPD Admission Alert",
        message=f"Patient {admission.patient_name} admitted for IPD care.",
        module="ipd", event_type="patient_admitted", recipient_role="reception", related_record_id=admission.id
    )
    return admission


@router.get("/ipd-admissions/{admission_id}", response_model=IPDAdmissionOut)
def get_admission(admission_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    return get_or_404(db, IPDAdmission, admission_id, "IPD admission")


@router.put("/ipd-admissions/{admission_id}", response_model=IPDAdmissionOut)
def update_admission(
    admission_id: str,
    payload: IPDAdmissionUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
    _perm=_perm_edit,
):
    admission = get_or_404(db, IPDAdmission, admission_id, "IPD admission")
    apply_updates(admission, payload)
    db.commit()
    db.refresh(admission)
    log_audit(f"PUT /ipd-admissions/{admission_id}", payload, payload.model_dump(exclude_unset=True), admission, admission)
    return admission



@router.post("/ipd-admissions/{admission_id}/discharge", response_model=IPDAdmissionOut)
def discharge_patient(admission_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit):
    admission = get_or_404(db, IPDAdmission, admission_id, "IPD admission")
    admission.status = "Discharged"

    if admission.bed_id:
        bed = db.get(Bed, admission.bed_id)
        if bed:
            bed.status = "Cleaning"
            bed.current_patient_id = None
            bed.current_patient_uhid = None
            bed.current_patient_name = None
            bed.admitted_date = None

    if admission.patient_id:
        patient = db.get(Patient, admission.patient_id)
        if patient:
            patient.status = PatientStatus.Discharged

    db.commit()
    db.refresh(admission)
    notify_user_or_role(
        db, title="IPD Patient Discharged",
        message=f"Patient {admission.patient_name} has been discharged.",
        module="ipd", event_type="patient_discharged", recipient_role="nurse", related_record_id=admission.id
    )
    notify_user_or_role(
        db, title="IPD Patient Discharged",
        message=f"Patient {admission.patient_name} has been discharged.",
        module="ipd", event_type="patient_discharged", recipient_role="reception", related_record_id=admission.id
    )
    return admission
