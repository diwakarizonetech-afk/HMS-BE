import React from 'react';
import { ShieldCheck, Users, Building, DollarSign, Activity } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hospital Administration & System Oversight</h1>
          <p className="text-xs text-slate-500">
            Phase 1 Module Architecture Ready • Role Permissions, Department Configurations & Audit Logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
            Active Staff
          </span>
          <h3 className="text-2xl font-black text-slate-900">128 Staff Members</h3>
          <p className="text-xs text-slate-500">Doctors, Nurses, Receptionists & Admins</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
            Total Revenue
          </span>
          <h3 className="text-2xl font-black text-slate-900">₹2.84 Lakhs</h3>
          <p className="text-xs text-slate-500">Today's total OPD + IPD + Lab billing</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            Bed Capacity
          </span>
          <h3 className="text-2xl font-black text-slate-900">76% Total Utilization</h3>
          <p className="text-xs text-slate-500">114 / 150 beds currently occupied</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase">
            System Status
          </span>
          <h3 className="text-2xl font-black text-emerald-600">All Modules Healthy</h3>
          <p className="text-xs text-slate-500">HIPAA compliant encrypted cloud sync active</p>
        </div>
      </div>
    </div>
  );
};
