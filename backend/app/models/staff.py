from sqlalchemy import String, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class StaffLeave(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "staff_leaves"
    staff_id: Mapped[str] = mapped_column(String(50), nullable=False)
    staff_name: Mapped[str] = mapped_column(String(150), nullable=False)
    staff_email: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False)
    from_date: Mapped[str] = mapped_column(String(20), nullable=False)
    to_date: Mapped[str] = mapped_column(String(20), nullable=False)
    days: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    applied_on: Mapped[str] = mapped_column(String(20), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


class Consultation(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "consultations"
    appointment_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    record: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="In Progress")


class IPDRecord(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "ipd_records"
    patient_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    admission_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    doctor_id: Mapped[str] = mapped_column(String(50), nullable=False)
    record: Mapped[dict] = mapped_column(JSON, default=dict)
