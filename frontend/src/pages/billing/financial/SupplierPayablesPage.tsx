import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useHMS } from '../../../context/HMSContext';
import { SupplierPayable } from '../../../types/billing';
import { Truck, DollarSign, Clock, CheckCircle2, Building2, X, CreditCard, Wallet, Calendar, FileText } from 'lucide-react';

export const SupplierPayablesPage: React.FC = () => {
  const { supplierPayables, paySupplier } = useBilling();
  const { addToast } = useHMS();

  // Pay Supplier Modal State
  const [selectedPayable, setSelectedPayable] = useState<SupplierPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalOutstandingPayables = supplierPayables.reduce((acc, p) => acc + p.outstanding_amount, 0);
  const totalInvoicesSum = supplierPayables.reduce((acc, p) => acc + p.invoice_amount, 0);

  const handleOpenPayModal = (sp: SupplierPayable) => {
    setSelectedPayable(sp);
    setPaymentAmount(sp.outstanding_amount.toString());
    setPaymentMode('Bank Transfer');
    setReferenceNo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
  };

  const handleClosePayModal = () => {
    setSelectedPayable(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast('error', 'Validation Error', 'Please enter a valid payment amount.');
      return;
    }

    if (amountNum > selectedPayable.outstanding_amount) {
      addToast('error', 'Validation Error', `Payment amount cannot exceed outstanding balance (₹${selectedPayable.outstanding_amount.toLocaleString('en-IN')}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      await paySupplier(
        selectedPayable.invoice_number,
        amountNum,
        paymentMode,
        referenceNo,
        remarks
      );

      addToast('success', 'Payment Recorded', `₹${amountNum.toLocaleString('en-IN')} payment recorded successfully for ${selectedPayable.supplier_name}!`);
      handleClosePayModal();
    } catch (err: any) {
      addToast('error', 'Payment Failed', err?.message || 'Failed to record supplier payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Supplier Payables & Purchase Expenses</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial overview of pharmacy and store supplier purchase invoices, paid amounts, and outstanding payables.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-right">
          <p className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">Total Supplier Payables</p>
          <p className="text-lg font-black text-rose-600">₹{totalOutstandingPayables.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Supplier Invoices</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹{totalInvoicesSum.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Paid to Vendors</p>
          <p className="text-xl font-black text-emerald-700 mt-1">
            ₹{(totalInvoicesSum - totalOutstandingPayables).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Pending Payables</p>
          <p className="text-xl font-black text-rose-600 mt-1">₹{totalOutstandingPayables.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Active Supplier Payables: <span className="text-slate-900 font-extrabold">{supplierPayables.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Purchase Date</th>
                <th className="px-4 py-3">Source Module</th>
                <th className="px-4 py-3 text-right">Invoice Amount</th>
                <th className="px-4 py-3 text-right">Paid Amount</th>
                <th className="px-4 py-3 text-right">Outstanding Payable</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {supplierPayables.map((sp) => (
                <tr key={sp.invoice_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-slate-900">{sp.supplier_name}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{sp.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-500">{sp.purchase_date}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">
                      {sp.module_source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    ₹{sp.invoice_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                    ₹{sp.paid_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                    ₹{sp.outstanding_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{sp.due_date || 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        sp.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sp.payment_status === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sp.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sp.outstanding_amount > 0 ? (
                      <button
                        onClick={() => handleOpenPayModal(sp)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 mx-auto"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Supplier</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Supplier Payment Form Modal */}
      {selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Record Vendor Payment</h3>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Invoice: <span className="text-blue-600">{selectedPayable.invoice_number}</span> ({selectedPayable.module_source})
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePayModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vendor Summary Card */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Amount</span>
                  <span className="font-black text-slate-800 text-sm">₹{selectedPayable.invoice_amount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Already Paid</span>
                  <span className="font-black text-emerald-700 text-sm">₹{selectedPayable.paid_amount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Due Balance</span>
                  <span className="font-black text-rose-600 text-sm">₹{selectedPayable.outstanding_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Form */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supplier / Vendor Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedPayable.supplier_name}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Payment Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedPayable.outstanding_amount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter payment amount"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Transaction Ref / UTR No. <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Enter transaction reference"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Payment Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter payment remarks"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClosePayModal}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Processing...' : 'Confirm & Record Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
