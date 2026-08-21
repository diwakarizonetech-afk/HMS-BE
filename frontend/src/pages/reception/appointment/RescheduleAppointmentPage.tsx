import React, { useState, useEffect } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { CalendarSync, Save, Search, Building2 } from 'lucide-react';

export const RescheduleAppointmentPage: React.FC = () => {
  const { appointments, rescheduleAppointment, branches } = useHMS();
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

  const [selectedAptId, setSelectedAptId] = useState('');
  const [newDate, setNewDate] = useState(getCurrentDateFormatted());
  const [newSlot, setNewSlot] = useState('11:30 AM');
  const [reason, setReason] = useState('Patient request');

  const filteredAppointments = appointments.filter((a) => {
    if (!branchFilter || branchFilter === 'All') return true;
    const aBranch = (a.branch || '').toLowerCase().trim();
    const selBranch = branchFilter.toLowerCase().trim();
    return !aBranch || aBranch === 'main branch' || aBranch.includes(selBranch) || selBranch.includes(aBranch);
  });

  useEffect(() => {
    if (filteredAppointments.length > 0) {
      if (!filteredAppointments.some((a) => a.id === selectedAptId)) {
        setSelectedAptId(filteredAppointments[0].id);
      }
    } else {
      setSelectedAptId('');
    }
  }, [branchFilter, appointments, selectedAptId]);

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
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">Reschedule Appointment</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <Building2 className="w-3 h-3" />
            {branchFilter}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Modify appointment consultation date and time slot per hospital branch.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
              <label className="block font-bold text-slate-700 mb-1">Select Existing Appointment *</label>
              <select
                value={selectedAptId}
                onChange={(e) => setSelectedAptId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
              >
                {filteredAppointments.length === 0 ? (
                  <option value="">No appointments scheduled for {branchFilter}</option>
                ) : (
                  filteredAppointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.isEmergency ? '🚨 [EMERGENCY] ' : ''}{a.patientName} ({a.patientUhid}) - {a.doctorName} on {a.date} at {a.timeSlot} ({a.branch || 'Main Branch'})
                    </option>
                  ))
                )}
              </select>
            </div>
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
                <optgroup label="Morning (9 AM - 1 PM)">
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="09:30 AM">09:30 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                </optgroup>
                <optgroup label="Afternoon (2 PM - 5 PM)">
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </optgroup>
                <optgroup label="Evening (6 PM - 9 PM)">
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="06:30 PM">06:30 PM</option>
                  <option value="07:00 PM">07:00 PM</option>
                  <option value="07:30 PM">07:30 PM</option>
                  <option value="08:00 PM">08:00 PM</option>
                  <option value="08:30 PM">08:30 PM</option>
                  <option value="09:00 PM">09:00 PM</option>
                </optgroup>
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
