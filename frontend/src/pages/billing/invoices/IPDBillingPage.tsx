import React from 'react';
import { useBilling } from '../../../context/BillingContext';
import { BedDouble, Eye, PlusCircle, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IPDBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { bills, setSelectedBillForModal } = useBilling();

  const ipdBills = bills.filter((b) => b.bill_type === 'IPD');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">IPD Inpatient Financial Billing</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Advance collections, room & nursing charges, interim bills, and final discharge bill settlements.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/billing/create')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          New IPD Bill
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Active IPD Patient Bills: <span className="text-slate-900 font-extrabold">{ipdBills.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">IPD Number</th>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3 text-center">Bill Stage</th>
                <th className="px-4 py-3 text-right">Total Bill</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Net Bill</th>
                <th className="px-4 py-3 text-right">Advance Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ipdBills.map((bill) => (
                <tr key={bill.id || bill.bill_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-indigo-700">{bill.ipd_number || '-'}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{bill.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{bill.patient_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{bill.uhid}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">
                      {bill.discharge_status || 'Interim'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    ₹{bill.gross_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                    ₹{bill.discount_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    ₹{bill.net_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                    ₹{bill.paid_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 font-bold">
                    ₹{bill.pending_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        bill.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedBillForModal(bill)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Invoice
                      </button>
                    </div>
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
