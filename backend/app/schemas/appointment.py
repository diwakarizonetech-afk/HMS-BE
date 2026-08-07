from pydantic import BaseModel

from app.models.appointment import AppointmentStatus, WalkInStatus, QueueStatus
from app.schemas.common import TimestampedORMBase


class AppointmentBase(BaseModel):
    patient_uhid: str
    patient_name: str
    patient_mobile: str
    department: str
    doctor_id: str | None = None
    doctor_name: str
    date: str
    time_slot: str
    reason: str | None = None


class AppointmentCreate(AppointmentBase):
    patient_id: str | None = None
    status: AppointmentStatus = AppointmentStatus.Scheduled
    created_date: str | None = None


class AppointmentUpdate(BaseModel):
    department: str | None = None
    doctor_id: str | None = None
    doctor_name: str | None = None
    date: str | None = None
    time_slot: str | None = None
    reason: str | None = None
    status: AppointmentStatus | None = None


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


class WalkInCreate(WalkInBase):
    patient_id: str | None = None
    token_number: str | None = None  # auto-generated if omitted
    issue_time: str | None = None


class WalkInUpdate(BaseModel):
    department: str | None = None
    doctor_name: str | None = None
    estimated_wait_minutes: int | None = None
    status: WalkInStatus | None = None


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


class QueueItemCreate(QueueItemBase):
    status: QueueStatus = QueueStatus.Waiting
    time_issued: str | None = None


class QueueItemUpdate(BaseModel):
    status: QueueStatus | None = None
    waiting_time_minutes: int | None = None


class QueueItemOut(QueueItemBase, TimestampedORMBase):
    status: QueueStatus
    time_issued: str
