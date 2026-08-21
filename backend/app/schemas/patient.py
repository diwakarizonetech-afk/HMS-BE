from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.patient import Gender, BloodGroup, MaritalStatus, PatientStatus, ContactPriority
from app.schemas.common import TimestampedORMBase


class PatientBase(BaseModel):
    first_name: str
    last_name: str
    gender: Gender | str = Gender.Male
    dob: str | None = None
    age: int | None = 0
    blood_group: BloodGroup | str = BloodGroup.O_pos
    marital_status: MaritalStatus | str = MaritalStatus.Single
    nationality: str | None = "Indian"

    mobile: str | None = None
    alt_mobile: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None

    aadhaar: str | None = None
    pan: str | None = None

    emergency_contact_name: str | None = None
    emergency_relationship: str | None = None
    emergency_phone: str | None = None

    allergies: str | None = None
    existing_diseases: str | None = None
    insurance_provider: str | None = None
    insurance_number: str | None = None
    branch: str | None = None

    @field_validator("mobile", "alt_mobile", "emergency_phone")
    @classmethod
    def validate_mobile_fields(cls, v: str | None) -> str | None:
        if v:
            clean = "".join(filter(str.isdigit, v))
            if len(clean) >= 10:
                return clean[-10:]
            return clean
        return v


class PatientCreate(PatientBase):
    uhid: str | None = None  # auto-generated if not supplied
    status: PatientStatus = PatientStatus.Active
    registration_date: str | None = None  # defaults to today


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: Gender | None = None
    dob: str | None = None
    age: int | None = None
    blood_group: BloodGroup | None = None
    marital_status: MaritalStatus | None = None
    nationality: str | None = None
    mobile: str | None = None
    alt_mobile: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    pincode: str | None = None
    aadhaar: str | None = None
    pan: str | None = None
    emergency_contact_name: str | None = None
    emergency_relationship: str | None = None
    emergency_phone: str | None = None
    allergies: str | None = None
    existing_diseases: str | None = None
    insurance_provider: str | None = None
    insurance_number: str | None = None
    status: PatientStatus | None = None


class PatientOut(PatientBase, TimestampedORMBase):
    uhid: str
    status: PatientStatus
    registration_date: str


class EmergencyContactBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    patient_uhid: str
    patient_name: str
    contact_name: str
    relationship_: str = Field(alias="relationship")
    phone: str
    priority: ContactPriority


class EmergencyContactCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    patient_id: str
    contact_name: str
    relationship_: str = Field(alias="relationship")
    phone: str
    priority: ContactPriority = ContactPriority.Secondary


class EmergencyContactOut(EmergencyContactBase, TimestampedORMBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
