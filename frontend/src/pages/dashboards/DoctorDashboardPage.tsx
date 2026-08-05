import React from 'react';
import { Stethoscope, UserCheck, Calendar, Activity, ClipboardList } from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          <Stethoscope className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Doctor Console (OPD & EMR)</h1>
          <p className="text-xs text-slate-500">
            Phase 1 Module Architecture Ready • Logged in as Dr. Vikram Malhotra
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            OPD Queue
          </span>
          <h3 className="text-2xl font-black text-slate-900">8 Patients Waiting</h3>
          <p className="text-xs text-slate-500">Today's active consultations in OPD Room 102</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
            IPD Rounds
          </span>
          <h3 className="text-2xl font-black text-slate-900">4 Admitted Patients</h3>
          <p className="text-xs text-slate-500">Assigned ICU & Surgical Ward patients</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase">
            E-Prescriptions
          </span>
          <h3 className="text-2xl font-black text-slate-900">12 Issued Today</h3>
          <p className="text-xs text-slate-500">Integrated pharmacy and lab order generation</p>
        </div>
      </div>
    </div>
  );
};
