from pydantic import BaseModel, Field, ConfigDict

from app.models.appointment import AppointmentStatus, WalkInStatus, QueueStatus
from app.schemas.common import TimestampedORMBase


class AppointmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    patient_uhid: str = Field(..., alias="patientUhid")
    patient_name: str = Field(..., alias="patientName")
    patient_mobile: str = Field(..., alias="patientMobile")
    department: str
    doctor_id: str | None = Field(None, alias="doctorId")
    doctor_name: str = Field(..., alias="doctorName")
    date: str
    time_slot: str = Field(..., alias="timeSlot")
    reason: str | None = None
    branch: str | None = None


class AppointmentCreate(AppointmentBase):
    patient_id: str | None = Field(None, alias="patientId")
    status: AppointmentStatus = AppointmentStatus.Scheduled
    created_date: str | None = Field(None, alias="createdDate")


class AppointmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    patient_uhid: str | None = Field(None, alias="patientUhid")
    patient_name: str | None = Field(None, alias="patientName")
    patient_mobile: str | None = Field(None, alias="patientMobile")
    department: str | None = None
    doctor_id: str | None = Field(None, alias="doctorId")
    doctor_name: str | None = Field(None, alias="doctorName")
    date: str | None = None
    time_slot: str | None = Field(None, alias="timeSlot")
    reason: str | None = None
    status: AppointmentStatus | None = None
    branch: str | None = None


class AppointmentOut(AppointmentBase, TimestampedORMBase):
    patient_id: str | None = None
    status: AppointmentStatus
    created_date: str


class WalkInBase(BaseModel):
    patient_uhid: str
    patient_name: str
    department: str
    doctor_name: str
    estimated_wait_minutes: int = 0
    branch: str | None = None


class WalkInCreate(WalkInBase):
    patient_id: str | None = None
    token_number: str | None = None  # auto-generated if omitted
    issue_time: str | None = None


class WalkInUpdate(BaseModel):
    department: str | None = None
    doctor_name: str | None = None
    estimated_wait_minutes: int | None = None
    status: WalkInStatus | None = None
    branch: str | None = None


class WalkInOut(WalkInBase, TimestampedORMBase):
    token_number: str
    patient_id: str | None = None
    issue_time: str
    status: WalkInStatus


class QueueItemBase(BaseModel):
    token_number: str
    patient_uhid: str
    patient_name: str
    doctor_name: str
    department: str
    waiting_time_minutes: int = 0
    branch: str | None = None


class QueueItemCreate(QueueItemBase):
    status: QueueStatus = QueueStatus.Waiting
    time_issued: str | None = None


class QueueItemUpdate(BaseModel):
    status: QueueStatus | None = None
    waiting_time_minutes: int | None = None
    branch: str | None = None


class QueueItemOut(QueueItemBase, TimestampedORMBase):
    status: QueueStatus
    time_issued: str
