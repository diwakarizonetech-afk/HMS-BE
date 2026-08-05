from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.appointment import WalkInToken, QueueItem
from app.schemas.appointment import (
    WalkInCreate,
    WalkInUpdate,
    WalkInOut,
    QueueItemCreate,
    QueueItemUpdate,
    QueueItemOut,
)

router = APIRouter(tags=["Walk-in & Queue"])


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
def issue_walkin_token(payload: WalkInCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
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
    walkin_id: str, payload: WalkInUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    walkin = get_or_404(db, WalkInToken, walkin_id, "Walk-in token")
    apply_updates(walkin, payload)
    db.commit()
    db.refresh(walkin)
    return walkin


@router.delete("/walkins/{walkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_walkin(walkin_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    walkin = get_or_404(db, WalkInToken, walkin_id, "Walk-in token")
    db.delete(walkin)
    db.commit()


# --- Live queue ---

@router.get("/queue", response_model=list[QueueItemOut])
def list_queue(
    department: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_active_user),
):
    stmt = select(QueueItem)
    if department:
        stmt = stmt.where(QueueItem.department == department)
    stmt = stmt.order_by(QueueItem.created_at.asc())
    return db.scalars(stmt).all()


@router.post("/queue", response_model=QueueItemOut, status_code=status.HTTP_201_CREATED)
def add_to_queue(payload: QueueItemCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    data = payload.model_dump()
    data["time_issued"] = data.get("time_issued") or datetime.now().strftime("%H:%M")
    item = QueueItem(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/queue/{queue_id}", response_model=QueueItemOut)
def update_queue_item(
    queue_id: str, payload: QueueItemUpdate, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    apply_updates(item, payload)
    db.commit()
    db.refresh(item)
    return item


@router.put("/queue/{queue_id}/status", response_model=QueueItemOut)
def update_queue_status(
    queue_id: str, status: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    item.status = status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/queue/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_queue(queue_id: str, db: Session = Depends(get_db), _=Depends(get_current_active_user)):
    item = get_or_404(db, QueueItem, queue_id, "Queue item")
    db.delete(item)
    db.commit()
