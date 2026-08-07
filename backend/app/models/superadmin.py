from sqlalchemy import String, Integer, Float, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class HospitalProfile(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "hospital_profiles"

    hospital_name: Mapped[str] = mapped_column(String(200), nullable=False)
    hospital_code: Mapped[str] = mapped_column(String(50), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo: Mapped[str | None] = mapped_column(Text, nullable=True)
    hospital_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    establishment_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    established_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    accreditation: Mapped[str | None] = mapped_column(String(200), nullable=True)
    total_bed_capacity: Mapped[int] = mapped_column(Integer, default=0)
    emergency_contact_number: Mapped[str | None] = mapped_column(String(50), nullable=True)


class Branch(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "branches"

    branch_name: Mapped[str] = mapped_column(String(150), nullable=False)
    branch_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="India")
    pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    is_main_branch: Mapped[bool] = mapped_column(Boolean, default=False)
    bed_capacity: Mapped[int] = mapped_column(Integer, default=0)
    total_staff: Mapped[int] = mapped_column(Integer, default=0)


class Specialization(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "specializations"

    specialization_name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    department_name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")


class ConsultationCharge(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "consultation_charges"

    doctor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    consultation_fee: Mapped[float] = mapped_column(Float, nullable=False)
    follow_up_fee: Mapped[float] = mapped_column(Float, default=0.0)
    emergency_fee: Mapped[float] = mapped_column(Float, default=0.0)
    validity_days: Mapped[int] = mapped_column(Integer, default=7)
    status: Mapped[str] = mapped_column(String(20), default="Active")


class WorkingHours(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "working_hours"

    department: Mapped[str] = mapped_column(String(150), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(200), nullable=False)
    start_time: Mapped[str] = mapped_column(String(20), nullable=False)
    end_time: Mapped[str] = mapped_column(String(20), nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=15)
    max_patients_per_slot: Mapped[int] = mapped_column(Integer, default=1)
    is_working_day: Mapped[bool] = mapped_column(Boolean, default=True)


class LeaveRequest(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "leave_requests"

    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[str] = mapped_column(String(20), nullable=False)
    end_date: Mapped[str] = mapped_column(String(20), nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(20), default="Pending")
    applied_date: Mapped[str] = mapped_column(String(20), nullable=False)


class ShiftRotation(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "shift_rotations"

    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    morning_shift: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evening_shift: Mapped[str | None] = mapped_column(String(50), nullable=True)
    night_shift: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assigned_shift: Mapped[str] = mapped_column(String(50), nullable=False)
    effective_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    start_date: Mapped[str] = mapped_column(String(20), nullable=False)
    end_date: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)



class RoleItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    role_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system_default: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_user_count: Mapped[int] = mapped_column(Integer, default=0)


class PermissionItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "permissions"

    role_id: Mapped[str] = mapped_column(String(100), nullable=False)
    module_name: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    is_granted: Mapped[bool] = mapped_column(Boolean, default=True)


class DepartmentAssignment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "department_assignments"

    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    primary_department: Mapped[str] = mapped_column(String(150), nullable=False)
    secondary_department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    shift_type: Mapped[str] = mapped_column(String(50), default="General")
    assigned_date: Mapped[str] = mapped_column(String(20), nullable=False)


class LoginHistoryItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "login_history"

    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(50), default="127.0.0.1")
    browser: Mapped[str] = mapped_column(String(100), default="Chrome")
    login_time: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Success")
