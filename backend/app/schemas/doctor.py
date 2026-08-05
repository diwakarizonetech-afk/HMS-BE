from pydantic import BaseModel
from pydantic.alias_generators import to_camel

from app.models.doctor import DoctorStatus
from app.schemas.common import TimestampedORMBase


class DoctorBase(BaseModel):
    name: str
    department: str = "General Medicine"
    specialization: str = "General Physician"
    room_no: str = "OPD-101"
    consultation_fee: float = 500.0
    available_days: list[str] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    slots: list[str] = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"]
    status: DoctorStatus = DoctorStatus.Available
    email: str


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    specialization: str | None = None
    room_no: str | None = None
    consultation_fee: float | None = None
    available_days: list[str] | None = None
    slots: list[str] | None = None
    status: DoctorStatus | None = None
    email: str | None = None


class DoctorOut(DoctorBase, TimestampedORMBase):
    pass


class DepartmentBase(BaseModel):
    model_config = __import__('pydantic').ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
    name: str
    code: str
    icon_name: str
    doctor_count: int = 0
    description: str | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    icon_name: str | None = None
    doctor_count: int | None = None
    description: str | None = None


class DepartmentOut(DepartmentBase, TimestampedORMBase):
    pass
