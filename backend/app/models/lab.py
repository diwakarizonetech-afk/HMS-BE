from sqlalchemy import String, Integer, Float, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class LabTestMaster(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "lab_test_master"
    test_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    sub_category: Mapped[str] = mapped_column(String(100), nullable=False)
    sample_type: Mapped[str] = mapped_column(String(100), nullable=False)
    container_type: Mapped[str] = mapped_column(String(150), nullable=False)
    method: Mapped[str] = mapped_column(String(150), nullable=False)
    machine: Mapped[str] = mapped_column(String(150), nullable=False)
    normal_range: Mapped[str] = mapped_column(String(300), nullable=False)
    critical_range: Mapped[str] = mapped_column(String(300), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    tat_hours: Mapped[int] = mapped_column(Integer, default=2)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    prep_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_template: Mapped[str | None] = mapped_column(String(200), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


class SampleCollection(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "sample_collections"
    collection_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    age: Mapped[int] = mapped_column(Integer, default=0)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    ordered_tests: Mapped[list] = mapped_column(JSON, default=list)
    sample_type: Mapped[str] = mapped_column(String(100), nullable=False)
    container: Mapped[str] = mapped_column(String(150), nullable=False)
    barcode: Mapped[str] = mapped_column(String(50), nullable=False)
    collection_date: Mapped[str] = mapped_column(String(20), nullable=False)
    collection_time: Mapped[str] = mapped_column(String(20), nullable=False)
    collected_by: Mapped[str] = mapped_column(String(150), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Normal")
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class SampleProcessing(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "sample_processing"
    sample_id: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    analyzer: Mapped[str] = mapped_column(String(200), nullable=False)
    machine: Mapped[str] = mapped_column(String(200), nullable=False)
    assigned_technician: Mapped[str] = mapped_column(String(150), nullable=False)
    processing_start: Mapped[str] = mapped_column(String(30), default="Pending")
    processing_end: Mapped[str] = mapped_column(String(30), default="Pending")
    duration: Mapped[str] = mapped_column(String(50), default="0 mins")
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    qc_status: Mapped[str] = mapped_column(String(20), default="Pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class LabResult(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "lab_results"
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    test_code: Mapped[str] = mapped_column(String(50), nullable=False)
    sample_id: Mapped[str] = mapped_column(String(50), nullable=False)
    result_value: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_range: Mapped[str] = mapped_column(String(200), nullable=False)
    flag: Mapped[str] = mapped_column(String(20), default="Normal")
    technician: Mapped[str] = mapped_column(String(150), nullable=False)
    verified_by: Mapped[str] = mapped_column(String(150), default="Pending")
    entry_date: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class LabReport(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "lab_reports"
    report_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_age: Mapped[int] = mapped_column(Integer, default=0)
    patient_gender: Mapped[str] = mapped_column(String(20), nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    tests: Mapped[list] = mapped_column(JSON, default=list)
    test_results: Mapped[list] = mapped_column(JSON, default=list)
    generated_date: Mapped[str] = mapped_column(String(50), nullable=False)
    generated_by: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Generated")
    doctor_review_status: Mapped[str] = mapped_column(String(50), default="Pending Review")
    doctor_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctor_review_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class LabActivity(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "lab_activities"
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    user: Mapped[str] = mapped_column(String(150), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Normal")
