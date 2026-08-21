from pydantic import BaseModel

from app.models.ipd import BedStatus, WardType, IPDStatus
from app.schemas.common import TimestampedORMBase


class BedBase(BaseModel):
    bed_number: str
    ward: str
    room_number: str = ""
    category: str = "Standard"
    branch: str | None = None
    daily_rate: float = 0


class BedCreate(BedBase):
    status: BedStatus = BedStatus.Available


class BedUpdate(BaseModel):
    ward: str | None = None
    room_number: str | None = None
    category: str | None = None
    branch: str | None = None
    daily_rate: float | None = None
    doctor_assigned: str | None = None
    nurse_in_charge: str | None = None
    status: BedStatus | None = None
    current_patient_id: str | None = None
    current_patient_uhid: str | None = None
    current_patient_name: str | None = None
    admitted_date: str | None = None


class BedOut(BedBase, TimestampedORMBase):
    status: BedStatus
    branch: str | None = None
    daily_rate: float = 0
    doctor_assigned: str | None = None
    nurse_in_charge: str | None = None
    current_patient_id: str | None = None
    current_patient_uhid: str | None = None
    current_patient_name: str | None = None
    admitted_date: str | None = None


class BedAllocateRequest(BaseModel):
    patient_id: str


class IPDAdmissionBase(BaseModel):
    patient_uhid: str
    patient_name: str
    ward: str
    room_number: str | None = "R-101"
    bed_number: str
    attending_doctor: str
    attending_nurse: str | None = None
    admission_reason: str | None = None
    emergency_contact: str | None = "N/A"
    insurance_provider: str | None = None
    insurance_number: str | None = None
    branch: str | None = None


class IPDAdmissionCreate(IPDAdmissionBase):
    patient_id: str | None = None
    bed_id: str | None = None
    admission_date: str | None = None
    status: IPDStatus = IPDStatus.Admitted


class IPDAdmissionUpdate(BaseModel):
    ward: str | None = None
    room_number: str | None = None
    bed_number: str | None = None
    attending_doctor: str | None = None
    attending_nurse: str | None = None
    admission_reason: str | None = None
    emergency_contact: str | None = None
    insurance_provider: str | None = None
    insurance_number: str | None = None
    branch: str | None = None
    status: IPDStatus | None = None


class IPDAdmissionOut(IPDAdmissionBase, TimestampedORMBase):
    patient_id: str | None = None
    bed_id: str | None = None
    admission_date: str
    attending_nurse: str | None = None
    branch: str | None = None
    status: IPDStatus
