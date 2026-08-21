from pydantic import BaseModel, Field, ConfigDict, AliasChoices

from app.models.appointment import AppointmentStatus, WalkInStatus, QueueStatus
from app.schemas.common import TimestampedORMBase


class AppointmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    patient_uhid: str = Field(..., validation_alias=AliasChoices("patient_uhid", "patientUhid"))
    patient_name: str = Field(..., validation_alias=AliasChoices("patient_name", "patientName"))
    patient_mobile: str = Field(..., validation_alias=AliasChoices("patient_mobile", "patientMobile"))
    blood_group: str | None = Field(None, validation_alias=AliasChoices("blood_group", "bloodGroup"))
    department: str
    doctor_id: str | None = Field(None, validation_alias=AliasChoices("doctor_id", "doctorId"))
    doctor_name: str = Field(..., validation_alias=AliasChoices("doctor_name", "doctorName"))
    date: str
    time_slot: str = Field(..., validation_alias=AliasChoices("time_slot", "timeSlot"))
    reason: str | None = None
    is_emergency: bool = Field(False, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int = 0
    booking_source: str | None = Field(None, validation_alias=AliasChoices("booking_source", "bookingSource"))
    token_number: str | None = Field(None, validation_alias=AliasChoices("token_number", "tokenNumber"))
    assigned_nurse: str | None = Field(None, validation_alias=AliasChoices("assigned_nurse", "assignedNurse"))
    branch: str | None = None


class AppointmentCreate(AppointmentBase):
    patient_id: str | None = Field(None, validation_alias=AliasChoices("patient_id", "patientId"))
    status: AppointmentStatus = AppointmentStatus.Scheduled
    created_date: str | None = Field(None, validation_alias=AliasChoices("created_date", "createdDate"))


class AppointmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    patient_uhid: str | None = Field(None, validation_alias=AliasChoices("patient_uhid", "patientUhid"))
    patient_name: str | None = Field(None, validation_alias=AliasChoices("patient_name", "patientName"))
    patient_mobile: str | None = Field(None, validation_alias=AliasChoices("patient_mobile", "patientMobile"))
    blood_group: str | None = Field(None, validation_alias=AliasChoices("blood_group", "bloodGroup"))
    department: str | None = None
    doctor_id: str | None = Field(None, validation_alias=AliasChoices("doctor_id", "doctorId"))
    doctor_name: str | None = Field(None, validation_alias=AliasChoices("doctor_name", "doctorName"))
    date: str | None = None
    time_slot: str | None = Field(None, validation_alias=AliasChoices("time_slot", "timeSlot"))
    reason: str | None = None
    is_emergency: bool | None = Field(None, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int | None = None
    booking_source: str | None = Field(None, validation_alias=AliasChoices("booking_source", "bookingSource"))
    token_number: str | None = Field(None, validation_alias=AliasChoices("token_number", "tokenNumber"))
    assigned_nurse: str | None = Field(None, validation_alias=AliasChoices("assigned_nurse", "assignedNurse"))
    status: AppointmentStatus | None = None
    branch: str | None = None


class AppointmentOut(AppointmentBase, TimestampedORMBase):
    patient_id: str | None = None
    status: AppointmentStatus
    created_date: str


class WalkInBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    patient_uhid: str = Field(..., validation_alias=AliasChoices("patient_uhid", "patientUhid"))
    patient_name: str = Field(..., validation_alias=AliasChoices("patient_name", "patientName"))
    blood_group: str | None = Field(None, validation_alias=AliasChoices("blood_group", "bloodGroup"))
    department: str
    doctor_name: str = Field(..., validation_alias=AliasChoices("doctor_name", "doctorName"))
    estimated_wait_minutes: int = Field(0, validation_alias=AliasChoices("estimated_wait_minutes", "estimatedWaitMinutes", "waiting_time_minutes"))
    branch: str | None = None
    is_emergency: bool = Field(False, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int = 0


class WalkInCreate(WalkInBase):
    patient_id: str | None = None
    token_number: str | None = None  # auto-generated if omitted
    issue_time: str | None = None


class WalkInUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    department: str | None = None
    doctor_name: str | None = None
    estimated_wait_minutes: int | None = None
    status: WalkInStatus | None = None
    branch: str | None = None
    is_emergency: bool | None = Field(None, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int | None = None


class WalkInOut(WalkInBase, TimestampedORMBase):
    token_number: str
    patient_id: str | None = None
    issue_time: str
    status: WalkInStatus


class QueueItemBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    token_number: str = Field(..., validation_alias=AliasChoices("token_number", "tokenNumber"))
    patient_uhid: str = Field(..., validation_alias=AliasChoices("patient_uhid", "patientUhid"))
    patient_name: str = Field(..., validation_alias=AliasChoices("patient_name", "patientName"))
    blood_group: str | None = Field(None, validation_alias=AliasChoices("blood_group", "bloodGroup"))
    doctor_name: str = Field(..., validation_alias=AliasChoices("doctor_name", "doctorName"))
    department: str
    waiting_time_minutes: int = Field(0, validation_alias=AliasChoices("waiting_time_minutes", "waitingTimeMinutes"))
    is_emergency: bool = Field(False, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int = 0
    assigned_nurse: str | None = Field(None, validation_alias=AliasChoices("assigned_nurse", "assignedNurse"))
    branch: str | None = None


class QueueItemCreate(QueueItemBase):
    status: QueueStatus = QueueStatus.Waiting
    time_issued: str | None = None


class QueueItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    status: QueueStatus | None = None
    waiting_time_minutes: int | None = None
    branch: str | None = None
    is_emergency: bool | None = Field(None, validation_alias=AliasChoices("is_emergency", "isEmergency"))
    priority: int | None = None


class QueueItemOut(QueueItemBase, TimestampedORMBase):
    status: QueueStatus
    time_issued: str
