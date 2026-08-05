import React from 'react';
import { TestTube, FileText, CheckCircle, Clock } from 'lucide-react';

export const LabDashboardPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold">
          <TestTube className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Laboratory Information System (LIS)</h1>
          <p className="text-xs text-slate-500">
            Phase 1 Module Architecture Ready • Sample Collection & Test Reporting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full uppercase">
            Pending Samples
          </span>
          <h3 className="text-2xl font-black text-slate-900">18 Blood & Urine Samples</h3>
          <p className="text-xs text-slate-500">CBC, Lipid Panel & Blood Glucose queued</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
            Reports Released
          </span>
          <h3 className="text-2xl font-black text-slate-900">32 Released Today</h3>
          <p className="text-xs text-slate-500">Directly synchronized with Doctor EMR console</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
            STAT Emergency Tests
          </span>
          <h3 className="text-2xl font-black text-slate-900">2 STAT Orders</h3>
          <p className="text-xs text-slate-500">Emergency Cardiac Enzymes (Troponin-I)</p>
        </div>
      </div>
    </div>
  );
};
