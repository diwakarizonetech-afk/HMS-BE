import React from 'react';
import { Patient } from '../../types/hms';
import { useHMS } from '../../context/HMSContext';
import {
  User,
  Phone,
  Droplet,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  BedDouble,
  FileText,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface PatientInfoCardProps {
  patient: Patient | null;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({ patient }) => {
  const { doctors, beds } = useHMS();

  if (!patient) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Patient Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Please search and select a patient from the search bar above to load their read-only clinical record.
        </p>
      </div>
    );
  }

  // Derive associated doctor, bed, ward, diagnosis details from HMS data
  const defaultDoctor = doctors[0] || { name: 'Dr. Vikram Malhotra', department: 'Cardiology' };
  const occupiedBed = beds.find((b) => b.currentPatientUhid === patient.uhid);

  const doctorName = defaultDoctor.name;
  const department = defaultDoctor.department;
  const patientType = patient.status === 'Admitted' ? 'IPD' : 'OPD';
  const wardName = occupiedBed?.ward || (patient.status === 'Admitted' ? 'ICU Ward' : 'OPD Daycare');
  const roomNumber = occupiedBed ? `Room-${occupiedBed.roomNumber}` : 'Room 102';
  const bedNumber = occupiedBed?.bedNumber || 'B-101';
  const diagnosis = patient.existingDiseases || (patient.status === 'Admitted' ? 'Acute Crisis / Under Care' : 'General Evaluation');
  const appointmentDate = new Date().toISOString().split('T')[0];
  const appointmentTime = '09:30 AM';
  const admissionDate = patient.status === 'Admitted' ? '2026-07-25' : 'N/A';
  const conditionStatus: string =
    patient.status === 'Discharged' ? 'Discharged' : patient.status === 'Admitted' ? 'IPD Admitted' : 'Stable';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 relative overflow-hidden">
      {/* Read Only Notice Badge Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-blue-600/20 shrink-0">
            {patient.firstName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                {patient.uhid}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.age} YRS • {patient.gender} • DOB: {patient.dob}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Patient Type Badge (OPD / IPD) */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
              patientType === 'IPD'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {patientType} Patient
          </span>

          {/* Condition Badge */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              conditionStatus === 'Critical'
                ? 'bg-rose-100 text-rose-700'
                : conditionStatus === 'Discharged'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {conditionStatus}
          </span>

          {/* Read Only Indicator Badge */}
          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-[11px] font-bold border border-slate-200" title="Patient personal details are managed by Reception Module and cannot be edited by Nurse">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Read-Only Profile</span>
          </span>
        </div>
      </div>

      {/* Grid of Read-Only Clinical Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" />
            Phone Number
          </span>
          <p className="font-bold text-slate-900 mt-0.5 truncate">{patient.mobile}</p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Droplet className="w-3 h-3 text-rose-500" />
            Blood Group
          </span>
          <p className="font-bold text-rose-700 mt-0.5">{patient.bloodGroup}</p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-blue-500" />
            Attending Doctor
          </span>
          <p className="font-bold text-slate-900 mt-0.5 truncate">{doctorName}</p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-500" />
            Department
          </span>
          <p className="font-bold text-slate-900 mt-0.5 truncate">{department}</p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-500" />
            Appt Date & Time
          </span>
          <p className="font-bold text-slate-900 mt-0.5 truncate">
            {appointmentDate} ({appointmentTime})
          </p>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <BedDouble className="w-3 h-3 text-amber-500" />
            Ward / Room / Bed
          </span>
          <p className="font-bold text-slate-900 mt-0.5 truncate">
            {wardName} • {bedNumber}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-400" />
            Clinical Diagnosis
          </span>
          <p className="font-bold text-slate-900 mt-0.5">{diagnosis}</p>
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-500" />
            Admission Date
          </span>
          <p className="font-bold text-slate-900 mt-0.5">{admissionDate}</p>
        </div>
      </div>
    </div>
  );
};
