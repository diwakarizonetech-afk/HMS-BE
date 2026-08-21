import React, { useEffect, useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { fetchBillByNumberApi } from '../../../services/api';
import {
  X,
  Printer,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Shield,
  CreditCard,
} from 'lucide-react';

export const InvoiceModal: React.FC = () => {
  const { selectedBillForModal, setSelectedBillForModal } = useBilling();
  const [fullBill, setFullBill] = useState<any | null>(null);

  useEffect(() => {
    setFullBill(null);
    const billNumber = selectedBillForModal?.bill_number;
    const needsFullBill = billNumber && (!selectedBillForModal.items || selectedBillForModal.items.length === 0);
    if (!needsFullBill) return;

    fetchBillByNumberApi(billNumber)
      .then((loadedBill) => setFullBill(loadedBill))
      .catch((err) => console.warn('Failed to load full invoice details:', err));
  }, [selectedBillForModal]);

  if (!selectedBillForModal) return null;

  const handlePrint = () => {
    window.print();
  };

  const bill = fullBill || selectedBillForModal;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Action Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Hospital Tax Invoice Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Invoice
            </button>
            <button
              onClick={() => setSelectedBillForModal(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-8 space-y-6 text-slate-800 printable-area" id="invoice-printable">
          {/* Header Branding */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                A
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  AEGISCARE MULTISPECIALTY HOSPITAL
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  124 Healthcare Boulevard, Medical District, City - 560001
                </p>
                <p className="text-xs text-slate-500 font-medium">GSTIN: 29AAAAA0000A1Z5 | Lic: HOSP-BLR-2026-99</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2 ${
                  bill.payment_status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : bill.payment_status === 'Partially Paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {bill.payment_status} INVOICE
              </span>
              <p className="text-xs font-bold text-slate-900">
                Invoice No: <span className="text-blue-600">{bill.bill_number}</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">Date: {bill.bill_date}</p>
            </div>
          </div>

          {/* Patient & Billing Header Info */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To Patient</p>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">{bill.patient_name}</p>
              <p className="text-slate-600 font-medium">UHID: <span className="font-bold text-slate-900">{bill.uhid}</span></p>
              {bill.ipd_number && <p className="text-slate-600 font-medium">IPD No: {bill.ipd_number}</p>}
              {bill.appointment_id && <p className="text-slate-600 font-medium">Appt ID: {bill.appointment_id}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Metadata</p>
              <p className="font-bold text-slate-900 mt-0.5">Category: {bill.bill_type} Billing</p>
              <p className="text-slate-600 font-medium">Dept: {bill.department || 'General'}</p>
              <p className="text-slate-600 font-medium">Consulting Doctor: {bill.doctor_name || 'N/A'}</p>
              <p className="text-slate-600 font-medium">Billing Staff: {bill.billing_staff}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Service / Item Description</th>
                  <th className="px-3 py-2.5 text-center">Category</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Discount (₹)</th>
                  <th className="px-3 py-2.5 text-right">Net Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bill.items && bill.items.length > 0 ? (
                  bill.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-slate-900 font-semibold">{item.service_name}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{item.category || 'General'}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">₹{item.unit_price.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-600">₹{item.discount.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">₹{item.net_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-center text-slate-400">
                      General Hospital Consultation / Billable Service
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Totals Section */}
          <div className="flex justify-end pt-2 text-xs">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Gross Amount:</span>
                <span className="font-semibold text-slate-800">₹{bill.gross_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Total Concession / Discount:</span>
                <span className="font-semibold">- ₹{bill.discount_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Applicable Tax:</span>
                <span className="font-semibold">₹{bill.tax_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                <span>Grand Total Net Bill:</span>
                <span className="text-blue-700">₹{bill.net_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md">
                <span>Amount Paid:</span>
                <span>₹{bill.paid_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md">
                <span>Balance Due:</span>
                <span>₹{bill.pending_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-800">Terms & Conditions:</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                1. Payments once collected are non-transferable without authorized manager approval.
                <br />
                2. Outstanding dues must be cleared prior to final hospital discharge.
              </p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="font-extrabold text-slate-900">Authorized Billing Officer</p>
              <p className="text-[10px] text-slate-400">AegisCare Finance & Revenue Department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
