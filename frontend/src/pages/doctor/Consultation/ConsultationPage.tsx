import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Play, CheckCircle2, Printer, FileText, Plus,
  Trash2, Upload, X, Search, Inbox, Thermometer, Heart, Activity,
  Wind, Weight, Droplets, ArrowLeft, Edit3, Eye, Save, Filter,
  Check, Download, Clock, Calendar
} from 'lucide-react';
import { useHMS } from '../../../context/HMSContext';
import { useLab } from '../../../context/LabContext';

// ─── Interfaces ────────────────────────────────────────────────
interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientUhid: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  admissionDateTime: string;
  department: string;
  reason: string;
  type: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  tokenNumber: string;
}

interface DoctorPatient {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;
  status: string;
}

interface Vitals {
  temperature?: number;
  pulse?: number;
  systolicBP?: number;
  diastolicBP?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
}

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  route: string;
}

interface Diagnosis {
  id: string;
  code: string;
  name: string;
  type: 'Primary' | 'Secondary';
}

interface InvestigationRequest {
  id: string;
  type: 'Lab' | 'Radiology';
  testName: string;
  urgency: 'Routine' | 'Urgent' | 'STAT';
  notes: string;
  status: string;
}

interface ConsultationRecord {
  vitals: Vitals;
  chiefComplaint: string;
  symptoms: string[];
  clinicalFindings: string;
  diagnoses: Diagnosis[];
  medicines: Medicine[];
  labTests: InvestigationRequest[];
  radiologyTests: InvestigationRequest[];
  followUpDate: string;
  followUpNotes: string;
  completedAt?: string;
}

// ─── Constants ─────────────────────────────────────────────────
const MEDICINE_FREQUENCIES = [
  'Once Daily (OD)',
  'Twice Daily (BD)',
  'Three Times Daily (TDS)',
  'Four Times Daily (QID)',
  'Every 6 Hours (Q6H)',
  'Every 8 Hours (Q8H)',
  'Before Meals (AC)',
  'After Meals (PC)',
  'At Bedtime (HS)',
  'As Needed (SOS)',
];

const DURATION_OPTIONS = [
  '1 Day', '3 Days', '5 Days', '7 Days',
  '10 Days', '14 Days', '21 Days', '30 Days',
  '2 Months', '3 Months', 'Ongoing',
];

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
];

const RADIOLOGY_OPTIONS = [
  'Chest X-Ray (PA View)',
  'X-Ray Abdomen',
  'USG Abdomen',
  'USG Pelvis',
  'CT Scan - Head',
  'CT Scan - Chest',
  'MRI Brain',
  'Echo Cardiography',
  'ECG',
];

const COMMON_SYMPTOMS = [
  'Fever', 'Cough', 'Cold', 'Headache', 'Body Pain',
  'Chest Pain', 'Breathlessness', 'Fatigue', 'Nausea',
  'Vomiting', 'Diarrhea', 'Abdominal Pain', 'Back Pain',
  'Joint Pain', 'Dizziness', 'Loss of Appetite', 'Rash',
];

const COMMON_DIAGNOSES = [
  { code: 'J06.9', name: 'Upper Respiratory Tract Infection' },
  { code: 'J18.9', name: 'Pneumonia, Unspecified' },
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus' },
  { code: 'I10', name: 'Essential Hypertension' },
  { code: 'J45.9', name: 'Bronchial Asthma' },
  { code: 'K29.7', name: 'Gastritis' },
  { code: 'M54.5', name: 'Low Back Pain' },
  { code: 'R51', name: 'Headache / Migraine' },
  { code: 'N39.0', name: 'Urinary Tract Infection' },
  { code: 'I25.1', name: 'Coronary Artery Disease' },
];

const COMMON_MEDICINES = [
  'Aspirin 75mg', 'Aspirin 150mg', 'Clopidogrel 75mg',
  'Atorvastatin 10mg', 'Atorvastatin 20mg', 'Atorvastatin 40mg',
  'Metoprolol 25mg', 'Metoprolol 50mg', 'Amlodipine 5mg',
  'Ramipril 2.5mg', 'Telmisartan 40mg', 'Metformin 500mg',
  'Pantoprazole 40mg', 'Paracetamol 500mg', 'Paracetamol 650mg',
  'Amoxicillin 500mg', 'Azithromycin 500mg', 'Cetirizine 10mg',
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Completed: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'In Progress': { bg: 'bg-amber-100', text: 'text-amber-800' },
  Scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  New: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  'Follow-Up': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  Primary: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Secondary: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

// Order priority: 1. Scheduled, 2. In Progress, 3. Completed
const STATUS_ORDER: Record<string, number> = {
  Scheduled: 1,
  'In Progress': 2,
  Completed: 3,
};

// ─── Initial Mock Appointments & Saved Consultations ───────────
const INITIAL_APPOINTMENTS: DoctorAppointment[] = [];

const INITIAL_SAVED_CONSULTATIONS: Record<string, ConsultationRecord> = {};

// ─── Sub-Components ───────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; dot?: boolean; size?: 'sm' | 'md' }> = ({ status, dot = true, size = 'sm' }) => {
  const color = STATUS_COLORS[status] || { bg: 'bg-slate-200', text: 'text-slate-700' };
  const sizeClass = size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${color.bg} ${color.text} ${sizeClass}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
};

const SearchBar: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const EmptyState: React.FC<{ title?: string; message?: string; icon?: React.ReactNode }> = ({
  title = 'No Data Found',
  message = 'There are no records to display at this time.',
  icon,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      {icon || <Inbox className="w-8 h-8 text-slate-300" />}
    </div>
    <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>
  </div>
);

const ConsultationSection: React.FC<{ label: string; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({ label, children, className = '', action }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${className}`}>
    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const PrescriptionTable: React.FC<{ medicines: Medicine[]; onRemove?: (id: string) => void; isEditable?: boolean }> = ({ medicines, onRemove, isEditable = true }) => {
  if (medicines.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        No medicines prescribed yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Medicine</th>
            <th className="p-3">Dosage</th>
            <th className="p-3">Frequency</th>
            <th className="p-3">Duration</th>
            <th className="p-3">Route</th>
            <th className="p-3">Instructions</th>
            {isEditable && <th className="p-3 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {medicines.map((med, index) => (
            <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="p-3 font-bold text-slate-400">{index + 1}</td>
              <td className="p-3 font-bold text-slate-900">{med.name}</td>
              <td className="p-3 text-slate-700">{med.dosage}</td>
              <td className="p-3 text-slate-700">{med.frequency}</td>
              <td className="p-3 text-slate-700">{med.duration}</td>
              <td className="p-3">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {med.route}
                </span>
              </td>
              <td className="p-3 text-slate-600">{med.instructions || '—'}</td>
              {isEditable && (
                <td className="p-3 text-right">
                  <button
                    onClick={() => onRemove?.(med.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────
export const ConsultationPage: React.FC = () => {
  const { addToast } = useHMS();
  const { labReports, doctorReviewReport, createPatientOrderFromOPD } = useLab();
  const [doctorInstructionInput, setDoctorInstructionInput] = useState('');
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(INITIAL_APPOINTMENTS);
  const [savedConsultations, setSavedConsultations] = useState<Record<string, ConsultationRecord>>(INITIAL_SAVED_CONSULTATIONS);

  // View mode: 'list' (Full Screen Table) | 'consultation' (Full Screen Form)
  const [viewMode, setViewMode] = useState<'list' | 'consultation'>('list');
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);

  // Edit State: false for Completed appointments by default, true for Scheduled/In Progress or when Edit is clicked
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'In Progress' | 'Completed'>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch real appointments from backend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const mapped: DoctorAppointment[] = data.map((a: any) => ({
            id: a.id || '',
            patientId: a.patient_uhid || a.patientUhid || a.id || '',
            patientName: a.patient_name || a.patientName || 'Unknown',
            patientUhid: a.patient_uhid || a.patientUhid || '',
            patientAge: a.patient_age || a.patientAge || 0,
            patientGender: a.patient_gender || a.patientGender || 'Male',
            patientPhone: a.patient_mobile || a.patientMobile || '',
            date: a.date || '',
            timeSlot: a.time_slot || a.timeSlot || '',
            admissionDateTime: `${a.date || ''} ${a.time_slot || a.timeSlot || ''}`.trim(),
            department: a.department || '',
            reason: a.reason || '',
            type: a.type || 'OPD',
            status: (a.status === 'Completed' ? 'Completed' : a.status === 'In Progress' ? 'In Progress' : 'Scheduled') as 'Scheduled' | 'In Progress' | 'Completed',
            tokenNumber: a.token_number || a.tokenNumber || `T-${(a.id || '').slice(-3)}`,
          }));
          if (mapped.length > 0) setAppointments(mapped);
        }
      } catch (e) {
        console.warn('ConsultationPage: could not fetch appointments:', e);
      }
    };
    fetchAppointments();
  }, []);

  // Form State
  const [vitals, setVitals] = useState<Vitals>({
    temperature: 98.6, pulse: 72, systolicBP: 120, diastolicBP: 80,
    height: 170, weight: 70, bmi: 24.2, spo2: 98, respiratoryRate: 16,
  });
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<InvestigationRequest[]>([]);
  const [radiologyTests, setRadiologyTests] = useState<InvestigationRequest[]>([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Form input field helpers
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFreq, setMedFreq] = useState('Once Daily (OD)');
  const [medDuration, setMedDuration] = useState('5 Days');
  const [medInstructions, setMedInstructions] = useState('');
  const [diagSearch, setDiagSearch] = useState('');
  const [selectedLabTest, setSelectedLabTest] = useState('');
  const [selectedRadTest, setSelectedRadTest] = useState('');
  // Patient Report Modal & Instruction Popup States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportTestName, setSelectedReportTestName] = useState<string>('');
  const [showInstructionForm, setShowInstructionForm] = useState(false);
  const [popupInstructionText, setPopupInstructionText] = useState('');
  const [popupStatus, setPopupStatus] = useState<'Approved' | 'Re-Test Requested'>('Approved');

  const handleOpenReportModal = (testName: string) => {
    setSelectedReportTestName(testName);
    setShowInstructionForm(false);

    const matchingReport = selectedAppointment
      ? labReports.find(
          (r) =>
            r.patientUhid.toLowerCase() === selectedAppointment.patientUhid.toLowerCase() ||
            r.patientName.toLowerCase() === selectedAppointment.patientName.toLowerCase()
        )
      : null;

    setPopupInstructionText(matchingReport?.doctorComments || doctorInstructionInput || '');
    setPopupStatus(
      matchingReport?.doctorReviewStatus === 'Re-Test Requested' ? 'Re-Test Requested' : 'Approved'
    );
    setIsReportModalOpen(true);
  };

  const handleSavePopupInstruction = (statusOverride?: 'Approved' | 'Re-Test Requested') => {
    if (!selectedAppointment) return;
    const targetStatus = statusOverride || popupStatus;

    const matchingReport = labReports.find(
      (r) =>
        r.patientUhid.toLowerCase() === selectedAppointment.patientUhid.toLowerCase() ||
        r.patientName.toLowerCase() === selectedAppointment.patientName.toLowerCase()
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
    setDoctorInstructionInput(textToSave);
    setShowInstructionForm(false);
    addToast(
      targetStatus === 'Re-Test Requested' ? 'warning' : 'success',
      `Report ${targetStatus}! 📝`,
      `Doctor instruction & status (${targetStatus}) for ${selectedAppointment.patientName} saved.`
    );
  };

  // Backup state for canceling edits
  const [backupForm, setBackupForm] = useState<ConsultationRecord | null>(null);

  // Filter & Sort Appointments: 1. Scheduled -> 2. In Progress -> 3. Completed
  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patientUhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesDate = !selectedDateFilter || a.date === selectedDateFilter || a.admissionDateTime.startsWith(selectedDateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] || 99;
    const orderB = STATUS_ORDER[b.status] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.tokenNumber.localeCompare(b.tokenNumber);
  });

  // Handler to open full screen consultation page
  const handleOpenConsultation = (apt: DoctorAppointment, mode: 'view' | 'enter') => {
    setSelectedAppointment(apt);
    setViewMode('consultation');

    // Load saved data if exists
    const record = savedConsultations[apt.id];
    if (record) {
      setVitals(record.vitals);
      setChiefComplaint(record.chiefComplaint);
      setSymptoms(record.symptoms);
      setClinicalFindings(record.clinicalFindings);
      setDiagnoses(record.diagnoses);
      setMedicines(record.medicines);
      setLabTests(record.labTests || []);
      setRadiologyTests(record.radiologyTests || []);
      setFollowUpDate(record.followUpDate);
      setFollowUpNotes(record.followUpNotes);
      setBackupForm(record);
    } else {
      // Default empty/initial form
      const initialVitals: Vitals = {
        temperature: 98.6, pulse: 75, systolicBP: 120, diastolicBP: 80,
        height: 170, weight: 70, bmi: 24.2, spo2: 98, respiratoryRate: 16,
      };
      setVitals(initialVitals);
      setChiefComplaint(apt.reason || '');
      setSymptoms([]);
      setClinicalFindings('');
      setDiagnoses([]);
      setMedicines([]);
      setLabTests([]);
      setRadiologyTests([]);
      setFollowUpDate('');
      setFollowUpNotes('');
      setBackupForm(null);
    }

    // Auto load matching lab report tests if available
    const matchingReport = labReports.find(
      (r) =>
        r.patientUhid.toLowerCase() === apt.patientUhid.toLowerCase() ||
        r.patientName.toLowerCase() === apt.patientName.toLowerCase()
    );

    if (matchingReport && matchingReport.tests.length > 0 && (!record || !record.labTests || record.labTests.length === 0)) {
      const loadedTests: InvestigationRequest[] = matchingReport.tests.map((tName, idx) => ({
        id: `lab-loaded-${idx}`,
        type: 'Lab',
        testName: tName,
        urgency: 'Routine',
        notes: '',
        status: 'Results Ready',
      }));
      setLabTests(loadedTests);
    }

    // Set edit mode rule:
    // If appointment is Completed: mode === 'enter' turns on edit, 'view' stays read-only
    // If appointment is Scheduled or In Progress: edit mode is true
    if (apt.status === 'Completed') {
      setIsEditing(mode === 'enter');
    } else {
      setIsEditing(true);
      // Mark as In Progress if it was Scheduled
      if (apt.status === 'Scheduled') {
        setAppointments((prev) =>
          prev.map((item) => (item.id === apt.id ? { ...item, status: 'In Progress' } : item))
        );
        setSelectedAppointment((prev) => (prev ? { ...prev, status: 'In Progress' } : prev));
      }
    }
  };

  // Enable editing on completed report
  const handleStartEditing = () => {
    if (!selectedAppointment) return;
    setBackupForm({
      vitals: { ...vitals },
      chiefComplaint,
      symptoms: [...symptoms],
      clinicalFindings,
      diagnoses: [...diagnoses],
      medicines: [...medicines],
      labTests: [...labTests],
      radiologyTests: [...radiologyTests],
      followUpDate,
      followUpNotes,
    });
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEditing = () => {
    if (backupForm) {
      setVitals(backupForm.vitals);
      setChiefComplaint(backupForm.chiefComplaint);
      setSymptoms(backupForm.symptoms);
      setClinicalFindings(backupForm.clinicalFindings);
      setDiagnoses(backupForm.diagnoses);
      setMedicines(backupForm.medicines);
      setLabTests(backupForm.labTests);
      setRadiologyTests(backupForm.radiologyTests);
      setFollowUpDate(backupForm.followUpDate);
      setFollowUpNotes(backupForm.followUpNotes);
    }
    setViewMode('list');
    setSelectedAppointment(null);
    setIsEditing(false);
  };

  // Save consultation report
  const handleSaveConsultation = () => {
    if (!selectedAppointment) return;
    setSaving(true);

    setTimeout(() => {
      let currentLabTests = [...labTests];
      if (selectedLabTest && !currentLabTests.some((t) => t.testName === selectedLabTest)) {
        const newTest: InvestigationRequest = {
          id: `lab-${Date.now()}`,
          type: 'Lab',
          testName: selectedLabTest,
          urgency: 'Routine',
          notes: '',
          status: 'Requested',
        };
        currentLabTests.push(newTest);
        setLabTests(currentLabTests);
      }

      const record: ConsultationRecord = {
        vitals,
        chiefComplaint,
        symptoms,
        clinicalFindings,
        diagnoses,
        medicines,
        labTests: currentLabTests,
        radiologyTests,
        followUpDate,
        followUpNotes,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSavedConsultations((prev) => ({ ...prev, [selectedAppointment.id]: record }));

      // Mark appointment as Completed
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAppointment.id ? { ...a, status: 'Completed' } : a))
      );

      addToast(
        'success',
        'Consultation Completed! 🎉',
        `OPD Consultation for ${selectedAppointment.patientName} (${selectedAppointment.tokenNumber}) completed & prescription saved.`
      );

      // Dispatch Lab Order to LIS Lab Technician module automatically
      if (currentLabTests.length > 0) {
        createPatientOrderFromOPD(
          selectedAppointment.patientName,
          selectedAppointment.patientUhid,
          selectedAppointment.patientAge,
          selectedAppointment.patientGender as any,
          'Dr. Vikram Malhotra',
          selectedAppointment.department,
          currentLabTests.map((t) => t.testName)
        );
      }

      setSelectedAppointment(null);
      setIsEditing(false);
      setViewMode('list');
      setSaving(false);
    }, 300);
  };

  // Save consultation report as In-Progress (Draft)
  const handleSaveInProgress = () => {
    if (!selectedAppointment) return;
    setSaving(true);

    setTimeout(() => {
      let currentLabTests = [...labTests];
      if (selectedLabTest && !currentLabTests.some((t) => t.testName === selectedLabTest)) {
        const newTest: InvestigationRequest = {
          id: `lab-${Date.now()}`,
          type: 'Lab',
          testName: selectedLabTest,
          urgency: 'Routine',
          notes: '',
          status: 'Requested',
        };
        currentLabTests.push(newTest);
        setLabTests(currentLabTests);
      }

      const record: ConsultationRecord = {
        vitals,
        chiefComplaint,
        symptoms,
        clinicalFindings,
        diagnoses,
        medicines,
        labTests: currentLabTests,
        radiologyTests,
        followUpDate,
        followUpNotes,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSavedConsultations((prev) => ({ ...prev, [selectedAppointment.id]: record }));

      // Set appointment status to In Progress
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAppointment.id ? { ...a, status: 'In Progress' } : a))
      );

      addToast(
        'info',
        'Consultation Saved 📁',
        `In-progress OPD Consultation for ${selectedAppointment.patientName} saved.`
      );

      // Dispatch Lab Order to LIS Lab Technician module automatically
      if (currentLabTests.length > 0) {
        createPatientOrderFromOPD(
          selectedAppointment.patientName,
          selectedAppointment.patientUhid,
          selectedAppointment.patientAge,
          selectedAppointment.patientGender as any,
          'Dr. Vikram Malhotra',
          selectedAppointment.department,
          currentLabTests.map((t) => t.testName)
        );
      }

      setSelectedAppointment(null);
      setIsEditing(false);
      setViewMode('list');
      setSaving(false);
    }, 300);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAppointment(null);
    setIsEditing(false);
  };

  const updateVital = (key: keyof Vitals, val: number) => {
    setVitals((prev) => {
      const updated = { ...prev, [key]: val };
      if ((key === 'height' || key === 'weight') && updated.height && updated.weight) {
        const heightM = updated.height / 100;
        updated.bmi = Math.round((updated.weight / (heightM * heightM)) * 10) / 10;
      }
      return updated;
    });
  };

  const toggleSymptom = (sym: string) => {
    if (!isEditing) return;
    setSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddMedicine = () => {
    if (!medName.trim() || !isEditing) return;
    const med: Medicine = {
      id: `med-${Date.now()}`,
      name: medName,
      dosage: medDosage || '1 tablet',
      frequency: medFreq,
      duration: medDuration,
      instructions: medInstructions || 'After meals',
      route: 'Oral',
    };
    setMedicines((prev) => [...prev, med]);
    setMedName('');
    setMedDosage('');
    setMedInstructions('');
  };

  const handleAddDiagnosis = (code: string, name: string) => {
    if (!isEditing) return;
    const diag: Diagnosis = {
      id: `diag-${Date.now()}`,
      code,
      name,
      type: diagnoses.length === 0 ? 'Primary' : 'Secondary',
    };
    setDiagnoses((prev) => [...prev, diag]);
    setDiagSearch('');
  };

  const handleAddLabTest = () => {
    if (!selectedLabTest || !isEditing) return;
    const test: InvestigationRequest = {
      id: `lab-${Date.now()}`,
      type: 'Lab',
      testName: selectedLabTest,
      urgency: 'Routine',
      notes: '',
      status: 'Requested',
    };
    setLabTests((prev) => [...prev, test]);
    setSelectedLabTest('');
  };

  const handleAddRadTest = () => {
    if (!selectedRadTest || !isEditing) return;
    const test: InvestigationRequest = {
      id: `rad-${Date.now()}`,
      type: 'Radiology',
      testName: selectedRadTest,
      urgency: 'Routine',
      notes: '',
      status: 'Requested',
    };
    setRadiologyTests((prev) => [...prev, test]);
    setSelectedRadTest('');
  };

  const filteredDiagnoses = diagSearch.trim()
    ? COMMON_DIAGNOSES.filter(
      (d) =>
        d.name.toLowerCase().includes(diagSearch.toLowerCase()) ||
        d.code.toLowerCase().includes(diagSearch.toLowerCase())
    )
    : [];

  const counts = {
    All: appointments.length,
    Scheduled: appointments.filter((a) => a.status === 'Scheduled').length,
    'In Progress': appointments.filter((a) => a.status === 'In Progress').length,
    Completed: appointments.filter((a) => a.status === 'Completed').length,
  };

  // ═════════════════════════════════════════════════════════════
  // VIEW 1: FULL SCREEN TODAY'S APPOINTMENTS TABLE
  // ═════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto">
        {/* Header & Controls Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">OPD Consultation & Appointments</h1>
              <p className="text-xs text-slate-500 mt-1">
                Select an appointment to enter or review consultation reports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Today: <span className="text-blue-600">{appointments.length} Patients</span>
              </span>
            </div>
          </div>

          {/* Search Bar & Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="w-full md:w-96">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by Patient Name, UHID, Token, Reason..."
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {(['All', 'Scheduled', 'In Progress', 'Completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <span>{status}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === status
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                      }`}
                  >
                    {counts[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OPD Admission Date Filter Bar */}
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
              onClick={() => setSelectedDateFilter(new Date().toISOString().split('T')[0])}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter === new Date().toISOString().split('T')[0]
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
                Showing OPD patients for admission date: <strong className="text-blue-600">{selectedDateFilter}</strong> ({filteredAppointments.length} found)
              </span>
            ) : (
              <span>Showing OPD patients for <strong>All Dates</strong> ({filteredAppointments.length} total)</span>
            )}
          </div>
        </div>

        {/* ─── Full Screen Appointments Table ─────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 w-28">Token / Time</th>
                  <th className="p-4">Admission Date & Time</th>
                  <th className="p-4">Patient Name & UHID</th>
                  <th className="p-4">Age / Gender / Contact</th>
                  <th className="p-4">Type & Reason</th>
                  <th className="p-4 w-32">Status</th>
                  <th className="p-4 text-center w-48">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <EmptyState
                        title="No Appointments Found"
                        message={`No appointments matching your criteria (${statusFilter}).`}
                        icon={<Stethoscope className="w-8 h-8 text-slate-300" />}
                      />
                    </td>
                  </tr>
                ) : (
                  sortedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Token & Time */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-xs">{apt.tokenNumber}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {apt.timeSlot}
                        </div>
                      </td>

                      {/* Admission Date & Time */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          {apt.admissionDateTime}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Slot: {apt.timeSlot}</div>
                      </td>

                      {/* Patient Name & UHID */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {apt.patientName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{apt.patientName}</p>
                            <p className="text-[10px] font-semibold text-blue-600">{apt.patientUhid}</p>
                          </div>
                        </div>
                      </td>

                      {/* Age / Gender / Phone */}
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-xs">
                          {apt.patientAge} yrs / {apt.patientGender}
                        </p>
                        <p className="text-[10px] text-slate-500">{apt.patientPhone}</p>
                      </td>

                      {/* Type & Reason */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={apt.type} dot={false} />
                          <span className="text-[10px] text-slate-400">{apt.department}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium max-w-xs truncate">{apt.reason}</p>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge status={apt.status} size="md" />
                      </td>

                      {/* Action Column */}
                      <td className="p-4 text-center">
                        {apt.status === 'Scheduled' && (
                          <button
                            onClick={() => handleOpenConsultation(apt, 'enter')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 cursor-pointer transition-colors w-full"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Enter Report</span>
                          </button>
                        )}

                        {apt.status === 'In Progress' && (
                          <button
                            onClick={() => handleOpenConsultation(apt, 'enter')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm shadow-amber-500/20 cursor-pointer transition-colors w-full"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Resume Consultation</span>
                          </button>
                        )}

                        {apt.status === 'Completed' && (
                          <button
                            onClick={() => handleOpenConsultation(apt, 'view')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs cursor-pointer transition-colors w-full"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Report</span>
                          </button>
                        )}
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
  // VIEW 2: FULL SCREEN CONSULTATION / REPORT ENTER PAGE
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl cursor-pointer transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge status={selectedAppointment?.status || 'Scheduled'} size="md" />

          {/* Action Buttons for Completed vs Draft */}
          {selectedAppointment?.status === 'Completed' ? (
            !isEditing ? (
              <button
                onClick={handleStartEditing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Consultation Report
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEditing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConsultation}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToList}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConsultation}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving...' : 'Complete Consultation'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Patient Info Full Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-md">
              {selectedAppointment?.patientName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{selectedAppointment?.patientName}</h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {selectedAppointment?.tokenNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-blue-600">{selectedAppointment?.patientUhid}</span> •{' '}
                {selectedAppointment?.patientAge} yrs / {selectedAppointment?.patientGender} •{' '}
                {selectedAppointment?.patientPhone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Time Slot</span>
              <p className="font-bold text-slate-900">{selectedAppointment?.timeSlot}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Visit Type</span>
              <p className="font-bold text-blue-600">{selectedAppointment?.type}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Department</span>
              <p className="font-bold text-slate-900">{selectedAppointment?.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          READ-ONLY MODE FOR COMPLETED CONSULTATIONS (WHEN !isEditing)
         ═════════════════════════════════════════════════════════ */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* Read-Only Banner Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You are viewing a <strong>Completed Consultation Report</strong> in read-only mode. Click "Edit Consultation Report" on top to make changes.
              </span>
            </div>
            <button
              onClick={handleStartEditing}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
            >
              Edit Report
            </button>
          </div>

          {/* Read-Only Vitals Grid */}
          <ConsultationSection label="Vitals Summary">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Temp', val: `${vitals.temperature ?? '--'} °F` },
                { label: 'Pulse', val: `${vitals.pulse ?? '--'} bpm` },
                { label: 'BP', val: `${vitals.systolicBP ?? '--'}/${vitals.diastolicBP ?? '--'}` },
                { label: 'SpO₂', val: `${vitals.spo2 ?? '--'} %` },
                { label: 'Resp', val: `${vitals.respiratoryRate ?? '--'} /min` },
                { label: 'Height', val: `${vitals.height ?? '--'} cm` },
                { label: 'Weight', val: `${vitals.weight ?? '--'} kg` },
                { label: 'BMI', val: `${vitals.bmi ?? '--'} kg/m²` },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{item.val}</p>
                </div>
              ))}
            </div>
          </ConsultationSection>

          {/* Read-Only Complaints & Clinical Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConsultationSection label="Chief Complaints & Symptoms">
              <p className="text-xs text-slate-800 font-medium leading-relaxed mb-3">
                {chiefComplaint || 'No complaints recorded.'}
              </p>
              {symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </ConsultationSection>

            <ConsultationSection label="Clinical Examination Findings">
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {clinicalFindings || 'No specific clinical findings recorded.'}
              </p>
            </ConsultationSection>
          </div>

          {/* Read-Only Diagnoses */}
          <ConsultationSection label="Diagnoses (ICD-10)">
            {diagnoses.length === 0 ? (
              <p className="text-xs text-slate-400">No diagnoses assigned.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {diagnoses.map((d) => (
                  <div key={d.id} className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{d.code}</span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{d.name}</p>
                    </div>
                    <StatusBadge status={d.type} dot={false} />
                  </div>
                ))}
              </div>
            )}
          </ConsultationSection>

          {/* Read-Only Prescription Table */}
          <ConsultationSection label="Prescription Medicines">
            <PrescriptionTable medicines={medicines} isEditable={false} />
          </ConsultationSection>

          {/* Read-Only Investigations & Follow Up */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConsultationSection label="Investigation Requests">
              <div className="space-y-2">
                {labTests.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-purple-900">{t.testName} (Lab)</span>
                      <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{t.status || 'Requested'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(t.testName)}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Report
                    </button>
                  </div>
                ))}
                {radiologyTests.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">{t.testName} (Radiology)</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{t.status}</span>
                  </div>
                ))}
                {labTests.length === 0 && radiologyTests.length === 0 && (
                  <p className="text-xs text-slate-400">No lab or radiology tests requested.</p>
                )}
              </div>
            </ConsultationSection>

            <ConsultationSection label="Follow-Up & Instructions">
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Follow-Up Date</span>
                  <p className="font-bold text-slate-900">{followUpDate || 'Not scheduled'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Instructions</span>
                  <p className="font-medium text-slate-700 leading-relaxed">{followUpNotes || 'No specific follow-up instructions.'}</p>
                </div>
              </div>
            </ConsultationSection>
          </div>

          {/* LIS Diagnostic Results & Doctor Medical Review Component */}
          {(() => {
            const matchingReport = selectedAppointment
              ? labReports.find(
                  (r) =>
                    r.patientUhid.toLowerCase() === selectedAppointment.patientUhid.toLowerCase() ||
                    r.patientName.toLowerCase() === selectedAppointment.patientName.toLowerCase()
                )
              : null;

            if (!matchingReport) {
              return (
                <ConsultationSection label="LIS Diagnostic Results & Doctor Medical Review">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    No lab reports generated for this patient yet. When lab tests are prescribed and saved, the lab diagnostic results and doctor review reply box will appear here automatically.
                  </div>
                </ConsultationSection>
              );
            }

            return (
              <ConsultationSection label="LIS Diagnostic Results & Doctor Medical Review">
                <div className="space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">Report No: {matchingReport.reportNumber}</span>
                      <p className="text-[10px] text-slate-500">Sample Date: {matchingReport.generatedDate}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        matchingReport.doctorReviewStatus === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : matchingReport.doctorReviewStatus === 'Re-Test Requested'
                          ? 'bg-purple-100 text-purple-800'
                          : matchingReport.doctorReviewStatus === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      Status: {matchingReport.doctorReviewStatus}
                    </span>
                  </div>

                  {/* Observed Parameters Table */}
                  {matchingReport.testResults && matchingReport.testResults.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Test Investigation</th>
                            <th className="py-2.5 px-3">Observed Result Value</th>
                            <th className="py-2.5 px-3">Unit</th>
                            <th className="py-2.5 px-3">Ref Range</th>
                            <th className="py-2.5 px-3">Flag</th>
                            <th className="py-2.5 px-3">Tech Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {matchingReport.testResults.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{r.testName}</td>
                              <td className="py-2.5 px-3 font-extrabold text-slate-900">{r.resultValue || '(Pending)'}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.unit}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.referenceRange}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    r.flag === 'Critical'
                                      ? 'bg-rose-100 text-rose-700'
                                      : r.flag === 'High'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {r.flag || 'Normal'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic">{r.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold text-xs">
                      ⏳ Lab technician hasn't keyed in results for this order yet.
                    </div>
                  )}

                  {/* Doctor Review Actions & Instructions Input */}
                  <div className="space-y-3 pt-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <label className="block font-bold text-indigo-950 text-xs">
                      Doctor Clinical Reply / Instructions for Lab & Patient
                    </label>
                    <textarea
                      rows={2}
                      value={doctorInstructionInput || matchingReport.doctorComments || ''}
                      onChange={(e) => setDoctorInstructionInput(e.target.value)}
                      placeholder="Enter doctor reply / clinical instructions (e.g. HbA1c 7.4% elevated. Adjust Metformin to 1000mg BD...)"
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3 text-xs font-medium text-slate-800"
                    />

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const comment = doctorInstructionInput || 'Re-test requested on fresh specimen.';
                          doctorReviewReport(matchingReport.id, 'Re-Test Requested', comment);
                          addToast('warning', 'Doctor Reply Sent to Lab 📩', `Reply sent to Lab Module: "${comment}"`);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 cursor-pointer shadow-2xs"
                      >
                        Request Re-Test / Send Lab Instructions
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comment = doctorInstructionInput || 'Verified & approved without deviations.';
                          doctorReviewReport(matchingReport.id, 'Approved', comment);
                          addToast('success', 'Doctor Reply Sent to Lab 📩', `Doctor review & reply recorded in Lab Module!`);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
                      >
                        Submit Reply & Approve Report
                      </button>
                    </div>
                  </div>
                </div>
              </ConsultationSection>
            );
          })()}

          {/* Action Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-end gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print Prescription
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              onClick={handleStartEditing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Consultation
            </button>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════
            EDIT / FORM ENTRY MODE FOR CONSULTATION REPORT
           ═════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Vitals Entry */}
          <ConsultationSection label="Vitals Entry">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-xs">
              {[
                { key: 'temperature', label: 'Temp (°F)', step: 0.1 },
                { key: 'pulse', label: 'Pulse (bpm)', step: 1 },
                { key: 'systolicBP', label: 'Systolic BP', step: 1 },
                { key: 'diastolicBP', label: 'Diastolic BP', step: 1 },
                { key: 'height', label: 'Height (cm)', step: 1 },
                { key: 'weight', label: 'Weight (kg)', step: 0.1 },
                { key: 'spo2', label: 'SpO₂ (%)', step: 1 },
                { key: 'respiratoryRate', label: 'Resp. Rate', step: 1 },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block font-bold text-slate-700 mb-1">{field.label}</label>
                  <input
                    type="number"
                    step={field.step}
                    value={(vitals as Record<string, number>)[field.key] ?? ''}
                    onChange={(e) => updateVital(field.key as any, parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Auto-Calculated BMI</span>
              <p className="text-base font-black text-blue-700">{vitals.bmi || '--'} kg/m²</p>
            </div>
          </ConsultationSection>

          {/* Chief Complaint & Symptoms */}
          <ConsultationSection label="Chief Complaint & Symptoms">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chief Complaint *</label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Patient complains of chest pain radiating to left arm..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Symptoms (Select applicable)</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${symptoms.includes(s)
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ConsultationSection>

          {/* Clinical Examination Findings */}
          <ConsultationSection label="Clinical Examination Findings">
            <textarea
              rows={3}
              value={clinicalFindings}
              onChange={(e) => setClinicalFindings(e.target.value)}
              placeholder="Detailed physical examination findings..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </ConsultationSection>

          {/* Diagnoses (ICD-10) */}
          <ConsultationSection label="Diagnoses (ICD-10)">
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  placeholder="Search ICD-10 code or diagnosis name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {filteredDiagnoses.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-20 max-h-40 overflow-y-auto">
                    {filteredDiagnoses.map((d) => (
                      <button
                        key={d.code}
                        onClick={() => handleAddDiagnosis(d.code, d.name)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <span className="font-bold text-blue-600">{d.code}</span> — {d.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {diagnoses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {diagnoses.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600">{d.code}</span>
                        <p className="text-xs font-bold text-slate-900">{d.name}</p>
                      </div>
                      <button
                        onClick={() => setDiagnoses((prev) => prev.filter((item) => item.id !== d.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ConsultationSection>

          {/* Prescription Form */}
          <ConsultationSection label="Prescription Medicines">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="lg:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    list="medicine-list"
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="Type medicine name..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <datalist id="medicine-list">
                    {COMMON_MEDICINES.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={medFreq}
                    onChange={(e) => setMedFreq(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {MEDICINE_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration</label>
                  <select
                    value={medDuration}
                    onChange={(e) => setMedDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Instructions</label>
                  <input
                    type="text"
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    placeholder="e.g. After meals"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <button
                onClick={handleAddMedicine}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
              <PrescriptionTable
                medicines={medicines}
                onRemove={(id) => setMedicines((prev) => prev.filter((m) => m.id !== id))}
                isEditable={true}
              />
            </div>
          </ConsultationSection>

          {/* Investigations Entry */}
          <ConsultationSection label="Investigation Requests">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Lab Tests */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Lab Tests</h4>
                <div className="flex gap-2">
                  <select
                    value={selectedLabTest}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedLabTest(val);
                      if (val) {
                        setLabTests((prev) => {
                          if (prev.some((t) => t.testName === val)) return prev;
                          return [
                            ...prev,
                            {
                              id: `lab-${Date.now()}`,
                              type: 'Lab',
                              testName: val,
                              urgency: 'Routine',
                              notes: '',
                              status: 'Requested',
                            },
                          ];
                        });
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">Select lab test...</option>
                    {LAB_TEST_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddLabTest}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold cursor-pointer hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {labTests.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{t.testName}</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {t.status || 'Requested'}
                        </span>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setLabTests((prev) => prev.filter((item) => item.id !== t.id))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {labTests.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(labTests[0]?.testName || '')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Report
                    </button>
                  </div>
                )}
              </div>

              {/* Radiology */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Radiology Tests</h4>
                <div className="flex gap-2">
                  <select
                    value={selectedRadTest}
                    onChange={(e) => setSelectedRadTest(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">Select radiology test...</option>
                    {RADIOLOGY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={handleAddRadTest}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {radiologyTests.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                      <span className="text-xs font-medium text-slate-900">{t.testName}</span>
                      <button
                        onClick={() => setRadiologyTests((prev) => prev.filter((item) => item.id !== t.id))}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ConsultationSection>

          {/* Follow-Up Entry */}
          <ConsultationSection label="Follow-Up & Review Date">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Follow-Up Instructions</label>
                <input
                  type="text"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g. Review blood sugar reports, check BP log..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </ConsultationSection>

          {/* LIS Diagnostic Results & Doctor Medical Review Component (In Edit Mode) */}
          {(() => {
            const matchingReport = selectedAppointment
              ? labReports.find(
                  (r) =>
                    r.patientUhid.toLowerCase() === selectedAppointment.patientUhid.toLowerCase() ||
                    r.patientName.toLowerCase() === selectedAppointment.patientName.toLowerCase()
                )
              : null;

            if (!matchingReport) return null;

            return (
              <ConsultationSection label="LIS Diagnostic Results & Doctor Medical Review">
                <div className="space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">Report No: {matchingReport.reportNumber}</span>
                      <p className="text-[10px] text-slate-500">Sample Date: {matchingReport.generatedDate}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        matchingReport.doctorReviewStatus === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : matchingReport.doctorReviewStatus === 'Re-Test Requested'
                          ? 'bg-purple-100 text-purple-800'
                          : matchingReport.doctorReviewStatus === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      Status: {matchingReport.doctorReviewStatus}
                    </span>
                  </div>

                  {/* Observed Parameters Table */}
                  {matchingReport.testResults && matchingReport.testResults.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Test Investigation</th>
                            <th className="py-2.5 px-3">Observed Result Value</th>
                            <th className="py-2.5 px-3">Unit</th>
                            <th className="py-2.5 px-3">Ref Range</th>
                            <th className="py-2.5 px-3">Flag</th>
                            <th className="py-2.5 px-3">Tech Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {matchingReport.testResults.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{r.testName}</td>
                              <td className="py-2.5 px-3 font-extrabold text-slate-900">{r.resultValue || '(Pending)'}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.unit}</td>
                              <td className="py-2.5 px-3 text-slate-600">{r.referenceRange}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    r.flag === 'Critical'
                                      ? 'bg-rose-100 text-rose-700'
                                      : r.flag === 'High'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {r.flag || 'Normal'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic">{r.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold text-xs">
                      ⏳ Lab technician hasn't keyed in results for this order yet.
                    </div>
                  )}

                  {/* Doctor Review Actions & Instructions Input */}
                  <div className="space-y-3 pt-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <label className="block font-bold text-indigo-950 text-xs">
                      Doctor Clinical Reply / Instructions for Lab & Patient
                    </label>
                    <textarea
                      rows={2}
                      value={doctorInstructionInput || matchingReport.doctorComments || ''}
                      onChange={(e) => setDoctorInstructionInput(e.target.value)}
                      placeholder="Enter doctor reply / clinical instructions (e.g. HbA1c 7.4% elevated. Adjust Metformin to 1000mg BD...)"
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3 text-xs font-medium text-slate-800"
                    />

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const comment = doctorInstructionInput || 'Re-test requested on fresh specimen.';
                          doctorReviewReport(matchingReport.id, 'Re-Test Requested', comment);
                          addToast('warning', 'Doctor Reply Sent to Lab 📩', `Reply sent to Lab Module: "${comment}"`);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 cursor-pointer shadow-2xs"
                      >
                        Request Re-Test / Send Lab Instructions
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comment = doctorInstructionInput || 'Verified & approved without deviations.';
                          doctorReviewReport(matchingReport.id, 'Approved', comment);
                          addToast('success', 'Doctor Reply Sent to Lab 📩', `Doctor review & reply recorded in Lab Module!`);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
                      >
                        Submit Reply & Approve Report
                      </button>
                    </div>
                  </div>
                </div>
              </ConsultationSection>
            );
          })()}

          {/* Bottom Action Footer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleCancelEditing}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              {selectedAppointment?.status !== 'Completed' && (
                <button
                  onClick={handleSaveInProgress}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={handleSaveConsultation}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Patient Lab Report Modal Popup */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Patient Diagnostic Lab Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedAppointment?.patientName} ({selectedAppointment?.patientUhid}) • {selectedReportTestName || 'All Laboratory Tests'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs">
              {/* Patient Summary Header Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                  <p className="font-bold text-slate-900">{selectedAppointment?.patientName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">UHID</span>
                  <p className="font-bold text-blue-600">{selectedAppointment?.patientUhid}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Referred Doctor</span>
                  <p className="font-semibold text-slate-800">Dr. Vikram Malhotra</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Report Status</span>
                  <p className="font-bold text-emerald-600">Results Ready</p>
                </div>
              </div>

              {/* Diagnostic Parameters Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Diagnostic Investigation Parameters ({selectedReportTestName || 'Lab Order'})
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3.5">Test Investigation</th>
                        <th className="py-2.5 px-3.5">Observed Result Value</th>
                        <th className="py-2.5 px-3.5">Unit</th>
                        <th className="py-2.5 px-3.5">Reference Range</th>
                        <th className="py-2.5 px-3.5">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        const matchingReport = selectedAppointment
                          ? labReports.find(
                              (r) =>
                                r.patientUhid.toLowerCase() === selectedAppointment.patientUhid.toLowerCase() ||
                                r.patientName.toLowerCase() === selectedAppointment.patientName.toLowerCase()
                            )
                          : null;

                        const results = matchingReport?.testResults?.filter(
                          (r) =>
                            !selectedReportTestName ||
                            r.testName.toLowerCase().includes(selectedReportTestName.toLowerCase()) ||
                            selectedReportTestName.toLowerCase().includes(r.testName.toLowerCase())
                        ) || matchingReport?.testResults || [];

                        if (results.length > 0) {
                          return results.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-3 px-3.5 font-bold text-slate-900">{r.testName}</td>
                              <td className="py-3 px-3.5 font-black text-slate-900 text-sm">{r.resultValue || '142'}</td>
                              <td className="py-3 px-3.5 text-slate-600 font-medium">{r.unit || 'mg/dL'}</td>
                              <td className="py-3 px-3.5 text-slate-600">{r.referenceRange || '70 - 99 mg/dL'}</td>
                              <td className="py-3 px-3.5">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    r.flag === 'Critical' || r.flag === 'High'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {r.flag || 'High'}
                                </span>
                              </td>
                            </tr>
                          ));
                        }

                        // Default mock fallback for newly requested tests (e.g. Blood Sugar Fasting)
                        return (
                          <tr className="hover:bg-slate-50">
                            <td className="py-3 px-3.5 font-bold text-slate-900">{selectedReportTestName || 'Blood Sugar (Fasting)'}</td>
                            <td className="py-3 px-3.5 font-black text-slate-900 text-sm">142</td>
                            <td className="py-3 px-3.5 text-slate-600 font-medium">mg/dL</td>
                            <td className="py-3 px-3.5 text-slate-600">70 - 99 mg/dL</td>
                            <td className="py-3 px-3.5">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                High
                              </span>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Saved Instruction Preview */}
              {popupInstructionText && !showInstructionForm && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 font-medium text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 text-[10px] uppercase tracking-wider block">
                      Saved Doctor Instruction / Reply:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        popupStatus === 'Re-Test Requested'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {popupStatus}
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{popupInstructionText}</p>
                </div>
              )}

              {/* Doctor Instruction Form (Toggled by "Instruction" Button) */}
              {showInstructionForm && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-indigo-600" />
                      Enter Doctor Instruction / Clinical Impression
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium">Forwards to Lab Verification Console</span>
                  </div>

                  <textarea
                    rows={3}
                    value={popupInstructionText}
                    onChange={(e) => setPopupInstructionText(e.target.value)}
                    placeholder="Enter clinical instructions or reply (e.g. Fasting blood sugar 142 mg/dL is elevated. Advised low carb diet, repeat in 2 weeks...)"
                    className="w-full bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3 text-xs font-medium text-slate-800 shadow-2xs outline-none"
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInstructionForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePopupInstruction('Re-Test Requested')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      Re-Test Requested
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePopupInstruction('Approved')}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      Approved
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {!showInstructionForm ? (
                <button
                  type="button"
                  onClick={() => setShowInstructionForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  {popupInstructionText ? 'Edit Instruction' : 'Instruction'}
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Editing clinical instructions...</span>
              )}

              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
