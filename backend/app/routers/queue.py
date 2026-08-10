from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user, get_own_doctor_id, require_permission
from app.models.appointment import WalkInToken, QueueItem, Appointment
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

    if data.get("patient_uhid"):
        pat = db.scalar(select(Patient).where(Patient.uhid == data["patient_uhid"]))
        if pat:
            data["patient_name"] = f"{pat.first_name} {pat.last_name}".strip()

    if data.get("doctor_name"):
        d_name = data["doctor_name"].lower().strip()
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name) == d_name))
        if doc:
            data["doctor_name"] = doc.name
            if doc.branch:
                data["branch"] = doc.branch

    walkin = WalkInToken(**data)
    db.add(walkin)
    db.commit()
    db.refresh(walkin)

    # Automatically place the walk-in into the live queue
    queue_item = QueueItem(
        token_number=walkin.token_number,
        patient_uhid=walkin.patient_uhid,
        patient_name=walkin.patient_name,
        doctor_name=walkin.doctor_name,
        department=walkin.department,
        status="Waiting",
        waiting_time_minutes=0,
        time_issued=walkin.issue_time,
        branch=walkin.branch,
    )
    db.add(queue_item)
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
    elif department:
        stmt = stmt.where(QueueItem.department == department)

    # Branch scoping: filter by explicit branch query or current user's branch (unless super_admin/admin without filter)
    target_branch = branch or (current_user.branch if role_norm not in ("super_admin", "admin") else None)
    if target_branch and target_branch.lower() != 'all':
        stmt = stmt.where(
            or_(
                func.lower(QueueItem.branch) == target_branch.lower(),
                func.lower(QueueItem.branch) == 'main branch',
                QueueItem.branch.is_(None),
                QueueItem.branch == ''
            )
        )

    stmt = stmt.order_by(QueueItem.created_at.asc())
    return db.scalars(stmt).all()


@router.post("/queue", response_model=QueueItemOut, status_code=status.HTTP_201_CREATED)
def add_to_queue(payload: QueueItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["time_issued"] = data.get("time_issued") or datetime.now().strftime("%H:%M")
    if not data.get("branch"):
        data["branch"] = current_user.branch
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
