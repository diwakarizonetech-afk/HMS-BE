import React, { useState, useEffect, useMemo } from 'react';
import { useER } from '../../../context/ERContext';
import { useAuth } from '../../../context/AuthContext';
import { useLab } from '../../../context/LabContext';
import { createPrescriptionApi } from '../../../services/api';
import { fetchERTimelineApi } from '../../../services/api';
import { ERDisposition, ERLabOrder, ERPharmacyOrder, EROrderedProcedure } from '../../../types/er';
import {
  Stethoscope,
  Siren,
  FileText,
  Save,
  BedDouble,
  UserPlus2,
  CheckCircle2,
  AlertTriangle,
  Pill,
  ClipboardList,
  HeartPulse,
  RefreshCw,
} from 'lucide-react';

const STANDARD_LAB_OPTIONS = [
  'Complete Blood Count (CBC)',
  'Troponin I STAT',
  'ECG 12 Lead',
  'Serum Electrolytes',
  'Blood Sugar (Fasting/Random)',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Arterial Blood Gas (ABG)',
  'Urine Routine & Microscopy',
  'D-Dimer STAT',
];

export const DoctorERConsultationPage: React.FC = () => {
  const { user } = useAuth();
  const { erVisits, recordDoctorAssessment, setERDisposition } = useER();
  const labContext = useLab();

  const doctorName = user?.name || 'Emergency Doctor';

  // Filter ER cases assigned to logged-in doctor (or unassigned waiting cases)
  const doctorVisits = useMemo(() => {
    return erVisits.filter((v) => {
      if (v.er_status === 'Discharged' || v.er_status === 'Transferred') return false;
      const assigned = (v.assigned_doctor || (v as any).assignedDoctor || '').toLowerCase().trim();
      const currentDoc = doctorName.toLowerCase().trim();
      if (!assigned || assigned === 'unassigned') return true;
      return assigned === currentDoc || currentDoc.includes(assigned) || assigned.includes(currentDoc);
    });
  }, [erVisits, doctorName]);

  const [selectedVisitId, setSelectedVisitId] = useState<string>(doctorVisits[0]?.id || erVisits[0]?.id || '');
  const activeVisit = erVisits.find((v) => v.id === selectedVisitId);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const latestVital = [...history].reverse().find((event) => event.event_type === 'vital')?.data;

  useEffect(() => {
    if (!selectedVisitId) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const events = await fetchERTimelineApi(selectedVisitId);
        if (!cancelled) setHistory(events);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    const timer = window.setInterval(loadHistory, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedVisitId]);

  useEffect(() => {
    if (doctorVisits.length > 0 && (!selectedVisitId || !doctorVisits.some((v) => v.id === selectedVisitId))) {
      const active = doctorVisits.find((v) => v.er_status !== 'Discharged' && v.er_status !== 'Transferred') || doctorVisits[0];
      if (active) {
        setSelectedVisitId(active.id);
      }
    }
  }, [doctorVisits, selectedVisitId]);

  // Form State
  const [diagnosis, setDiagnosis] = useState(activeVisit?.chief_complaint || '');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [disposition, setDisposition] = useState<ERDisposition>(activeVisit?.er_disposition || 'Pending');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [requiredWard, setRequiredWard] = useState('ICU');

  // Lab & Pharmacy Orders
  const [newLabTest, setNewLabTest] = useState('');
  const [newLabPriority, setNewLabPriority] = useState<'Normal' | 'STAT' | 'Emergency'>('STAT');
  const [labOrdersList, setLabOrdersList] = useState<ERLabOrder[]>(activeVisit?.labOrders || []);

  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1 Tablet / IV');
  const [pharmacyOrdersList, setPharmacyOrdersList] = useState<ERPharmacyOrder[]>(activeVisit?.pharmacyOrders || []);

  const handleAddLab = () => {
    if (!newLabTest.trim()) return;
    const item: ERLabOrder = {
      id: `lab-${Date.now()}`,
      testName: newLabTest,
      priority: newLabPriority,
      status: 'Ordered',
    };
    setLabOrdersList([...labOrdersList, item]);
    setNewLabTest('');
  };

  const handleAddMed = () => {
    if (!newMedName.trim() || !newMedDosage.trim()) return;
    const item: ERPharmacyOrder = {
      id: `ph-${Date.now()}`,
      medicineName: newMedName,
      dosage: newMedDosage,
      quantity: 1,
      status: 'Prescribed',
    };
    setPharmacyOrdersList([...pharmacyOrdersList, item]);
    setNewMedName('');
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;

    // 1. Record doctor assessment in ER context
    await recordDoctorAssessment(
      activeVisit.id,
      assessmentNotes,
      diagnosis,
      labOrdersList,
      pharmacyOrdersList,
      undefined,
      doctorName
    );

    // 2. Sync Lab Orders directly to Lab Module (OPD/ER Lab Order Creation)
    if (labOrdersList.length > 0 && labContext?.createPatientOrderFromOPD) {
      try {
        const testNames = labOrdersList.map((l) => l.testName);
        await labContext.createPatientOrderFromOPD(
          activeVisit.patient_name,
          activeVisit.patient_uhid,
          activeVisit.age || 30,
          (activeVisit.gender as any) || 'Male',
          doctorName,
          activeVisit.department || 'Emergency Medicine',
          testNames,
          activeVisit.id,
          true,
          activeVisit.branch || (activeVisit as any).hospital_branch || user?.branch
        );
      } catch (err) {
        console.warn('Could not sync lab order to Lab module:', err);
      }
    }

    // 3. Sync Medicine Prescriptions directly to Pharmacy Module
    if (pharmacyOrdersList.length > 0) {
      try {
        const medsPayload = pharmacyOrdersList.map((po) => ({
          name: po.medicineName,
          dosage: po.dosage || '1 dose',
          frequency: 'STAT',
          duration: '1 Day',
          instructions: 'Emergency STAT Administration',
          route: 'IV/Oral',
        }));
        await createPrescriptionApi({
          patient_uhid: activeVisit.patient_uhid,
          patient_name: activeVisit.patient_name,
          doctor_name: doctorName,
          department: activeVisit.department || 'Emergency Medicine',
          diagnosis: diagnosis || activeVisit.chief_complaint || 'Emergency Assessment',
          medicines: medsPayload,
          notes: 'Prescribed during Emergency Consultation',
          erEncounterId: activeVisit.id,
          isEmergency: true,
          branch: activeVisit.branch || (activeVisit as any).hospital_branch || 'Main Branch',
        });
      } catch (err) {
        console.warn('Could not sync prescription to Pharmacy module:', err);
      }
    }

    // 4. Set ER Disposition & trigger Reception Room Allocation notification
    if (disposition !== 'Pending') {
      await setERDisposition(activeVisit.id, disposition, dispositionNotes, requiredWard, doctorName);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-cyan-700 via-teal-700 to-emerald-700 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <Stethoscope className="w-7 h-7 text-cyan-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Doctor Emergency Consultation & Disposition</h1>
            <p className="text-xs text-cyan-100 mt-1">
              Perform emergency clinical assessment, diagnose, order labs/meds (synced with Lab & Pharmacy), and trigger ER room allocation requests to Reception.
            </p>
          </div>
        </div>
      </div>

      {/* ER Patient Picker & Assigned Staff Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
        <label className="block font-bold text-slate-700">Select Emergency Case for Assessment (Assigned Doctor: {doctorName}) *</label>
        <select
          value={selectedVisitId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedVisitId(id);
            const found = erVisits.find((v) => v.id === id);
            if (found) {
              setDiagnosis(found.chief_complaint || '');
              setAssessmentNotes('');
              setDisposition(found.er_disposition || 'Pending');
              setLabOrdersList([]);
              setPharmacyOrdersList([]);
            }
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
        >
          {doctorVisits.map((v) => (
            <option key={v.id} value={v.id}>
              {v.encounter_number || v.id} — {v.patient_name} ({v.patient_uhid}, Dept: {v.department || 'General Medicine'}, {v.emergency_type})
            </option>
          ))}
        </select>

        {activeVisit && (
          <div className="bg-linear-to-r from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase">Assigned Department</span>
              <p className="font-bold text-slate-900 mt-0.5">{activeVisit.department || 'General Medicine'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase">Assigned Doctor</span>
              <p className="font-semibold text-slate-800 mt-0.5">{activeVisit.assigned_doctor || activeVisit.assignedDoctor || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase">Assigned Nurse</span>
              <p className="font-semibold text-emerald-800 mt-0.5">{activeVisit.assigned_nurse || activeVisit.assignedNurse || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase">Triage Status</span>
              <p className="font-bold text-rose-700 mt-0.5">{activeVisit.triage_status || 'Pending Triage'}</p>
            </div>
          </div>
        )}
      </div>

      {activeVisit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900">Patient Details at ER Arrival</h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{activeVisit.patient_uhid}</span>
            </div>
            <p className="font-extrabold text-slate-900">{activeVisit.patient_name}</p>
            <p className="text-slate-600">Age/Gender: <strong>{activeVisit.patient_age ?? '—'} / {activeVisit.patient_gender || '—'}</strong></p>
            <p className="text-slate-600">Blood Group: <strong>{activeVisit.patient_blood_group || '—'}</strong></p>
            <p className="text-slate-600">Phone: <strong>{activeVisit.patient_phone || '—'}</strong></p>
            <p className="text-slate-600">Allergies: <strong>{activeVisit.patient_allergies || 'None reported'}</strong></p>
            <p className="text-slate-600">Existing Diseases: <strong>{activeVisit.patient_existing_diseases || 'None reported'}</strong></p>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900">Shared ER Patient History</h2>
              <button
                type="button"
                onClick={() => {
                  if (!selectedVisitId) return;
                  setHistoryLoading(true);
                  fetchERTimelineApi(selectedVisitId).then(setHistory).finally(() => setHistoryLoading(false));
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                title="Refresh patient history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {history.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-3">
                {history.map((event) => (
                  <div key={event.id} className="border-l-2 border-cyan-200 pl-3">
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-slate-800">{event.title}</p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{event.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{event.role || 'Staff'}: {event.actor || 'System'}</p>
                    <p className="text-slate-600 mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">{historyLoading ? 'Loading history...' : 'No history recorded yet.'}</p>
            )}
          </div>
        </div>
      )}

      {activeVisit ? (
        <form onSubmit={handleSubmitAssessment} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Left / Main Column: Assessment & Orders */}
          <div className="space-y-6 lg:col-span-2">
            {/* Nurse Recorded Vitals & Triage Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Emergency Vitals Recorded by Nurse ({activeVisit.assigned_nurse || activeVisit.assignedNurse || 'Nurse Staff'})</span>
                </h2>
                <a
                  href="/nurse/er/care"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                >
                  Open Nurse ER Care Portal &rarr;
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-700 block uppercase">Blood Pressure</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {latestVital?.blood_pressure || activeVisit.vitals?.bloodPressure || (activeVisit as any).vital_signs?.blood_pressure || 'Not recorded'}{' '}
                    <span className="text-[10px] font-normal text-slate-500">mmHg</span>
                  </p>
                </div>
                <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-700 block uppercase">Pulse Rate</span>
                  <p className="font-extrabold text-blue-900 text-sm mt-0.5">
                    {latestVital?.pulse_rate ?? activeVisit.vitals?.pulseRate ?? (activeVisit as any).vital_signs?.pulse_rate ?? '—'}{' '}
                    <span className="text-[10px] font-normal text-slate-500">bpm</span>
                  </p>
                </div>
                <div className="bg-cyan-50/70 p-2.5 rounded-xl border border-cyan-100">
                  <span className="text-[10px] font-bold text-cyan-700 block uppercase">SpO2 Oxygen</span>
                  <p className="font-extrabold text-cyan-900 text-sm mt-0.5">
                    {latestVital?.spo2 ?? activeVisit.vitals?.spO2 ?? (activeVisit as any).vital_signs?.spo2 ?? '—'}%
                  </p>
                </div>
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-700 block uppercase">Temperature</span>
                  <p className="font-extrabold text-amber-900 text-sm mt-0.5">
                    {latestVital?.temperature ?? activeVisit.vitals?.temperature ?? (activeVisit as any).vital_signs?.temperature ?? '—'}°F
                  </p>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Respiratory Rate</span>
                  <p className="font-extrabold text-emerald-900 text-sm mt-0.5">
                    {latestVital?.respiratory_rate ?? activeVisit.vitals?.respiratoryRate ?? (activeVisit as any).vital_signs?.respiratory_rate ?? '—'}{' '}
                    <span className="text-[10px] font-normal text-slate-500">/min</span>
                  </p>
                </div>
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-700 block uppercase">Pain Scale</span>
                  <p className="font-extrabold text-purple-900 text-sm mt-0.5">
                    {latestVital?.pain_scale ?? activeVisit.vitals?.painScale ?? (activeVisit as any).vital_signs?.pain_scale ?? '—'}{' '}
                    <span className="text-[10px] font-normal text-slate-500">/10</span>
                  </p>
                </div>
              </div>

              {(activeVisit.triage_notes || activeVisit.triageNotes) && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Nurse Triage Notes: </span>
                  <span className="text-slate-800 italic">{activeVisit.triage_notes || activeVisit.triageNotes}</span>
                </div>
              )}
            </div>

            {/* Clinical Assessment */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-cyan-600" />
                <span>Emergency Clinical Assessment & Diagnosis</span>
              </h2>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute ST-Elevation Myocardial Infarction (STEMI)"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Evaluation & Consultation Notes *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail clinical findings, physical evaluation, ECG/imaging interpretations..."
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Emergency Orders (Lab & Pharmacy) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-600" />
                <span>Emergency Orders (STAT Lab & Pharmacy)</span>
              </h2>

              {/* Lab Orders */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Order STAT Lab Investigations</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="er-lab-tests"
                    placeholder="Lab test name (e.g. Troponin I STAT, ECG 12 Lead)..."
                    value={newLabTest}
                    onChange={(e) => setNewLabTest(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <datalist id="er-lab-tests">
                    {(labContext?.testMasterList && labContext.testMasterList.length > 0
                      ? labContext.testMasterList.map((t) => t.testName)
                      : STANDARD_LAB_OPTIONS
                    ).map((t, idx) => (
                      <option key={`lab-opt-${idx}`} value={t} />
                    ))}
                  </datalist>
                  <select
                    value={newLabPriority}
                    onChange={(e) => setNewLabPriority(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-rose-600"
                  >
                    <option value="STAT">STAT</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Normal">Normal</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddLab}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer hover:bg-indigo-700"
                  >
                    + Add Lab
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {labOrdersList.map((lo) => (
                    <span key={lo.id} className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                      {lo.testName} ({lo.priority})
                    </span>
                  ))}
                </div>
              </div>

              {/* Pharmacy Orders */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="block font-bold text-slate-700">Prescribe Emergency STAT Medications</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="er-med-list"
                    placeholder="Medicine Name (e.g. Aspirin, Paracetamol)"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <datalist id="er-med-list">
                    {['Aspirin 300mg', 'Paracetamol 500mg IV', 'Nitroglycerin 0.4mg SL', 'Furosemide 40mg IV', 'Ondansetron 4mg IV', 'Atropine 0.6mg IV', 'Morphine 5mg IV', 'Normal Saline 500ml IV'].map((m, idx) => (
                      <option key={`med-opt-${idx}`} value={m} />
                    ))}
                  </datalist>
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 1 Tab / 500mg IV)"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="w-44 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddMed}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold cursor-pointer hover:bg-cyan-700"
                  >
                    + Add Med
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {pharmacyOrdersList.map((po) => (
                    <span key={po.id} className="px-3 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold text-[11px]">
                      {po.medicineName} - {po.dosage}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: ER Disposition & Action Box */}
          <div className="space-y-6">
            {/* Vitals Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                {activeVisit.triage_status}
              </span>
              <h3 className="text-base font-extrabold text-slate-900">{activeVisit.patient_name}</h3>
              <p className="text-xs text-slate-500">
                Complaint: <span className="font-bold text-slate-700">{activeVisit.chief_complaint}</span>
              </p>
              <p className="text-xs text-slate-500">
                Location: <span className="font-bold text-purple-700">{activeVisit.current_location}</span>
              </p>
            </div>

            {/* ER Disposition Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Siren className="w-4 h-4 text-rose-600" />
                <span>Select ER Disposition</span>
              </h2>

              <div className="space-y-2">
                <label
                  onClick={() => setDisposition('Discharge')}
                  className={`p-3 rounded-xl border cursor-pointer block space-y-1 transition-all ${
                    disposition === 'Discharge' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Discharge Patient
                  </span>
                  <span className="text-[10px] text-slate-500 block">Patient stable for outpatient discharge</span>
                </label>

                <label
                  onClick={() => setDisposition('Observation')}
                  className={`p-3 rounded-xl border cursor-pointer block space-y-1 transition-all ${
                    disposition === 'Observation' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-bold text-purple-800 flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-purple-600" /> ER Short-Stay Observation
                  </span>
                  <span className="text-[10px] text-slate-500 block">Assign temporary observation bed</span>
                </label>

                <label
                  onClick={() => setDisposition('IPD')}
                  className={`p-3 rounded-xl border cursor-pointer block space-y-1 transition-all ${
                    disposition === 'IPD' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-bold text-amber-800 flex items-center gap-2">
                    <UserPlus2 className="w-4 h-4 text-amber-600" /> IPD Inpatient Admission
                  </span>
                  <span className="text-[10px] text-slate-500 block">Require inpatient ward transfer</span>
                </label>
              </div>

              {disposition === 'IPD' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recommended Ward Type</label>
                  <select
                    value={requiredWard}
                    onChange={(e) => setRequiredWard(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                  >
                    <option value="ICU">ICU (Intensive Care Unit)</option>
                    <option value="General Ward">General Ward</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Surgical Ward">Surgical Ward</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disposition Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for disposition decision..."
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Consultation & Disposition</span>
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
};
