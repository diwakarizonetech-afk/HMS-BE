import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { XCircle, AlertTriangle } from 'lucide-react';

export const CancelAppointmentPage: React.FC = () => {
  const { appointments, cancelAppointment } = useHMS();

  const [selectedAptId, setSelectedAptId] = useState(appointments[0]?.id || '');
  const [reason, setReason] = useState('Patient unavailable');

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
        <h1 className="text-xl font-bold text-slate-900">Cancel Appointment</h1>
        <p className="text-xs text-slate-500">
          Cancel existing OPD consultations and log reason in patient history.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Active Appointment *</label>
            <select
              value={selectedAptId}
              onChange={(e) => setSelectedAptId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            >
              {appointments
                .filter((a) => a.status !== 'Cancelled')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.patientName} ({a.patientUhid}) - {a.doctorName} [{a.date} - {a.timeSlot}]
                  </option>
                ))}
            </select>
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
