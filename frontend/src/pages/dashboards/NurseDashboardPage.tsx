import React from 'react';
import { HeartPulse, BedDouble, Activity, ShieldCheck } from 'lucide-react';

export const NurseDashboardPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
          <HeartPulse className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nursing Station & Vitals Console</h1>
          <p className="text-xs text-slate-500">
            Phase 1 Module Architecture Ready • Ward Monitoring & Medication Schedules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase">
            Active Vitals
          </span>
          <h3 className="text-2xl font-black text-slate-900">14 Patients Tracked</h3>
          <p className="text-xs text-slate-500">Hourly BP, Pulse, SpO2 & Temp logging</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            Ward Beds
          </span>
          <h3 className="text-2xl font-black text-slate-900">80% Ward Occupancy</h3>
          <p className="text-xs text-slate-500">ICU Bed B-101 and General Ward G-201 active</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
            Medication Doses
          </span>
          <h3 className="text-2xl font-black text-slate-900">6 Doses Due</h3>
          <p className="text-xs text-slate-500">Scheduled IV Antibiotics & Insulin administrations</p>
        </div>
      </div>
    </div>
  );
};
