import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useER } from '../../../context/ERContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Siren,
  ArrowLeft,
  UserCheck,
  HeartPulse,
  Stethoscope,
  ClipboardList,
  BedDouble,
  Truck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  UserPlus2,
  Activity,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { fetchERTimelineApi } from '../../../services/api';

export const ERPatientDetailPage: React.FC = () => {
  const { erVisitId } = useParams<{ erVisitId: string }>();
  const navigate = useNavigate();
  const { getERVisitById } = useER();
  const { user } = useAuth();

  const visit = erVisitId ? getERVisitById(erVisitId) : undefined;
  const isReception = user?.role === 'reception' || !user?.role;

  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (!erVisitId) return;
    setTimelineLoading(true);
    fetchERTimelineApi(erVisitId)
      .then(setTimeline)
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [erVisitId]);

  if (!visit) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">ER Visit Record Not Found</h2>
        <p className="text-xs text-slate-500">The requested ER Visit ID "{erVisitId}" could not be located.</p>
        <button
          onClick={() => navigate('/reception/er/queue')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
        >
          Return to ER Queue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-rose-700 text-sm bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">
                {visit.encounter_number || visit.id}
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {visit.patient_uhid}
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                {visit.emergency_type}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">{visit.patient_name}</h1>
            <p className="text-xs text-slate-500">
              Branch: <span className="font-bold">{visit.branch || '—'}</span> • Registered by: {visit.registered_by || '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {visit.er_disposition === 'Observation' && (
            <button
              onClick={() => navigate(`/reception/er/observation-beds?erVisitId=${visit.id}`)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <BedDouble className="w-4 h-4" />
              <span>Assign Observation Bed</span>
            </button>
          )}

          {visit.er_disposition === 'IPD' && (
            <button
              onClick={() => navigate(`/reception/er/ipd-coordination?erVisitId=${visit.id}`)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus2 className="w-4 h-4" />
              <span>Coordinate IPD Admission</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient & Arrival Info */}
        <div className="space-y-6">
          {/* Patient Master Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Patient Summary</span>
              </h2>
              {isReception && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Read-Only
                </span>
              )}
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Emergency Contact:</span>
                <span className="font-semibold text-slate-800">{visit.emergency_contact || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Accompanied By:</span>
                <span className="font-semibold text-slate-800">{visit.accompanied_by || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Assigned Doctor:</span>
                <span className="font-bold text-slate-900">{visit.assigned_doctor || '—'}</span>
              </div>
            </div>
          </div>

          {/* Arrival & Encounter Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Siren className="w-4 h-4 text-rose-600" />
              <span>Arrival & Encounter Details</span>
            </h2>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Arrival Date & Time:</span>
                <span className="font-semibold text-slate-800">{visit.arrival_date} @ {visit.arrival_time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Arrival Mode:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  {visit.arrival_mode === 'Ambulance' ? <Truck className="w-3.5 h-3.5 text-rose-500" /> : <UserCheck className="w-3.5 h-3.5 text-blue-500" />}
                  {visit.arrival_mode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Chief Complaint:</span>
                <p className="bg-slate-50 p-2.5 rounded-xl text-slate-800 font-medium italic border border-slate-200">
                  "{visit.chief_complaint}"
                </p>
              </div>
              {visit.triage_notes && (
                <div>
                  <span className="text-slate-400 block mb-1">Triage Notes:</span>
                  <p className="bg-rose-50/50 p-2.5 rounded-xl text-slate-700 font-medium border border-rose-100 text-[10px]">
                    {visit.triage_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Current Status & Location</span>
            </h2>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Current ER Location:</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {visit.current_location || 'ER General Bay'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Triage Status:</span>
                <span className="font-bold text-rose-700">{visit.triage_status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Workflow Status:</span>
                <span className="font-bold text-slate-800">{visit.er_status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">ER Disposition:</span>
                <span className="font-extrabold text-amber-700">{visit.er_disposition || 'Pending'}</span>
              </div>
              {visit.required_ward && (
                <div className="flex justify-between py-1 border-t border-slate-50">
                  <span className="text-slate-400">Required Ward:</span>
                  <span className="font-bold text-indigo-700">{visit.required_ward}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Timeline & Clinical Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Triage Info Card */}
          {visit.triage_status !== 'Pending Triage' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Triage Assessment (Nurse Record)</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {visit.triage_status}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {visit.triage_notes || 'Nurse triage completed. Refer to timeline for recorded vitals.'}
              </p>
            </div>
          )}

          {/* Doctor Assessment & Disposition */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span>Doctor Assessment & Emergency Diagnosis</span>
            </h2>

            {visit.er_status !== 'Registered' && visit.er_status !== 'Waiting for Triage' && visit.er_status !== 'Waiting for Doctor' ? (
              <div className="space-y-3">
                {visit.disposition_notes && (
                  <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-1">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Doctor Disposition Notes</p>
                    <p className="text-sm font-semibold text-slate-900">{visit.disposition_notes}</p>
                  </div>
                )}
                {visit.required_ward && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-600">Recommended ward: <span className="font-bold text-amber-700">{visit.required_ward}</span></span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">Doctor assessment pending consultation.</p>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>ER Visit Audit Timeline</span>
              </h2>
              <button
                onClick={() => {
                  if (!erVisitId) return;
                  setTimelineLoading(true);
                  fetchERTimelineApi(erVisitId).then(setTimeline).finally(() => setTimelineLoading(false));
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Refresh timeline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${timelineLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {timelineLoading ? (
              <p className="text-slate-400 italic text-[11px]">Loading timeline...</p>
            ) : timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((item, idx) => (
                  <div key={item.id || idx} className="relative space-y-0.5 text-[11px]">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-white" />
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{item.title}</span>
                      <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      By <span className="font-semibold text-slate-700">{item.actor}</span>
                      {item.role ? ` (${item.role})` : ''}
                    </p>
                    {item.description && <p className="text-slate-600">{item.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show registration as the first timeline item */}
                <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="relative space-y-0.5 text-[11px]">
                    <span className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-white" />
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>ER Visit Registered</span>
                      <span className="text-[10px] text-slate-400">{visit.arrival_time} · {visit.arrival_date}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      By <span className="font-semibold text-slate-700">{visit.registered_by || 'Reception'}</span>
                    </p>
                    <p className="text-slate-600">{visit.chief_complaint}</p>
                  </div>
                </div>
                <p className="text-slate-400 italic text-[10px] pl-1">Additional events will appear as care progresses.</p>
              </div>
            )}
          </div>

          {/* Nursing Notes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>Emergency Nursing Observations</span>
            </h2>
            <p className="text-slate-400 italic text-[11px]">
              Nursing notes and vitals are recorded by the ER nurse and saved to the patient record. View them in the timeline above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
