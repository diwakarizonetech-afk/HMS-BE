import React, { useState, useEffect } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { XCircle, AlertTriangle, Building2 } from 'lucide-react';

export const CancelAppointmentPage: React.FC = () => {
  const { appointments, cancelAppointment, branches } = useHMS();
  const { user } = useAuth();

  const userBranch = user?.branch || 'Main Branch';
  const [branchFilter, setBranchFilter] = useState<string>(userBranch);

  const branchOptions = React.useMemo(() => {
    const list: string[] = [];
    if (branches && branches.length > 0) {
      branches.forEach((b) => {
        if (b.branchName && !list.includes(b.branchName)) {
          list.push(b.branchName);
        }
      });
    }
    if (userBranch && !list.includes(userBranch)) {
      list.push(userBranch);
    }
    ['Main Branch', 'City Center Branch', 'North Wing Branch', 'East Wing Branch'].forEach((b) => {
      if (!list.includes(b)) list.push(b);
    });
    return list;
  }, [branches, userBranch]);

  const activeAppointments = appointments.filter((a) => {
    const notCancelled = a.status !== 'Cancelled';
    if (!branchFilter || branchFilter === 'All') return notCancelled;
    const aBranch = (a.branch || '').toLowerCase().trim();
    const selBranch = branchFilter.toLowerCase().trim();
    const matchesBranch = !aBranch || aBranch === 'main branch' || aBranch.includes(selBranch) || selBranch.includes(aBranch);
    return notCancelled && matchesBranch;
  });

  const [selectedAptId, setSelectedAptId] = useState('');
  const [reason, setReason] = useState('Patient unavailable');

  useEffect(() => {
    if (activeAppointments.length > 0) {
      if (!activeAppointments.some((a) => a.id === selectedAptId)) {
        setSelectedAptId(activeAppointments[0].id);
      }
    } else {
      setSelectedAptId('');
    }
  }, [branchFilter, activeAppointments, selectedAptId]);

  const selectedApt = appointments.find((a) => a.id === selectedAptId);

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAptId) {
      cancelAppointment(selectedAptId, reason);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">Cancel Appointment</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <Building2 className="w-3 h-3" />
            {branchFilter}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Cancel existing OPD consultations per hospital branch and log reason in patient history.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Hospital Branch *</span>
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3.5 py-2.5 font-bold text-blue-900 outline-none focus:bg-white"
              >
                <option value="All">All Hospital Branches</option>
                {branchOptions.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Active Appointment *</label>
              <select
                value={selectedAptId}
                onChange={(e) => setSelectedAptId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
              >
                {activeAppointments.length === 0 ? (
                  <option value="">No active appointments scheduled for {branchFilter}</option>
                ) : (
                  activeAppointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.isEmergency ? '🚨 [EMERGENCY] ' : ''}{a.patientName} ({a.patientUhid}) - {a.doctorName} [{a.date} - {a.timeSlot}] ({a.branch || 'Main Branch'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedApt && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-rose-900">
                  Cancelling Appointment for {selectedApt.patientName}
                </p>
                <p className="text-[11px] text-rose-700">
                  Doctor: {selectedApt.doctorName} • Date: {selectedApt.date} at {selectedApt.timeSlot}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Cancellation Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            >
              <option value="Patient unavailable">Patient unavailable</option>
              <option value="Doctor emergency leave">Doctor emergency leave / unavailable</option>
              <option value="Duplicate booking">Duplicate booking</option>
              <option value="Patient admitted to IPD">Patient admitted to IPD Ward</option>
            </select>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirm Cancel Appointment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
