import React, { useState, useEffect } from 'react';
import { useLab } from '../../../context/LabContext';
import {
  Search, ArrowLeft, User, Phone, Droplets, BedDouble, Stethoscope,
  Calendar, Clock, Printer, Download, Upload, FileText, Activity,
  AlertTriangle, Scissors, Users, Pill, FlaskConical, Scan, ClipboardList,
  Inbox, Thermometer, Heart, Wind, Weight, X, Plus, CheckCircle2, ChevronDown,
  FileCheck, ShieldAlert, AlertCircle, Edit3, Save, Check, Filter, Eye, ChevronRight
} from 'lucide-react';

const LAB_TEST_OPTIONS = [
  'Complete Blood Count (CBC)',
  'Blood Sugar (Fasting)',
  'Blood Sugar (PP)',
  'HbA1c',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Lipid Profile',
  'Thyroid Profile (T3, T4, TSH)',
  'Urine Routine & Microscopy',
  'Serum Electrolytes',
  'Troponin-I',
];

// ─── Complete IPD Consultation Interfaces (Matching 3 Images) ───
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPDClinicalInfo {
  chiefComplaints: string;
  presentIllness: string;
  pastMedicalHistory: string;
  surgicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  allergyInformation: string;
  currentMedications: string;
}

export interface IPDVitals {
  temperature: number;
  systolicBP: number;
  diastolicBP: number;
  pulseRate: number;
  respiratoryRate: number;
  spo2: number;
  weight: number;
  height: number;
  bmi: number;
  lastRecordedTime: string;
}

export interface IPDDailyRound {
  id: string;
  roundDateTime: string;
  subjectiveNotes: string;
  objectiveFindings: string;
  assessment: string;
  plan: string;
  progressNotes: string;
  nextReviewDate: string;
  doctorName: string;
}

export interface IPDDiagnosis {
  primaryDiagnosis: string;
  primaryCode: string;
  secondaryDiagnosis: string;
  secondaryCode: string;
}

export interface IPDOrders {
  labTestOrders: string[];
  radiologyOrders: string[];
  procedures: string[];
  nursingInstructions: string;
  dietInstructions: string;
  physiotherapyOrders: string;
}

export interface IPDPrescriptionMed {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  specialInstructions: string;
}

export interface IPDLabReport {
  id: string;
  name: string;
  date: string;
  status: string;
  result: string;
  unit: string;
  normalRange: string;
}

export interface IPDRadiologyReport {
  id: string;
  name: string;
  date: string;
  impression: string;
  findings: string;
}

export interface IPDAttachedReport {
  id: string;
  fileName: string;
  uploadDate: string;
  size: string;
}

export interface IPDDischargeSummary {
  finalDiagnosis: string;
  treatmentGiven: string;
  hospitalCourse: string;
  conditionAtDischarge: 'Stable' | 'Improved' | 'Critical' | 'DAMA';
  dischargeMedications: Array<{
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  followUpDate: string;
  dischargeAdvice: string;
}

export interface IPDStatusInfo {
  admissionStatus: 'Admitted' | 'Under Treatment' | 'ICU' | 'Discharged';
  bedStatus: 'Occupied' | 'Vacant' | 'Transferred';
  lastUpdatedBy: string;
  lastUpdatedTime: string;
}

export interface IPDPatientRecord {
  patientId: string;
  ipNumber: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  mobileNumber: string;
  emergencyContact: EmergencyContact;

  admissionDateTime: string;
  ward: string;
  roomNumber: string;
  bedNumber: string;
  admittingDoctor: string;
  department: string;
  admissionDiagnosis: string;
  admissionReason: string;

  clinicalInfo: IPDClinicalInfo;
  vitals: IPDVitals;
  dailyRounds: IPDDailyRound[];
  diagnosis: IPDDiagnosis;
  orders: IPDOrders;
  prescriptions: IPDPrescriptionMed[];
  investigationResults: {
    labReports: IPDLabReport[];
    radiologyReports: IPDRadiologyReport[];
    attachedReports: IPDAttachedReport[];
  };
  dischargeSummary: IPDDischargeSummary;
  statusInfo: IPDStatusInfo;
  uhid?: string;
}

const INITIAL_PATIENTS: IPDPatientRecord[] = [];

// ─── Section Keys ──────────────────────────────────────────────
type IPDSectionKey =
  | 'patient_admission'
  | 'clinical_info'
  | 'vitals'
  | 'daily_rounds'
  | 'diagnosis'
  | 'orders'
  | 'prescription'
  | 'investigations'
  | 'discharge_summary';

const SECTIONS: Array<{ key: IPDSectionKey; label: string; icon: React.ReactNode }> = [
  { key: 'patient_admission', label: '1. Patient & Admission Info', icon: <User className="w-4 h-4" /> },
  { key: 'clinical_info', label: '2. Clinical Information', icon: <FileText className="w-4 h-4" /> },
  { key: 'vitals', label: '3. Vital Signs', icon: <Activity className="w-4 h-4" /> },
  { key: 'daily_rounds', label: '4. Doctor Daily Rounds', icon: <Stethoscope className="w-4 h-4" /> },
  { key: 'diagnosis', label: '5. Diagnosis (ICD-10)', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'orders', label: '6. Doctor Orders', icon: <FileCheck className="w-4 h-4" /> },
  { key: 'prescription', label: '7. Prescriptions', icon: <Pill className="w-4 h-4" /> },
  { key: 'investigations', label: '8. Investigation Results', icon: <FlaskConical className="w-4 h-4" /> },
  { key: 'discharge_summary', label: '9. Discharge Summary & Status', icon: <Printer className="w-4 h-4" /> },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Admitted: { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Under Treatment': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  ICU: { bg: 'bg-rose-100', text: 'text-rose-800' },
  Discharged: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Occupied: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Vacant: { bg: 'bg-slate-200', text: 'text-slate-700' },
  Transferred: { bg: 'bg-amber-100', text: 'text-amber-800' },
};

const StatusBadge: React.FC<{ status: string; dot?: boolean }> = ({ status, dot = true }) => {
  const color = STATUS_COLORS[status] || { bg: 'bg-slate-200', text: 'text-slate-700' };
  return (
    <span className={`inline-flex items-center gap-1 font-bold text-xs px-3 py-1 rounded-full ${color.bg} ${color.text}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────
export const MedicalHistoryPage: React.FC = () => {
  const { labReports, doctorReviewReport, createPatientOrderFromOPD } = useLab();
  const [patients, setPatients] = useState<IPDPatientRecord[]>(INITIAL_PATIENTS);
  
  // View mode: 'list' (Full Screen Table) | 'details' (Full Screen 9-Section EMR)
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<IPDSectionKey>('patient_admission');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('2026-07-24');

  // Modals & Form States
  const [showAddRoundModal, setShowAddRoundModal] = useState<boolean>(false);
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);

  // ─── IPD Lab Test Selection & Report Modal States ───
  const [selectedLabTest, setSelectedLabTest] = useState<string>('');
  const [ipdLabTests, setIpdLabTests] = useState<Array<{ id: string; testName: string; status: string }>>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedReportTestName, setSelectedReportTestName] = useState<string>('');
  const [showInstructionForm, setShowInstructionForm] = useState<boolean>(false);
  const [popupInstructionText, setPopupInstructionText] = useState<string>('');
  const [popupStatus, setPopupStatus] = useState<'Approved' | 'Re-Test Requested'>('Approved');

  // ─── Section In-Place Edit States ───
  const [isEditingClinical, setIsEditingClinical] = useState<boolean>(false);
  const [clinicalForm, setClinicalForm] = useState<IPDClinicalInfo>({
    chiefComplaints: '',
    presentIllness: '',
    pastMedicalHistory: '',
    surgicalHistory: '',
    familyHistory: '',
    socialHistory: '',
    allergyInformation: '',
    currentMedications: '',
  });

  const [isEditingVitals, setIsEditingVitals] = useState<boolean>(false);
  const [vitalsForm, setVitalsForm] = useState<IPDVitals>({
    temperature: 98.6,
    systolicBP: 120,
    diastolicBP: 80,
    pulseRate: 72,
    respiratoryRate: 16,
    spo2: 98,
    weight: 70,
    height: 170,
    bmi: 24.2,
    lastRecordedTime: '',
  });

  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState<boolean>(false);
  const [diagnosisForm, setDiagnosisForm] = useState<IPDDiagnosis>({
    primaryDiagnosis: '',
    primaryCode: '',
    secondaryDiagnosis: '',
    secondaryCode: '',
  });

  const [isEditingOrders, setIsEditingOrders] = useState<boolean>(false);
  const [ordersForm, setOrdersForm] = useState<{
    labTestOrdersStr: string;
    radiologyOrdersStr: string;
    proceduresStr: string;
    nursingInstructions: string;
    dietInstructions: string;
    physiotherapyOrders: string;
  }>({
    labTestOrdersStr: '',
    radiologyOrdersStr: '',
    proceduresStr: '',
    nursingInstructions: '',
    dietInstructions: '',
    physiotherapyOrders: '',
  });

  const [isEditingDischarge, setIsEditingDischarge] = useState<boolean>(false);
  const [dischargeForm, setDischargeForm] = useState<{
    finalDiagnosis: string;
    treatmentGiven: string;
    hospitalCourse: string;
    conditionAtDischarge: 'Stable' | 'Improved' | 'Critical' | 'DAMA';
    followUpDate: string;
    dischargeAdvice: string;
    admissionStatus: 'Admitted' | 'Under Treatment' | 'ICU' | 'Discharged';
  }>({
    finalDiagnosis: '',
    treatmentGiven: '',
    hospitalCourse: '',
    conditionAtDischarge: 'Stable',
    followUpDate: '',
    dischargeAdvice: '',
    admissionStatus: 'Under Treatment',
  });

  // Daily Round Form State
  const [newRoundSubjective, setNewRoundSubjective] = useState('');
  const [newRoundObjective, setNewRoundObjective] = useState('');
  const [newRoundAssessment, setNewRoundAssessment] = useState('');
  const [newRoundPlan, setNewRoundPlan] = useState('');
  const [newRoundProgress, setNewRoundProgress] = useState('');
  const [newRoundNextReview, setNewRoundNextReview] = useState('');

  // Prescription Form State
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('Once Daily (OD)');
  const [newMedRoute, setNewMedRoute] = useState('Oral');
  const [newMedDuration, setNewMedDuration] = useState('7 Days');
  const [newMedInstructions, setNewMedInstructions] = useState('');

  // Fetch real IPD records from backend on mount
  useEffect(() => {
    const fetchIPDRecords = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        const apiHost = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
        const res = await fetch(`${apiHost}/api/v1/doctors/ipd-records`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPatients(data);
          }
        }
      } catch (e) {
        console.warn('MedicalHistoryPage: error fetching IPD records:', e);
      }
    };
    fetchIPDRecords();
  }, []);

  // Current Active Patient
  const patient = patients.find((p) => p.patientId === selectedPatientId) || patients[0];

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.admissionDiagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.statusInfo.admissionStatus === statusFilter;
    const matchesDate = !selectedDateFilter || p.admissionDateTime.startsWith(selectedDateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleOpenPatientDetails = (p: IPDPatientRecord) => {
    setSelectedPatientId(p.patientId);
    setViewMode('details');
    setActiveSection('patient_admission');
    setIsEditingClinical(false);
    setIsEditingVitals(false);
    setIsEditingDiagnosis(false);
    setIsEditingOrders(false);
    setIsEditingDischarge(false);
  };

  // ─── Edit Inits & Savers ─────────────────────────────
  const startEditClinical = () => {
    setClinicalForm({ ...patient.clinicalInfo });
    setIsEditingClinical(true);
  };

  const saveClinical = () => {
    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              clinicalInfo: { ...clinicalForm },
              statusInfo: { ...item.statusInfo, lastUpdatedTime: new Date().toLocaleString() },
            }
          : item
      )
    );
    setIsEditingClinical(false);
  };

  const startEditVitals = () => {
    setVitalsForm({ ...patient.vitals });
    setIsEditingVitals(true);
  };

  const saveVitals = () => {
    const heightM = (vitalsForm.height || 170) / 100;
    const calculatedBMI = Number((vitalsForm.weight / (heightM * heightM)).toFixed(1));
    const updatedVitals: IPDVitals = {
      ...vitalsForm,
      bmi: calculatedBMI,
      lastRecordedTime: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };

    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              vitals: updatedVitals,
              statusInfo: { ...item.statusInfo, lastUpdatedTime: new Date().toLocaleString() },
            }
          : item
      )
    );
    setIsEditingVitals(false);
  };

  const startEditDiagnosis = () => {
    setDiagnosisForm({ ...patient.diagnosis });
    setIsEditingDiagnosis(true);
  };

  const saveDiagnosis = () => {
    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              diagnosis: { ...diagnosisForm },
              statusInfo: { ...item.statusInfo, lastUpdatedTime: new Date().toLocaleString() },
            }
          : item
      )
    );
    setIsEditingDiagnosis(false);
  };

  const handleAddLabTestFromDropdown = (testName: string) => {
    if (!testName) return;
    if (ipdLabTests.some((t) => t.testName === testName)) return;
    setIpdLabTests((prev) => [
      ...prev,
      { id: `ipd-lab-${Date.now()}-${prev.length}`, testName, status: 'Requested' },
    ]);
    setSelectedLabTest('');
  };

  const handleRemoveLabTest = (testId: string) => {
    setIpdLabTests((prev) => prev.filter((t) => t.id !== testId));
  };

  const handleOpenReportModal = (testName: string) => {
    setSelectedReportTestName(testName);
    setShowInstructionForm(false);

    const matchingReport = labReports.find(
      (r) =>
        r.patientUhid.toLowerCase() === (patient.uhid || patient.patientId).toLowerCase() ||
        r.patientName.toLowerCase() === patient.patientName.toLowerCase()
    );

    setPopupInstructionText(matchingReport?.doctorComments || '');
    setPopupStatus(
      matchingReport?.doctorReviewStatus === 'Re-Test Requested' ? 'Re-Test Requested' : 'Approved'
    );
    setIsReportModalOpen(true);
  };

  const handleSaveReportInstruction = (targetStatus: 'Approved' | 'Re-Test Requested') => {
    const matchingReport = labReports.find(
      (r) =>
        r.patientUhid.toLowerCase() === (patient.uhid || patient.patientId).toLowerCase() ||
        r.patientName.toLowerCase() === patient.patientName.toLowerCase()
    );

    const textToSave =
      popupInstructionText.trim() ||
      (targetStatus === 'Re-Test Requested'
        ? 'Re-test requested on fresh specimen.'
        : 'Verified & approved by attending doctor.');

    if (matchingReport) {
      doctorReviewReport(matchingReport.id, targetStatus, textToSave);
    }

    setPopupInstructionText(textToSave);
    setPopupStatus(targetStatus);
    setShowInstructionForm(false);
  };

  const startEditOrders = () => {
    const initialTests = patient.orders.labTestOrders.map((tName, i) => ({
      id: `ipd-lab-${Date.now()}-${i}`,
      testName: tName,
      status: 'Requested',
    }));
    setIpdLabTests(initialTests);
    setOrdersForm({
      labTestOrdersStr: patient.orders.labTestOrders.join(', '),
      radiologyOrdersStr: patient.orders.radiologyOrders.join(', '),
      proceduresStr: patient.orders.procedures.join(', '),
      nursingInstructions: patient.orders.nursingInstructions,
      dietInstructions: patient.orders.dietInstructions,
      physiotherapyOrders: patient.orders.physiotherapyOrders,
    });
    setIsEditingOrders(true);
  };

  const saveOrders = () => {
    const labTestNames = ipdLabTests.map((t) => t.testName);
    const updatedOrders: IPDOrders = {
      labTestOrders: labTestNames,
      radiologyOrders: ordersForm.radiologyOrdersStr.split(',').map((s) => s.trim()).filter(Boolean),
      procedures: ordersForm.proceduresStr.split(',').map((s) => s.trim()).filter(Boolean),
      nursingInstructions: ordersForm.nursingInstructions,
      dietInstructions: ordersForm.dietInstructions,
      physiotherapyOrders: ordersForm.physiotherapyOrders,
    };

    if (labTestNames.length > 0) {
      createPatientOrderFromOPD(
        patient.patientName,
        patient.uhid || patient.patientId,
        patient.age,
        patient.gender as any,
        patient.admittingDoctor || 'Dr. Vikram Malhotra',
        patient.department || 'IPD',
        labTestNames
      );
    }

    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              orders: updatedOrders,
              statusInfo: { ...item.statusInfo, lastUpdatedTime: new Date().toLocaleString() },
            }
          : item
      )
    );
    setIsEditingOrders(false);
  };

  const startEditDischarge = () => {
    setDischargeForm({
      finalDiagnosis: patient.dischargeSummary.finalDiagnosis,
      treatmentGiven: patient.dischargeSummary.treatmentGiven,
      hospitalCourse: patient.dischargeSummary.hospitalCourse,
      conditionAtDischarge: patient.dischargeSummary.conditionAtDischarge,
      followUpDate: patient.dischargeSummary.followUpDate,
      dischargeAdvice: patient.dischargeSummary.dischargeAdvice,
      admissionStatus: patient.statusInfo.admissionStatus,
    });
    setIsEditingDischarge(true);
  };

  const saveDischarge = () => {
    const isDischarged = dischargeForm.admissionStatus === 'Discharged';
    const updatedDischargeSummary: IPDDischargeSummary = {
      ...patient.dischargeSummary,
      finalDiagnosis: dischargeForm.finalDiagnosis,
      treatmentGiven: dischargeForm.treatmentGiven,
      hospitalCourse: dischargeForm.hospitalCourse,
      conditionAtDischarge: dischargeForm.conditionAtDischarge,
      followUpDate: dischargeForm.followUpDate,
      dischargeAdvice: dischargeForm.dischargeAdvice,
    };

    const updatedStatusInfo: IPDStatusInfo = {
      ...patient.statusInfo,
      admissionStatus: dischargeForm.admissionStatus,
      bedStatus: isDischarged ? 'Vacant' : patient.statusInfo.bedStatus,
      lastUpdatedBy: 'Dr. Vikram Malhotra',
      lastUpdatedTime: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };

    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              dischargeSummary: updatedDischargeSummary,
              statusInfo: updatedStatusInfo,
            }
          : item
      )
    );
    setIsEditingDischarge(false);
  };

  // Add Daily Round Note
  const handleAddDailyRound = () => {
    if (!newRoundSubjective.trim() && !newRoundObjective.trim()) return;
    const round: IPDDailyRound = {
      id: `rd-${Date.now()}`,
      roundDateTime: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      subjectiveNotes: newRoundSubjective,
      objectiveFindings: newRoundObjective,
      assessment: newRoundAssessment,
      plan: newRoundPlan,
      progressNotes: newRoundProgress,
      nextReviewDate: newRoundNextReview || 'Tomorrow',
      doctorName: 'Dr. Vikram Malhotra',
    };

    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? {
              ...item,
              dailyRounds: [round, ...item.dailyRounds],
              statusInfo: {
                ...item.statusInfo,
                lastUpdatedBy: 'Dr. Vikram Malhotra',
                lastUpdatedTime: new Date().toLocaleString(),
              },
            }
          : item
      )
    );

    setNewRoundSubjective('');
    setNewRoundObjective('');
    setNewRoundAssessment('');
    setNewRoundPlan('');
    setNewRoundProgress('');
    setNewRoundNextReview('');
    setShowAddRoundModal(false);
  };

  // Add Prescription Medicine
  const handleAddPrescription = () => {
    if (!newMedName.trim()) return;
    const med: IPDPrescriptionMed = {
      id: `m-${Date.now()}`,
      medicineName: newMedName,
      dosage: newMedDosage || '1 Tab',
      frequency: newMedFreq,
      route: newMedRoute,
      duration: newMedDuration,
      specialInstructions: newMedInstructions || 'After meals',
    };

    setPatients((prev) =>
      prev.map((item) =>
        item.patientId === patient.patientId
          ? { ...item, prescriptions: [...item.prescriptions, med] }
          : item
      )
    );

    setNewMedName('');
    setNewMedDosage('');
    setNewMedInstructions('');
    setShowAddMedModal(false);
  };

  // ═════════════════════════════════════════════════════════════
  // VIEW 1: FULL SCREEN IPD ADMITTED PATIENTS TABLE
  // ═════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto font-sans text-slate-800">
        {/* Header & Controls Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-6 h-6 text-blue-600" />
                IPD Consultation & Inpatient Directory
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Select an admitted inpatient to open their comprehensive 9-section EMR chart & daily rounds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-blue-600" />
                Inpatients: <span className="text-blue-600">{patients.length} Admitted</span>
              </span>
            </div>
          </div>

          {/* Search Bar & Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="w-full md:w-96">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Patient Name, UHID, IP Number, Ward, Bed, Diagnosis..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {(['All', 'ICU', 'Under Treatment', 'Admitted', 'Discharged'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* IPD Admission Date Filter Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">Filter by Admission Date:</span>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => setSelectedDateFilter('2026-07-24')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter === '2026-07-24'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
              >
                Show All Dates
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-600">
            {selectedDateFilter ? (
              <span>
                Showing IPD admissions for date: <strong className="text-blue-600">{selectedDateFilter}</strong> ({filteredPatients.length} found)
              </span>
            ) : (
              <span>Showing IPD admissions for <strong>All Dates</strong> ({filteredPatients.length} total)</span>
            )}
          </div>
        </div>

        {/* ─── Full Screen IPD Inpatient Table ───────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 w-32">IP Number / Bed</th>
                  <th className="p-4">Admission Date & Time</th>
                  <th className="p-4">Patient Name & UHID</th>
                  <th className="p-4">Age / Gender / Mobile</th>
                  <th className="p-4">Ward & Room</th>
                  <th className="p-4">Admission Diagnosis</th>
                  <th className="p-4 w-36">Status</th>
                  <th className="p-4 text-center w-48">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                        <h3 className="text-sm font-bold text-slate-700">No Inpatients Found</h3>
                        <p className="text-xs text-slate-400 mt-1">No admitted patients matching your search criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => (
                    <tr key={p.patientId} className="hover:bg-blue-50/30 transition-colors">
                      {/* IP Number & Bed */}
                      <td className="p-4">
                        <div className="font-bold text-indigo-700 text-xs">{p.ipNumber}</div>
                        <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1 mt-0.5">
                          <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                          {p.bedNumber}
                        </div>
                      </td>

                      {/* Admission Date & Time */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          {p.admissionDateTime}
                        </div>
                      </td>

                      {/* Patient Name & UHID */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {p.patientName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{p.patientName}</p>
                            <p className="text-[10px] font-semibold text-blue-600">{p.patientId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Age / Gender / Contact */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-xs">
                          {p.age} yrs / {p.gender}
                        </p>
                        <p className="text-[10px] text-slate-500">{p.mobileNumber}</p>
                      </td>

                      {/* Ward & Room */}
                      <td className="p-4">
                        <p className="font-bold text-blue-700 text-xs">{p.ward}</p>
                        <p className="text-[10px] text-slate-500">Room {p.roomNumber}</p>
                      </td>

                      {/* Admission Diagnosis */}
                      <td className="p-4">
                        <p className="text-xs text-amber-800 font-bold max-w-xs truncate">{p.admissionDiagnosis}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.admittingDoctor}</p>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge status={p.statusInfo.admissionStatus} />
                      </td>

                      {/* Action Column */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenPatientDetails(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 cursor-pointer transition-colors w-full"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View IPD Chart</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // VIEW 2: FULL SCREEN IPD PATIENT 9-SECTION EMR & CONSULTATION
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans text-slate-800">
      {/* Top Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => setViewMode('list')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl cursor-pointer transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inpatient List
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddRoundModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Ward Round Note
          </button>
        </div>
      </div>

      {/* Selected Patient Summary Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
            {patient.patientName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{patient.patientName}</h2>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {patient.patientId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              IP No: <strong className="text-indigo-700">{patient.ipNumber}</strong> • Bed:{' '}
              <strong className="text-blue-700">{patient.bedNumber}</strong> ({patient.ward})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={patient.statusInfo.admissionStatus} />
        </div>
      </div>

      {/* IPD Patient 9-Section Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Vertical Section Navigation Menu */}
        <div className="lg:col-span-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 sticky top-24">
          <div className="px-3 py-2 border-b border-slate-100 mb-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Clinical Sections</p>
            <p className="text-xs font-bold text-slate-800">Inpatient EMR Record</p>
          </div>

          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2.5 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 translate-x-0.5'
                    : 'bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {sec.icon}
                  </span>
                  <span className="truncate">{sec.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Right Side: Active Section Content Area */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
          {/* SECTION 1: Patient & Admission Info */}
          {activeSection === 'patient_admission' && (
            <div className="space-y-6">
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Patient Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Patient ID (UHID)</span>
                    <p className="font-medium text-slate-800">{patient.patientId}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">IP Number</span>
                    <p className="font-medium text-indigo-700">{patient.ipNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Patient Name</span>
                    <p className="font-medium text-slate-800">{patient.patientName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Age / Gender</span>
                    <p className="font-medium text-slate-800">{patient.age} yrs / {patient.gender}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Blood Group</span>
                    <p className="font-medium text-rose-600">{patient.bloodGroup}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Mobile Number</span>
                    <p className="font-medium text-slate-800">{patient.mobileNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Emergency Contact</span>
                    <p className="font-medium text-slate-800">
                      {patient.emergencyContact.name} ({patient.emergencyContact.relationship}) — {patient.emergencyContact.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-indigo-600" /> Admission Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Admission Date & Time</span>
                    <p className="font-medium text-slate-800">{patient.admissionDateTime}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Ward</span>
                    <p className="font-medium text-blue-700">{patient.ward}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Room Number</span>
                    <p className="font-medium text-slate-800">Room {patient.roomNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Bed Number</span>
                    <p className="font-medium text-indigo-700">{patient.bedNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Admitting Doctor</span>
                    <p className="font-medium text-slate-800">{patient.admittingDoctor}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Department</span>
                    <p className="font-medium text-slate-800">{patient.department}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Admission Diagnosis</span>
                    <p className="font-medium text-amber-800">{patient.admissionDiagnosis}</p>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[10px] text-slate-600 font-bold uppercase">Admission Reason</span>
                    <p className="font-normal text-slate-700 leading-relaxed mt-0.5">{patient.admissionReason}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Clinical Information */}
          {activeSection === 'clinical_info' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clinical History & Patient Details
                </h3>
                {!isEditingClinical ? (
                  <button
                    onClick={startEditClinical}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Clinical Info
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingClinical(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveClinical}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Clinical Info
                    </button>
                  </div>
                )}
              </div>

              {!isEditingClinical ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Chief Complaints</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.chiefComplaints}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">History of Present Illness (HPI)</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.presentIllness}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Past Medical History</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.pastMedicalHistory}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Surgical History</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.surgicalHistory}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Family History</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.familyHistory}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Social History (Habits)</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.clinicalInfo.socialHistory}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Allergy Information</span>
                    <p className="font-bold text-rose-900 mt-1">{patient.clinicalInfo.allergyInformation}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Current Home Medications</span>
                    <p className="font-medium text-blue-900 mt-1">{patient.clinicalInfo.currentMedications}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chief Complaints</label>
                    <textarea
                      rows={2}
                      value={clinicalForm.chiefComplaints}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, chiefComplaints: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">History of Present Illness (HPI)</label>
                    <textarea
                      rows={2}
                      value={clinicalForm.presentIllness}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, presentIllness: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Past Medical History</label>
                    <textarea
                      rows={2}
                      value={clinicalForm.pastMedicalHistory}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, pastMedicalHistory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Surgical History</label>
                    <textarea
                      rows={2}
                      value={clinicalForm.surgicalHistory}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, surgicalHistory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Family History</label>
                    <input
                      type="text"
                      value={clinicalForm.familyHistory}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, familyHistory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Social History</label>
                    <input
                      type="text"
                      value={clinicalForm.socialHistory}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, socialHistory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-rose-700 mb-1">Allergy Information</label>
                    <input
                      type="text"
                      value={clinicalForm.allergyInformation}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, allergyInformation: e.target.value })}
                      className="w-full bg-rose-50/50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-900 outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-700 mb-1">Current Home Medications</label>
                    <input
                      type="text"
                      value={clinicalForm.currentMedications}
                      onChange={(e) => setClinicalForm({ ...clinicalForm, currentMedications: e.target.value })}
                      className="w-full bg-blue-50/50 border border-blue-200 rounded-xl p-3 text-xs font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Vital Signs */}
          {activeSection === 'vitals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Daily Vitals Monitoring — Last Recorded: {patient.vitals.lastRecordedTime}
                </span>
                {!isEditingVitals ? (
                  <button
                    onClick={startEditVitals}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Update Vitals
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingVitals(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveVitals}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Vitals
                    </button>
                  </div>
                )}
              </div>

              {!isEditingVitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label: 'Temp', val: `${patient.vitals.temperature} °F`, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { label: 'BP', val: `${patient.vitals.systolicBP}/${patient.vitals.diastolicBP}`, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { label: 'Pulse', val: `${patient.vitals.pulseRate} bpm`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'Resp Rate', val: `${patient.vitals.respiratoryRate} /min`, color: 'text-teal-700 bg-teal-50 border-teal-200' },
                    { label: 'SpO₂', val: `${patient.vitals.spo2} %`, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                    { label: 'Weight', val: `${patient.vitals.weight} kg`, color: 'text-slate-700 bg-slate-50 border-slate-200' },
                    { label: 'Height', val: `${patient.vitals.height} cm`, color: 'text-slate-700 bg-slate-50 border-slate-200' },
                    { label: 'BMI', val: `${patient.vitals.bmi} kg/m²`, color: 'text-blue-800 bg-blue-100 border-blue-300' },
                  ].map((v, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${v.color}`}>
                      <span className="text-[10px] font-bold uppercase opacity-80">{v.label}</span>
                      <p className="text-lg font-black mt-1">{v.val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-amber-800 mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitalsForm.temperature}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: parseFloat(e.target.value) || 98.6 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-800 mb-1">Systolic BP</label>
                    <input
                      type="number"
                      value={vitalsForm.systolicBP}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBP: parseInt(e.target.value) || 120 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-800 mb-1">Diastolic BP</label>
                    <input
                      type="number"
                      value={vitalsForm.diastolicBP}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBP: parseInt(e.target.value) || 80 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={vitalsForm.pulseRate}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: parseInt(e.target.value) || 72 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-teal-800 mb-1">Resp Rate (/min)</label>
                    <input
                      type="number"
                      value={vitalsForm.respiratoryRate}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: parseInt(e.target.value) || 16 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-indigo-800 mb-1">SpO₂ (%)</label>
                    <input
                      type="number"
                      value={vitalsForm.spo2}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: parseInt(e.target.value) || 98 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={vitalsForm.weight}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, weight: parseFloat(e.target.value) || 70 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={vitalsForm.height}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, height: parseFloat(e.target.value) || 170 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Doctor Daily Rounds (SOAP) */}
          {activeSection === 'daily_rounds' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Doctor Daily Round Notes
                </h3>
                <button
                  onClick={() => setShowAddRoundModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Ward Round Note
                </button>
              </div>

              {patient.dailyRounds.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No ward round notes recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {patient.dailyRounds.map((rd) => (
                    <div key={rd.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {rd.roundDateTime}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{rd.doctorName}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Next Review: <strong className="text-blue-600">{rd.nextReviewDate}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 uppercase">Subjective Notes</span>
                          <p className="text-slate-800 mt-0.5 leading-relaxed">{rd.subjectiveNotes || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase">Objective Findings</span>
                          <p className="text-slate-800 mt-0.5 leading-relaxed">{rd.objectiveFindings || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Assessment</span>
                          <p className="text-slate-800 mt-0.5 leading-relaxed">{rd.assessment || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Plan & Instructions</span>
                          <p className="text-slate-800 mt-0.5 leading-relaxed">{rd.plan || '—'}</p>
                        </div>
                      </div>

                      {rd.progressNotes && (
                        <div className="pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Progress Notes</span>
                          <p className="text-slate-700 mt-0.5">{rd.progressNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Diagnosis */}
          {activeSection === 'diagnosis' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ICD-10 Clinical Diagnoses
                </h3>
                {!isEditingDiagnosis ? (
                  <button
                    onClick={startEditDiagnosis}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Diagnosis
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingDiagnosis(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveDiagnosis}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Diagnosis
                    </button>
                  </div>
                )}
              </div>

              {!isEditingDiagnosis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Primary Diagnosis</span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        {patient.diagnosis.primaryCode}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{patient.diagnosis.primaryDiagnosis}</h4>
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-600 uppercase">Secondary / Comorbidities</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        {patient.diagnosis.secondaryCode}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{patient.diagnosis.secondaryDiagnosis}</h4>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="block font-bold text-blue-800">Primary Diagnosis</label>
                    <input
                      type="text"
                      value={diagnosisForm.primaryDiagnosis}
                      onChange={(e) => setDiagnosisForm({ ...diagnosisForm, primaryDiagnosis: e.target.value })}
                      placeholder="e.g. Acute Anterior Wall Myocardial Infarction"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={diagnosisForm.primaryCode}
                      onChange={(e) => setDiagnosisForm({ ...diagnosisForm, primaryCode: e.target.value })}
                      placeholder="ICD-10 Code (e.g. I21.0)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-blue-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-bold text-purple-800">Secondary Diagnosis / Comorbidities</label>
                    <input
                      type="text"
                      value={diagnosisForm.secondaryDiagnosis}
                      onChange={(e) => setDiagnosisForm({ ...diagnosisForm, secondaryDiagnosis: e.target.value })}
                      placeholder="e.g. Type 2 Diabetes Mellitus"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={diagnosisForm.secondaryCode}
                      onChange={(e) => setDiagnosisForm({ ...diagnosisForm, secondaryCode: e.target.value })}
                      placeholder="ICD-10 Code (e.g. E11.9)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-purple-700"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: Doctor Orders */}
          {activeSection === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Inpatient Doctor Orders & Instructions
                </h3>
                {!isEditingOrders ? (
                  <button
                    onClick={startEditOrders}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Orders
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingOrders(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveOrders}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Orders
                    </button>
                  </div>
                )}
              </div>

              {!isEditingOrders ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Lab Test Orders</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {patient.orders.labTestOrders.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase">Radiology Orders</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {patient.orders.radiologyOrders.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Procedures Advised</span>
                    <div className="space-y-1">
                      {patient.orders.procedures.map((p, i) => (
                        <p key={i} className="font-bold text-slate-900">{p}</p>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nursing Instructions</span>
                    <p className="font-medium text-slate-800 leading-relaxed">{patient.orders.nursingInstructions}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Diet Orders</span>
                    <p className="font-medium text-slate-800 leading-relaxed">{patient.orders.dietInstructions}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Physiotherapy Orders</span>
                    <p className="font-medium text-slate-800 leading-relaxed">{patient.orders.physiotherapyOrders}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-purple-900 text-xs tracking-wider uppercase">
                        Lab Tests
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={selectedLabTest}
                          onChange={(e) => {
                            setSelectedLabTest(e.target.value);
                            if (e.target.value) {
                              handleAddLabTestFromDropdown(e.target.value);
                            }
                          }}
                          className="w-full appearance-none bg-slate-50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 pr-8 cursor-pointer"
                        >
                          <option value="">Select lab test...</option>
                          {LAB_TEST_OPTIONS.map((testName, i) => (
                            <option key={i} value={testName}>
                              {testName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      <button
                        type="button"
                        onClick={() => selectedLabTest && handleAddLabTestFromDropdown(selectedLabTest)}
                        className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center text-lg shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        +
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      {ipdLabTests.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-100/80"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{t.testName}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-800">
                              {t.status || 'Requested'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLabTest(t.id)}
                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {ipdLabTests.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(ipdLabTests[ipdLabTests.length - 1]?.testName || 'Blood Sugar (PP)')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" /> Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-indigo-800 mb-1">Radiology Orders (Comma Separated)</label>
                      <input
                        type="text"
                        value={ordersForm.radiologyOrdersStr}
                        onChange={(e) => setOrdersForm({ ...ordersForm, radiologyOrdersStr: e.target.value })}
                        placeholder="e.g. Echo 2D, Chest X-Ray"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-blue-800 mb-1">Procedures Advised</label>
                      <input
                        type="text"
                        value={ordersForm.proceduresStr}
                        onChange={(e) => setOrdersForm({ ...ordersForm, proceduresStr: e.target.value })}
                        placeholder="e.g. Primary PCI"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nursing Instructions</label>
                      <input
                        type="text"
                        value={ordersForm.nursingInstructions}
                        onChange={(e) => setOrdersForm({ ...ordersForm, nursingInstructions: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Diet Orders</label>
                      <input
                        type="text"
                        value={ordersForm.dietInstructions}
                        onChange={(e) => setOrdersForm({ ...ordersForm, dietInstructions: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Physiotherapy Orders</label>
                      <input
                        type="text"
                        value={ordersForm.physiotherapyOrders}
                        onChange={(e) => setOrdersForm({ ...ordersForm, physiotherapyOrders: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: Prescriptions */}
          {activeSection === 'prescription' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Inpatient Medication Chart
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddMedModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> Print Chart
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Special Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {patient.prescriptions.map((med, index) => (
                      <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{med.medicineName}</td>
                        <td className="p-3 text-slate-700">{med.dosage}</td>
                        <td className="p-3 text-slate-700">{med.frequency}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {med.route}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">{med.duration}</td>
                        <td className="p-3 text-slate-600">{med.specialInstructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 8: Investigation Results */}
          {activeSection === 'investigations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Diagnostic Reports & External Attachments
                </h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Attach External Report
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lab Reports */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" /> Lab Test Results
                  </h4>
                  <div className="space-y-2">
                    {patient.investigationResults.labReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <p className="text-[10px] text-slate-400">{r.date} • Normal: {r.normalRange}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-sm">{r.result} {r.unit}</span>
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.status === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radiology Reports */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Scan className="w-4 h-4 text-indigo-600" /> Radiology Reports
                  </h4>
                  <div className="space-y-2">
                    {patient.investigationResults.radiologyReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <span className="text-[10px] text-slate-400">{r.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{r.findings}</p>
                        <p className="text-xs font-bold text-indigo-900 mt-1">Impression: {r.impression}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {patient.investigationResults.attachedReports.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Attached Documents</h4>
                  <div className="flex flex-wrap gap-3">
                    {patient.investigationResults.attachedReports.map((ar) => (
                      <div key={ar.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-bold text-slate-900">{ar.fileName}</p>
                          <p className="text-[10px] text-slate-400">{ar.uploadDate} • {ar.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 9: Discharge Summary & Status */}
          {activeSection === 'discharge_summary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Inpatient Discharge Summary & Admission Status
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditingDischarge ? (
                    <>
                      <button
                        onClick={startEditDischarge}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Discharge & Status
                      </button>
                      <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer">
                        <Printer className="w-4 h-4" /> Print Discharge Summary (PDF)
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingDischarge(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveDischarge}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer transition-colors"
                      >
                        <Check className="w-4 h-4" /> Submit & Process Discharge
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!isEditingDischarge ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Final Diagnosis</span>
                    <p className="font-bold text-slate-900 mt-1">{patient.dischargeSummary.finalDiagnosis}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Condition at Discharge</span>
                    <p className="font-bold text-emerald-700 mt-1">{patient.dischargeSummary.conditionAtDischarge}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Treatment Given</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.dischargeSummary.treatmentGiven}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital Course</span>
                    <p className="font-medium text-slate-800 leading-relaxed mt-1">{patient.dischargeSummary.hospitalCourse}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Follow-up Date</span>
                    <p className="font-bold text-blue-600 mt-1">{patient.dischargeSummary.followUpDate}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Discharge Advice</span>
                    <p className="font-medium text-slate-800 mt-1">{patient.dischargeSummary.dischargeAdvice}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Current Admission Status</span>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{patient.statusInfo.admissionStatus}</p>
                    </div>
                    <StatusBadge status={patient.statusInfo.admissionStatus} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Final Diagnosis *</label>
                      <input
                        type="text"
                        value={dischargeForm.finalDiagnosis}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Condition at Discharge *</label>
                      <select
                        value={dischargeForm.conditionAtDischarge}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Stable">Stable</option>
                        <option value="Improved">Improved</option>
                        <option value="Critical">Critical</option>
                        <option value="DAMA">Discharged Against Medical Advice (DAMA)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Treatment Summary Given *</label>
                    <textarea
                      rows={2}
                      value={dischargeForm.treatmentGiven}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentGiven: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hospital Course & Recovery Progress *</label>
                    <textarea
                      rows={2}
                      value={dischargeForm.hospitalCourse}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, hospitalCourse: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-blue-700 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={dischargeForm.followUpDate}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Discharge Advice / Instructions</label>
                      <input
                        type="text"
                        value={dischargeForm.dischargeAdvice}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeAdvice: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Admission Status Selector */}
                  <div className="pt-3 border-t border-slate-200">
                    <label className="block font-bold text-slate-900 mb-2">Update Admission Status:</label>
                    <div className="flex flex-wrap gap-3">
                      {(['Under Treatment', 'ICU', 'Admitted', 'Discharged'] as const).map((st) => (
                        <label
                          key={st}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
                            dischargeForm.admissionStatus === st
                              ? st === 'Discharged'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                : 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="admissionStatus"
                            value={st}
                            checked={dischargeForm.admissionStatus === st}
                            onChange={() => setDischargeForm({ ...dischargeForm, admissionStatus: st })}
                            className="hidden"
                          />
                          <span>{st}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Ward Round Note Modal */}
      {showAddRoundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" /> New Ward Round Note
              </h3>
              <button onClick={() => setShowAddRoundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subjective Notes *</label>
                <textarea
                  rows={2}
                  value={newRoundSubjective}
                  onChange={(e) => setNewRoundSubjective(e.target.value)}
                  placeholder="Patient's symptoms, feelings, complaints during rounds..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Objective Findings</label>
                <textarea
                  rows={2}
                  value={newRoundObjective}
                  onChange={(e) => setNewRoundObjective(e.target.value)}
                  placeholder="Vitals, physical examination, lab/ECG observations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment</label>
                  <input
                    type="text"
                    value={newRoundAssessment}
                    onChange={(e) => setNewRoundAssessment(e.target.value)}
                    placeholder="Doctor clinical assessment..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan & Orders</label>
                  <input
                    type="text"
                    value={newRoundPlan}
                    onChange={(e) => setNewRoundPlan(e.target.value)}
                    placeholder="Treatment plan..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setShowAddRoundModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={handleAddDailyRound} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                Save Ward Round Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prescription Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-600" /> Add Inpatient Prescription
              </h3>
              <button onClick={() => setShowAddMedModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Aspirin 75mg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g. 1 Tab"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Route</label>
                  <select
                    value={newMedRoute}
                    onChange={(e) => setNewMedRoute(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Oral">Oral</option>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="Subcutaneous">Subcutaneous</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions</label>
                <input
                  type="text"
                  value={newMedInstructions}
                  onChange={(e) => setNewMedInstructions(e.target.value)}
                  placeholder="e.g. After meals"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setShowAddMedModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={handleAddPrescription} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                Add Medicine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Lab Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold">
                  <FlaskConical className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30">
                    IPD Diagnostic Lab Report
                  </span>
                  <h3 className="text-base font-bold tracking-tight text-white mt-0.5">
                    {selectedReportTestName || 'Blood Test Report'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Patient Details Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient Name</span>
                  <p className="font-extrabold text-slate-900 text-sm">{patient.patientName}</p>
                  <p className="text-slate-500 font-semibold">{patient.uhid || patient.patientId} • {patient.age}Y / {patient.gender}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admitting Doctor</span>
                  <p className="font-extrabold text-slate-900">{patient.admittingDoctor || 'Dr. Vikram Malhotra'}</p>
                  <p className="text-slate-500 font-semibold">{patient.department}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Report Status</span>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      popupStatus === 'Re-Test Requested' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" /> {popupStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnostic Test Parameters Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-3">Test Parameter</th>
                      <th className="p-3">Observed Value</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Flag / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-purple-900">{selectedReportTestName || 'Blood Sugar (PP)'}</td>
                      <td className="p-3 font-black text-slate-900">142</td>
                      <td className="p-3 text-slate-500">70 - 140</td>
                      <td className="p-3 text-slate-500">mg/dL</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Slightly High
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3">Fasting Blood Sugar</td>
                      <td className="p-3 font-bold text-slate-900">98</td>
                      <td className="p-3 text-slate-500">70 - 100</td>
                      <td className="p-3 text-slate-500">mg/dL</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3">HbA1c (Glycated Hemoglobin)</td>
                      <td className="p-3 font-bold text-slate-900">6.4</td>
                      <td className="p-3 text-slate-500">4.0 - 5.6</td>
                      <td className="p-3 text-slate-500">%</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Prediabetic
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Doctor Instructions & Status Review Form */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" /> Doctor Instructions & Review Status
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowInstructionForm(!showInstructionForm)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    {showInstructionForm ? 'Cancel' : 'Edit Instruction'}
                  </button>
                </div>

                {popupInstructionText && !showInstructionForm && (
                  <div className="p-3 rounded-xl bg-white border border-purple-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Saved Instruction</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        popupStatus === 'Re-Test Requested' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {popupStatus}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">{popupInstructionText}</p>
                  </div>
                )}

                {showInstructionForm && (
                  <div className="space-y-3 pt-1">
                    <textarea
                      value={popupInstructionText}
                      onChange={(e) => setPopupInstructionText(e.target.value)}
                      placeholder="Enter doctor instructions or notes for path lab..."
                      rows={3}
                      className="w-full p-3 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveReportInstruction('Re-Test Requested')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 cursor-pointer transition-colors"
                      >
                        Re-Test Requested
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReportInstruction('Approved')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                      >
                        Approved
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 cursor-pointer shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
