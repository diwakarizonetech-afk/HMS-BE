import React from 'react';
import { useBilling } from '../../../context/BillingContext';
import { Pill, Eye, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PharmacyBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { bills, setSelectedBillForModal } = useBilling();

  const pharmacyBills = bills.filter((b) => b.bill_type === 'Pharmacy');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pharmacy Sales Financial Billing</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial transactions for medicine sales, POS invoices, and prescription billing. (Excludes inventory/batch operations).
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/billing/create')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          New Pharmacy Bill
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Pharmacy Sales Invoices: <span className="text-slate-900 font-extrabold">{pharmacyBills.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Pharmacy Bill No</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3 text-right">Gross Sale</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-center">Payment Mode</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pharmacyBills.map((bill) => (
                <tr key={bill.id || bill.bill_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-emerald-700">{bill.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{bill.patient_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{bill.uhid}</td>
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
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                      {bill.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
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
