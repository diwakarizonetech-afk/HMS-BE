from pydantic import BaseModel

from app.schemas.common import TimestampedORMBase


# ---------------------------------------------------------------------------
# EmergencyEncounter schemas
# ---------------------------------------------------------------------------

class EmergencyEncounterCreate(BaseModel):
    patient_id: str | None = None
    patient_uhid: str
    patient_name: str
    patient_age: int | None = None
    patient_gender: str | None = None
    patient_blood_group: str | None = None
    patient_phone: str | None = None
    patient_allergies: str | None = None
    patient_existing_diseases: str | None = None
    patient_emergency_contact_name: str | None = None
    patient_emergency_contact_phone: str | None = None
    patient_emergency_relationship: str | None = None
    arrival_date: str
    arrival_time: str
    arrival_mode: str = "Walk-in"
    ambulance_number: str | None = None
    referral_hospital: str | None = None
    paramedic_name: str | None = None
    emergency_type: str = "General Emergency"
    chief_complaint: str
    accompanied_by: str | None = None
    emergency_contact: str | None = None
    department: str | None = None
    assigned_doctor: str | None = None
    assigned_nurse: str | None = None
    registered_by: str | None = None
    created_by: str | None = None
    branch: str | None = None


class EmergencyEncounterUpdate(BaseModel):
    patient_name: str | None = None
    patient_age: int | None = None
    patient_gender: str | None = None
    patient_blood_group: str | None = None
    patient_phone: str | None = None
    patient_allergies: str | None = None
    patient_existing_diseases: str | None = None
    patient_emergency_contact_name: str | None = None
    patient_emergency_contact_phone: str | None = None
    patient_emergency_relationship: str | None = None
    arrival_date: str | None = None
    arrival_time: str | None = None
    arrival_mode: str | None = None
    ambulance_number: str | None = None
    referral_hospital: str | None = None
    paramedic_name: str | None = None
    emergency_type: str | None = None
    chief_complaint: str | None = None
    accompanied_by: str | None = None
    emergency_contact: str | None = None
    department: str | None = None
    assigned_doctor: str | None = None
    assigned_nurse: str | None = None
    triage_status: str | None = None
    triage_time: str | None = None
    triaged_by: str | None = None
    triage_notes: str | None = None
    er_status: str | None = None
    er_disposition: str | None = None
    disposition_notes: str | None = None
    required_ward: str | None = None
    current_location: str | None = None
    observation_bed_id: str | None = None
    ipd_admission_id: str | None = None
    discharge_time: str | None = None
    discharge_notes: str | None = None
    updated_by: str | None = None
    branch: str | None = None


class EmergencyEncounterOut(TimestampedORMBase):
    encounter_number: str
    patient_id: str | None = None
    patient_uhid: str
    patient_name: str
    patient_age: int | None = None
    patient_gender: str | None = None
    patient_blood_group: str | None = None
    patient_phone: str | None = None
    patient_allergies: str | None = None
    patient_existing_diseases: str | None = None
    patient_emergency_contact_name: str | None = None
    patient_emergency_contact_phone: str | None = None
    patient_emergency_relationship: str | None = None
    arrival_date: str
    arrival_time: str
    arrival_mode: str
    ambulance_number: str | None = None
    referral_hospital: str | None = None
    paramedic_name: str | None = None
    emergency_type: str
    chief_complaint: str
    accompanied_by: str | None = None
    emergency_contact: str | None = None
    department: str | None = None
    assigned_doctor: str | None = None
    assigned_nurse: str | None = None
    triage_status: str
    triage_time: str | None = None
    triaged_by: str | None = None
    triage_notes: str | None = None
    er_status: str
    er_disposition: str
    disposition_notes: str | None = None
    required_ward: str | None = None
    current_location: str | None = None
    observation_bed_id: str | None = None
    ipd_admission_id: str | None = None
    discharge_time: str | None = None
    discharge_notes: str | None = None
    registered_by: str | None = None
    created_by: str | None = None
    updated_by: str | None = None
    branch: str | None = None


# ---------------------------------------------------------------------------
# Triage schema
# ---------------------------------------------------------------------------

class ERTriageRequest(BaseModel):
    triage_status: str
    triage_notes: str | None = None
    triaged_by: str | None = None
    triage_time: str | None = None
    current_location: str | None = None


# ---------------------------------------------------------------------------
# ERAssessment schemas
# ---------------------------------------------------------------------------

class ERAssessmentCreate(BaseModel):
    presenting_complaint: str | None = None
    history: str | None = None
    clinical_examination: str | None = None
    assessment: str
    severity: str | None = None
    provisional_diagnosis: str | None = None
    final_diagnosis: str | None = None
    diagnosis_notes: str | None = None
    doctor_name: str
    doctor_id: str | None = None
    assessment_time: str | None = None


class ERAssessmentUpdate(BaseModel):
    presenting_complaint: str | None = None
    history: str | None = None
    clinical_examination: str | None = None
    assessment: str | None = None
    severity: str | None = None
    provisional_diagnosis: str | None = None
    final_diagnosis: str | None = None
    diagnosis_notes: str | None = None
    doctor_name: str | None = None
    assessment_time: str | None = None


class ERAssessmentOut(TimestampedORMBase):
    encounter_id: str
    presenting_complaint: str | None = None
    history: str | None = None
    clinical_examination: str | None = None
    assessment: str
    severity: str | None = None
    provisional_diagnosis: str | None = None
    final_diagnosis: str | None = None
    diagnosis_notes: str | None = None
    doctor_name: str
    doctor_id: str | None = None
    assessment_time: str | None = None


# ---------------------------------------------------------------------------
# ERProcedure schemas
# ---------------------------------------------------------------------------

class ERProcedureCreate(BaseModel):
    procedure_name: str
    indication: str | None = None
    notes: str | None = None
    outcome: str | None = None
    performed_by: str
    procedure_time: str | None = None


class ERProcedureOut(TimestampedORMBase):
    encounter_id: str
    procedure_name: str
    indication: str | None = None
    notes: str | None = None
    outcome: str | None = None
    performed_by: str
    procedure_time: str | None = None


# ---------------------------------------------------------------------------
# Disposition schema
# ---------------------------------------------------------------------------

class ERDispositionRequest(BaseModel):
    disposition: str
    disposition_notes: str | None = None
    required_ward: str | None = None
    doctor_name: str | None = None


# ---------------------------------------------------------------------------
# Observation bed assign schema
# ---------------------------------------------------------------------------

class ERAssignBedRequest(BaseModel):
    bed_id: str
    current_location: str | None = None


# ---------------------------------------------------------------------------
# IPD transfer schema
# ---------------------------------------------------------------------------

class ERToIPDRequest(BaseModel):
    ward: str
    room_number: str | None = "ER-Room"
    bed_number: str
    bed_id: str | None = None
    attending_doctor: str
    attending_nurse: str | None = None
    admission_reason: str | None = None
    emergency_contact: str | None = None
    insurance_provider: str | None = None
    insurance_number: str | None = None
