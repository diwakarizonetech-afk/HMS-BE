import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, today_str
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_permission
from app.models.ipd import Bed, BedStatus, IPDAdmission, IPDStatus
from app.models.patient import Patient, PatientStatus
from app.models.user import User
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
    branch: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Bed)
    if ward:
        stmt = stmt.where(Bed.ward == ward)
    if bed_status:
        stmt = stmt.where(Bed.status == bed_status)

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != "all":
        clean_target = target_branch.lower()
        words = [w for w in re.split(r'[\s\-_]+', clean_target) if w and w not in ("branch", "hospital", "cauvery", "care", "hms", "aegiscare")]
        
        bed_branch_clauses = [
            func.lower(Bed.branch) == clean_target,
        ]
        for w in words:
            if len(w) > 2:
                bed_branch_clauses.append(func.lower(Bed.branch).contains(w))
        
        if any(mb in clean_target for mb in ("main", "headquarters", "hq")):
            bed_branch_clauses.extend([Bed.branch.is_(None), Bed.branch == ""])
            
        stmt = stmt.where(or_(*bed_branch_clauses))

    beds = list(db.scalars(stmt).all())

    # Auto-seed standard observation and ward beds if no beds exist for this branch query
    if not beds:
        try:
            branch_name = target_branch if target_branch and target_branch.lower() != "all" else (current_user.branch or "Main Branch")
            branch_slug = re.sub(r'[^a-zA-Z0-9]', '', branch_name)[:6].upper() if branch_name else "MAIN"
            default_beds_data = [
                ("OBS-01", "OBS-ROOM-1", "ER Observation Unit", "Observation", 1500.0),
                ("OBS-02", "OBS-ROOM-1", "ER Observation Unit", "Observation", 1500.0),
                ("OBS-03", "OBS-ROOM-2", "ER Observation Unit", "Observation", 1500.0),
                ("OBS-04", "OBS-ROOM-2", "ER Observation Unit", "Observation", 1500.0),
                ("OBS-05", "OBS-ROOM-3", "ER Observation Unit", "Observation", 1500.0),
                ("OBS-06", "OBS-ROOM-3", "ER Observation Unit", "Observation", 1500.0),
                ("ICU-01", "ICU-ROOM-A", "ICU", "ICU", 5000.0),
                ("ICU-02", "ICU-ROOM-A", "ICU", "ICU", 5000.0),
                ("GEN-101", "ROOM-101", "General Ward", "General", 800.0),
                ("GEN-102", "ROOM-101", "General Ward", "General", 800.0),
                ("PVT-201", "ROOM-201", "Deluxe Private", "Deluxe", 3000.0),
            ]
            for b_num, r_num, w_name, cat_name, fee in default_beds_data:
                unique_b_num = f"{b_num}-{branch_slug}"
                existing = db.scalar(select(Bed).where(Bed.bed_number == unique_b_num))
                if not existing:
                    nb = Bed(
                        bed_number=unique_b_num,
                        room_number=r_num,
                        ward=w_name,
                        category=cat_name,
                        daily_rate=fee,
                        status=BedStatus.Available,
                        branch=branch_name,
                    )
                    db.add(nb)
            db.commit()
            beds = list(db.scalars(stmt).all())
            if not beds:
                beds = list(db.scalars(select(Bed)).all())
        except Exception:
            db.rollback()
            beds = list(db.scalars(select(Bed)).all())

    return beds


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
    if bed.status != BedStatus.Available:
        raise HTTPException(status_code=400, detail=f"Bed {bed.bed_number} is not available (status: {bed.status})")
    patient = get_or_404(db, Patient, payload.patient_id, "Patient")

    bed.status = BedStatus.Occupied
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
    if bed.status == BedStatus.Cleaning:
        bed.status = BedStatus.Available
    else:
        old_patient_uhid = bed.current_patient_uhid
        old_bed_number = bed.bed_number

        bed.status = BedStatus.Cleaning
        bed.current_patient_id = None
        bed.current_patient_uhid = None
        bed.current_patient_name = None
        bed.admitted_date = None

        if old_patient_uhid or old_bed_number:
            stmt = select(IPDAdmission).where(
                IPDAdmission.status == IPDStatus.Admitted,
                or_(IPDAdmission.bed_number == old_bed_number, IPDAdmission.patient_uhid == old_patient_uhid)
            )
            admissions = db.scalars(stmt).all()
            for adm in admissions:
                adm.status = IPDStatus.Discharged

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
    status_filter: str | None = None,
    branch: str | None = None,
    patient_uhid: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(IPDAdmission)
    if patient_uhid:
        stmt = stmt.where(IPDAdmission.patient_uhid == patient_uhid)
    if status_filter:
        stmt = stmt.where(IPDAdmission.status == status_filter)

    # When querying by patient_uhid, return complete history across all branches!
    if not patient_uhid:
        role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")
        target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
        if target_branch and target_branch.lower() != "all":
            norm_sub = target_branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
            adm_branch_clauses = [
                func.lower(IPDAdmission.branch) == target_branch.lower(),
            ]
            if norm_sub:
                adm_branch_clauses.append(func.lower(IPDAdmission.branch).contains(norm_sub))
            if norm_sub == "main" or target_branch.lower() == "main branch":
                adm_branch_clauses.extend([
                    IPDAdmission.branch.is_(None),
                    IPDAdmission.branch == "",
                    func.lower(IPDAdmission.branch) == "main branch",
                ])
            stmt = stmt.where(or_(*adm_branch_clauses))
    stmt = stmt.order_by(IPDAdmission.created_at.desc())
    return db.scalars(stmt).all()


def normalize_ward_enum(ward_str: str | None) -> str:
    if not ward_str:
        return "ICU"
    w = ward_str.lower().strip()
    if "icu" in w:
        return "ICU"
    if "general" in w or "obs" in w:
        return "General Ward"
    if "suite" in w:
        return "Deluxe Suite"
    if "private" in w or "deluxe" in w or "pvt" in w:
        return "Deluxe Private"
    if "semi" in w:
        return "Semi-Private"
    if "surgical" in w:
        return "Surgical Ward"
    return ward_str


@router.post("/ipd-admissions", response_model=IPDAdmissionOut, status_code=status.HTTP_201_CREATED)
def admit_patient(
    payload: IPDAdmissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create
):
    data = payload.model_dump()
    data["ward"] = normalize_ward_enum(data.get("ward"))
    data["admission_date"] = data.get("admission_date") or today_str()
    if not data.get("branch"):
        data["branch"] = current_user.branch
    admission = IPDAdmission(**data)

    db.add(admission)

    # Mark the referenced bed as occupied, and patient as admitted, if resolvable
    bed = None
    if admission.bed_id:
        bed = db.get(Bed, admission.bed_id)
    if not bed and admission.bed_number:
        stmt_b = select(Bed).where(func.lower(Bed.bed_number) == admission.bed_number.lower())
        bed = db.scalars(stmt_b).first()

    if bed:
        admission.bed_id = bed.id
        bed.status = BedStatus.Occupied
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
        message=f"Patient {admission.patient_name} admitted to ward/bed. Attending doctor: {admission.attending_doctor or 'Staff'}.",
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
    admission.status = IPDStatus.Discharged

    if admission.bed_id:
        bed = db.get(Bed, admission.bed_id)
        if bed:
            bed.status = BedStatus.Cleaning
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
