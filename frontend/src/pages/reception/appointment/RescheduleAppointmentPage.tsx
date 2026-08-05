import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { CalendarSync, Save, Search } from 'lucide-react';

export const RescheduleAppointmentPage: React.FC = () => {
  const { appointments, rescheduleAppointment } = useHMS();

  const [selectedAptId, setSelectedAptId] = useState(appointments[0]?.id || '');
  const [newDate, setNewDate] = useState(getCurrentDateFormatted());
  const [newSlot, setNewSlot] = useState('11:30 AM');
  const [reason, setReason] = useState('Patient request');

  const selectedApt = appointments.find((a) => a.id === selectedAptId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAptId) {
      rescheduleAppointment(selectedAptId, newDate, newSlot, reason);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Reschedule Appointment</h1>
        <p className="text-xs text-slate-500">
          Modify appointment consultation date and time slot for booked patients.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Existing Appointment *</label>
            <select
              value={selectedAptId}
              onChange={(e) => setSelectedAptId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            >
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patientName} ({a.patientUhid}) - {a.doctorName} on {a.date} at {a.timeSlot}
                </option>
              ))}
            </select>
          </div>

          {selectedApt && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Patient</span>
                <span className="font-bold text-slate-900">{selectedApt.patientName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Doctor</span>
                <span className="font-bold text-slate-900">{selectedApt.doctorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Current Date</span>
                <span className="font-bold text-slate-900">{selectedApt.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">Current Slot</span>
                <span className="font-bold text-blue-700">{selectedApt.timeSlot}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Date *</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">New Time Slot *</label>
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
                <option value="05:00 PM">05:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reschedule Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Doctor in surgery / Patient requested date change"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer"
            >
              <CalendarSync className="w-4 h-4" />
              <span>Save Rescheduled Slot</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
