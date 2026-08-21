import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Printer,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Save,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { VitalSign } from '../../../types/nurse';
import { Patient } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { Modal } from '../../../components/common/Modal';
import { NurseBranchSelector } from '../../../components/nurse/NurseBranchSelector';
import { isPatientAllocatedToBranch, matchBranch } from '../../../utils/helpers';
import { PatientHistoryViewer } from '../../../components/common/PatientHistoryViewer';

interface VitalsFormState {
  height: number | '';
  weight: number | '';
  temperature: number | '';
  bloodPressure: string;
  pulseRate: number | '';
  respiratoryRate: number | '';
  spO2: number | '';
  bloodSugar: number | '';
  painScale: number;
  remarks: string;
}

const defaultVitalsForm: VitalsFormState = {
  height: 170,
  weight: 70,
  temperature: 98.6,
  bloodPressure: '120/80',
  pulseRate: 72,
  respiratoryRate: 16,
  spO2: 98,
  bloodSugar: 110,
  painScale: 1,
  remarks: '',
};

export const RecordVitalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { vitals, notes, medications, addVitalSign, updateVitalSign, deleteVitalSign, selectedBranch } = useNurse();
  const { patients, doctors, appointments, ipdAdmissions, beds, addToast } = useHMS();
  const { user } = useAuth();

  const userRole = (user?.role || '').toString().toLowerCase().replace('userrole.', '');
  const isNurse = userRole.includes('nurse');
  const isSuperAdminOrAdmin = userRole.includes('admin') || userRole.includes('super');
  const activeBranch = (isNurse && !!user?.branch && user.branch !== 'All' && !isSuperAdminOrAdmin)
    ? user.branch
    : (selectedBranch && selectedBranch !== 'All' ? selectedBranch : (user?.branch || 'All'));

  // Branch-Filtered Patients based on branch allocation
  const branchPatients = useMemo(() => {
    return patients.filter((p) =>
      isPatientAllocatedToBranch(p, activeBranch, {
        appointments,
        admissions: ipdAdmissions,
        beds,
        vitals,
        notes,
        medications,
      })
    );
  }, [patients, activeBranch, appointments, ipdAdmissions, beds, vitals, notes, medications]);

  // Active Selected Patient from HMS Database (branch-scoped)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingVitalId, setEditingVitalId] = useState<string | null>(null);
  const [vitalsForm, setVitalsForm] = useState<VitalsFormState>(defaultVitalsForm);

  const lastLoadedPatientRef = useRef<string | null>(null);

  // Initial load: select first patient in branch if none is selected
  useEffect(() => {
    if (branchPatients.length > 0 && !selectedPatient && !editingVitalId) {
      setSelectedPatient(branchPatients[0]);
    }
  }, [branchPatients.length]);

  // When selectedPatient explicitly changes, load their existing vital record into the form
  useEffect(() => {
    if (!selectedPatient) {
      lastLoadedPatientRef.current = null;
      setEditingVitalId(null);
      setVitalsForm(defaultVitalsForm);
      return;
    }

    if (lastLoadedPatientRef.current !== selectedPatient.uhid) {
      lastLoadedPatientRef.current = selectedPatient.uhid;
      const existing = vitals.find(
        (v) => (v.patientUhid || '').toLowerCase().trim() === (selectedPatient.uhid || '').toLowerCase().trim()
      );
      if (existing) {
        setEditingVitalId(existing.id);
        setVitalsForm({
          height: existing.height ?? 170,
          weight: existing.weight ?? 70,
          temperature: existing.temperature ?? 98.6,
          bloodPressure: existing.bloodPressure || '120/80',
          pulseRate: existing.pulseRate ?? 72,
          respiratoryRate: existing.respiratoryRate ?? 16,
          spO2: existing.spO2 ?? 98,
          bloodSugar: existing.bloodSugar ?? 110,
          painScale: existing.painScale ?? 1,
          remarks: existing.remarks || '',
        });
      } else {
        setEditingVitalId(null);
        setVitalsForm(defaultVitalsForm);
      }
    }
  }, [selectedPatient]);

  // Table Search & Filter state
  const [tableSearch, setTableSearch] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVitalRecord, setSelectedVitalRecord] = useState<VitalSign | null>(null);

  // Handle Patient selection from search
  const handleSelectPatient = (patient: Patient) => {
    lastLoadedPatientRef.current = null; // force reload for chosen patient
    setSelectedPatient(patient);
    addToast('info', 'Patient Selected', `Loaded profile for ${patient.firstName} ${patient.lastName} (${patient.uhid})`);
  };

  const handleClearPatient = () => {
    lastLoadedPatientRef.current = null;
    setSelectedPatient(null);
    setEditingVitalId(null);
    setVitalsForm(defaultVitalsForm);
  };

  const handleCancelEdit = () => {
    setEditingVitalId(null);
    setVitalsForm(defaultVitalsForm);
    addToast('info', 'Edit Cancelled', 'Switched to new vitals recording mode.');
  };

  // Edit existing vital record from table row
  const handleEditVitalRecord = (v: VitalSign) => {
    const matchedPatient =
      patients.find((p) => (p.uhid || '').toLowerCase().trim() === (v.patientUhid || '').toLowerCase().trim()) ||
      ({
        id: `pat-${v.patientUhid}`,
        uhid: v.patientUhid,
        firstName: v.patientName.split(' ')[0] || 'Patient',
        lastName: v.patientName.split(' ').slice(1).join(' ') || '',
        age: v.age || 0,
        gender: (v.gender as any) || 'Male',
        branch: v.branch || activeBranch,
        mobile: '',
        bloodGroup: 'B+',
      } as Patient);

    lastLoadedPatientRef.current = matchedPatient.uhid;
    setSelectedPatient(matchedPatient);
    setEditingVitalId(v.id);
    setVitalsForm({
      height: v.height ?? 170,
      weight: v.weight ?? 70,
      temperature: v.temperature ?? 98.6,
      bloodPressure: v.bloodPressure || '120/80',
      pulseRate: v.pulseRate ?? 72,
      respiratoryRate: v.respiratoryRate ?? 16,
      spO2: v.spO2 ?? 98,
      bloodSugar: v.bloodSugar ?? 110,
      painScale: v.painScale ?? 1,
      remarks: v.remarks || '',
    });
    addToast('info', 'Editing Record', `Editing vital record for ${v.patientName} (${v.patientUhid})`);
    window.scrollTo({ top: 220, behavior: 'smooth' });
  };

  // Submit Vitals Form
  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      addToast('error', 'No Patient Selected', 'Please search and select a patient first.');
      return;
    }

    const tempVal = typeof vitalsForm.temperature === 'number' ? vitalsForm.temperature : Number(vitalsForm.temperature) || 98.6;
    if (tempVal < 90 || tempVal > 110) {
      addToast('error', 'Validation Error', 'Temperature must be between 90.0°F and 110.0°F.');
      return;
    }

    const bpVal = (vitalsForm.bloodPressure || '120/80').trim();
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(bpVal)) {
      addToast('error', 'Validation Error', 'Blood Pressure must be in SYS/DIA format (e.g. 120/80).');
      return;
    }

    const pulseVal = typeof vitalsForm.pulseRate === 'number' ? vitalsForm.pulseRate : Number(vitalsForm.pulseRate) || 72;
    if (pulseVal < 0 || pulseVal > 300) {
      addToast('error', 'Validation Error', 'Pulse rate must be between 0 and 300 bpm.');
      return;
    }

    const heightVal = typeof vitalsForm.height === 'number' ? vitalsForm.height : Number(vitalsForm.height) || 170;
    const weightVal = typeof vitalsForm.weight === 'number' ? vitalsForm.weight : Number(vitalsForm.weight) || 70;
    const respVal = typeof vitalsForm.respiratoryRate === 'number' ? vitalsForm.respiratoryRate : Number(vitalsForm.respiratoryRate) || 16;
    const spo2Val = typeof vitalsForm.spO2 === 'number' ? vitalsForm.spO2 : Number(vitalsForm.spO2) || 98;
    const sugarVal = typeof vitalsForm.bloodSugar === 'number' ? vitalsForm.bloodSugar : Number(vitalsForm.bloodSugar) || 110;

    const doctor = doctors[0] || { id: 'doc-1', name: 'Dr. Vikram Malhotra', department: 'Cardiology' };
    const currentBranch = (activeBranch !== 'All' ? activeBranch : selectedPatient.branch) || user?.branch || 'Main Branch';
    const nurseStaffName = user?.name ? `Nurse (${user.name})` : 'Nurse Staff';

    if (editingVitalId) {
      await updateVitalSign(editingVitalId, {
        patientUhid: selectedPatient.uhid,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        height: heightVal,
        weight: weightVal,
        temperature: tempVal,
        bloodPressure: bpVal,
        pulseRate: pulseVal,
        respiratoryRate: respVal,
        spO2: spo2Val,
        bloodSugar: sugarVal,
        painScale: vitalsForm.painScale,
        remarks: vitalsForm.remarks,
        recordedBy: nurseStaffName,
        branch: currentBranch,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setEditingVitalId(null);
    } else {
      await addVitalSign({
        patientUhid: selectedPatient.uhid,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.department,
        height: heightVal,
        weight: weightVal,
        temperature: tempVal,
        bloodPressure: bpVal,
        pulseRate: pulseVal,
        respiratoryRate: respVal,
        spO2: spo2Val,
        bloodSugar: sugarVal,
        painScale: vitalsForm.painScale,
        remarks: vitalsForm.remarks,
        recordedBy: nurseStaffName,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        branch: currentBranch,
      });
    }

    // Reset editable fields
    setVitalsForm(defaultVitalsForm);
  };

  // Filtered Vitals Table with Priority Sorting
  const filteredVitals = useMemo(() => {
    const matched = vitals.filter((v) => {
      const pName = v.patientName || '';
      const pUhid = v.patientUhid || '';
      const dName = v.doctorName || '';
      const matchesSearch =
        pName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        pUhid.toLowerCase().includes(tableSearch.toLowerCase()) ||
        dName.toLowerCase().includes(tableSearch.toLowerCase());
      const matchesDoctor = selectedDoctorFilter === 'All' || dName === selectedDoctorFilter;
      const matchesBranch = matchBranch(v.branch, activeBranch);
      return matchesSearch && matchesDoctor && matchesBranch;
    });

    return matched.sort((a, b) => {
      const patA = patients?.find((p) => p.uhid.toLowerCase().trim() === (a.patientUhid || '').toLowerCase().trim());
      const patB = patients?.find((p) => p.uhid.toLowerCase().trim() === (b.patientUhid || '').toLowerCase().trim());
      const isAEmergency = Boolean(patA?.isEmergency || (patA?.status || '').toLowerCase() === 'emergency' || appointments.some((apt) => apt.patientUhid === a.patientUhid && apt.isEmergency));
      const isBEmergency = Boolean(patB?.isEmergency || (patB?.status || '').toLowerCase() === 'emergency' || appointments.some((apt) => apt.patientUhid === b.patientUhid && apt.isEmergency));
      if (isAEmergency !== isBEmergency) {
        return isAEmergency ? -1 : 1; // emergency first
      }
      return 0;
    });
  }, [vitals, tableSearch, selectedDoctorFilter, activeBranch, patients, appointments]);

  const totalPages = Math.ceil(filteredVitals.length / itemsPerPage) || 1;
  const paginatedVitals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVitals.slice(start, start + itemsPerPage);
  }, [filteredVitals, currentPage]);

  const handleConfirmDelete = () => {
    if (selectedVitalRecord) {
      deleteVitalSign(selectedVitalRecord.id);
      setIsDeleteModalOpen(false);
      setSelectedVitalRecord(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Branch Selection Bar */}
      <NurseBranchSelector />

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Nurse Module</span>
            <span>/</span>
            <span className="text-blue-600">Record Vitals</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Record Patient Vital Signs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search patient from HMS database, view demographic summary, and record/edit vital measurements.
          </p>
        </div>
      </div>

      {/* STEP 1: PATIENT SEARCH */}
      <PatientSearch
        onSelectPatient={handleSelectPatient}
        selectedPatient={selectedPatient}
        onClearPatient={handleClearPatient}
      />

      {/* STEP 2: PATIENT INFORMATION CARD */}
      <PatientInfoCard patient={selectedPatient} />

      {/* STEP 3: VITALS RECORDING / EDITING FORM */}
      {selectedPatient && (
        <div className={`bg-white p-6 rounded-2xl border shadow-xs space-y-4 transition-all ${
          editingVitalId ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
        }`}>
          {/* Header & Edit Banner */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                editingVitalId ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {editingVitalId ? <Edit className="w-4 h-4" /> : <Thermometer className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingVitalId ? 'Edit Vitals Record' : 'Record New Vitals'} for {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">UHID: {selectedPatient.uhid}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingVitalId ? (
                <>
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    Editing Active Record
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Edit</span>
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Nurse Measurement Form
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveVitals} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={vitalsForm.height}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={vitalsForm.weight}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Temperature (°F) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vitalsForm.temperature}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Blood Pressure (SYS/DIA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="120/80"
                  value={vitalsForm.bloodPressure}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pulse Rate (bpm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={vitalsForm.pulseRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Respiratory Rate (bpm)
                </label>
                <input
                  type="number"
                  value={vitalsForm.respiratoryRate}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SpO2 Oxygen (%)
                </label>
                <input
                  type="number"
                  value={vitalsForm.spO2}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Blood Sugar (mg/dL)
                </label>
                <input
                  type="number"
                  value={vitalsForm.bloodSugar}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodSugar: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pain Scale (1 to 10): <span className="text-blue-600 font-bold">{vitalsForm.painScale} / 10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={vitalsForm.painScale}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, painScale: Number(e.target.value) })}
                  className="w-full accent-blue-600 mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nurse Remarks & Triage Observations
              </label>
              <textarea
                rows={2}
                value={vitalsForm.remarks}
                onChange={(e) => setVitalsForm({ ...vitalsForm, remarks: e.target.value })}
                placeholder="Notes on patient symptoms, discomfort level, or triage alerts..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingVitalId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Edit</span>
                </button>
              )}
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all ${
                  editingVitalId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {editingVitalId ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{editingVitalId ? 'Update Vitals Record' : 'Save Vitals Record'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORICAL VITALS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>Recorded Vitals Log</span>
            </h3>
            <p className="text-xs text-slate-500">History of recorded patient vital measurements (click Edit to modify)</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Doctor</th>
                <th className="py-3.5 px-4">Temp (°F)</th>
                <th className="py-3.5 px-4">BP (mmHg)</th>
                <th className="py-3.5 px-4">Pulse (bpm)</th>
                <th className="py-3.5 px-4">SpO2 (%)</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedVitals.length > 0 ? (
                paginatedVitals.map((v, idx) => {
                  const patMatch = patients?.find((p) => p.uhid.toLowerCase().trim() === (v.patientUhid || '').toLowerCase().trim());
                  const isEmergencyVital = Boolean(
                    patMatch?.isEmergency ||
                    (patMatch?.status || '').toLowerCase() === 'emergency' ||
                    (patMatch?.category || '').toLowerCase() === 'emergency' ||
                    appointments.some((apt) => apt.patientUhid === v.patientUhid && apt.isEmergency)
                  );
                  const isCurrentlyEditingThis = editingVitalId === v.id;

                  return (
                  <tr
                    key={`${v.id}-${idx}`}
                    className={`transition-colors ${
                      isCurrentlyEditingThis
                        ? 'bg-amber-50/60 border-l-4 border-l-amber-500'
                        : isEmergencyVital
                        ? 'bg-rose-50/40 border-l-4 border-l-rose-500 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900">{v.patientName}</p>
                        {isEmergencyVital && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white shadow-2xs animate-pulse tracking-wide uppercase">
                            EMERGENCY
                          </span>
                        )}
                        {isCurrentlyEditingThis && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white uppercase">
                            Editing Now
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-blue-600 font-mono font-semibold">{v.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{v.doctorName || 'Attending Physician'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{v.temperature}°F</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{v.bloodPressure}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{v.pulseRate} bpm</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{v.spO2}%</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{v.date} ({v.time})</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Edit Vitals Record"
                          onClick={() => handleEditVitalRecord(v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          title="View Details"
                          onClick={() => {
                            setSelectedVitalRecord(v);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete Record"
                          onClick={() => {
                            setSelectedVitalRecord(v);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No vitals recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Patient Medical History (End of Page) */}
      {selectedPatient?.uhid && (
        <div className="pt-2">
          <PatientHistoryViewer
            patientUhid={selectedPatient.uhid}
            patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
            title="Complete Patient Medical History & Prior Hospital Records"
            subtitle="Cross-branch medical history: prior doctor consultations, clinical diagnoses, past prescriptions, vitals trends, and lab reports"
            defaultExpanded={true}
          />
        </div>
      )}

      {/* View Modal */}
      {selectedVitalRecord && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Vitals Record - ${selectedVitalRecord.patientName}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs p-2">
            <p><span className="font-bold text-slate-700">UHID:</span> {selectedVitalRecord.patientUhid}</p>
            <p><span className="font-bold text-slate-700">Doctor:</span> {selectedVitalRecord.doctorName}</p>
            <p><span className="font-bold text-slate-700">BP:</span> {selectedVitalRecord.bloodPressure} mmHg</p>
            <p><span className="font-bold text-slate-700">Temp:</span> {selectedVitalRecord.temperature} °F</p>
            <p><span className="font-bold text-slate-700">Pulse:</span> {selectedVitalRecord.pulseRate} bpm</p>
            <p><span className="font-bold text-slate-700">SpO2:</span> {selectedVitalRecord.spO2} %</p>
            <p><span className="font-bold text-slate-700">Remarks:</span> {selectedVitalRecord.remarks || 'None'}</p>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedVitalRecord && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Vitals Record"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p>Are you sure you want to delete vital logs for {selectedVitalRecord.patientName}?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

