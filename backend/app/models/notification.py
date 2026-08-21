import enum

from sqlalchemy import String, Boolean, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class NotificationType(str, enum.Enum):
    info = "info"
    warning = "warning"
    success = "success"


class Notification(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), default=NotificationType.info)
    read: Mapped[bool] = mapped_column(Boolean, default=False)

    module: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sender_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sender_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    recipient_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    related_record_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="unread")
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    follow_up_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
