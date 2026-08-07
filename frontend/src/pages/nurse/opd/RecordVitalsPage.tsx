import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { VitalSign } from '../../../types/nurse';
import { Patient } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { useHMS } from '../../../context/HMSContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { Modal } from '../../../components/common/Modal';

export const RecordVitalsPage: React.FC = () => {
  const { vitals, addVitalSign, updateVitalSign, deleteVitalSign } = useNurse();
  const { patients, doctors, addToast } = useHMS();

  // Active Selected Patient from HMS Database
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);

  // Editable Vitals Form state for the active patient
  const [vitalsForm, setVitalsForm] = useState({
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
  });

  // Table Search & Filter state
  const [tableSearch, setTableSearch] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedVitalRecord, setSelectedVitalRecord] = useState<VitalSign | null>(null);

  // Handle Patient selection from search
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    addToast('info', 'Patient Loaded', `Loaded read-only profile for ${patient.firstName} ${patient.lastName}`);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  // Submit Vitals Form
  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      addToast('error', 'No Patient Selected', 'Please search and select a patient first.');
      return;
    }

    // Validation
    if (vitalsForm.temperature < 95 || vitalsForm.temperature > 108) {
      addToast('error', 'Validation Error', 'Temperature must be between 95.0°F and 108.0°F.');
      return;
    }

    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(vitalsForm.bloodPressure.trim())) {
      addToast('error', 'Validation Error', 'Blood Pressure must be in SYS/DIA format (e.g. 120/80).');
      return;
    }

    if (vitalsForm.pulseRate < 0) {
      addToast('error', 'Validation Error', 'Pulse rate cannot be negative.');
      return;
    }

    const doctor = doctors[0] || { id: 'doc-1', name: 'Dr. Vikram Malhotra', department: 'Cardiology' };

    addVitalSign({
      patientUhid: selectedPatient.uhid,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: doctor.department,
      height: vitalsForm.height,
      weight: vitalsForm.weight,
      temperature: vitalsForm.temperature,
      bloodPressure: vitalsForm.bloodPressure,
      pulseRate: vitalsForm.pulseRate,
      respiratoryRate: vitalsForm.respiratoryRate,
      spO2: vitalsForm.spO2,
      bloodSugar: vitalsForm.bloodSugar,
      painScale: vitalsForm.painScale,
      remarks: vitalsForm.remarks,
      recordedBy: 'Nurse Anjali Rao',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Reset editable fields
    setVitalsForm({
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
    });
  };

  // Filtered Vitals Table
  const filteredVitals = useMemo(() => {
    return vitals.filter((v) => {
      const matchesSearch =
        v.patientName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        v.patientUhid.toLowerCase().includes(tableSearch.toLowerCase()) ||
        v.doctorName.toLowerCase().includes(tableSearch.toLowerCase());
      const matchesDoctor = selectedDoctorFilter === 'All' || v.doctorName === selectedDoctorFilter;
      return matchesSearch && matchesDoctor;
    });
  }, [vitals, tableSearch, selectedDoctorFilter]);

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
            Search patient from HMS database, view read-only profile, and record pre-consultation vital measurements.
          </p>
        </div>
      </div>

      {/* STEP 1: PATIENT SEARCH */}
      <PatientSearch
        onSelectPatient={handleSelectPatient}
        selectedPatient={selectedPatient}
        onClearPatient={handleClearPatient}
      />

      {/* STEP 2: READ-ONLY PATIENT INFORMATION CARD */}
      <PatientInfoCard patient={selectedPatient} />

      {/* STEP 3: VITALS RECORDING FORM (EDITABLE FIELDS ONLY) */}
      {selectedPatient && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-600" />
              <span>Record Vitals for {selectedPatient.firstName} {selectedPatient.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Nurse Measurement Form
            </span>
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, height: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, weight: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: Number(e.target.value) })}
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
                  onChange={(e) => setVitalsForm({ ...vitalsForm, bloodSugar: Number(e.target.value) })}
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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Vitals Record</span>
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
            <p className="text-xs text-slate-500">History of recorded patient vital measurements</p>
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
                paginatedVitals.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{v.patientName}</p>
                      <p className="text-[10px] text-blue-600 font-mono font-semibold">{v.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{v.doctorName}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{v.temperature}°F</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{v.bloodPressure}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{v.pulseRate} bpm</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{v.spO2}%</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{v.date} ({v.time})</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedVitalRecord(v);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
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
                ))
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
