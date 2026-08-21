import enum

from sqlalchemy import String, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ArrivalMode(str, enum.Enum):
    Walk_in = "Walk-in"
    Ambulance = "Ambulance"


class EmergencyType(str, enum.Enum):
    Trauma = "Trauma"
    Cardiac = "Cardiac"
    Respiratory = "Respiratory"
    Neurological = "Neurological"
    Obstetric = "Obstetric"
    Pediatric = "Pediatric"
    Poisoning = "Poisoning"
    Burns = "Burns"
    Orthopedic = "Orthopedic"
    General_Emergency = "General Emergency"
    Other = "Other"


class ERTriageStatus(str, enum.Enum):
    Pending_Triage = "Pending Triage"
    Red = "Priority 1 (Red - Critical)"
    Yellow = "Priority 2 (Yellow - Urgent)"
    Green = "Priority 3 (Green - Non-Urgent)"


class ERStatus(str, enum.Enum):
    Registered = "Registered"
    Waiting_Triage = "Waiting for Triage"
    Triaged = "Triaged"
    Waiting_Doctor = "Waiting for Doctor"
    Under_Assessment = "Under Doctor Assessment"
    Observation = "Observation"
    IPD_Pending = "IPD Admission Pending"
    Admitted = "Admitted"
    Discharged = "Discharged"
    LAMA = "LAMA"
    Referred = "Referred"
    Transferred = "Transferred"
    Completed = "Completed"


class ERDisposition(str, enum.Enum):
    Pending = "Pending"
    Discharge = "Discharge"
    Observation = "Observation"
    IPD = "IPD"
    Transferred = "Transferred"


# ---------------------------------------------------------------------------
# EmergencyEncounter — core ER entity
# ---------------------------------------------------------------------------

class EmergencyEncounter(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "emergency_encounters"

    # Encounter identifier
    encounter_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Patient link (denormalised for read speed, FK for integrity)
    patient_id: Mapped[str | None] = mapped_column(
        ForeignKey("patients.id", ondelete="SET NULL"), nullable=True
    )
    patient_uhid: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    patient_age: Mapped[int | None] = mapped_column(nullable=True)
    patient_gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    patient_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient_existing_diseases: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient_emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    patient_emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_emergency_relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Arrival details
    arrival_date: Mapped[str] = mapped_column(String(20), nullable=False)
    arrival_time: Mapped[str] = mapped_column(String(20), nullable=False)
    arrival_mode: Mapped[ArrivalMode] = mapped_column(
        Enum(ArrivalMode, name="er_arrival_mode"), default=ArrivalMode.Walk_in
    )

    # Ambulance details (nullable — only for Ambulance mode)
    ambulance_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referral_hospital: Mapped[str | None] = mapped_column(String(200), nullable=True)
    paramedic_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Emergency classification
    emergency_type: Mapped[EmergencyType] = mapped_column(
        Enum(EmergencyType, name="er_emergency_type"), default=EmergencyType.General_Emergency
    )
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    accompanied_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Staff assignment
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    assigned_doctor: Mapped[str | None] = mapped_column(String(150), nullable=True)
    assigned_nurse: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Triage
    triage_status: Mapped[ERTriageStatus] = mapped_column(
        Enum(ERTriageStatus, name="er_triage_status"), default=ERTriageStatus.Pending_Triage
    )
    triage_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    triaged_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    triage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ER flow status
    er_status: Mapped[ERStatus] = mapped_column(
        Enum(ERStatus, name="er_status"), default=ERStatus.Registered
    )
    er_disposition: Mapped[ERDisposition] = mapped_column(
        Enum(ERDisposition, name="er_disposition"), default=ERDisposition.Pending
    )
    disposition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    required_ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    current_location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Bed / IPD links
    observation_bed_id: Mapped[str | None] = mapped_column(
        ForeignKey("beds.id", ondelete="SET NULL"), nullable=True
    )
    ipd_admission_id: Mapped[str | None] = mapped_column(
        ForeignKey("ipd_admissions.id", ondelete="SET NULL"), nullable=True
    )

    # Discharge
    discharge_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    discharge_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit
    registered_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


# ---------------------------------------------------------------------------
# ERAssessment — doctor's clinical assessment for an ER encounter
# ---------------------------------------------------------------------------

class ERAssessment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "er_assessments"

    encounter_id: Mapped[str] = mapped_column(
        ForeignKey("emergency_encounters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    presenting_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    history: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinical_examination: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    provisional_diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    doctor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assessment_time: Mapped[str | None] = mapped_column(String(20), nullable=True)


# ---------------------------------------------------------------------------
# ERProcedure — procedures performed during an ER encounter
# ---------------------------------------------------------------------------

class ERProcedure(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "er_procedures"

    encounter_id: Mapped[str] = mapped_column(
        ForeignKey("emergency_encounters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    procedure_name: Mapped[str] = mapped_column(String(200), nullable=False)
    indication: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    performed_by: Mapped[str] = mapped_column(String(150), nullable=False)
    procedure_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
