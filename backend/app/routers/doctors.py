from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates, list_all
from app.core.logging_utils import log_audit
from app.core.database import get_db
from app.deps import get_current_active_user, get_optional_current_user, require_roles
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
    branch: str | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    # 1. Clean up existing duplicate Doctor rows and non-doctor accounts (e.g. pharmacy, reception)
    try:
        all_users = db.scalars(select(User)).all()
        user_role_map = {
            u.email.lower().strip(): str(getattr(u, 'role', '')).lower().replace("userrole.", "")
            for u in all_users if u.email
        }
        all_docs = list(db.scalars(select(Doctor).order_by(Doctor.created_at.asc())).all())
        seen_keys = set()
        to_delete = []
        for d in all_docs:
            email_clean = d.email.lower().strip() if d.email else ""
            user_role = user_role_map.get(email_clean, 'doctor')
            is_non_doctor = (
                user_role not in ['doctor'] or
                'pharmacy' in d.name.lower() or
                'reception' in d.name.lower() or
                'admin' in d.name.lower() or
                'lab' in d.name.lower()
            )
            key = email_clean or d.name.strip().lower()
            if is_non_doctor or (key and key in seen_keys):
                to_delete.append(d)
            elif key:
                seen_keys.add(key)
        if to_delete:
            for d in to_delete:
                db.delete(d)
            db.commit()
    except Exception:
        db.rollback()

    # 2. Ensure every valid Doctor user account has a corresponding Doctor record
    try:
        all_users = db.scalars(select(User)).all()
        doc_users = [
            u for u in all_users
            if str(getattr(u, 'role', '')).lower().replace("userrole.", "") == 'doctor'
            and 'pharmacy' not in u.name.lower()
            and 'reception' not in u.name.lower()
        ]
        for du in doc_users:
            if not du.email:
                continue
            email_clean = du.email.lower().strip()
            doc = db.scalar(select(Doctor).where(func.lower(Doctor.email) == email_clean))
            expected_name = du.name if du.name.startswith("Dr.") else f"Dr. {du.name}"
            if not doc:
                new_doc = Doctor(
                    name=expected_name,
                    email=email_clean,
                    department=du.department or "General Medicine",
                    specialization="General Physician",
                    room_no="OPD-101",
                    consultation_fee=500.0,
                    available_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
                    slots=["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
                    status=DoctorStatus.Available,
                    branch=du.branch or "Main Branch",
                )
                db.add(new_doc)
            else:
                if du.branch and doc.branch != du.branch:
                    doc.branch = du.branch
                if du.name and doc.name != expected_name:
                    doc.name = expected_name
                if du.department and doc.department != du.department:
                    doc.department = du.department
        db.commit()
    except Exception:
        db.rollback()

    stmt = select(Doctor)
    role_str = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)) if current_user and current_user.role else ""
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")

    if department and department != "All":
        stmt = stmt.where(func.lower(Doctor.department) == department.lower())

    # Branch scoping: filter by explicit branch query or current user's branch (unless super_admin/admin without filter)
    user_branch = current_user.branch if current_user else None
    target_branch = branch or (user_branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != "all":
        stmt = stmt.where(
            (func.lower(Doctor.branch) == target_branch.lower()) |
            (func.lower(Doctor.branch) == "main branch") |
            (Doctor.branch.is_(None)) |
            (Doctor.branch == "")
        )

    stmt = stmt.offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


@router.post("/doctors", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _=_admin_only):
    data = payload.model_dump()
    if not data.get("branch"):
        data["branch"] = current_user.branch or "Main Branch"
    email_clean = data.get("email", "").lower().strip() if data.get("email") else ""
    existing = None
    if email_clean:
        existing = db.scalar(select(Doctor).where(func.lower(Doctor.email) == email_clean))
    if not existing and data.get("name"):
        existing = db.scalar(select(Doctor).where(func.lower(Doctor.name) == data["name"].lower().strip()))

    if existing:
        for k, v in data.items():
            if v is not None:
                setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    doctor = Doctor(**data)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
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
def list_departments(db: Session = Depends(get_db)):
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
