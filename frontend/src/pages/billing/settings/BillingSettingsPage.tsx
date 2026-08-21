import React, { useState } from 'react';
import { Settings, Save, Building2, Shield, Percent, DollarSign } from 'lucide-react';

export const BillingSettingsPage: React.FC = () => {
  const [hospitalName, setHospitalName] = useState('AegisCare Multispecialty Hospital');
  const [gstin, setGstin] = useState('29AAAAA0000A1Z5');
  const [discountApprovalThreshold, setDiscountApprovalThreshold] = useState<number>(2000);
  const [refundApprovalThreshold, setRefundApprovalThreshold] = useState<number>(5000);
  const [taxRate, setTaxRate] = useState<number>(18);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Billing settings updated successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Billing & Financial Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure hospital tax parameters, authorization thresholds, and printable receipt headers.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs max-w-3xl space-y-6 text-xs font-medium">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Receipt Header & Tax Configuration
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Official Hospital Header Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">GSTIN Tax Registration Number</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Discount Manager Approval Threshold (₹)</label>
              <input
                type="number"
                value={discountApprovalThreshold}
                onChange={(e) => setDiscountApprovalThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-purple-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Discounts above this amount require manager approval</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Refund Manager Approval Threshold (₹)</label>
              <input
                type="number"
                value={refundApprovalThreshold}
                onChange={(e) => setRefundApprovalThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-rose-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Refunds above this amount require manager approval</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
