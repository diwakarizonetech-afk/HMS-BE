import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useER } from '../../../context/ERContext';
import { BedDouble, ShieldCheck, CheckCircle2, UserCheck, XCircle, Activity, UserPlus, Siren } from 'lucide-react';

export const ObservationBedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { erObservationBeds, erVisits, assignObservationBed, releaseObservationBed } = useER();

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [targetVisitId, setTargetVisitId] = useState<string>(
    searchParams.get('erVisitId') ||
    erVisits.find((v) => v.er_disposition === 'Observation' || v.er_status === 'Observation')?.id ||
    ''
  );

  useEffect(() => {
    if (erVisits.length > 0 && (!targetVisitId || !erVisits.some((v) => v.id === targetVisitId))) {
      const active = erVisits.find((v) => v.er_disposition === 'Observation' || v.er_status === 'Observation') || erVisits[0];
      if (active) {
        setTargetVisitId(active.id);
      }
    }
  }, [erVisits, targetVisitId]);

  const availableVisitsForObs = erVisits.filter(
    (v) => v.er_status !== 'Discharged' && v.er_status !== 'Transferred'
  );

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId || !targetVisitId) return;

    await assignObservationBed(targetVisitId, selectedBedId);
    setSelectedBedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">5. ER Observation Bed Assignment</h1>
            <p className="text-xs text-slate-500">
              Allocate dedicated short-stay observation beds for emergency patients requiring continuous monitoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {erObservationBeds.filter((b) => (b.status || b.bedStatus) === 'Available').length} Available
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {erObservationBeds.filter((b) => (b.status || b.bedStatus) === 'Occupied').length} Occupied
          </span>
        </div>
      </div>

      {/* Observation Beds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {erObservationBeds.map((bed) => {
          const isOccupied = (bed.status || bed.bedStatus) === 'Occupied';
          const occupiedVisit = isOccupied
            ? erVisits.find((v) => v.id === bed.er_encounter_id || v.patient_uhid === bed.current_patient_uhid || v.patient_uhid === bed.currentPatientUhid)
            : null;

          return (
            <div
              key={bed.id}
              className={`p-6 rounded-2xl border transition-all space-y-4 ${
                isOccupied
                  ? 'bg-purple-50/40 border-purple-200 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {bed.ward}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Bed {bed.bed_number || bed.bedNumber} <span className="text-xs font-semibold text-slate-500">({bed.room_number || bed.roomNumber})</span>
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isOccupied ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {bed.status}
                </span>
              </div>

              {/* Occupied State Details */}
              {isOccupied && occupiedVisit ? (
                <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{occupiedVisit.patient_name || occupiedVisit.patientName}</p>
                    <span className="font-bold text-blue-600 text-[11px]">{occupiedVisit.patient_uhid || occupiedVisit.patientUhid}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Encounter: <span className="font-semibold text-rose-700">{occupiedVisit.encounter_number || occupiedVisit.id}</span> • {occupiedVisit.emergency_type || occupiedVisit.emergencyType}
                  </p>
                  <p className="text-[10px] text-slate-400">Assigned @ {bed.admitted_date || bed.assignmentTime || 'Today'}</p>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => releaseObservationBed(bed.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Release Bed
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedBedId(bed.id)}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Assign Patient to Bed {bed.bed_number || bed.bedNumber}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {selectedBedId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-purple-600" />
                <span>Assign Observation Bed</span>
              </h2>
              <button
                onClick={() => setSelectedBedId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Observation Bed</label>
                <input
                  type="text"
                  disabled
                  value={
                    erObservationBeds.find((b) => b.id === selectedBedId)
                      ? `${erObservationBeds.find((b) => b.id === selectedBedId)?.bed_number} — ${erObservationBeds.find((b) => b.id === selectedBedId)?.ward}`
                      : ''
                  }
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select ER Visit Patient *</label>
                <select
                  required
                  value={targetVisitId}
                  onChange={(e) => setTargetVisitId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 outline-none"
                >
                  <option value="">-- Choose ER Patient --</option>
                  {availableVisitsForObs.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.encounter_number || v.id} — {v.patient_name || v.patientName} ({v.patient_uhid || v.patientUhid}, {v.emergency_type || v.emergencyType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBedId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetVisitId}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  Confirm Bed Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
