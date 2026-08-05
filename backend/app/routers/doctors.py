from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, list_all
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, require_roles
from app.models.doctor import Doctor, Department, DoctorStatus
from app.schemas.doctor import (
    DoctorCreate,
    DoctorUpdate,
    DoctorOut,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentOut,
)
from app.models.user import User, UserRole
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Doctors & Departments"])

_admin_only = Depends(require_roles(UserRole.super_admin, UserRole.admin))
_any_auth   = Depends(get_current_active_user)


# --- Doctors ---

@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    department: str | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    try:
        all_users = db.scalars(select(User)).all()
        doc_users = [u for u in all_users if str(getattr(u, 'role', '')).lower() in ['doctor', 'userrole.doctor']]
        for du in doc_users:
            if not du.email:
                continue
            email_clean = du.email.lower()
            doc = db.scalar(select(Doctor).where(Doctor.email == email_clean))
            if not doc:
                new_doc = Doctor(
                    name=du.name if du.name.startswith("Dr.") else f"Dr. {du.name}",
                    email=email_clean,
                    department=du.department or "General Medicine",
                    specialization="General Physician",
                    room_no="OPD-101",
                    consultation_fee=500.0,
                    available_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
                    slots=["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
                    status=DoctorStatus.Available,
                )
                db.add(new_doc)
        db.commit()
    except Exception:
        db.rollback()

    stmt = select(Doctor)
    if department:
        stmt = stmt.where(Doctor.department == department)
    stmt = stmt.offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


@router.post("/doctors", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), _=_admin_only):
    doctor = Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    log_audit("POST /doctors", payload, payload.model_dump(), doctor, doctor)
    notify_user_or_role(
        db, title="Doctor Assigned to Department",
        message=f"{doctor.name} assigned to {doctor.department}.",
        module="doctor", event_type="doctor_assigned", recipient_role="doctor", related_record_id=doctor.id
    )
    notify_user_or_role(
        db, title="Doctor Assigned to Department",
        message=f"{doctor.name} assigned to {doctor.department}.",
        module="doctor", event_type="doctor_assigned", recipient_role="super_admin", related_record_id=doctor.id
    )
    return doctor


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: str, db: Session = Depends(get_db), _=_any_auth):
    return get_or_404(db, Doctor, doctor_id, "Doctor")


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
def update_doctor(
    doctor_id: str, payload: DoctorUpdate, db: Session = Depends(get_db), _=_admin_only
):
    doctor = get_or_404(db, Doctor, doctor_id, "Doctor")
    apply_updates(doctor, payload)
    db.commit()
    db.refresh(doctor)
    log_audit(f"PUT /doctors/{doctor_id}", payload, payload.model_dump(exclude_unset=True), doctor, doctor)
    notify_user_or_role(
        db, title="Doctor Profile Updated",
        message=f"{doctor.name} profile/department updated ({doctor.department}).",
        module="doctor", event_type="doctor_assigned", recipient_role="doctor", related_record_id=doctor.id
    )
    return doctor


@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: str, db: Session = Depends(get_db), _=_admin_only):
    doctor = get_or_404(db, Doctor, doctor_id, "Doctor")
    db.delete(doctor)
    db.commit()


# --- Departments ---

@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=_any_auth):
    return list_all(db, Department, limit=500)


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db), _=_admin_only):
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    log_audit("POST /departments", payload, payload.model_dump(), department, department)
    notify_user_or_role(
        db, title="New Department Created",
        message=f"Department '{department.name}' was created.",
        module="department", event_type="dept_created", recipient_role="super_admin", related_record_id=department.id
    )
    return department


@router.get("/departments/{department_id}", response_model=DepartmentOut)
def get_department(department_id: str, db: Session = Depends(get_db), _=_any_auth):
    return get_or_404(db, Department, department_id, "Department")


@router.put("/departments/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    _=_admin_only,
):
    department = get_or_404(db, Department, department_id, "Department")
    apply_updates(department, payload)
    db.commit()
    db.refresh(department)
    log_audit(f"PUT /departments/{department_id}", payload, payload.model_dump(exclude_unset=True), department, department)
    notify_user_or_role(
        db, title="Department Updated",
        message=f"Department '{department.name}' settings were updated.",
        module="department", event_type="dept_updated", recipient_role="super_admin", related_record_id=department.id
    )
    return department


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(department_id: str, db: Session = Depends(get_db), _=_admin_only):
    department = get_or_404(db, Department, department_id, "Department")
    db.delete(department)
    db.commit()
