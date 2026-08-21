import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useER } from '../../../context/ERContext';
import { useNurse } from '../../../context/NurseContext';
import { useAuth } from '../../../context/AuthContext';
import { TriageStatus, ERVitalSign } from '../../../types/er';
import { matchBranch } from '../../../utils/helpers';
import { NurseBranchSelector } from '../../../components/nurse/NurseBranchSelector';
import {
  HeartPulse,
  Siren,
  ClipboardList,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pill,
  Activity,
  UserCheck,
  Filter,
  Users,
  Search,
} from 'lucide-react';

export const NurseERCarePage: React.FC = () => {
  const { user } = useAuth();
  const { selectedBranch } = useNurse();
  const { erVisits, updateERTriage, recordERVitals, addERNursingNote, administerERMedication } = useER();
  const [searchParams] = useSearchParams();
  const initialUhid = searchParams.get('uhid') || '';

  const userRole = (user?.role || '').toString().toLowerCase().replace('userrole.', '');
  const isNurse = userRole.includes('nurse');
  const isSuperAdminOrAdmin = userRole.includes('admin') || userRole.includes('super');
  const activeBranch = (isNurse && !!user?.branch && user.branch !== 'All' && !isSuperAdminOrAdmin)
    ? user.branch
    : (selectedBranch && selectedBranch !== 'All' ? selectedBranch : (user?.branch || 'All'));

  const nurseName = user?.name || 'Staff Nurse';
  const [filterMode, setFilterMode] = useState<'all' | 'assigned'>('all');

  // Filter ER cases assigned to logged-in nurse or all active in branch
  const nurseVisits = React.useMemo(() => {
    return erVisits.filter((v) => {
      if (v.er_status === 'Discharged' || v.er_status === 'Transferred') return false;
      if (!matchBranch(v.branch, activeBranch)) return false;
      if (filterMode === 'assigned') {
        const assigned = (v.assigned_nurse || (v as any).assignedNurse || '').toLowerCase().trim();
        const currentNurse = nurseName.toLowerCase().trim();
        if (!assigned || assigned === 'unassigned') return false;
        return assigned === currentNurse || currentNurse.includes(assigned) || assigned.includes(currentNurse);
      }
      return true;
    });
  }, [erVisits, nurseName, activeBranch, filterMode]);

  const [selectedVisitId, setSelectedVisitId] = useState<string>('');

  useEffect(() => {
    if (initialUhid) {
      const match = erVisits.find((v) => (v.patient_uhid === initialUhid || v.patientUhid === initialUhid) && v.er_status !== 'Discharged' && v.er_status !== 'Transferred');
      if (match) {
        setSelectedVisitId(match.id);
        return;
      }
    }
    if (nurseVisits.length > 0 && (!selectedVisitId || !nurseVisits.some((v) => v.id === selectedVisitId))) {
      const active = nurseVisits.find((v) => v.er_status !== 'Discharged' && v.er_status !== 'Transferred') || nurseVisits[0];
      if (active) {
        setSelectedVisitId(active.id);
      }
    }
  }, [nurseVisits, selectedVisitId, initialUhid, erVisits]);

  const activeVisit = erVisits.find((v) => v.id === selectedVisitId);

  // Triage Form State
  const [triageStatus, setTriageStatus] = useState<TriageStatus>('Priority 2 (Yellow - Urgent)');
  const [triageNotes, setTriageNotes] = useState('');

  // Vitals Form State
  const [bpSys, setBpSys] = useState<number | ''>(120);
  const [bpDia, setBpDia] = useState<number | ''>(80);
  const [pulseRate, setPulseRate] = useState<number | ''>(78);
  const [spO2, setSpO2] = useState<number | ''>(98);
  const [temperature, setTemperature] = useState<number | ''>(98.6);
  const [respiratoryRate, setRespiratoryRate] = useState<number | ''>(18);
  const [painScale, setPainScale] = useState<number | ''>(3);

  // Nursing Note State
  const [newNote, setNewNote] = useState('');

  // Medication Admin State
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('IV Stat');

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    await updateERTriage(activeVisit.id, triageStatus, triageNotes, nurseName);
    setTriageNotes('');
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;
    await recordERVitals(
      activeVisit.id,
      {
        bp_sys: Number(bpSys) || 120,
        bp_dia: Number(bpDia) || 80,
        blood_pressure: `${bpSys || 120}/${bpDia || 80}`,
        pulse_rate: Number(pulseRate) || 80,
        spo2: Number(spO2) || 98,
        temperature: Number(temperature) || 98.6,
        respiratory_rate: Number(respiratoryRate) || 18,
        pain_scale: Number(painScale) || 0,
      },
      nurseName
    );
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit || !newNote.trim()) return;
    await addERNursingNote(activeVisit.id, newNote, nurseName);
    setNewNote('');
  };

  const handleMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit || !medicineName || !dosage) return;
    await administerERMedication(activeVisit.id, {
      medicineName,
      dosage,
      route,
      timeGiven: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      givenBy: nurseName,
    });
    setMedicineName('');
    setDosage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-indigo-800 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <Siren className="w-7 h-7 text-rose-200 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Nurse ER Triage & Nursing Care</h1>
            <p className="text-xs text-rose-100 mt-1">
              Classify triage urgency, record emergency vitals, administer meds, and update shared ER records.
            </p>
          </div>
        </div>
      </div>

      {/* Branch Selector */}
      <NurseBranchSelector />

      {/* Patient Picker Bar & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-600" />
            <span>Select Active ER Patient for Nursing Care</span>
          </label>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Branch ER Cases ({erVisits.filter(v => v.er_status !== 'Discharged' && v.er_status !== 'Transferred' && matchBranch(v.branch, activeBranch)).length})
            </button>
            <button
              onClick={() => setFilterMode('assigned')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'assigned'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned to Me ({nurseName})
            </button>
          </div>
        </div>

        {nurseVisits.length > 0 ? (
          <select
            value={selectedVisitId}
            onChange={(e) => setSelectedVisitId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20"
          >
            {nurseVisits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.encounter_number || v.id} — {v.patient_name} ({v.patient_uhid}, Dept: {v.department || 'Emergency'}, {v.triage_status || v.emergency_type || 'Active'})
              </option>
            ))}
          </select>
        ) : (
          <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
            <Siren className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">No Active ER Patients Found</p>
            <p className="text-slate-500 text-[11px]">
              {filterMode === 'assigned'
                ? `No active emergency cases currently assigned to "${nurseName}". Switch to "All Branch ER Cases" to view unassigned patients.`
                : `No active emergency cases registered in ${activeBranch}. New emergency admissions from Reception or ER will appear here immediately.`}
            </p>
            {filterMode === 'assigned' && (
              <button
                onClick={() => setFilterMode('all')}
                className="mt-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer hover:bg-blue-700 transition-colors"
              >
                View All Branch ER Patients
              </button>
            )}
          </div>
        )}

        {activeVisit && (
          <div className="bg-gradient-to-r from-rose-50/70 via-blue-50/50 to-indigo-50/60 p-4 rounded-xl border border-rose-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Department</span>
              <p className="font-bold text-slate-900 mt-0.5">{activeVisit.department || 'Emergency Medicine'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Doctor</span>
              <p className="font-semibold text-slate-800 mt-0.5">{activeVisit.assigned_doctor || activeVisit.assignedDoctor || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Nurse</span>
              <p className="font-semibold text-emerald-800 mt-0.5">{activeVisit.assigned_nurse || activeVisit.assignedNurse || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Current Location</span>
              <p className="font-bold text-rose-700 mt-0.5">{activeVisit.current_location || 'ER Triage Bay'}</p>
            </div>
          </div>
        )}
      </div>

      {activeVisit ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Left Column: Triage & Vitals */}
          <div className="space-y-6 lg:col-span-2">
            {/* Triage Classification Form */}
            <form onSubmit={handleTriageSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Siren className="w-4 h-4 text-rose-600" />
                <span>Perform Triage Classification</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  onClick={() => setTriageStatus('Priority 1 (Red - Critical)')}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between space-y-1 transition-all ${
                    triageStatus.includes('Priority 1')
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Red - Critical
                  </span>
                  <span className="text-[10px] text-slate-500">Immediate life-saving intervention</span>
                </label>

                <label
                  onClick={() => setTriageStatus('Priority 2 (Yellow - Urgent)')}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between space-y-1 transition-all ${
                    triageStatus.includes('Priority 2')
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-amber-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> Yellow - Urgent
                  </span>
                  <span className="text-[10px] text-slate-500">Urgent care needed within 30 mins</span>
                </label>

                <label
                  onClick={() => setTriageStatus('Priority 3 (Green - Non-Urgent)')}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between space-y-1 transition-all ${
                    triageStatus.includes('Priority 3')
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Green - Non-Urgent
                  </span>
                  <span className="text-[10px] text-slate-500">Standard emergency room care</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Triage Nurse Assessment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record initial triage observations..."
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Update Triage Status
                </button>
              </div>
            </form>

            {/* Record Clinical Vitals */}
            <form onSubmit={handleVitalsSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Record Emergency Vital Signs</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">BP Systolic</label>
                  <input
                    type="number"
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">BP Diastolic</label>
                  <input
                    type="number"
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    value={pulseRate}
                    onChange={(e) => setPulseRate(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SpO2 Oxygen (%)</label>
                  <input
                    type="number"
                    value={spO2}
                    onChange={(e) => setSpO2(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-cyan-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Respiratory Rate</label>
                  <input
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pain Scale (1-10)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={painScale}
                    onChange={(e) => setPainScale(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Save Vital Signs
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Nursing Notes & Medication Administration */}
          <div className="space-y-6">
            {/* Patient Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {activeVisit.patient_uhid}
              </span>
              <h3 className="text-base font-extrabold text-slate-900">{activeVisit.patient_name}</h3>
              <p className="text-xs text-slate-500">
                Complaint: <span className="font-semibold text-slate-800">{activeVisit.chief_complaint}</span>
              </p>
              <p className="text-xs text-slate-500">Location: <span className="font-bold text-purple-700">{activeVisit.current_location}</span></p>
            </div>

            {/* Add Nursing Note Form */}
            <form onSubmit={handleNoteSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>Add Nursing Note</span>
              </h3>
              <textarea
                rows={3}
                required
                placeholder="Log nursing observation or patient care rendered..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Add Nursing Note
              </button>
            </form>

            {/* Medication Administration */}
            <form onSubmit={handleMedSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-cyan-600" />
                <span>Administer Medication</span>
              </h3>
              <input
                type="text"
                required
                placeholder="Medicine Name (e.g. Paracetamol IV)"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Dosage (e.g. 500mg)"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Route (e.g. IV Stat)"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer"
              >
                Record Administration
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
