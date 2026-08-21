from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType


def notify_user_or_role(
    db: Session,
    title: str,
    message: str,
    module: str,
    event_type: str,
    user_id: str | None = None,
    recipient_role: str | None = None,
    sender_id: str | None = None,
    sender_name: str | None = None,
    related_record_id: str | None = None,
    priority: str = "medium",
    notification_type: NotificationType = NotificationType.info,
) -> Notification:
    """
    Creates and persists a notification record in PostgreSQL/SQLite table,
    targeted to a specific user_id or to all users belonging to a recipient_role.
    """
    time_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    notification = Notification(
        user_id=user_id,
        recipient_role=recipient_role,
        title=title,
        message=message,
        time=time_str,
        type=notification_type,
        read=False,
        module=module,
        event_type=event_type,
        sender_id=sender_id,
        sender_name=sender_name,
        related_record_id=related_record_id,
        priority=priority,
        status="unread",
    )
    db.add(notification)
    try:
        db.commit()
        db.refresh(notification)
    except Exception as e:
        db.rollback()
        print(f"[NotificationService Error]: {e}")
    return notification
