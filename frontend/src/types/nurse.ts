export interface VitalSign {
  id: string;
  patientUhid: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  doctorId: string;
  doctorName: string;
  department: string;
  height: number; // in cm
  weight: number; // in kg
  temperature: number; // in °F
  bloodPressure: string; // e.g. "120/80"
  pulseRate: number; // bpm
  respiratoryRate: number; // breaths per min
  spO2: number; // percentage
  bloodSugar: number; // mg/dL
  painScale: number; // 1 to 10
  remarks: string;
  recordedBy: string;
  date: string;
  time: string;
  branch?: string;
}

export interface WardTransfer {
  id: string;
  transferId: string; // e.g. TRF-2026-101
  patientUhid: string;
  patientName: string;
  currentWard: string;
  currentBed: string;
  newWard: string;
  newBed: string;
  transferReason: string;
  transferDate: string;
  transferTime: string;
  doctorApproval: 'Approved' | 'Pending Approval' | 'Requested';
  doctorName: string;
  remarks: string;
  transferredBy: string;
  status: 'Completed' | 'Pending' | 'In Progress' | 'Cancelled';
  branch?: string;
}

export interface NursingNote {
  id: string;
  patientUhid: string;
  patientName: string;
  ward: string;
  diagnosis: string;
  observation: string;
  symptoms: string;
  treatmentResponse: string;
  doctorInstructions: string;
  fluidIntake: number; // in mL
  fluidOutput: number; // in mL
  patientCondition: 'Stable' | 'Critical' | 'Improving' | 'Guarded' | 'Under Observation';
  notes: string;
  recordedBy: string;
  date: string;
  time: string;
  branch?: string;
}

export interface MedicationAdmin {
  id: string;
  patientUhid: string;
  patientName: string;
  ward: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  route: 'Oral' | 'IV Injection' | 'IM Injection' | 'Subcutaneous' | 'Inhalation' | 'Topical';
  frequency: 'Once Daily (OD)' | 'Twice Daily (BD)' | 'Thrice Daily (TDS)' | 'Q4H' | 'Q6H' | 'As Needed (PRN)';
  scheduledTime: string;
  givenTime?: string;
  status: 'Scheduled' | 'Given' | 'Missed' | 'Delayed';
  reasonIfMissed?: string;
  remarks?: string;
  nurseName: string;
  branch?: string;
}

export interface NurseActivity {
  id: string;
  activityType: 'Patient Admitted' | 'Vitals Recorded' | 'Medication Given' | 'Nursing Note Added' | 'Ward Transfer';
  patientName: string;
  patientUhid: string;
  details: string;
  timeAgo: string;
  nurseName: string;
  status: 'Completed' | 'Alert' | 'Pending';
  branch?: string;
}
