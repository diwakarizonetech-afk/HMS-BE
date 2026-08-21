import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { Receipt, Search, Printer, Eye, Download, Calendar } from 'lucide-react';

export const ReceiptsPage: React.FC = () => {
  const { collections, setSelectedReceiptForModal } = useBilling();
  const [search, setSearch] = useState('');

  const filteredReceipts = collections.filter(
    (r) =>
      !search.trim() ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      r.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.uhid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hospital Payment Receipts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Master record of all official money receipts issued upon payment collection.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Receipt No, Bill No, Patient Name, UHID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Receipts Issued: <span className="text-slate-900 font-extrabold">{filteredReceipts.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Receipt Number</th>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3">Service Category</th>
                <th className="px-4 py-3 text-right">Amount Collected</th>
                <th className="px-4 py-3 text-center">Mode</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredReceipts.map((rc) => (
                <tr key={rc.receipt_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-emerald-700">{rc.receipt_number}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{rc.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{rc.patient_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{rc.uhid}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{rc.service_type}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-800 text-sm">
                    ₹{rc.current_payment.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">
                      {rc.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{rc.payment_date}</td>
                  <td className="px-4 py-3 text-slate-600">{rc.collected_by}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedReceiptForModal(rc)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer mx-auto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      View & Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
