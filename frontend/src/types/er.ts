export type ArrivalMode = 'Walk-in' | 'Ambulance';

export type EmergencyType =
  | 'Trauma'
  | 'Cardiac'
  | 'Respiratory'
  | 'Neurological'
  | 'Burns'
  | 'Pediatric'
  | 'General Emergency'
  | 'Other';

export type TriageStatus =
  | 'Priority 1 (Red - Critical)'
  | 'Priority 2 (Yellow - Urgent)'
  | 'Priority 3 (Green - Non-Urgent)'
  | 'Pending Triage';

export type ERStatus =
  | 'Registered'
  | 'Waiting for Triage'
  | 'Triage Completed'
  | 'Waiting for Doctor'
  | 'Under Doctor Assessment'
  | 'Observation'
  | 'IPD Admission Pending'
  | 'Discharged'
  | 'Transferred';

export type ERDisposition =
  | 'Pending'
  | 'Discharge'
  | 'Observation'
  | 'IPD'
  | 'Transferred';

export interface AmbulanceInfo {
  ambulanceNumber?: string;
  referralHospital?: string;
  paramedicName?: string;
  arrivalTime?: string;
}

export interface ERTimelineItem {
  id: string;
  timestamp: string;
  title: string;
  actor: string;
  role: 'Reception' | 'Nurse' | 'Doctor' | 'System';
  description: string;
}

export interface ERVitalSign {
  temperature?: number;
  bpSys?: number;
  bpDia?: number;
  bloodPressure?: string;
  pulseRate?: number;
  respiratoryRate?: number;
  spO2?: number;
  painScale?: number;
  recordedBy?: string;
  recordedAt?: string;
}

export interface ERNursingNote {
  id: string;
  note: string;
  recordedBy: string;
  time: string;
}

export interface ERMedicationAdmin {
  id: string;
  medicineName: string;
  dosage: string;
  route: string;
  timeGiven: string;
  givenBy: string;
}

export interface ERLabOrder {
  id: string;
  testName: string;
  priority: 'Normal' | 'STAT' | 'Emergency';
  status: 'Ordered' | 'Sample Collected' | 'Result Ready';
}

export interface ERPharmacyOrder {
  id: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  status: 'Prescribed' | 'Dispensed';
}

export interface EROrderedProcedure {
  id: string;
  procedureName: string;
  performedBy: string;
  notes?: string;
  timePerformed?: string;
}

export interface ERVisit {
  id: string; // e.g. ERV-2026-101
  patientUhid: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyRelationship: string;
  allergies?: string;
  existingDiseases?: string;

  // ER Registration Fields
  arrivalDate: string;
  arrivalTime: string;
  arrivalMode: ArrivalMode;
  ambulanceInfo?: AmbulanceInfo;
  emergencyType: EmergencyType;
  accompaniedBy: string;
  emergencyContact: string;
  initialComplaint: string;
  registrationStatus: 'Registered' | 'In Progress' | 'Completed' | 'Cancelled';
  registeredBy: string;

  // Workflow & Location Tracking
  triageStatus: TriageStatus;
  triageTime?: string;
  triagedBy?: string;
  triageNotes?: string;
  currentLocation: string; // e.g. "ER Triage", "ER Observation - Room OBS-01, Bed OBS-05"
  erStatus: ERStatus;
  department?: string;
  assignedDoctor: string;
  assignedNurse?: string;

  // Nurse Clinical Data
  vitals?: ERVitalSign;
  nursingNotes?: ERNursingNote[];
  medicationsAdministered?: ERMedicationAdmin[];

  // Doctor Clinical Data
  doctorAssessment?: string;
  diagnosis?: string;
  labOrders?: ERLabOrder[];
  pharmacyOrders?: ERPharmacyOrder[];
  emergencyProcedures?: EROrderedProcedure[];
  erDisposition: ERDisposition;
  dispositionNotes?: string;
  requiredWard?: string;
  ipdAdmissionStatus?: 'Pending Coordination' | 'Admitted' | 'Cancelled';

  // Audit Timeline
  timeline: ERTimelineItem[];
  createdDate: string;
  branch?: string;
}

export interface ERObservationBed {
  id: string;
  bedNumber: string; // e.g. OBS-01
  roomNumber: string; // e.g. OBS-ROOM-A
  observationWard: string; // e.g. ER Observation Unit 1
  bedStatus: 'Available' | 'Occupied' | 'Cleaning' | 'Reserved';
  currentPatientUhid?: string;
  currentPatientName?: string;
  erVisitId?: string;
  assignmentTime?: string;
  branch?: string;
}
