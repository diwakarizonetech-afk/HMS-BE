import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { WardType } from '../../../types/hms';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { BedDouble, Save, UserPlus2, ShieldCheck, HeartPulse } from 'lucide-react';

export const AdmitPatientPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients, beds, doctors, admitPatient } = useHMS();

  const [selectedUhid, setSelectedUhid] = useState(searchParams.get('uhid') || (patients[0]?.uhid || ''));
  const [selectedWard, setSelectedWard] = useState<WardType>('ICU');
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(getCurrentDateFormatted());
  const [attendingDoctor, setAttendingDoctor] = useState(doctors[0]?.name || 'Dr. Vikram Malhotra');
  const [admissionReason, setAdmissionReason] = useState('Acute hypertensive observation');

  const selectedPatientObj = patients.find((p) => p.uhid === selectedUhid);

  // Filter available beds for chosen ward
  const availableBedsInWard = beds.filter(
    (b) => b.ward === selectedWard && b.status === 'Available'
  );

  useEffect(() => {
    if (availableBedsInWard.length > 0) {
      setSelectedBedNumber(availableBedsInWard[0].bedNumber);
    } else {
      setSelectedBedNumber('');
    }
  }, [selectedWard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientObj) return;

    const chosenBed = beds.find((b) => b.bedNumber === selectedBedNumber);

    admitPatient({
      patientUhid: selectedPatientObj.uhid,
      patientName: `${selectedPatientObj.firstName} ${selectedPatientObj.lastName}`,
      ward: selectedWard,
      roomNumber: chosenBed?.roomNumber || 'ICU-01',
      bedNumber: selectedBedNumber || 'B-103',
      admissionDate,
      attendingDoctor,
      admissionReason,
      emergencyContact: `${selectedPatientObj.emergencyContactName} (${selectedPatientObj.emergencyPhone})`,
      insuranceProvider: selectedPatientObj.insuranceProvider,
      insuranceNumber: selectedPatientObj.insuranceNumber,
    });

    navigate('/reception/ipd/beds');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">In-Patient (IPD) Admission</h1>
        <p className="text-xs text-slate-500">
          Admit registered patients to hospital wards, ICUs, or private rooms with bed allocation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Patient Search / Select */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
            <select
              value={selectedUhid}
              onChange={(e) => setSelectedUhid(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.uhid}>
                  {p.uhid} - {p.firstName} {p.lastName} ({p.gender}, {p.age}y)
                </option>
              ))}
            </select>
          </div>

          {/* Ward Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Ward Category *</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value as WardType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ICU">ICU (Intensive Care Unit)</option>
              <option value="General Ward">General Ward</option>
              <option value="Deluxe Private">Deluxe Private</option>
              <option value="Semi-Private">Semi-Private</option>
              <option value="Surgical Ward">Surgical Ward</option>
            </select>
          </div>

          {/* Bed Allocation Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Available Bed Number *</label>
            {availableBedsInWard.length > 0 ? (
              <select
                value={selectedBedNumber}
                onChange={(e) => setSelectedBedNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-emerald-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                {availableBedsInWard.map((b) => (
                  <option key={b.id} value={b.bedNumber}>
                    Bed {b.bedNumber} ({b.roomNumber} - {b.category})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                No beds available in {selectedWard}!
              </div>
            )}
          </div>

          {/* Admission Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Admission Date & Time *</label>
            <input
              type="date"
              required
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            />
          </div>

          {/* Attending Doctor */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attending Doctor *</label>
            <select
              value={attendingDoctor}
              onChange={(e) => setAttendingDoctor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.name}>
                  {doc.name} - {doc.department}
                </option>
              ))}
            </select>
          </div>

          {/* Emergency Contact Summary */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Emergency Contact Person</label>
            <input
              type="text"
              readOnly
              value={
                selectedPatientObj
                  ? `${selectedPatientObj.emergencyContactName} (${selectedPatientObj.emergencyPhone})`
                  : 'N/A'
              }
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Admission Reason */}
        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-1">Admission Diagnosis / Reason *</label>
          <textarea
            required
            rows={3}
            value={admissionReason}
            onChange={(e) => setAdmissionReason(e.target.value)}
            placeholder="e.g. Acute chest pain observation, post-operative monitoring"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={!selectedBedNumber}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Confirm Admission & Allocate Bed</span>
          </button>
        </div>
      </form>
    </div>
  );
};
