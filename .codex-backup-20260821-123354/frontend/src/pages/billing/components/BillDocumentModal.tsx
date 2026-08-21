import React, { useEffect, useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { fetchBillByNumberApi } from '../../../services/api';
import {
  X,
  Printer,
  FileText,
  Receipt,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Layers,
  CreditCard,
  FileCheck2,
} from 'lucide-react';

export const BillDocumentModal: React.FC = () => {
  const {
    selectedBillForModal,
    setSelectedBillForModal,
    selectedReceiptForModal,
    setSelectedReceiptForModal,
  } = useBilling();

  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt' | 'combined'>('combined');
  const [fullBill, setFullBill] = useState<any | null>(null);

  // Determine active document
  const bill = fullBill || selectedBillForModal;
  const receipt = selectedReceiptForModal;

  useEffect(() => {
    setFullBill(null);
    const billNumber = selectedBillForModal?.bill_number || selectedReceiptForModal?.bill_number;
    const selectedBillHasItems = !!selectedBillForModal?.items?.length;
    const needsFullBill = !!billNumber && !selectedBillHasItems;
    if (!needsFullBill) return;

    fetchBillByNumberApi(billNumber)
      .then((loadedBill) => setFullBill(loadedBill))
      .catch((err) => console.warn('Failed to load full bill document details:', err));
  }, [selectedBillForModal, selectedReceiptForModal]);

  if (!bill && !receipt) return null;

  const handleClose = () => {
    setSelectedBillForModal(null);
    setSelectedReceiptForModal(null);
  };

  const handlePrint = () => {
    window.print();
  };

  // Derive bill values
  const patientName = bill?.patient_name || receipt?.patient_name || '-';
  const uhid = bill?.uhid || receipt?.uhid || '-';
  const billNo = bill?.bill_number || receipt?.bill_number || '-';
  const netAmount = bill?.net_amount ?? receipt?.total_bill ?? 0;
  const paidAmount = bill?.paid_amount ?? receipt?.current_payment ?? 0;
  const pendingAmount = bill?.pending_amount ?? receipt?.remaining_due ?? 0;
  const status = bill?.payment_status || (pendingAmount <= 0 ? 'Paid' : 'Partially Paid');
  const billDate = bill?.bill_date || receipt?.payment_date || new Date().toISOString().split('T')[0];
  const items = bill?.items || [];
  const paymentMode = receipt?.payment_mode || bill?.payment_mode || 'Cash';

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      {/* Centered Modal Card with Max Height and Fixed Pinned Top Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Pinned Top Bar (Light Palette - Matching Reception & Doctor Portals) */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 text-slate-800 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <FileCheck2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-slate-900">
                Hospital Billing Document Viewer
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Bill No: <span className="text-blue-600 font-bold">{billNo}</span> • Patient: {patientName}
              </p>
            </div>
          </div>

          {/* Center Document View Selector */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('combined')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'combined'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unified Invoice & Receipt
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'invoice'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tax Invoice Only
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'receipt'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Money Receipt Only
            </button>
          </div>

          {/* Action Buttons: Print & Close X */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Selector Pills */}
        <div className="md:hidden flex items-center justify-center gap-1 bg-slate-800 p-2 text-xs font-bold shrink-0 no-print border-t border-slate-800">
          <button
            onClick={() => setActiveTab('combined')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'combined' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            Unified
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'invoice' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            Invoice
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'receipt' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            Receipt
          </button>
        </div>

        {/* Scrollable Printable Document Body Container */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 overflow-y-auto flex-1 custom-scrollbar printable-area" id="hospital-document-printable">
          {/* Hospital Header Banner */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                A
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  AEGISCARE MULTISPECIALTY HOSPITAL
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  124 Healthcare Boulevard, Medical District, City - 560001
                </p>
                <p className="text-[11px] text-slate-400 font-medium">GSTIN: 29AAAAA0000A1Z5 | Lic: HOSP-BLR-2026-99</p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-xs font-extrabold rounded-full uppercase tracking-wider mb-1.5 ${
                  status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'Partially Paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {activeTab === 'receipt' ? 'PAYMENT RECEIPT' : activeTab === 'invoice' ? 'TAX INVOICE' : 'TAX INVOICE & RECEIPT'}
              </span>
              <p className="text-xs font-bold text-slate-900">
                Bill No: <span className="text-blue-700">{billNo}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Date: {billDate}</p>
            </div>
          </div>

          {/* Patient & Service Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Information</p>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">{patientName}</p>
              <p className="text-slate-600 font-medium mt-0.5">UHID: <span className="font-bold text-slate-900">{uhid}</span></p>
              {bill?.appointment_id && <p className="text-slate-600 font-medium">Appt ID: {bill.appointment_id}</p>}
              {bill?.ipd_number && <p className="text-slate-600 font-medium">IPD No: {bill.ipd_number}</p>}
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billing Metadata</p>
              <p className="font-bold text-slate-900 mt-0.5">Category: {bill?.bill_type || receipt?.service_type || '-'} Billing</p>
              <p className="text-slate-600 font-medium">Department: {bill?.department || '-'}</p>
              <p className="text-slate-600 font-medium">Consulting Doctor: {bill?.doctor_name || '-'}</p>
              <p className="text-slate-600 font-medium">Staff: {bill?.billing_staff || receipt?.collected_by || '-'}</p>
            </div>
          </div>

          {/* SECTION A: Bill Line Items */}
          {(
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Billed Services & Charges</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Service Description</th>
                      <th className="px-3 py-2.5 text-center">Category</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Unit Rate (₹)</th>
                      <th className="px-3 py-2.5 text-right">Discount (₹)</th>
                      <th className="px-3 py-2.5 text-right">Net Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.length > 0 ? (
                      items.map((item, idx) => (
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
                        <td colSpan={7} className="px-4 py-3 text-center text-slate-500 font-medium">
                          No line items found for this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION B: Payment Collection Receipt Summary */}
          {(activeTab === 'receipt' || activeTab === 'combined') && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Payment Collection Summary</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Payment Mode Used:</span>
                  <span className="font-bold text-indigo-700">{paymentMode}</span>
                </div>
                {receipt?.receipt_number && (
                  <div className="flex justify-between text-slate-700">
                    <span>Official Receipt Reference:</span>
                    <span className="font-bold text-emerald-700">{receipt.receipt_number}</span>
                  </div>
                )}
                {receipt?.transaction_ref && (
                  <div className="flex justify-between text-slate-700">
                    <span>Transaction UTR / Ref No:</span>
                    <span className="font-bold text-slate-900">{receipt.transaction_ref}</span>
                  </div>
                )}
                {receipt && (
                  <div className="flex justify-between text-slate-700">
                    <span>Payment Received From:</span>
                    <span className="font-bold text-slate-900">{receipt.payer_name || receipt.patient_name}</span>
                  </div>
                )}
                {(receipt?.payer_identifier || receipt?.gateway_payment_id) && (
                  <div className="flex justify-between text-slate-700">
                    <span>Payer ID / VPA / Gateway ID:</span>
                    <span className="font-bold text-slate-900">{receipt.payer_identifier || receipt.gateway_payment_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="flex justify-end pt-2 text-xs">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Total Net Bill:</span>
                <span className="font-bold text-slate-900">₹{netAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">
                <span>Amount Paid:</span>
                <span>₹{paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-md">
                <span>Balance Remaining Due:</span>
                <span>₹{pendingAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
            <div>
              <p className="text-slate-500 font-medium">Billed & Collected By:</p>
              <p className="font-extrabold text-slate-900">{bill?.billing_staff || receipt?.collected_by || '-'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Finance & Billing Department</p>
            </div>
            <div className="text-center border-t border-slate-300 pt-2 px-6">
              <p className="font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">AegisCare Accounts Department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
