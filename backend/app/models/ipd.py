import enum

from sqlalchemy import String, Float, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class BedStatus(str, enum.Enum):
    Available = "Available"
    Occupied = "Occupied"
    Reserved = "Reserved"
    Cleaning = "Cleaning"


class WardType(str, enum.Enum):
    General_Ward = "General Ward"
    ICU = "ICU"
    Deluxe_Private = "Deluxe Private"
    Deluxe_Suite = "Deluxe Suite"
    Semi_Private = "Semi-Private"
    Surgical_Ward = "Surgical Ward"


class Bed(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "beds"

    bed_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    ward: Mapped[str] = mapped_column(String(100), nullable=False)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # Standard/ICU/Deluxe/Isolation
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    daily_rate: Mapped[float] = mapped_column(Float, default=0)
    doctor_assigned: Mapped[str | None] = mapped_column(String(200), nullable=True)
    nurse_in_charge: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[BedStatus] = mapped_column(Enum(BedStatus, name="bed_status"), default=BedStatus.Available)
    current_patient_id: Mapped[str | None] = mapped_column(
        ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    current_patient_uhid: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_patient_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    admitted_date: Mapped[str | None] = mapped_column(String(20), nullable=True)


class IPDStatus(str, enum.Enum):
    Admitted = "Admitted"
    Discharged = "Discharged"
    Transferred = "Transferred"


class IPDAdmission(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "ipd_admissions"

    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ward: Mapped[str] = mapped_column(String(100), nullable=False)
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    bed_number: Mapped[str] = mapped_column(String(20), nullable=False)
    bed_id: Mapped[str | None] = mapped_column(ForeignKey("beds.id", ondelete="SET NULL"), nullable=True)
    admission_date: Mapped[str] = mapped_column(String(20), nullable=False)
    attending_doctor: Mapped[str] = mapped_column(String(150), nullable=False)
    attending_nurse: Mapped[str | None] = mapped_column(String(150), nullable=True)
    admission_reason: Mapped[str] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[str] = mapped_column(String(150), nullable=False)
    insurance_provider: Mapped[str | None] = mapped_column(String(150), nullable=True)
    insurance_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[IPDStatus] = mapped_column(Enum(IPDStatus, name="ipd_status"), default=IPDStatus.Admitted)
