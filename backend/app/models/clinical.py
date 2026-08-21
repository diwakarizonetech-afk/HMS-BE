from sqlalchemy import String, Float, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class PatientVital(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "patient_vitals"

    patient_uhid: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    patient_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    doctor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float] = mapped_column(Float, default=98.6)
    blood_pressure: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bp_sys: Mapped[float] = mapped_column(Float, default=120)
    bp_dia: Mapped[float] = mapped_column(Float, default=80)
    pulse_rate: Mapped[float] = mapped_column(Float, default=72)
    pulse: Mapped[float] = mapped_column(Float, default=72)
    respiratory_rate: Mapped[float] = mapped_column(Float, default=18)
    resp_rate: Mapped[float] = mapped_column(Float, default=18)
    spo2: Mapped[float] = mapped_column(Float, default=98)
    blood_sugar: Mapped[float | None] = mapped_column(Float, nullable=True)
    pain_scale: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[str] = mapped_column(String(150), default="Nurse")
    recorded_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    er_encounter_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class NursingNote(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "nursing_notes"

    patient_uhid: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    patient_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    admission_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    er_encounter_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(150), nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctor_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    fluid_intake: Mapped[float | None] = mapped_column(Float, nullable=True)
    fluid_output: Mapped[float | None] = mapped_column(Float, nullable=True)
    patient_condition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="General Note")
    note: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    nurse_name: Mapped[str] = mapped_column(String(150), nullable=False)
    recorded_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class MedicationLog(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "medication_logs"

    patient_uhid: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    patient_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    admission_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    er_encounter_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(150), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    route: Mapped[str] = mapped_column(String(50), default="Oral")
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    scheduled_time: Mapped[str] = mapped_column(String(50), nullable=False)
    administered_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    given_time: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Given")
    reason_if_missed: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    nurse_name: Mapped[str] = mapped_column(String(150), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class WardTransfer(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "ward_transfers"

    transfer_id: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    current_ward: Mapped[str] = mapped_column(String(150), nullable=False)
    current_bed: Mapped[str] = mapped_column(String(50), nullable=False)
    new_ward: Mapped[str] = mapped_column(String(150), nullable=False)
    new_bed: Mapped[str] = mapped_column(String(50), nullable=False)
    transfer_reason: Mapped[str] = mapped_column(Text, nullable=False)
    transfer_date: Mapped[str] = mapped_column(String(20), nullable=False)
    transfer_time: Mapped[str] = mapped_column(String(20), nullable=False)
    doctor_approval: Mapped[str] = mapped_column(String(50), default="Approved")
    doctor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    transferred_by: Mapped[str] = mapped_column(String(150), default="Nurse")
    status: Mapped[str] = mapped_column(String(30), default="Completed")
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
