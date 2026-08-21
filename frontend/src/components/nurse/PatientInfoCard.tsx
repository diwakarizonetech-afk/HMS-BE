import React from 'react';
import { Patient } from '../../types/hms';
import { useHMS } from '../../context/HMSContext';
import { useER } from '../../context/ERContext';
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
  const { doctors, beds, ipdAdmissions, appointments } = useHMS();
  const { erVisits } = useER();

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
  const occupiedBed = beds.find((b) => b.currentPatientUhid === patient.uhid);
  const activeAdm = (ipdAdmissions || []).find((a) => a.patientUhid === patient.uhid && a.status !== 'Discharged');
  const activeErVisit = (erVisits || []).find(
    (v) => (v.patient_uhid === patient.uhid || v.patientUhid === patient.uhid) && v.er_status !== 'Discharged' && v.er_status !== 'Transferred'
  );
  const emergencyAppointment = (appointments || []).find(
    (a) =>
      (a.patientUhid === patient.uhid || a.patient_uhid === patient.uhid) &&
      (a.isEmergency ||
        (a.type || '').toLowerCase().includes('emergency') ||
        (a.appointmentType || '').toLowerCase().includes('emergency') ||
        (a.department || '').toLowerCase().includes('emergency') ||
        (a.status || '').toLowerCase().includes('emergency'))
  );

  const defaultDoctor = doctors[0] || { name: 'Dr. Vikram Malhotra', department: 'Cardiology' };

  const isEmergencyPatient = Boolean(
    activeErVisit ||
    emergencyAppointment ||
    patient.isEmergency ||
    (patient.status || '').toLowerCase().includes('emergency') ||
    (patient.category || '').toLowerCase().includes('emergency') ||
    (patient.patientType || '').toLowerCase().includes('emergency') ||
    (patient.department || '').toLowerCase().includes('emergency') ||
    (patient.notes || '').toLowerCase().includes('emergency')
  );

  const doctorName =
    activeErVisit?.assigned_doctor ||
    activeErVisit?.assignedDoctor ||
    emergencyAppointment?.doctorName ||
    activeAdm?.attendingDoctor ||
    defaultDoctor.name;

  const department =
    activeErVisit?.department ||
    emergencyAppointment?.department ||
    defaultDoctor.department;

  const patientType = isEmergencyPatient ? 'EMERGENCY' : (patient.status === 'Admitted' || !!activeAdm ? 'IPD' : 'OPD');
  const wardName =
    activeErVisit?.current_location ||
    activeAdm?.ward ||
    occupiedBed?.ward ||
    (patient.status === 'Admitted' ? 'ICU Ward' : isEmergencyPatient ? 'ER Triage / Resuscitation' : 'OPD Daycare');
  const roomNumber = activeAdm?.roomNumber ? `Room-${activeAdm.roomNumber}` : occupiedBed ? `Room-${occupiedBed.roomNumber}` : isEmergencyPatient ? 'ER Bay 1' : 'Room 102';
  const bedNumber = activeAdm?.bedNumber || occupiedBed?.bedNumber || (isEmergencyPatient ? (activeErVisit?.bed_number || 'ER-Bed 1') : 'B-101');
  const diagnosis = activeErVisit?.chief_complaint || activeAdm?.admissionReason || activeAdm?.diagnosis || patient.existingDiseases || (patient.status === 'Admitted' ? 'Acute Crisis / Under Care' : isEmergencyPatient ? 'Emergency Triage Evaluation' : 'General Evaluation');
  const appointmentDate = emergencyAppointment?.date || new Date().toISOString().split('T')[0];
  const appointmentTime = emergencyAppointment?.timeSlot || '09:30 AM';
  const admissionDate = activeErVisit?.encounter_date || activeAdm?.admissionDate || (patient.status === 'Admitted' || isEmergencyPatient ? 'Today' : 'N/A');
  const conditionStatus: string =
    patient.status === 'Discharged' ? 'Discharged' : isEmergencyPatient ? (activeErVisit?.triage_status || 'Emergency Priority Case') : (patient.status === 'Admitted' || !!activeAdm) ? 'IPD Admitted' : 'Stable';

  return (
    <div className={`bg-white rounded-2xl border shadow-xs p-6 space-y-4 relative overflow-hidden transition-all ${
      isEmergencyPatient ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-500/20' : 'border-slate-200'
    }`}>
      {/* Read Only Notice Badge Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl text-white font-black flex items-center justify-center text-lg shadow-md shrink-0 ${
            isEmergencyPatient
              ? 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-600/30 animate-pulse'
              : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-600/20'
          }`}>
            {patient.firstName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                {patient.uhid}
              </span>
              {patient.branch && (
                <span className="font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {patient.branch}
                </span>
              )}
              {isEmergencyPatient && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-sm animate-pulse tracking-wide uppercase">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  EMERGENCY PATIENT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient.age} YRS • {patient.gender} • DOB: {patient.dob}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Emergency Alert Tag */}
          {isEmergencyPatient && (
            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-xs">
              STAT Emergency
            </span>
          )}

          {/* Patient Type Badge (OPD / IPD / EMERGENCY) */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
              isEmergencyPatient || patientType === 'EMERGENCY'
                ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-1 ring-rose-500/30'
                : patientType === 'IPD'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isEmergencyPatient ? 'EMERGENCY' : patientType} Patient
          </span>

          {/* Condition Badge */}
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              isEmergencyPatient
                ? 'bg-rose-100 text-rose-700 font-black'
                : conditionStatus === 'Critical'
                ? 'bg-rose-100 text-rose-700'
                : conditionStatus === 'Discharged'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isEmergencyPatient ? (activeErVisit?.triage_status || 'Emergency Case') : conditionStatus}
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
