import enum

from sqlalchemy import String, Integer, Date, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class Gender(str, enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"


class BloodGroup(str, enum.Enum):
    A_pos = "A+"
    A_neg = "A-"
    B_pos = "B+"
    B_neg = "B-"
    AB_pos = "AB+"
    AB_neg = "AB-"
    O_pos = "O+"
    O_neg = "O-"


class MaritalStatus(str, enum.Enum):
    Single = "Single"
    Married = "Married"
    Divorced = "Divorced"
    Widowed = "Widowed"


class PatientStatus(str, enum.Enum):
    Active = "Active"
    Admitted = "Admitted"
    Discharged = "Discharged"


class Patient(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "patients"

    uhid: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[Gender] = mapped_column(Enum(Gender, name="gender"), nullable=False)
    dob: Mapped[str | None] = mapped_column(String(20), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    blood_group: Mapped[BloodGroup | None] = mapped_column(Enum(BloodGroup, name="blood_group"), nullable=True, default=BloodGroup.O_pos)
    marital_status: Mapped[MaritalStatus | None] = mapped_column(Enum(MaritalStatus, name="marital_status"), nullable=True, default=MaritalStatus.Single)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Indian")

    # Contact info
    mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    alt_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Identity
    aadhaar: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Emergency contact (primary, kept on patient record)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Medical
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    existing_diseases: Mapped[str | None] = mapped_column(Text, nullable=True)
    insurance_provider: Mapped[str | None] = mapped_column(String(150), nullable=True)
    insurance_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[PatientStatus] = mapped_column(
        Enum(PatientStatus, name="patient_status"), default=PatientStatus.Active, nullable=False
    )
    registration_date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(150), nullable=True)

    emergency_contacts: Mapped[list["EmergencyContactItem"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class ContactPriority(str, enum.Enum):
    Primary = "Primary"
    Secondary = "Secondary"


class EmergencyContactItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "emergency_contacts"

    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    relationship_: Mapped[str] = mapped_column("relationship", String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    priority: Mapped[ContactPriority] = mapped_column(Enum(ContactPriority, name="contact_priority"), nullable=False)

    patient: Mapped["Patient"] = relationship(back_populates="emergency_contacts")
