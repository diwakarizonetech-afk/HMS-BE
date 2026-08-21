from pydantic import BaseModel, Field, ConfigDict


class PatientVitalBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    patient_uhid: str = Field(..., alias="patientUhid")
    patient_name: str | None = Field(None, alias="patientName")
    age: int | None = None
    gender: str | None = None
    doctor_id: str | None = Field(None, alias="doctorId")
    doctor_name: str | None = Field(None, alias="doctorName")
    department: str | None = None
    height: float | None = None
    weight: float | None = None
    temperature: float = 98.6
    blood_pressure: str | None = Field(None, alias="bloodPressure")
    bp_sys: float = Field(120, alias="bpSys")
    bp_dia: float = Field(80, alias="bpDia")
    pulse_rate: float = Field(72, alias="pulseRate")
    pulse: float = 72
    respiratory_rate: float = Field(18, alias="respiratoryRate")
    resp_rate: float = Field(18, alias="respRate")
    spo2: float = Field(98, alias="spO2")
    blood_sugar: float | None = Field(None, alias="bloodSugar")
    pain_scale: int | None = Field(None, alias="painScale")
    remarks: str | None = ""
    recorded_by: str = Field("Nurse", alias="recordedBy")
    recorded_at: str | None = Field(None, alias="recordedAt")
    date: str | None = None
    time: str | None = None
    er_encounter_id: str | None = Field(None, alias="erEncounterId")
    branch: str | None = None


class PatientVitalCreate(PatientVitalBase):
    pass


class PatientVitalOut(PatientVitalBase):
    id: str


class NursingNoteBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    patient_uhid: str = Field(..., alias="patientUhid")
    patient_name: str | None = Field(None, alias="patientName")
    admission_id: str | None = Field(None, alias="admissionId")
    er_encounter_id: str | None = Field(None, alias="erEncounterId")
    ward: str | None = None
    diagnosis: str | None = ""
    observation: str | None = ""
    symptoms: str | None = ""
    treatment_response: str | None = Field("", alias="treatmentResponse")
    doctor_instructions: str | None = Field("", alias="doctorInstructions")
    fluid_intake: float | None = Field(None, alias="fluidIntake")
    fluid_output: float | None = Field(None, alias="fluidOutput")
    patient_condition: str | None = Field(None, alias="patientCondition")
    category: str = "General Note"
    note: str = ""
    notes: str | None = ""
    nurse_name: str = Field("Nurse", alias="nurseName")
    recorded_by: str | None = Field(None, alias="recordedBy")
    created_at_time: str | None = Field(None, alias="createdAtTime")
    date: str | None = None
    time: str | None = None
    branch: str | None = None


class NursingNoteCreate(NursingNoteBase):
    pass


class NursingNoteOut(NursingNoteBase):
    id: str


class MedicationLogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    patient_uhid: str = Field(..., alias="patientUhid")
    patient_name: str | None = Field(None, alias="patientName")
    admission_id: str | None = Field(None, alias="admissionId")
    er_encounter_id: str | None = Field(None, alias="erEncounterId")
    ward: str | None = None
    doctor_name: str | None = Field(None, alias="doctorName")
    medicine_name: str = Field(..., alias="medicineName")
    dosage: str
    route: str = "Oral"
    frequency: str | None = None
    scheduled_time: str = Field(..., alias="scheduledTime")
    administered_at: str | None = Field(None, alias="administeredAt")
    given_time: str | None = Field(None, alias="givenTime")
    status: str = "Given"
    reason_if_missed: str | None = Field(None, alias="reasonIfMissed")
    remarks: str | None = ""
    nurse_name: str = Field("Nurse", alias="nurseName")
    branch: str | None = None


class MedicationLogCreate(MedicationLogBase):
    pass


class MedicationLogOut(MedicationLogBase):
    id: str


class WardTransferBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    transfer_id: str = Field(..., alias="transferId")
    patient_uhid: str = Field(..., alias="patientUhid")
    patient_name: str = Field(..., alias="patientName")
    current_ward: str = Field(..., alias="currentWard")
    current_bed: str = Field(..., alias="currentBed")
    new_ward: str = Field(..., alias="newWard")
    new_bed: str = Field(..., alias="newBed")
    transfer_reason: str = Field(..., alias="transferReason")
    transfer_date: str = Field(..., alias="transferDate")
    transfer_time: str = Field(..., alias="transferTime")
    doctor_approval: str = Field("Approved", alias="doctorApproval")
    doctor_name: str | None = Field(None, alias="doctorName")
    remarks: str | None = ""
    transferred_by: str = Field("Nurse", alias="transferredBy")
    status: str = "Completed"
    branch: str | None = None



class WardTransferCreate(WardTransferBase):
    pass


class WardTransferOut(WardTransferBase):
    id: str
