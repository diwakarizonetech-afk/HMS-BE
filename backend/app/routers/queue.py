from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user, get_own_doctor_id, require_permission
from app.models.appointment import WalkInToken, QueueItem, Appointment
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.appointment import (
    WalkInCreate,
    WalkInUpdate,
    WalkInOut,
    QueueItemCreate,
    QueueItemUpdate,
    QueueItemOut,
)

router = APIRouter(tags=["Walk-in & Queue"])

# Permission-matrix enforcement (see deps.py::require_permission for the
# revoke-only design decision, and CHANGELOG.md Phase 10 for the reasoning).
# Only GET /queue got department scoping in Phase 9 -- walk-in creation and
# queue/status mutations had no permission check at all before this change.
# There's no dedicated "Queue"/"Walk-in" entry in the frontend's
# PermissionManagementPage.tsx modulesList, so this uses "Appointment Mgmt",
# the closest existing module: a walk-in is a same-day, unscheduled
# appointment/visit, and the live queue tracks visit status for both
# scheduled and walk-in patients -- functionally the same OPD-scheduling
# concern "Appointment Mgmt" already governs for appointments.py.
_perm_create = Depends(require_permission("Appointment Mgmt", "Create"))
_perm_edit = Depends(require_permission("Appointment Mgmt", "Edit"))
_perm_delete = Depends(require_permission("Appointment Mgmt", "Delete"))


def _next_token_number(db: Session) -> str:
    count = db.query(WalkInToken).count() + 1
    return f"TK-{100 + count}"


# --- Walk-in tokens ---

@router.get("/walkins", response_model=list[WalkInOut])
def list_walkins(db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    stmt = select(WalkInToken).order_by(WalkInToken.created_at.desc())
    return db.scalars(stmt).all()


@router.post("/walkins", response_model=WalkInOut, status_code=status.HTTP_201_CREATED)
@router.post("/queue/walk-in", response_model=WalkInOut, status_code=status.HTTP_201_CREATED)
def issue_walkin_token(payload: WalkInCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["token_number"] = data.get("token_number") or _next_token_number(db)
    data["issue_time"] = data.get("issue_time") or datetime.now().strftime("%H:%M")
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
    )
    db.add(queue_item)
    db.commit()
    return walkin


@router.put("/walkins/{walkin_id}", response_model=WalkInOut)
def update_walkin(
    walkin_id: str, payload: WalkInUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_edit
):
    walkin = get_or_404(db, WalkInToken, walkin_id, "Walk-in token")
    apply_updates(walkin, payload)
    db.commit()
    db.refresh(walkin)
    return walkin


@router.delete("/walkins/{walkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_walkin(walkin_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_delete):
    walkin = get_or_404(db, WalkInToken, walkin_id, "Walk-in token")
    db.delete(walkin)
    db.commit()


# --- Live queue ---

@router.get("/queue", response_model=list[QueueItemOut])
def list_queue(
    department: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    own_doctor_id: str | None = Depends(get_own_doctor_id),
):
    total_q_count = db.scalar(select(func.count(QueueItem.id))) or 0
    if total_q_count == 0:
        apts = list(db.scalars(select(Appointment)).all())
        if apts:
            for a in apts:
                token_str = f"T-{str(a.id)[:4].upper()}"
                q_item = QueueItem(
                    token_number=token_str,
                    patient_uhid=a.patient_uhid,
                    patient_name=a.patient_name,
                    doctor_name=a.doctor_name,
                    department=a.department or "General Medicine",
                    status="Completed" if str(a.status).lower() == "completed" else "Waiting",
                    waiting_time_minutes=15,
                    time_issued=a.time_slot or datetime.now().strftime("%H:%M"),
                )
                db.add(q_item)
            try:
                db.commit()
            except Exception:
                db.rollback()
        else:
            seed_q = [
                QueueItem(token_number="T-101", patient_uhid="UHID-88201", patient_name="Rahul Verma", doctor_name="Dr. Vikram Malhotra", department="Cardiology", status="Waiting", waiting_time_minutes=15, time_issued="09:30 AM"),
                QueueItem(token_number="T-102", patient_uhid="UHID-88202", patient_name="Priya Sharma", doctor_name="Dr. Ananya Roy", department="General Medicine", status="In Consultation", waiting_time_minutes=0, time_issued="10:00 AM"),
                QueueItem(token_number="T-103", patient_uhid="UHID-88203", patient_name="Amitabh Bachchan", doctor_name="Dr. Rajesh Sharma", department="Orthopedics", status="Waiting", waiting_time_minutes=30, time_issued="10:30 AM"),
            ]
            for item in seed_q:
                db.add(item)
            try:
                db.commit()
            except Exception:
                db.rollback()

    stmt = select(QueueItem)
    if current_user.role == UserRole.doctor:
        if own_doctor_id:
            doctor = db.get(Doctor, own_doctor_id)
            if doctor:
                stmt = stmt.where(QueueItem.doctor_name == doctor.name)
        else:
            stmt = stmt.where(QueueItem.doctor_name == "__none__")
    elif department:
        stmt = stmt.where(QueueItem.department == department)
    stmt = stmt.order_by(QueueItem.created_at.asc())
    return db.scalars(stmt).all()


@router.post("/queue", response_model=QueueItemOut, status_code=status.HTTP_201_CREATED)
def add_to_queue(payload: QueueItemCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user), _perm=_perm_create):
    data = payload.model_dump()
    data["time_issued"] = data.get("time_issued") or datetime.now().strftime("%H:%M")
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
