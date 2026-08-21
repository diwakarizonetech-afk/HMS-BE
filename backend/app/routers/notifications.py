from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])

ROLE_ALIASES = {
    "reception": ["reception", "receptionist", "front_desk"],
    "receptionist": ["reception", "receptionist", "front_desk"],
    "doctor": ["doctor", "physician"],
    "physician": ["doctor", "physician"],
    "nurse": ["nurse"],
    "pharmacy": ["pharmacy", "pharmacist"],
    "pharmacist": ["pharmacy", "pharmacist"],
    "store": ["store", "store_manager", "inventory"],
    "store_manager": ["store", "store_manager", "inventory"],
    "inventory": ["store", "store_manager", "inventory"],
    "lab": ["lab", "lab_technician", "laboratory"],
    "lab_technician": ["lab", "lab_technician", "laboratory"],
    "laboratory": ["lab", "lab_technician", "laboratory"],
    "admin": ["admin", "super_admin", "superadmin", "administrator"],
    "super_admin": ["admin", "super_admin", "superadmin", "administrator"],
    "superadmin": ["admin", "super_admin", "superadmin", "administrator"],
    "billing": ["billing", "billing_manager", "accountant", "cashier"],
    "billing_manager": ["billing", "billing_manager", "accountant", "cashier"],
    "patient": ["patient"],
}


def _get_role_variants(user: User) -> list[str]:
    raw_role = (user.role.value if hasattr(user.role, "value") else str(user.role or "")).strip().lower()
    variants = {raw_role, raw_role.replace(" ", "_"), raw_role.replace("_", " ")}
    if raw_role in ROLE_ALIASES:
        for alias in ROLE_ALIASES[raw_role]:
            variants.add(alias.lower())
    return [v for v in variants if v]



def _build_user_notification_filter(current_user: User):
    role_variants = [r.lower() for r in _get_role_variants(current_user)]
    is_admin = any(r in ("admin", "super_admin", "superadmin") for r in role_variants)

    conditions = [
        Notification.user_id == current_user.id,
        func.lower(Notification.recipient_role).in_(role_variants),
        func.lower(Notification.recipient_role).in_(["all", "staff", "everyone", "global"]),
        Notification.recipient_role.is_(None),
    ]

    base_filter = or_(*conditions)

    if not is_admin and current_user.branch and current_user.branch != "All":
        branch_clean = current_user.branch.strip().lower()
        branch_filter = or_(
            Notification.branch.is_(None),
            Notification.branch == "",
            func.lower(Notification.branch) == branch_clean,
            func.lower(Notification.branch).contains(branch_clean),
        )
        return and_(base_filter, branch_filter)

    return base_filter


def _notification_visible_to(notification: Notification, current_user: User) -> bool:
    """Ownership/visibility check for a single notification based on user assignment or role allocation."""
    if notification.user_id == current_user.id:
        return True

    role_variants = [r.lower() for r in _get_role_variants(current_user)]
    is_admin = any(r in ("admin", "super_admin", "superadmin") for r in role_variants)

    if not is_admin and current_user.branch and current_user.branch != "All" and notification.branch:
        u_br = current_user.branch.strip().lower()
        n_br = notification.branch.strip().lower()
        if u_br not in n_br and n_br not in u_br:
            return False

    if notification.recipient_role:
        recip = notification.recipient_role.lower().strip()
        if recip in role_variants or recip in ("all", "staff", "everyone", "global"):
            return True

    if notification.user_id is None and (notification.recipient_role is None or notification.recipient_role.lower().strip() in ("all", "staff", "everyone", "global")):
        return True

    return is_admin


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Notification).where(_build_user_notification_filter(current_user))
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/count")
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Notification).where(_build_user_notification_filter(current_user))
    all_notifs = db.scalars(stmt).all()
    unread_count = sum(1 for n in all_notifs if not n.read)
    return {"unread_count": unread_count, "total_count": len(all_notifs)}


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate, db: Session = Depends(get_db), _=Depends(get_current_active_user)
):
    data = payload.model_dump()
    data["time"] = data.get("time") or datetime.now().strftime("%Y-%m-%d %H:%M")
    notification = Notification(**data)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/mark-all-read", response_model=list[NotificationOut])
@router.post("/mark-all-read", response_model=list[NotificationOut])
@router.put("/read-all", response_model=list[NotificationOut])
@router.post("/read-all", response_model=list[NotificationOut])
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stmt = select(Notification).where(
        _build_user_notification_filter(current_user),
        Notification.read.is_(False),
    )
    items = db.scalars(stmt).all()
    for item in items:
        item.read = True
        item.status = "read"
    db.commit()
    return items


@router.put("/{notification_id}", response_model=NotificationOut)
def update_notification(
    notification_id: str,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    notification = get_or_404(db, Notification, notification_id, "Notification")
    if not _notification_visible_to(notification, current_user):
        raise HTTPException(status_code=404, detail="Notification not found")
    apply_updates(notification, payload)
    if payload.read is True:
        notification.status = "read"
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/{notification_id}/read", response_model=NotificationOut)
@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_single_notification_read(
    notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    notification = get_or_404(db, Notification, notification_id, "Notification")
    if not _notification_visible_to(notification, current_user):
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = True
    notification.status = "read"
    db.commit()
    db.refresh(notification)
    return notification


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    notification = get_or_404(db, Notification, notification_id, "Notification")
    if not _notification_visible_to(notification, current_user):
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()


@router.patch("/{notification_id}/booked", response_model=NotificationOut)
@router.post("/{notification_id}/booked", response_model=NotificationOut)
def mark_follow_up_booked(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark a follow-up notification as booked so it no longer shows in the reception alert."""
    notification = get_or_404(db, Notification, notification_id, "Notification")
    if not _notification_visible_to(notification, current_user):
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = True
    notification.status = "booked"
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/follow-ups")
def list_follow_up_notifications(
    uhid: str | None = None,
    include_booked: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return all follow-up-assigned notifications for reception.
    - If uhid is provided, return history for that specific patient.
    - By default excludes already-booked follow-ups.
    """
    stmt = select(Notification).where(
        _build_user_notification_filter(current_user),
        Notification.event_type == "follow_up_assigned",
    )
    if uhid:
        stmt = stmt.where(Notification.related_record_id == uhid)
    if not include_booked:
        stmt = stmt.where(Notification.status != "booked")
    stmt = stmt.order_by(Notification.created_at.desc())
    results = db.scalars(stmt).all()

    # Enrich with parsed follow-up date
    import re
    enriched = []
    for n in results:
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", n.message or "")
        follow_up_date = date_match.group(1) if date_match else None
        enriched.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "time": n.time,
            "type": n.type.value if hasattr(n.type, "value") else str(n.type),
            "read": n.read,
            "status": n.status,
            "event_type": n.event_type,
            "sender_name": n.sender_name,
            "related_record_id": n.related_record_id,
            "priority": n.priority,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "follow_up_date": follow_up_date,
        })
    return enriched
