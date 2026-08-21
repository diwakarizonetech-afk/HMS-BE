from pydantic import BaseModel, Field, ConfigDict

from app.models.doctor import DoctorStatus
from app.schemas.common import TimestampedORMBase


class DoctorBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = "Doctor"
    department: str | None = "General Medicine"
    specialization: str | None = "General Physician"
    room_no: str | None = Field("OPD-101", alias="roomNo")
    consultation_fee: float | None = Field(500.0, alias="consultationFee")
    available_days: list[str] | None = Field(default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri"], alias="availableDays")
    slots: list[str] | None = Field(default_factory=lambda: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"])
    status: DoctorStatus | None = DoctorStatus.Available
    email: str = ""
    branch: str | None = None


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    department: str | None = None
    specialization: str | None = None
    room_no: str | None = Field(None, alias="roomNo")
    consultation_fee: float | None = Field(None, alias="consultationFee")
    available_days: list[str] | None = Field(None, alias="availableDays")
    slots: list[str] | None = None
    status: DoctorStatus | None = None
    email: str | None = None
    branch: str | None = None


class DoctorOut(DoctorBase, TimestampedORMBase):
    pass


class DepartmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field("General", alias="departmentName")
    code: str = Field("DEPT", alias="departmentCode")
    icon_name: str | None = Field("Building2", alias="iconName")
    doctor_count: int | None = Field(0, alias="doctorCount")
    description: str | None = None
    head_of_department: str | None = Field(None, alias="headOfDepartment")
    email: str | None = None
    phone: str | None = None
    floor_location: str | None = Field(None, alias="floorLocation")
    bed_count: int | None = Field(0, alias="bedCount")
    status: str | None = "Active"


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(None, alias="departmentName")
    code: str | None = Field(None, alias="departmentCode")
    icon_name: str | None = Field(None, alias="iconName")
    doctor_count: int | None = Field(None, alias="doctorCount")
    description: str | None = None
    head_of_department: str | None = Field(None, alias="headOfDepartment")
    email: str | None = None
    phone: str | None = None
    floor_location: str | None = Field(None, alias="floorLocation")
    bed_count: int | None = Field(None, alias="bedCount")
    status: str | None = None


class DepartmentOut(DepartmentBase, TimestampedORMBase):
    pass
