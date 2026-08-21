import enum

from sqlalchemy import String, Integer, Boolean, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class AppointmentStatus(str, enum.Enum):
    Requested = "Requested"
    Pending = "Pending"
    Scheduled = "Scheduled"
    Completed = "Completed"
    Rescheduled = "Rescheduled"
    Cancelled = "Cancelled"
    In_Progress = "In Progress"


class Appointment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "appointments"

    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    patient_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"), default=AppointmentStatus.Scheduled
    )
    created_date: Mapped[str] = mapped_column(String(20), nullable=False)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    booking_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    token_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    assigned_nurse: Mapped[str | None] = mapped_column(String(150), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class WalkInStatus(str, enum.Enum):
    Waiting = "Waiting"
    In_Consultation = "In Consultation"
    Completed = "Completed"
    Skipped = "Skipped"


class WalkInToken(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "walkin_tokens"

    token_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    estimated_wait_minutes: Mapped[int] = mapped_column(Integer, default=0)
    issue_time: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[WalkInStatus] = mapped_column(Enum(WalkInStatus, name="walkin_status"), default=WalkInStatus.Waiting)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class QueueStatus(str, enum.Enum):
    Waiting = "Waiting"
    In_Consultation = "In Consultation"
    Completed = "Completed"
    On_Hold = "On Hold"
    Skipped = "Skipped"


class QueueItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "queue_items"

    token_number: Mapped[str] = mapped_column(String(20), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[QueueStatus] = mapped_column(Enum(QueueStatus, name="queue_status"), default=QueueStatus.Waiting)
    waiting_time_minutes: Mapped[int] = mapped_column(Integer, default=0)
    time_issued: Mapped[str] = mapped_column(String(50), nullable=False)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    assigned_nurse: Mapped[str | None] = mapped_column(String(150), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
