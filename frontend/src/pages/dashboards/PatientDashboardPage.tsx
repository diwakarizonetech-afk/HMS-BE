import React from 'react';
import { User, Calendar, FileText, Activity, Shield } from 'lucide-react';
import { useHMS } from '../../context/HMSContext';

export const PatientDashboardPage: React.FC = () => {
  const { patients, appointments } = useHMS();
  const samplePatient = patients[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-lg">
            {samplePatient?.firstName[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Patient Health Portal: {samplePatient?.firstName} {samplePatient?.lastName}
            </h1>
            <p className="text-xs text-slate-500">
              UHID: <span className="font-bold text-blue-600">{samplePatient?.uhid}</span> • {samplePatient?.mobile}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
          Verified Active Account
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            Upcoming OPD Appointments
          </span>
          <h3 className="text-lg font-bold text-slate-900">Dr. Vikram Malhotra</h3>
          <p className="text-xs text-slate-500">Cardiology OPD • Today at 10:00 AM</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
            Medical Reports & Prescriptions
          </span>
          <h3 className="text-lg font-bold text-slate-900">2 Available Reports</h3>
          <p className="text-xs text-slate-500">ECG Normal • Lipid Profile Completed</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase">
            Emergency Contacts
          </span>
          <h3 className="text-lg font-bold text-slate-900">{samplePatient?.emergencyContactName}</h3>
          <p className="text-xs text-slate-500">{samplePatient?.emergencyPhone}</p>
        </div>
      </div>
    </div>
  );
};
