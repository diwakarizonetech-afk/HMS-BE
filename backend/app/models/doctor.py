import enum

from sqlalchemy import String, Integer, Float, Enum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class DoctorStatus(str, enum.Enum):
    Available = "Available"
    In_Surgery = "In Surgery"
    On_Leave = "On Leave"
    Busy = "Busy"


class Doctor(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "doctors"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    specialization: Mapped[str] = mapped_column(String(200), nullable=False)
    room_no: Mapped[str] = mapped_column(String(20), nullable=False)
    consultation_fee: Mapped[float] = mapped_column(Float, nullable=False)
    available_days: Mapped[list] = mapped_column(JSON, default=list)
    slots: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[DoctorStatus] = mapped_column(
        Enum(DoctorStatus, name="doctor_status"), default=DoctorStatus.Available
    )
    email: Mapped[str] = mapped_column(String(150), nullable=False)


class Department(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    icon_name: Mapped[str] = mapped_column(String(100), nullable=False)
    doctor_count: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=True)
