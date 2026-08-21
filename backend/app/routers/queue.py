from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user, get_own_doctor_id, require_permission
from app.models.appointment import WalkInToken, QueueItem, Appointment, QueueStatus
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.appointment import (
    WalkInCreate,
    WalkInOut,
    QueueItemCreate,
    QueueItemUpdate,
    QueueItemOut,
)

router = APIRouter(tags=["Walk-in & Queue"])

# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
# Only GET /queue got department scoping in Phase 9 -- walk-in creation and
# queue/status mutations had no permission check at all before that change.
#
# Phase 19: queue.py used to share the "Appointment Mgmt" module with
# appointments.py, since there was no dedicated "Queue"/"Walk-in" entry in
# the frontend's PermissionManagementPage.tsx/RoleManagementPage.tsx
# modulesList at the time. A dedicated "Queue Management" module has now
# been added to both frontend module lists, so this is switched over to it.
# Real behavior consequence, stated plainly rather than glossed over: this is
# a revoke-only model (see require_permission docstring) -- if a Super Admin
# had previously revoked Create/Edit/Delete under "Appointment Mgmt"
# specifically intending to also restrict queue actions (since that was the
# only module available for it before), that revoke will no longer apply to
# queue.py after this split, because it's now checked against a different,
# still-empty "Queue Management" PermissionItem row (which defaults to
# ALLOW, same as every other role with no explicit revoke). Anyone relying
# on that prior coupling needs to re-apply the revoke under the new
# dedicated "Queue Management" module via the Permission Management screen.
_perm_create = Depends(require_permission("Queue Management", "Create"))
_perm_edit = Depends(require_permission("Queue Management", "Edit"))
_perm_delete = Depends(require_permission("Queue Management", "Delete"))


def _next_token_number(db: Session) -> str:
    count = db.query(WalkInToken).count() + 1
    return f"TK-{100 + count}"


# --- Walk-in tokens ---
#
# NOTE (cleanup pass): GET/PUT/DELETE /walkins and the /walkins POST alias
# were previously flagged across several changelog phases as possibly-dead
# code. Confirmed dead by grepping the entire frontend source for "/walkins"
# -- zero references anywhere. The frontend only ever calls POST
# /queue/walk-in (kept below) to issue a walk-in token; nothing lists,
# edits, or deletes a WalkInToken directly through this router path.
# Removed the unused GET/PUT/DELETE/duplicate-POST routes rather than
# leaving confusing dead API surface. The WalkInToken model, its automatic
# QueueItem creation, and the real /queue/walk-in creation path are all
# unchanged.

@router.post("/queue/walk-in", response_model=WalkInOut, status_code=status.HTTP_201_CREATED)
def issue_walkin_token(payload: WalkInCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    from app.models.doctor import Doctor
    from app.models.patient import Patient

    data = payload.model_dump()
    data["token_number"] = data.get("token_number") or _next_token_number(db)
    data["issue_time"] = data.get("issue_time") or datetime.now().strftime("%H:%M")
    if not data.get("branch"):
        data["branch"] = current_user.branch or "Main Branch"

    matched_patient = None
    if data.get("patient_uhid"):
        matched_patient = db.scalar(select(Patient).where(Patient.uhid == data["patient_uhid"]))
        if matched_patient:
            data["patient_name"] = f"{matched_patient.first_name} {matched_patient.last_name}".strip()

    if data.get("doctor_name"):
        d_name = data["doctor_name"].lower().strip()
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name) == d_name))
        if doc:
            data["doctor_name"] = doc.name
            if doc.branch:
                data["branch"] = doc.branch

    is_emergency_flag = bool(
        data.get("is_emergency")
        or (matched_patient and getattr(matched_patient, "is_emergency", False))
        or (matched_patient and getattr(matched_patient, "status", "") and matched_patient.status.lower() == "emergency")
    )
    prio_val = 10 if is_emergency_flag else 0

    walkin = WalkInToken(**data)
    db.add(walkin)
    db.commit()
    db.refresh(walkin)

    # Automatically place the walk-in into the live queue
    queue_item = QueueItem(
        token_number=walkin.token_number,
        patient_uhid=walkin.patient_uhid,
        patient_name=walkin.patient_name,
        blood_group=matched_patient.blood_group.value if matched_patient and getattr(matched_patient.blood_group, "value", None) else None,
        doctor_name=walkin.doctor_name,
        department=walkin.department,
        status=QueueStatus.Waiting,
        waiting_time_minutes=0,
        is_emergency=is_emergency_flag,
        priority=prio_val,
        time_issued=walkin.issue_time,
        branch=walkin.branch,
    )
    db.add(queue_item)

    # Automatically create/sync corresponding Appointment record so it is stored in DB for OPD & Doctor Consultation
    try:
        matched_doc = None
        if data.get("doctor_name"):
            d_clean = data["doctor_name"].lower().replace("dr.", "").strip()
            matched_doc = db.scalar(
                select(Doctor).where(
                    or_(
                        func.lower(Doctor.name).contains(d_clean),
                        func.lower(Doctor.name) == data["doctor_name"].lower().strip()
                    )
                )
            )

        from app.models.appointment import Appointment, AppointmentStatus
        from app.core.crud_utils import today_str

        apt = Appointment(
            patient_uhid=walkin.patient_uhid,
            patient_name=walkin.patient_name,
            patient_mobile=matched_patient.phone if (matched_patient and hasattr(matched_patient, 'phone')) else "",
            department=walkin.department,
            doctor_id=matched_doc.id if matched_doc else None,
            doctor_name=walkin.doctor_name,
            date=today_str(),
            time_slot=walkin.issue_time,
            reason="Walk-in OPD Consultation",
            type="OPD",
            status=AppointmentStatus.Scheduled,
            branch=walkin.branch,
            booking_source="Walk-in",
            token_number=walkin.token_number,
            is_emergency=is_emergency_flag,
            priority=prio_val,
        )
        db.add(apt)
    except Exception as e:
        print(f"Warning: Failed to create Appointment record for walkin token: {e}")

    db.commit()
    return walkin


# --- Live queue ---

@router.get("/queue", response_model=list[QueueItemOut])
def list_queue(
    department: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_doctor_id: str | None = Depends(get_own_doctor_id),
):
    from sqlalchemy import case
    stmt = select(QueueItem)
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    role_norm = role_str.lower().replace(" ", "_").replace("userrole.", "")

    if current_user.role == UserRole.doctor:
        if own_doctor_id:
            doctor = db.get(Doctor, own_doctor_id)
            if doctor:
                stmt = stmt.where(QueueItem.doctor_name == doctor.name)
        else:
            stmt = stmt.where(QueueItem.doctor_name == "__none__")
    elif department and department.lower() != 'all':
        dept_clean = department.lower().strip()
        import re
        dept_clean = re.sub(r'\s*\([^)]*\)', '', dept_clean).strip()
        stmt = stmt.where(
            or_(
                func.lower(QueueItem.department) == department.lower(),
                func.lower(QueueItem.department).contains(dept_clean)
            )
        )

    # Branch scoping: filter by explicit branch query parameter or current user's branch
    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != 'all':
        norm_sub = target_branch.lower().replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
        q_branch_clauses = [
            func.lower(QueueItem.branch) == target_branch.lower(),
        ]
        if norm_sub:
            q_branch_clauses.append(func.lower(QueueItem.branch).contains(norm_sub))
        if norm_sub == "main" or target_branch.lower() == "main branch":
            q_branch_clauses.extend([
                QueueItem.branch.is_(None),
                QueueItem.branch == "",
                func.lower(QueueItem.branch) == "main branch",
            ])
        stmt = stmt.where(or_(*q_branch_clauses))

    # Order by: 1. Active items first (Waiting, In Consultation, On Hold -> 0), Completed -> 1, Skipped -> 2
    # 2. is_emergency True first (desc)
    # 3. priority desc
    # 4. created_at asc
    status_order = case(
        (QueueItem.status == QueueStatus.Completed, 1),
        (QueueItem.status == QueueStatus.Skipped, 2),
        else_=0,
    )
    stmt = stmt.order_by(
        status_order.asc(),
        QueueItem.is_emergency.desc(),
        QueueItem.priority.desc(),
        QueueItem.created_at.asc(),
    )
    items = db.scalars(stmt).all()
    for it in items:
        if (it.token_number and str(it.token_number).startswith("E-")) and not it.is_emergency:
            it.is_emergency = True
            it.priority = it.priority or 1
    return items


@router.post("/queue", response_model=QueueItemOut, status_code=status.HTTP_201_CREATED)
def add_to_queue(payload: QueueItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["time_issued"] = data.get("time_issued") or datetime.now().strftime("%H:%M")
    if not data.get("branch"):
        data["branch"] = current_user.branch
    if data.get("token_number") and str(data.get("token_number")).startswith("E-"):
        data["is_emergency"] = True
        data["priority"] = data.get("priority") or 1
    item = QueueItem(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/queue/{queue_id}", response_model=QueueItemOut)
def update_queue_item(
    queue_id: str, payload: QueueItemUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    apply_updates(item, payload)
    db.commit()
    db.refresh(item)
    return item


@router.put("/queue/{queue_id}/status", response_model=QueueItemOut)
def update_queue_status(
    queue_id: str, status: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    item.status = status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/queue/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_queue(queue_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    db.delete(item)
    db.commit()
