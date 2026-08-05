import React from 'react';
import { Pill, ShoppingCart, AlertCircle, Package } from 'lucide-react';

export const PharmacyDashboardPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
          <Pill className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pharmacy & Drug Inventory Management</h1>
          <p className="text-xs text-slate-500">
            Phase 1 Module Architecture Ready • E-Prescription Dispensing & Stock Management
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
            Prescriptions Queued
          </span>
          <h3 className="text-2xl font-black text-slate-900">11 Dispensing Requests</h3>
          <p className="text-xs text-slate-500">Digital OPD doctor prescriptions pending billing</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">
            Low Stock Alerts
          </span>
          <h3 className="text-2xl font-black text-slate-900">4 Low Stock Items</h3>
          <p className="text-xs text-slate-500">Paracetamol 650mg, Amoxicillin 500mg, IV Saline</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            Today's Revenue
          </span>
          <h3 className="text-2xl font-black text-slate-900">₹42,500 Collected</h3>
          <p className="text-xs text-slate-500">Retail & IPD medication billing total</p>
        </div>
      </div>
    </div>
  );
};
