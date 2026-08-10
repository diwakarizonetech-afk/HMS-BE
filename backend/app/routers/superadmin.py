from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.logging_utils import log_audit
from app.core.security import hash_password
from app.deps import get_current_active_user, require_roles
from app.models.user import User, UserRole
from app.models.doctor import Doctor, DoctorStatus
from app.models.notification import NotificationType
from app.models.superadmin import (
    HospitalProfile, Branch, Specialization, ConsultationCharge,
    WorkingHours, LeaveRequest, ShiftRotation, RoleItem,
    PermissionItem, DepartmentAssignment, LoginHistoryItem
)
from app.schemas.superadmin import (
    HospitalProfileCreate, HospitalProfileOut,
    BranchCreate, BranchOut,
    SpecializationCreate, SpecializationOut,
    ConsultationChargeCreate, ConsultationChargeOut,
    WorkingHoursCreate, WorkingHoursOut,
    LeaveRequestCreate, LeaveRequestOut,
    ShiftRotationCreate, ShiftRotationOut,
    RoleItemCreate, RoleItemOut,
    PermissionItemCreate, PermissionItemOut,
    DepartmentAssignmentCreate, DepartmentAssignmentOut,
    LoginHistoryItemOut
)
from app.schemas.user import UserCreate, UserOut, UserUpdate, PasswordResetRequest
from app.services.notification_service import notify_user_or_role

router = APIRouter(tags=["Super Admin"])

# Convenience shorthand dependencies
_admin_only = Depends(require_roles(UserRole.super_admin, UserRole.admin))
_any_auth   = Depends(get_current_active_user)


# ─────────────────────────── Hospital Profile ────────────────────────────────

@router.get("/hospital-profile", response_model=HospitalProfileOut | None)
def get_hospital_profile(db: Session = Depends(get_db), _=_any_auth):
    return db.scalar(select(HospitalProfile).limit(1))


@router.post("/hospital-profile", response_model=HospitalProfileOut)
@router.put("/hospital-profile", response_model=HospitalProfileOut)
def save_hospital_profile(payload: HospitalProfileCreate, db: Session = Depends(get_db), _=_admin_only):
    profile = db.scalar(select(HospitalProfile).limit(1))
    if not profile:
        profile = HospitalProfile(**payload.model_dump())
        db.add(profile)
    else:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    log_audit("POST/PUT /hospital-profile", payload, payload.model_dump(), profile, profile)
    notify_user_or_role(
        db, title="Hospital Profile Updated",
        message="Hospital profile settings and details were updated.",
        module="hospital", event_type="profile_updated", recipient_role="super_admin"
    )
    return profile


# ─────────────────────────────── Branches ─────────────────────────────────────

@router.get("/branches", response_model=list[BranchOut])
def get_branches(db: Session = Depends(get_db)):
    return list(db.scalars(select(Branch).order_by(Branch.created_at.desc())).all())


@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(payload: BranchCreate, db: Session = Depends(get_db), _=_admin_only):
    branch = Branch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    log_audit("POST /branches", payload, payload.model_dump(), branch, branch)
    notify_user_or_role(
        db, title="New Branch Created",
        message=f"Branch '{branch.branch_name}' was created.",
        module="hospital", event_type="branch_created", recipient_role="super_admin", related_record_id=branch.id
    )
    return branch


@router.put("/branches/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    branch = db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    field_map = {
        "branchName": "branch_name",
        "branchCode": "branch_code",
        "managerName": "manager_name",
        "isMainBranch": "is_main_branch",
        "bedCapacity": "bed_capacity",
        "totalStaff": "total_staff",
    }
    for field, value in payload.items():
        col = field_map.get(field, field)
        if hasattr(branch, col) and value is not None:
            setattr(branch, col, value)
    db.commit()
    db.refresh(branch)
    log_audit(f"PUT /branches/{branch_id}", payload, payload, branch, branch)
    return branch


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(branch_id: str, db: Session = Depends(get_db), _=_admin_only):
    branch = db.get(Branch, branch_id)
    if branch:
        db.delete(branch)
        db.commit()


# ──────────────────────────── Specializations ─────────────────────────────────

@router.get("/specializations", response_model=list[SpecializationOut])
def get_specializations(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(Specialization).order_by(Specialization.created_at.desc())).all())


@router.post("/specializations", response_model=SpecializationOut, status_code=status.HTTP_201_CREATED)
def create_specialization(payload: SpecializationCreate, db: Session = Depends(get_db), _=_admin_only):
    data = payload.model_dump()
    code_val = data.get("code") or f"SPC-{(data.get('specialization_name') or 'GEN')[:4].upper()}"
    dept_val = data.get("department_name") or "General"
    spec = Specialization(
        specialization_name=data["specialization_name"],
        code=code_val,
        department_name=dept_val,
        description=data.get("description"),
        status=data.get("status") or "Active",
    )
    db.add(spec)
    db.commit()
    db.refresh(spec)
    log_audit("POST /specializations", payload, payload.model_dump(), spec, spec)
    return spec


@router.put("/specializations/{spec_id}", response_model=SpecializationOut)
def update_specialization(spec_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    spec = db.get(Specialization, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Specialization not found")
    field_map = {
        "specializationName": "specialization_name",
        "associatedDepartment": "department_name",
        "departmentName": "department_name",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(spec, col) and v is not None:
            setattr(spec, col, v)
    db.commit()
    db.refresh(spec)
    log_audit(f"PUT /specializations/{spec_id}", payload, payload, spec, spec)
    return spec


@router.delete("/specializations/{spec_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_specialization(spec_id: str, db: Session = Depends(get_db), _=_admin_only):
    spec = db.get(Specialization, spec_id)
    if spec:
        db.delete(spec)
        db.commit()


# ───────────────────────── Consultation Charges ───────────────────────────────

@router.get("/consultation-charges", response_model=list[ConsultationChargeOut])
def get_consultation_charges(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(ConsultationCharge).order_by(ConsultationCharge.created_at.desc())).all())


@router.post("/consultation-charges", response_model=ConsultationChargeOut, status_code=status.HTTP_201_CREATED)
def create_consultation_charge(payload: ConsultationChargeCreate, db: Session = Depends(get_db), _=_admin_only):
    charge = ConsultationCharge(**payload.model_dump())
    db.add(charge)
    db.commit()
    db.refresh(charge)
    log_audit("POST /consultation-charges", payload, payload.model_dump(), charge, charge)
    return charge


@router.put("/consultation-charges/{charge_id}", response_model=ConsultationChargeOut)
def update_consultation_charge(charge_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    charge = db.get(ConsultationCharge, charge_id)
    if not charge:
        raise HTTPException(status_code=404, detail="Consultation charge not found")
    field_map = {
        "doctorId": "doctor_id",
        "doctorName": "doctor_name",
        "consultationFee": "consultation_fee",
        "followUpFee": "follow_up_fee",
        "emergencyFee": "emergency_fee",
        "validityDays": "validity_days",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(charge, col) and v is not None:
            setattr(charge, col, v)
    db.commit()
    db.refresh(charge)
    log_audit(f"PUT /consultation-charges/{charge_id}", payload, payload, charge, charge)
    return charge


@router.delete("/consultation-charges/{charge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consultation_charge(charge_id: str, db: Session = Depends(get_db), _=_admin_only):
    charge = db.get(ConsultationCharge, charge_id)
    if charge:
        db.delete(charge)
        db.commit()


# ───────────────────────────── Working Hours ──────────────────────────────────

@router.get("/working-hours", response_model=list[WorkingHoursOut])
def get_working_hours(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(WorkingHours)).all())


@router.post("/working-hours", response_model=WorkingHoursOut, status_code=status.HTTP_201_CREATED)
def create_working_hours(payload: WorkingHoursCreate, db: Session = Depends(get_db), _=_admin_only):
    data = payload.model_dump()
    day_val = data.get("day_of_week") or "Monday"
    if isinstance(day_val, list):
        day_val = ", ".join(day_val)
    wh = WorkingHours(
        department=data.get("department") or "General",
        day_of_week=str(day_val),
        start_time=data.get("start_time") or "08:00 AM",
        end_time=data.get("end_time") or "05:00 PM",
        slot_duration_minutes=data.get("slot_duration_minutes") if data.get("slot_duration_minutes") is not None else 15,
        max_patients_per_slot=data.get("max_patients_per_slot") if data.get("max_patients_per_slot") is not None else 1,
        is_working_day=data.get("is_working_day") if data.get("is_working_day") is not None else True,
    )
    try:
        db.add(wh)
        db.commit()
        db.refresh(wh)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to create working hours: {str(ex)}")
    log_audit("POST /working-hours", payload, payload.model_dump(), wh, wh)
    return wh


@router.put("/working-hours/{wh_id}", response_model=WorkingHoursOut)
def update_working_hours(wh_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    wh = db.get(WorkingHours, wh_id)
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working hours record not found")
    field_map = {
        "dayOfWeek": "day_of_week",
        "workingDays": "day_of_week",
        "startTime": "start_time",
        "endTime": "end_time",
        "slotDurationMinutes": "slot_duration_minutes",
        "maxPatientsPerSlot": "max_patients_per_slot",
        "isWorkingDay": "is_working_day",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if col == "day_of_week" and isinstance(v, list):
            v = ", ".join(v)
        if hasattr(wh, col) and v is not None:
            setattr(wh, col, v)
    try:
        db.commit()
        db.refresh(wh)
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to update working hours: {str(ex)}")
    log_audit(f"PUT /working-hours/{wh_id}", payload, payload, wh, wh)
    return wh


@router.delete("/working-hours/{wh_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_working_hours(wh_id: str, db: Session = Depends(get_db), _=_admin_only):
    wh = db.get(WorkingHours, wh_id)
    if wh:
        db.delete(wh)
        db.commit()


# ─────────────────────────────── Leaves ───────────────────────────────────────

def _resolve_employee_target_role(role_str: str | None, dept_str: str | None) -> str:
    r = (role_str or "").lower()
    d = (dept_str or "").lower()
    if "store" in r or "store" in d or "inventory" in d:
        return "store"
    if "nurse" in r or "nurse" in d or "nursing" in d:
        return "nurse"
    if "doctor" in r or "doctor" in d:
        return "doctor"
    if "reception" in r or "front" in d:
        return "reception"
    if "admin" in r or "super" in r:
        return "super_admin"
    return "reception"


@router.get("/leaves", response_model=list[LeaveRequestOut])
def get_leaves(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(LeaveRequest).order_by(LeaveRequest.created_at.desc())).all())


@router.post("/leaves", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_leave(payload: LeaveRequestCreate, db: Session = Depends(get_db), _=_any_auth):
    lv = LeaveRequest(**payload.model_dump())
    db.add(lv)
    db.commit()
    db.refresh(lv)
    log_audit("POST /leaves", payload, payload.model_dump(), lv, lv)

    target_role = _resolve_employee_target_role(lv.role, lv.department)

    notify_user_or_role(
        db, title="New Leave Request Submitted",
        message=f"Leave request submitted by {lv.employee_name or 'Staff'} ({lv.leave_type or 'Leave'}, {lv.total_days} days).",
        module="leave", event_type="leave_submitted", recipient_role="super_admin", related_record_id=lv.id
    )
    notify_user_or_role(
        db, title="Leave Request Submitted",
        message=f"Your leave request ({lv.leave_type or 'Leave'}) was submitted and is pending review.",
        module="leave", event_type="leave_submitted", recipient_role=target_role, related_record_id=lv.id
    )
    return lv


@router.put("/leaves/{leave_id}", response_model=LeaveRequestOut)
def update_leave(leave_id: str, payload: dict, db: Session = Depends(get_db), _=_any_auth):
    lv = db.get(LeaveRequest, leave_id)
    if not lv:
        raise HTTPException(status_code=404, detail="Leave request not found")
    field_map = {
        "employeeId": "employee_id",
        "employeeName": "employee_name",
        "leaveType": "leave_type",
        "fromDate": "start_date",
        "startDate": "start_date",
        "toDate": "end_date",
        "endDate": "end_date",
        "totalDays": "total_days",
        "approvalStatus": "approval_status",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(lv, col) and v is not None:
            setattr(lv, col, v)
    db.commit()
    db.refresh(lv)
    log_audit(f"PUT /leaves/{leave_id}", payload, payload, lv, lv)

    status_val = payload.get("approval_status") or payload.get("status") or lv.approval_status or "Updated"
    status_lower = str(status_val).lower()

    target_role = _resolve_employee_target_role(lv.role, lv.department)
    notif_type = NotificationType.success if status_lower == "approved" else (NotificationType.warning if status_lower in ["rejected", "cancelled"] else NotificationType.info)

    # Find employee's user account if present
    target_user = db.scalar(
        select(User).where(
            (User.employee_id == lv.employee_id) | (User.name == lv.employee_name)
        )
    )

    if target_user:
        notify_user_or_role(
            db, title=f"Leave Request {status_val.capitalize()}",
            message=f"Your leave request for {lv.leave_type} ({lv.start_date} to {lv.end_date}) has been {status_lower}.",
            module="leave", event_type=f"leave_{status_lower}", user_id=target_user.id, related_record_id=lv.id, notification_type=notif_type
        )

    # Send back notification to employee's portal module (reception, store, nurse, doctor)
    notify_user_or_role(
        db, title=f"Leave Request {status_val.capitalize()}",
        message=f"Leave request for {lv.employee_name} ({lv.leave_type}) was {status_lower}.",
        module="leave", event_type=f"leave_{status_lower}", recipient_role=target_role, related_record_id=lv.id, notification_type=notif_type
    )

    # Notify Super Admin / Manager
    notify_user_or_role(
        db, title=f"Leave Request {status_val.capitalize()}",
        message=f"Leave request for {lv.employee_name} ({lv.department}) status updated to {status_val}.",
        module="leave", event_type=f"leave_{status_lower}", recipient_role="super_admin", related_record_id=lv.id, notification_type=notif_type
    )
    return lv


@router.delete("/leaves/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave(leave_id: str, db: Session = Depends(get_db), _=_admin_only):
    lv = db.get(LeaveRequest, leave_id)
    if lv:
        db.delete(lv)
        db.commit()


# ─────────────────────────────── Shifts ───────────────────────────────────────

@router.get("/shifts", response_model=list[ShiftRotationOut])
def get_shifts(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(ShiftRotation).order_by(ShiftRotation.created_at.desc())).all())


@router.post("/shifts", response_model=ShiftRotationOut, status_code=status.HTTP_201_CREATED)
def create_shift(payload: ShiftRotationCreate, db: Session = Depends(get_db), _=_admin_only):
    sft = ShiftRotation(**payload.model_dump())
    db.add(sft)
    db.commit()
    db.refresh(sft)
    log_audit("POST /shifts", payload, payload.model_dump(), sft, sft)
    notify_user_or_role(
        db, title="Shift Roster Assigned",
        message=f"Shift {sft.assigned_shift or 'Rotation'} assigned to {sft.employee_name or 'Staff'}.",
        module="shift", event_type="shift_assigned", recipient_role="nurse", related_record_id=sft.id
    )
    notify_user_or_role(
        db, title="Shift Roster Assigned",
        message=f"Shift {sft.assigned_shift or 'Rotation'} assigned to {sft.employee_name or 'Staff'}.",
        module="shift", event_type="shift_assigned", recipient_role="reception", related_record_id=sft.id
    )
    return sft


@router.put("/shifts/{shift_id}", response_model=ShiftRotationOut)
def update_shift(shift_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    sft = db.get(ShiftRotation, shift_id)
    if not sft:
        raise HTTPException(status_code=404, detail="Shift record not found")
    field_map = {
        "employeeId": "employee_id",
        "employeeName": "employee_name",
        "morningShift": "morning_shift",
        "eveningShift": "evening_shift",
        "nightShift": "night_shift",
        "assignedShift": "assigned_shift",
        "effectiveDate": "effective_date",
        "startDate": "start_date",
        "endDate": "end_date",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(sft, col):
            setattr(sft, col, v)
    db.commit()
    db.refresh(sft)
    log_audit(f"PUT /shifts/{shift_id}", payload, payload, sft, sft)
    return sft


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(shift_id: str, db: Session = Depends(get_db), _=_admin_only):
    sft = db.get(ShiftRotation, shift_id)
    if sft:
        db.delete(sft)
        db.commit()


# ─────────────────────────── Roles & Permissions ──────────────────────────────

@router.get("/roles", response_model=list[RoleItemOut])
def get_roles(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(RoleItem)).all())


@router.post("/roles", response_model=RoleItemOut, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleItemCreate, db: Session = Depends(get_db), _=_admin_only):
    role = RoleItem(**payload.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    log_audit("POST /roles", payload, payload.model_dump(), role, role)
    return role


@router.put("/roles/{role_id}", response_model=RoleItemOut)
def update_role(role_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    role = db.get(RoleItem, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    field_map = {
        "roleName": "role_name",
        "roleCode": "role_code",
        "isSystemDefault": "is_system_default",
        "assignedUserCount": "assigned_user_count",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(role, col) and v is not None:
            setattr(role, col, v)
    db.commit()
    db.refresh(role)
    log_audit(f"PUT /roles/{role_id}", payload, payload, role, role)
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: str, db: Session = Depends(get_db), _=_admin_only):
    role = db.get(RoleItem, role_id)
    if role:
        if role.is_system_default:
            raise HTTPException(status_code=400, detail="System default role cannot be deleted")
        db.delete(role)
        db.commit()


@router.get("/permissions", response_model=list[PermissionItemOut])
def get_permissions(db: Session = Depends(get_db), _=_admin_only):
    return list(db.scalars(select(PermissionItem)).all())


@router.post("/permissions", response_model=PermissionItemOut, status_code=status.HTTP_201_CREATED)
def set_permission(payload: PermissionItemCreate, db: Session = Depends(get_db), _=_admin_only):
    """Upsert a single (role, module, action) permission grant. Toggling a permission
    in the Role/Permission Management UI calls this to persist the change instead of
    only updating local React state."""
    existing = db.scalar(
        select(PermissionItem).where(
            PermissionItem.role_id == payload.role_id,
            PermissionItem.module_name == payload.module_name,
            PermissionItem.action == payload.action,
        )
    )
    if existing:
        existing.is_granted = payload.is_granted
        db.commit()
        db.refresh(existing)
        log_audit("POST /permissions (update)", payload, payload.model_dump(), existing, existing)
        return existing
    perm = PermissionItem(**payload.model_dump())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    log_audit("POST /permissions (create)", payload, payload.model_dump(), perm, perm)
    return perm


def normalize_role_value(role_str: str | None) -> str:
    if not role_str:
        return "pharmacy"
    clean = role_str.strip().lower().replace(" ", "_")
    if "pharmacy" in clean or "pharmacist" in clean:
        return "pharmacy"
    if "reception" in clean or "receptionist" in clean or "cashier" in clean:
        return "reception"
    if "lab" in clean:
        return "lab"
    if "store" in clean:
        return "store"
    if "nurse" in clean:
        return "nurse"
    if "super" in clean or "admin" in clean:
        return "super_admin"
    if "doctor" in clean or "physician" in clean:
        return "doctor"
    if "patient" in clean:
        return "patient"
    return "pharmacy"


# ─────────────────────────── User Management ──────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(User).order_by(User.created_at.desc())).all())


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _=_admin_only):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    
    clean_role = normalize_role_value(payload.role)

    user = User(
        name=payload.name,
        username=payload.username,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=clean_role,
        avatar=payload.avatar,
        department=payload.department,
        assigned_ward=payload.assigned_ward,
        branch=payload.branch or "Main Branch",
        employee_id=payload.employee_id,
        phone=payload.phone,
        status=payload.status or "Active",
        last_login=payload.last_login,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if clean_role == "doctor":
        existing_doc = db.scalar(select(Doctor).where(Doctor.email == payload.email.lower()))
        if not existing_doc:
            doc = Doctor(
                name=payload.name if payload.name.startswith("Dr.") else f"Dr. {payload.name}",
                email=payload.email.lower(),
                department=payload.department or "General Medicine",
                specialization="General Physician",
                room_no="OPD-101",
                consultation_fee=500.0,
                available_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
                slots=["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
                status=DoctorStatus.Available,
            )
            db.add(doc)
            try:
                db.commit()
            except Exception:
                db.rollback()

    log_audit("POST /users", payload, payload.model_dump(), user, user)
    notify_user_or_role(
        db, title="Account Created Successfully",
        message=f"Welcome {user.name}! Your account has been created with role '{user.role}'.",
        module="user", event_type="user_created", user_id=user.id, related_record_id=user.id
    )
    notify_user_or_role(
        db, title="New User Created",
        message=f"New user {user.name} ({user.role}) was registered.",
        module="user", event_type="user_created", recipient_role="super_admin", related_record_id=user.id
    )
    return user



@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), _=_admin_only):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    old_email = user.email
    for k, v in data.items():
        if hasattr(user, k) and v is not None:
            if k == "role":
                v = normalize_role_value(v)
            setattr(user, k, v)
    db.commit()
    db.refresh(user)

    if user.role == "doctor":
        doc = db.scalar(select(Doctor).where((Doctor.email == old_email.lower()) | (Doctor.email == user.email.lower())))
        if doc:
            doc.name = user.name if user.name.startswith("Dr.") else f"Dr. {user.name}"
            doc.email = user.email.lower()
            doc.department = user.department or doc.department
            try:
                db.commit()
            except Exception:
                db.rollback()
        else:
            new_doc = Doctor(
                name=user.name if user.name.startswith("Dr.") else f"Dr. {user.name}",
                email=user.email.lower(),
                department=user.department or "General Medicine",
                specialization="General Physician",
                room_no="OPD-101",
                consultation_fee=500.0,
                available_days=["Mon", "Tue", "Wed", "Thu", "Fri"],
                slots=["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
                status=DoctorStatus.Available,
            )
            db.add(new_doc)
            try:
                db.commit()
            except Exception:
                db.rollback()

    log_audit(f"PUT /users/{user_id}", payload, data, user, user)
    notify_user_or_role(
        db, title="User Role & Profile Updated",
        message=f"User account for {user.name} was updated.",
        module="user", event_type="role_updated", user_id=user.id, related_record_id=user.id
    )
    notify_user_or_role(
        db, title="User Updated",
        message=f"User {user.name} details were updated.",
        module="user", event_type="role_updated", recipient_role="super_admin", related_record_id=user.id
    )
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, db: Session = Depends(get_db), _=_admin_only):
    user = db.get(User, user_id)
    if user:
        db.delete(user)
        db.commit()


@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: str, payload: PasswordResetRequest, db: Session = Depends(get_db), _=_admin_only):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_audit(f"POST /users/{user_id}/reset-password", payload, payload.model_dump(), user, {"message": "Password reset successfully"})
    return {"message": "Password reset successfully"}


@router.put("/users/{user_id}/toggle-status", response_model=UserOut)
def toggle_user_status(user_id: str, db: Session = Depends(get_db), _=_admin_only):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "Inactive" if user.status == "Active" else "Active"
    user.is_active = (user.status == "Active")
    db.commit()
    db.refresh(user)
    log_audit(f"PUT /users/{user_id}/toggle-status", {}, {}, user, user)
    return user


# ──────────────────────── Department Assignments ──────────────────────────────

@router.get("/department-assignments", response_model=list[DepartmentAssignmentOut])
def get_department_assignments(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(DepartmentAssignment).order_by(DepartmentAssignment.created_at.desc())).all())


@router.post("/department-assignments", response_model=DepartmentAssignmentOut, status_code=status.HTTP_201_CREATED)
def create_department_assignment(payload: DepartmentAssignmentCreate, db: Session = Depends(get_db), _=_admin_only):
    da = DepartmentAssignment(**payload.model_dump())
    db.add(da)
    db.commit()
    db.refresh(da)
    log_audit("POST /department-assignments", payload, payload.model_dump(), da, da)
    return da


@router.put("/department-assignments/{da_id}", response_model=DepartmentAssignmentOut)
def update_department_assignment(da_id: str, payload: dict, db: Session = Depends(get_db), _=_admin_only):
    da = db.get(DepartmentAssignment, da_id)
    if not da:
        raise HTTPException(status_code=404, detail="Department assignment not found")
    field_map = {
        "employeeId": "employee_id",
        "employeeName": "employee_name",
        "primaryDepartment": "primary_department",
        "department": "primary_department",
        "secondaryDepartment": "secondary_department",
        "shiftType": "shift_type",
        "assignedDate": "assigned_date",
        "effectiveDate": "assigned_date",
    }
    for k, v in payload.items():
        col = field_map.get(k, k)
        if hasattr(da, col) and v is not None:
            setattr(da, col, v)
    db.commit()
    db.refresh(da)
    log_audit(f"PUT /department-assignments/{da_id}", payload, payload, da, da)
    return da


@router.delete("/department-assignments/{da_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department_assignment(da_id: str, db: Session = Depends(get_db), _=_admin_only):
    da = db.get(DepartmentAssignment, da_id)
    if da:
        db.delete(da)
        db.commit()


# ─────────────────────────── Login History ────────────────────────────────────

@router.get("/login-history", response_model=list[LoginHistoryItemOut])
def get_login_history(db: Session = Depends(get_db), _=_any_auth):
    return list(db.scalars(select(LoginHistoryItem).order_by(LoginHistoryItem.created_at.desc())).all())
