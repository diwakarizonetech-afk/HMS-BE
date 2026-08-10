from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.core.crud_utils import get_or_404, apply_updates
from app.core.database import get_db
from app.deps import get_current_active_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _notification_visible_to(notification: Notification, current_user: User) -> bool:
    """Ownership/visibility check for a single notification.

    Mirrors the exact filter already used by list_notifications/get_notification_count
    (own user_id, own role broadcast, or a fully-global user_id+recipient_role-less
    notification) so a user can only mark-read/update/delete a notification they were
    actually allowed to see in their own notification list. Without this, any
    authenticated user could mark-read or delete *any* notification in the system by
    guessing/enumerating its id, regardless of who it was addressed to -- confirmed by
    reading update_notification/mark_single_notification_read/delete_notification below,
    none of which checked ownership before this fix.

    Note: there is no dedicated "Notifications" module in the frontend's
    PermissionManagementPage.tsx modulesList, so this is a row-level ownership check
    rather than require_permission()-style module/action enforcement -- a Super Admin
    has no module toggle to configure for notifications in the first place, and it
    wouldn't be the right tool here anyway: this is about *whose* notification it is,
    not *what role* is allowed to touch notifications in general.
    """
    role_str = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).lower()
    if notification.user_id == current_user.id:
        return True
    if notification.recipient_role and notification.recipient_role.lower() in (role_str, str(current_user.role).lower()):
        return True
    if notification.user_id is None and notification.recipient_role is None:
        return True
    return False


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    role_str = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).lower()
    
    stmt = select(Notification).where(
        or_(
            Notification.user_id == current_user.id,
            Notification.recipient_role == role_str,
            Notification.recipient_role == str(current_user.role),
            (Notification.user_id.is_(None) & Notification.recipient_role.is_(None)),
        )
    )
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/count")
def get_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    role_str = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).lower()
    
    stmt = select(Notification).where(
        or_(
            Notification.user_id == current_user.id,
            Notification.recipient_role == role_str,
            Notification.recipient_role == str(current_user.role),
            (Notification.user_id.is_(None) & Notification.recipient_role.is_(None)),
        )
    )
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
    role_str = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).lower()
    
    stmt = select(Notification).where(
        or_(
            Notification.user_id == current_user.id,
            Notification.recipient_role == role_str,
            Notification.recipient_role == str(current_user.role),
            (Notification.user_id.is_(None) & Notification.recipient_role.is_(None)),
        ),
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
