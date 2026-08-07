from pydantic import BaseModel

from app.models.notification import NotificationType
from app.schemas.common import TimestampedORMBase


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.info
    module: str | None = None
    event_type: str | None = None
    sender_id: str | None = None
    sender_name: str | None = None
    recipient_role: str | None = None
    related_record_id: str | None = None
    priority: str | None = "medium"
    status: str | None = "unread"


class NotificationCreate(NotificationBase):
    user_id: str | None = None
    time: str | None = None
    read: bool = False


class NotificationUpdate(BaseModel):
    read: bool | None = None
    status: str | None = None
    priority: str | None = None


class NotificationOut(NotificationBase, TimestampedORMBase):
    id: str
    user_id: str | None = None
    time: str
    read: bool
