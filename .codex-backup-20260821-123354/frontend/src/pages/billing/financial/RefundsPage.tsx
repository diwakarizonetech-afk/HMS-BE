import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchBillByNumberApi } from '../../../services/api';
import { RefreshCw, PlusCircle, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export const RefundsPage: React.FC = () => {
  const { bills, refunds, requestRefund, approveRefund } = useBilling();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [uhid, setUhid] = useState('');
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [billLookupStatus, setBillLookupStatus] = useState('');

  const resetRefundForm = () => {
    setBillNumber('');
    setPatientName('');
    setUhid('');
    setOriginalAmount(0);
    setPaidAmount(0);
    setRefundAmount(0);
    setRefundReason('');
    setBillLookupStatus('');
  };

  const applyBillDetails = (bill: any) => {
    const billPaidAmount = Number(bill.paid_amount ?? bill.paidAmount ?? 0);

    setBillNumber(bill.bill_number || bill.billNumber || '');
    setPatientName(bill.patient_name || bill.patientName || '');
    setUhid(bill.uhid || '');
    setOriginalAmount(Number(bill.net_amount ?? bill.netAmount ?? 0));
    setPaidAmount(billPaidAmount);
    setRefundAmount(billPaidAmount);
    setBillLookupStatus('Bill details loaded.');
  };

  const lookupBillDetails = async (value: string) => {
    const cleanBillNumber = value.trim();
    setBillNumber(value);

    if (!cleanBillNumber) {
      setPatientName('');
      setUhid('');
      setOriginalAmount(0);
      setPaidAmount(0);
      setRefundAmount(0);
      setBillLookupStatus('');
      return;
    }

    const localMatch = bills.find(
      (b) => b.bill_number.toLowerCase() === cleanBillNumber.toLowerCase()
    );
    if (localMatch) {
      applyBillDetails(localMatch);
      return;
    }

    try {
      setBillLookupStatus('Looking up bill...');
      const bill = await fetchBillByNumberApi(cleanBillNumber);
      applyBillDetails(bill);
    } catch {
      setPatientName('');
      setUhid('');
      setOriginalAmount(0);
      setPaidAmount(0);
      setRefundAmount(0);
      setBillLookupStatus('Bill not found.');
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !patientName || !refundReason || refundAmount <= 0) {
      alert('Please fill in all mandatory refund details.');
      return;
    }
    if (paidAmount <= 0) {
      alert('This bill has no paid amount available for refund.');
      return;
    }
    if (refundAmount > paidAmount) {
      alert(`Refund amount cannot exceed paid amount (₹${paidAmount.toLocaleString('en-IN')}).`);
      setRefundAmount(paidAmount);
      return;
    }

    try {
      await requestRefund({
        bill_number: billNumber,
        patient_name: patientName,
        uhid,
        original_amount: originalAmount,
        paid_amount: paidAmount,
        refund_amount: refundAmount,
        refund_reason: refundReason,
        refund_mode: 'Cash',
        requested_by: user?.name || '',
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to submit refund request.');
      return;
    }

    setShowModal(false);
    resetRefundForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hospital Refund Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Process payment refunds for cancelled procedures or duplicate test collections with manager approvals.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetRefundForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Initiate Refund Request
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Refund Requests: <span className="text-slate-900 font-extrabold">{refunds.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Refund Code</th>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3 text-right">Original Paid</th>
                <th className="px-4 py-3 text-right">Refund Amount</th>
                <th className="px-4 py-3">Refund Reason</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Approved By</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {refunds.map((ref) => (
                <tr key={ref.refund_code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-rose-700">{ref.refund_code}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{ref.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{ref.patient_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    ₹{ref.paid_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-700 text-sm">
                    ₹{ref.refund_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{ref.refund_reason}</td>
                  <td className="px-4 py-3 text-slate-600">{ref.requested_by}</td>
                  <td className="px-4 py-3 text-slate-600">{ref.approved_by || 'Pending Manager'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        ref.status === 'Processed' || ref.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ref.status === 'Requested' ? (
                      <button
                        onClick={() => approveRefund(ref.refund_code, user?.name || 'Finance Manager')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md shadow-xs transition-colors cursor-pointer"
                      >
                        Approve Refund
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Refund Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-rose-600" />
              Request Patient Refund
            </h3>

            <form onSubmit={handleSubmitRefund} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bill Number</label>
                <input
                  type="text"
                  placeholder="Enter bill number"
                  value={billNumber}
                  onChange={(e) => lookupBillDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  required
                />
                {billLookupStatus && (
                  <p
                    className={`mt-1 text-[10px] font-bold ${
                      billLookupStatus === 'Bill not found.' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {billLookupStatus}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Patient Name</label>
                <input
                  type="text"
                  placeholder="Enter patient name"
                  value={patientName}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-not-allowed"
                  required
                />
                {uhid && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[10px] font-extrabold text-blue-700">
                    UHID: {uhid}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Original Bill (₹)</label>
                <input
                  type="number"
                  value={originalAmount}
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={paidAmount}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-not-allowed"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={paidAmount || 999999}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Math.min(Number(e.target.value), paidAmount || Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-rose-600 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Refund Reason</label>
                <textarea
                  rows={2}
                  placeholder="Reason for refunding patient..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetRefundForm();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Submit Refund Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
