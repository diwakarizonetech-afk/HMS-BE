import React, { useEffect, useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { fetchBillByNumberApi } from '../../../services/api';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Building2,
  FileCheck2,
  ShieldCheck,
  CreditCard,
  User,
} from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { selectedReceiptForModal, setSelectedReceiptForModal } = useBilling();
  const [linkedBill, setLinkedBill] = useState<any | null>(null);

  useEffect(() => {
    setLinkedBill(null);
    if (!selectedReceiptForModal?.bill_number) return;

    fetchBillByNumberApi(selectedReceiptForModal.bill_number)
      .then((bill) => setLinkedBill(bill))
      .catch((err) => console.warn('Failed to load receipt bill metadata:', err));
  }, [selectedReceiptForModal]);

  if (!selectedReceiptForModal) return null;

  const handlePrint = () => {
    window.print();
  };

  const receipt = selectedReceiptForModal;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Official Hospital Money Receipt
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={() => setSelectedReceiptForModal(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body Container */}
        <div className="p-8 space-y-6 text-slate-800 printable-area" id="receipt-printable">
          {/* Hospital Branding Header */}
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
                <p className="text-xs text-slate-500 font-medium">
                  Phone: +91 80 4567 8900 | Email: billing@aegiscare.com
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
                Payment Receipt
              </span>
              <p className="text-xs font-bold text-slate-900">
                Receipt No: <span className="text-blue-600">{receipt.receipt_number}</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">Date & Time: {receipt.payment_date}</p>
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patient Details</p>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">{receipt.patient_name}</p>
              <p className="text-slate-600 font-medium">UHID: <span className="font-bold text-slate-900">{receipt.uhid}</span></p>
              <p className="text-slate-600 font-medium">Service Type: <span className="font-bold text-slate-800">{receipt.service_type}</span></p>
              <p className="text-slate-600 font-medium">Doctor Department: <span className="font-bold text-slate-900">{linkedBill?.department || 'N/A'}</span></p>
              <p className="text-slate-600 font-medium">Consulting Doctor: <span className="font-bold text-slate-900">{linkedBill?.doctor_name || 'N/A'}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billing Info</p>
              <p className="font-bold text-slate-900 mt-0.5">Bill Number: {receipt.bill_number}</p>
              <p className="text-slate-600 font-medium">Payment Mode: <span className="font-bold text-blue-700">{receipt.payment_mode}</span></p>
              <p className="text-slate-600 font-medium">Transaction Ref: {receipt.transaction_ref || 'N/A'}</p>
              <p className="text-slate-600 font-medium">Paid By: <span className="font-bold text-slate-900">{receipt.payer_name || receipt.patient_name}</span></p>
              {(receipt.payer_identifier || receipt.gateway_payment_id) && (
                <p className="text-slate-600 font-medium">
                  Payer ID: <span className="font-bold text-slate-900">{receipt.payer_identifier || receipt.gateway_payment_id}</span>
                </p>
              )}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="px-4 py-3 text-slate-800 font-semibold">Total Bill Amount</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-bold">₹{receipt.total_bill.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-600">Previously Paid Amount</td>
                  <td className="px-4 py-3 text-right text-slate-600">₹{receipt.previously_paid.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-emerald-50/70 text-emerald-950 font-extrabold">
                  <td className="px-4 py-3 text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Current Amount Received
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-800 text-sm">₹{receipt.current_payment.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-800 font-bold">Remaining Outstanding Balance</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-extrabold">₹{receipt.remaining_due.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Signature & Auth */}
          <div className="pt-8 flex items-end justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Collected By:</p>
              <p className="font-extrabold text-slate-900">{receipt.collected_by}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Billing & Revenue Staff</p>
            </div>
            <div className="text-center border-t border-slate-300 pt-2 px-6">
              <p className="font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">AegisCare Accounts Department</p>
            </div>
          </div>

          {/* Computer Generated Disclaimer */}
          <div className="text-center border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-medium">
            This is a computer-generated receipt issued by AegisCare HMS. No physical signature is required.
          </div>
        </div>
      </div>
    </div>
  );
};
