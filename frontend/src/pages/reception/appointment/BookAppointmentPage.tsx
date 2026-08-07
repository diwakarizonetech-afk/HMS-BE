import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { CalendarPlus, Save, RotateCcw, CheckCircle2, User, Clock } from 'lucide-react';

export const BookAppointmentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients, departments, doctors, bookAppointment } = useHMS();

  const [selectedUhid, setSelectedUhid] = useState(searchParams.get('uhid') || (patients[0]?.uhid || ''));
  const [selectedDept, setSelectedDept] = useState('Cardiology');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [aptDate, setAptDate] = useState(getCurrentDateFormatted());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('Routine Health Checkup');

  // Filter doctors by chosen department
  const filteredDoctors = doctors.filter((d) => d.department === selectedDept);

  useEffect(() => {
    if (filteredDoctors.length > 0) {
      setSelectedDoctorId(filteredDoctors[0].id);
      if (filteredDoctors[0].slots.length > 0) {
        setSelectedSlot(filteredDoctors[0].slots[0]);
      }
    } else {
      setSelectedDoctorId('');
      setSelectedSlot('');
    }
  }, [selectedDept]);

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patientObj = patients.find((p) => p.uhid === selectedUhid);
    if (!patientObj || !selectedDoctorObj) return;

    bookAppointment({
      patientUhid: patientObj.uhid,
      patientName: `${patientObj.firstName} ${patientObj.lastName}`,
      patientMobile: patientObj.mobile,
      department: selectedDept,
      doctorId: selectedDoctorObj.id,
      doctorName: selectedDoctorObj.name,
      date: aptDate,
      timeSlot: selectedSlot || '10:00 AM',
      reason,
    });

    navigate('/reception/appointment/queue');
  };

  const handleReset = () => {
    setSelectedDept('Cardiology');
    setAptDate(getCurrentDateFormatted());
    setReason('Routine Health Checkup');
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Book OPD Appointment</h1>
        <p className="text-xs text-slate-500">
          Schedule consultation for registered patients with hospital specialists.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Patient Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Patient (UHID) *</label>
            <select
              value={selectedUhid}
              onChange={(e) => setSelectedUhid(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.uhid}>
                  {p.uhid} - {p.firstName} {p.lastName} ({p.mobile})
                </option>
              ))}
            </select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Department *</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Attending Doctor */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attending Doctor *</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {filteredDoctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} - {doc.specialization} (Fee: ₹{doc.consultationFee})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Appointment Date *</label>
            <input
              type="date"
              required
              value={aptDate}
              onChange={(e) => setAptDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Time Slot Selector */}
        {selectedDoctorObj && (
          <div>
            <label className="block font-bold text-slate-700 mb-2">Available Time Slots *</label>
            <div className="flex flex-wrap gap-2">
              {selectedDoctorObj.slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reason for Visit */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Reason for Appointment *</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Chest discomfort, Follow-up consultation"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Confirm Appointment</span>
          </button>
        </div>
      </form>
    </div>
  );
};
