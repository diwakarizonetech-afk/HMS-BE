import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Clock,
  User,
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  HeartPulse,
  BedDouble,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Activity,
  CheckCircle2,
  FileCheck2,
  Building2,
  Phone,
  Droplet,
} from 'lucide-react';
import { fetchPatientHistoryApi } from '../../services/api';

interface PatientHistoryViewerProps {
  patientUhid?: string;
  patientName?: string;
  compact?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  subtitle?: string;
}

export const PatientHistoryViewer: React.FC<PatientHistoryViewerProps> = ({
  patientUhid,
  patientName,
  compact = false,
  defaultExpanded = true,
  title = 'Patient Medical History & Previous Records',
  subtitle = 'Review past OPD consultations, diagnoses, prescriptions, lab reports, and vitals across all hospital visits',
}) => {
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consultations' | 'prescriptions' | 'vitals' | 'lab' | 'admissions'>('consultations');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const loadHistory = async () => {
    if (!patientUhid || !patientUhid.trim()) {
      setHistoryData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPatientHistoryApi(patientUhid.trim());
      setHistoryData(data);
    } catch (err: any) {
      console.warn('Failed to load patient history:', err);
      setError(err?.message || 'Could not load complete history from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [patientUhid]);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Derive historical counts
  const totalConsultations = historyData?.consultations?.length || 0;
  const totalAppointments = historyData?.appointments?.length || 0;
  const totalPrescriptions = historyData?.prescriptions?.length || 0;
  const totalLabReports = historyData?.labReports?.length || 0;
  const totalVitals = historyData?.vitals?.length || 0;
  const totalAdmissions = historyData?.admissions?.length || 0;
  const totalVisitsCount = Math.max(totalConsultations, totalAppointments);

  const isReturningPatient = totalVisitsCount > 1 || totalPrescriptions > 0 || totalLabReports > 0 || totalAdmissions > 0;
  const patientInfo = historyData?.patient || {};

  const filteredConsultations = useMemo(() => {
    const list = historyData?.consultations || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((c: any) => {
      const rec = c.record || {};
      const diagStr = Array.isArray(rec.diagnoses) ? rec.diagnoses.map((d: any) => d.name || d.code || '').join(' ') : '';
      const symStr = Array.isArray(rec.symptoms) ? rec.symptoms.join(' ') : '';
      const compStr = rec.chiefComplaint || '';
      const docStr = c.doctorName || '';
      return (
        diagStr.toLowerCase().includes(q) ||
        symStr.toLowerCase().includes(q) ||
        compStr.toLowerCase().includes(q) ||
        docStr.toLowerCase().includes(q) ||
        (c.date || '').includes(q)
      );
    });
  }, [historyData?.consultations, searchFilter]);

  const filteredPrescriptions = useMemo(() => {
    const list = historyData?.prescriptions || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((rx: any) => {
      const doc = (rx.doctorName || '').toLowerCase();
      const medList = Array.isArray(rx.items || rx.medicines) ? (rx.items || rx.medicines) : [];
      const medStr = medList.map((m: any) => `${m.medicineName || m.name || ''} ${m.dosage || ''}`).join(' ').toLowerCase();
      return doc.includes(q) || medStr.includes(q) || (rx.prescriptionNumber || '').toLowerCase().includes(q) || (rx.date || '').includes(q);
    });
  }, [historyData?.prescriptions, searchFilter]);

  const filteredLabReports = useMemo(() => {
    const list = historyData?.labReports || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((lr: any) => {
      const repNo = (lr.reportNumber || '').toLowerCase();
      const doc = (lr.doctorName || '').toLowerCase();
      const tests = Array.isArray(lr.tests) ? lr.tests.join(' ').toLowerCase() : '';
      const testResults = Array.isArray(lr.testResults) ? lr.testResults.map((tr: any) => tr.testName || '').join(' ').toLowerCase() : '';
      return repNo.includes(q) || doc.includes(q) || tests.includes(q) || testResults.includes(q);
    });
  }, [historyData?.labReports, searchFilter]);

  const filteredVitals = useMemo(() => {
    const list = historyData?.vitals || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((v: any) => {
      return (v.date || '').includes(q) || (v.recordedBy || '').toLowerCase().includes(q) || (v.bloodPressure || '').includes(q);
    });
  }, [historyData?.vitals, searchFilter]);

  const filteredAdmissions = useMemo(() => {
    const list = historyData?.admissions || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter((adm: any) => {
      const ward = (adm.ward || '').toLowerCase();
      const reason = (adm.admissionReason || '').toLowerCase();
      const doc = (adm.attendingDoctor || '').toLowerCase();
      return ward.includes(q) || reason.includes(q) || doc.includes(q);
    });
  }, [historyData?.admissions, searchFilter]);

  if (!patientUhid) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white cursor-pointer select-none flex items-center justify-between gap-4 transition-colors hover:brightness-105"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-wide text-white flex items-center gap-2">
                <span>{title}</span>
              </h3>
              {isReturningPatient ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-900" />
                  Returning Old Patient ({totalVisitsCount} Visits)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/30 text-cyan-200 border border-cyan-400/30 uppercase tracking-wider">
                  First Recorded Visit
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              UHID: <span className="font-mono font-bold text-cyan-300">{patientUhid}</span>
              {patientName && <span> • Patient: <strong className="text-white">{patientName}</strong></span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadHistory();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 hover:text-white transition-all cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 bg-slate-50/40">
          {/* Quick Summary Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setActiveTab('consultations')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'consultations'
                  ? 'bg-blue-50 border-blue-300 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consultations</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalConsultations || totalAppointments}</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('prescriptions')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'prescriptions'
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prescriptions</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalPrescriptions}</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('vitals')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'vitals'
                  ? 'bg-rose-50 border-rose-300 shadow-xs ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vitals Logs</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalVitals}</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <HeartPulse className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('lab')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'lab'
                  ? 'bg-purple-50 border-purple-300 shadow-xs ring-2 ring-purple-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lab Reports</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalLabReports}</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('admissions')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'admissions'
                  ? 'bg-indigo-50 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IPD Admissions</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{totalAdmissions}</h4>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <BedDouble className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Medical Alerts & Background Info Banner */}
          {(patientInfo?.allergies || patientInfo?.existingDiseases || patientInfo?.bloodGroup) && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px]">
                    Critical Medical Background & Risk Factors
                  </h5>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {patientInfo.allergies && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                        ⚠️ Allergies: {patientInfo.allergies}
                      </span>
                    )}
                    {patientInfo.existingDiseases && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                        🏥 Chronic: {patientInfo.existingDiseases}
                      </span>
                    )}
                    {patientInfo.bloodGroup && (
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[11px] border border-red-200">
                        🩸 Blood Group: {patientInfo.bloodGroup}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {patientInfo.branch && (
                <span className="text-[11px] font-semibold text-amber-900">
                  Registered Campus: <strong>{patientInfo.branch}</strong>
                </span>
              )}
            </div>
          )}

          {/* Controls: Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('consultations')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'consultations'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🩺 Prior Consultations ({totalConsultations})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prescriptions')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'prescriptions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                💊 Past Prescriptions ({totalPrescriptions})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vitals')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'vitals'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                📈 Vitals Trend ({totalVitals})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lab')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'lab'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🧪 Lab & Diagnostics ({totalLabReports})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admissions')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'admissions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🏥 IPD & Notes ({totalAdmissions})
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter history records..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
              <p className="font-semibold">Loading complete cross-branch patient medical history...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <strong>Error loading history:</strong> {error}
            </div>
          )}

          {/* TAB 1: CONSULTATIONS */}
          {!loading && activeTab === 'consultations' && (
            <div className="space-y-3">
              {filteredConsultations.length > 0 ? (
                filteredConsultations.map((c: any, idx: number) => {
                  const rec = c.record || {};
                  const isItemExpanded = expandedItems[c.id || idx] !== false; // expanded by default
                  const dateStr = c.date || (c.createdAt ? c.createdAt.split('T')[0] : 'Past Visit');

                  return (
                    <div key={c.id || idx} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div
                        onClick={() => toggleItem(c.id || idx)}
                        className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-xs text-slate-900">
                                Consultation on {dateStr}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {c.status || 'Completed'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Doctor: <strong className="text-slate-800">{c.doctorName || 'Attending Doctor'}</strong>
                              {rec.completedAt && <span> • Time: {rec.completedAt}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-600">
                            {isItemExpanded ? 'Collapse' : 'View Full Details'}
                          </span>
                          {isItemExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isItemExpanded && (
                        <div className="p-4 space-y-3.5 text-xs">
                          {/* Chief Complaint & Symptoms */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider mb-1">
                                Chief Complaint
                              </span>
                              <p className="text-slate-900 font-medium">{rec.chiefComplaint || 'None documented'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider mb-1">
                                Recorded Symptoms
                              </span>
                              {Array.isArray(rec.symptoms) && rec.symptoms.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {rec.symptoms.map((s: string, si: number) => (
                                    <span key={si} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-500 italic">No specific symptoms tagged</p>
                              )}
                            </div>
                          </div>

                          {/* Clinical Findings & Diagnoses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rec.clinicalFindings && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="font-bold text-slate-700 text-[11px] block uppercase tracking-wider mb-1">
                                  Clinical Findings / Physical Exam
                                </span>
                                <p className="text-slate-800 leading-relaxed">{rec.clinicalFindings}</p>
                              </div>
                            )}

                            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                              <span className="font-bold text-emerald-900 text-[11px] block uppercase tracking-wider mb-1">
                                Diagnoses (ICD / Clinical)
                              </span>
                              {Array.isArray(rec.diagnoses) && rec.diagnoses.length > 0 ? (
                                <div className="space-y-1.5">
                                  {rec.diagnoses.map((d: any, di: number) => (
                                    <div key={di} className="flex items-center justify-between text-xs font-semibold text-slate-900">
                                      <span>• {d.name || d.code || d}</span>
                                      {d.type && <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded font-bold">{d.type}</span>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-500 italic">General OPD evaluation</p>
                              )}
                            </div>
                          </div>

                          {/* Prescribed Medicines in this session */}
                          {Array.isArray(rec.medicines) && rec.medicines.length > 0 && (
                            <div className="space-y-2">
                              <span className="font-bold text-slate-800 text-xs block">
                                💊 Prescribed Medications ({rec.medicines.length}):
                              </span>
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                                    <tr>
                                      <th className="py-2 px-3">Medicine</th>
                                      <th className="py-2 px-3">Dosage</th>
                                      <th className="py-2 px-3">Frequency</th>
                                      <th className="py-2 px-3">Duration</th>
                                      <th className="py-2 px-3">Instructions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {rec.medicines.map((m: any, mi: number) => (
                                      <tr key={mi} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 font-bold text-slate-900">{m.name || m.medicineName || 'Medicine'}</td>
                                        <td className="py-2 px-3 text-slate-700">{m.dosage || '1 tab'}</td>
                                        <td className="py-2 px-3 font-semibold text-blue-700">{m.frequency || '1-0-1'}</td>
                                        <td className="py-2 px-3 text-slate-700">{m.duration || '5 Days'}</td>
                                        <td className="py-2 px-3 text-slate-500">{m.instructions || m.timing || 'After meals'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Follow-up date note */}
                          {(rec.followUpDate || rec.followUpNotes) && (
                            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-purple-900 text-[11px] block">Doctor Follow-Up Assigned:</span>
                                <p className="text-purple-950 font-medium">
                                  Date: <strong>{rec.followUpDate || 'As advised'}</strong>
                                  {rec.followUpNotes && <span> • Notes: {rec.followUpNotes}</span>}
                                </p>
                              </div>
                              <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-800">No prior OPD consultations recorded.</p>
                  <p>This is the patient's first active consultation in the doctor OPD console.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRESCRIPTIONS */}
          {!loading && activeTab === 'prescriptions' && (
            <div className="space-y-3">
              {filteredPrescriptions.length > 0 ? (
                filteredPrescriptions.map((rx: any, idx: number) => {
                  const medList = Array.isArray(rx.items || rx.medicines) ? (rx.items || rx.medicines) : [];

                  return (
                    <div key={rx.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Prescription #{rx.prescriptionNumber || `RX-${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {rx.status || 'Verified'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Date: <strong className="text-slate-800">{rx.date || 'Past Visit'}</strong> • Doctor: <strong>{rx.doctorName || 'Doctor'}</strong> • Campus: {rx.branch || 'Main Branch'}
                        </p>
                      </div>

                      {medList.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                              <tr>
                                <th className="py-2 px-3">Medicine Name</th>
                                <th className="py-2 px-3">Dosage</th>
                                <th className="py-2 px-3">Frequency</th>
                                <th className="py-2 px-3">Duration</th>
                                <th className="py-2 px-3">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {medList.map((m: any, mi: number) => (
                                <tr key={mi} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-bold text-slate-900">{m.medicineName || m.name || 'Medicine'}</td>
                                  <td className="py-2 px-3 text-slate-700">{m.dosage || '1 tab'}</td>
                                  <td className="py-2 px-3 font-semibold text-blue-700">{m.frequency || '1-0-1'}</td>
                                  <td className="py-2 px-3 text-slate-700">{m.duration || '5 Days'}</td>
                                  <td className="py-2 px-3 text-slate-500">{m.instructions || m.timing || 'After meals'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-xs">No medication items listed in this prescription.</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                  No previous prescriptions found for this patient.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VITALS TREND */}
          {!loading && activeTab === 'vitals' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              {filteredVitals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-3.5">Date & Time</th>
                        <th className="py-3 px-3.5">Blood Pressure</th>
                        <th className="py-3 px-3.5">Temperature</th>
                        <th className="py-3 px-3.5">Pulse Rate</th>
                        <th className="py-3 px-3.5">SpO2</th>
                        <th className="py-3 px-3.5">Blood Sugar</th>
                        <th className="py-3 px-3.5">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVitals.map((v: any, vi: number) => (
                        <tr key={vi} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {v.date} {v.time ? `(${v.time})` : ''}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                            {v.bloodPressure || (v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia} mmHg` : '120/80')}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-800">{v.temperature || 98.6}°F</td>
                          <td className="py-2.5 px-3.5 text-slate-700">{v.pulse || v.pulseRate || 72} bpm</td>
                          <td className="py-2.5 px-3.5 font-bold text-emerald-600">{v.spo2 || v.spO2 || 98}%</td>
                          <td className="py-2.5 px-3.5 text-slate-700">{v.bloodSugar || 110} mg/dL</td>
                          <td className="py-2.5 px-3.5 text-slate-500">{v.recordedBy || 'Nurse Staff'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  No historical vitals records found for this patient.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LAB REPORTS */}
          {!loading && activeTab === 'lab' && (
            <div className="space-y-3">
              {filteredLabReports.length > 0 ? (
                filteredLabReports.map((lr: any, lri: number) => {
                  const results = Array.isArray(lr.testResults) ? lr.testResults : [];

                  return (
                    <div key={lr.id || lri} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900">
                            Report #{lr.reportNumber || `LR-${lri + 1}`}
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Sample Date: {lr.generatedDate || 'Past Record'} • Doctor: {lr.doctorName || 'Doctor'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          lr.doctorReviewStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {lr.doctorReviewStatus || lr.status || 'Verified'}
                        </span>
                      </div>

                      {results.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                              <tr>
                                <th className="py-2 px-3">Test Investigation</th>
                                <th className="py-2 px-3">Observed Result</th>
                                <th className="py-2 px-3">Unit</th>
                                <th className="py-2 px-3">Reference Range</th>
                                <th className="py-2 px-3">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {results.map((r: any, ri: number) => (
                                <tr key={ri} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-bold text-slate-900">{r.testName}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.resultValue}</td>
                                  <td className="py-2 px-3 text-slate-600">{r.unit || '-'}</td>
                                  <td className="py-2 px-3 text-slate-500">{r.referenceRange || '-'}</td>
                                  <td className="py-2 px-3">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      r.flag === 'Critical' || r.flag === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {r.flag || 'Normal'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-xs">Test parameters pending verification.</p>
                      )}

                      {lr.doctorComments && (
                        <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 font-medium">
                          <strong>Doctor Review Comment:</strong> {lr.doctorComments}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                  No diagnostic lab reports on file for this patient.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ADMISSIONS & NURSING NOTES */}
          {!loading && activeTab === 'admissions' && (
            <div className="space-y-4">
              {filteredAdmissions.length > 0 ? (
                filteredAdmissions.map((adm: any, ai: number) => (
                  <div key={adm.id || ai} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900">
                          IPD Admission - Ward {adm.ward || 'General'} (Bed {adm.bedNumber || 'N/A'})
                        </span>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Admitted: {adm.admissionDate} • Attending: {adm.attendingDoctor || 'Physician'} • Status: {adm.status || 'Active'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {adm.status || 'Admitted'}
                      </span>
                    </div>
                    {adm.admissionReason && (
                      <p className="text-xs text-slate-700">
                        <strong>Reason for Admission:</strong> {adm.admissionReason}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                  No inpatient admissions recorded for this patient.
                </div>
              )}

              {/* Nursing Notes Section */}
              {historyData?.nursingNotes && historyData.nursingNotes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Recorded Nursing Care Notes ({historyData.nursingNotes.length})
                  </h5>
                  <div className="space-y-2">
                    {historyData.nursingNotes.map((n: any, ni: number) => (
                      <div key={n.id || ni} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span>Nurse: <strong className="text-slate-800">{n.nurseName || 'Nurse Staff'}</strong> ({n.ward || 'Ward'})</span>
                          <span>{n.date} {n.time ? `• ${n.time}` : ''}</span>
                        </div>
                        <p className="text-slate-800 font-medium leading-snug">{n.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
