import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchBillByNumberApi } from '../../../services/api';
import { Percent, PlusCircle, CheckCircle2, XCircle, Clock, ShieldAlert } from 'lucide-react';

export const DiscountsPage: React.FC = () => {
  const { bills, discounts, requestDiscount, approveDiscount } = useBilling();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [uhid, setUhid] = useState('');
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed Amount'>('Fixed Amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [billLookupStatus, setBillLookupStatus] = useState('');

  const calculatedDiscountAmount =
    discountType === 'Percentage'
      ? (originalAmount * discountValue) / 100
      : discountValue;
  const maxDiscountAmount = pendingAmount > 0 ? pendingAmount : originalAmount;
  const safeDiscountAmount = Math.min(calculatedDiscountAmount, maxDiscountAmount);

  const applyBillDetails = (bill: any) => {
    setBillNumber(bill.bill_number || bill.billNumber || '');
    setPatientName(bill.patient_name || bill.patientName || '');
    setUhid(bill.uhid || '');
    setOriginalAmount(Number(bill.net_amount ?? bill.netAmount ?? 0));
    setPendingAmount(Number(bill.pending_amount ?? bill.pendingAmount ?? bill.net_amount ?? bill.netAmount ?? 0));
    setDiscountValue(0);
    setBillLookupStatus('Bill details loaded.');
  };

  const lookupBillDetails = async (value: string) => {
    const cleanBillNumber = value.trim();
    setBillNumber(value);

    if (!cleanBillNumber) {
      setPatientName('');
      setUhid('');
      setOriginalAmount(0);
      setPendingAmount(0);
      setDiscountValue(0);
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
      setPendingAmount(0);
      setDiscountValue(0);
      setBillLookupStatus('Bill not found.');
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !patientName || !reason) {
      alert('Please fill in all mandatory discount request fields.');
      return;
    }
    if (maxDiscountAmount <= 0) {
      alert('This bill has no pending amount available for concession.');
      return;
    }
    if (calculatedDiscountAmount > maxDiscountAmount) {
      alert(`Discount cannot exceed the current pending amount (₹${maxDiscountAmount.toLocaleString('en-IN')}).`);
      setDiscountValue(discountType === 'Percentage' && originalAmount > 0 ? Number(((maxDiscountAmount / originalAmount) * 100).toFixed(2)) : maxDiscountAmount);
      return;
    }

    try {
      await requestDiscount({
        bill_number: billNumber,
        patient_name: patientName,
        uhid,
        original_amount: originalAmount,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: safeDiscountAmount,
        reason,
        requested_by: user?.name || '',
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to submit discount request.');
      return;
    }

    setShowModal(false);
    setBillNumber('');
    setPatientName('');
    setUhid('');
    setOriginalAmount(0);
    setPendingAmount(0);
    setDiscountValue(0);
    setReason('');
    setBillLookupStatus('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Discount & Concession Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Request, track, and approve financial concessions and senior citizen/staff discounts.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Request New Discount
        </button>
      </div>

      {/* Discounts Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Discount Requests: <span className="text-slate-900 font-extrabold">{discounts.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Discount Code</th>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3 text-right">Original Bill</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-right">Discount Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Approved By</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {discounts.map((disc) => (
                <tr key={disc.discount_code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-purple-700">{disc.discount_code}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{disc.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{disc.patient_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    ₹{disc.original_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                      {disc.discount_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-purple-800 text-sm">
                    ₹{disc.discount_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{disc.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{disc.requested_by}</td>
                  <td className="px-4 py-3 text-slate-600">{disc.approved_by || 'Pending Approval'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        disc.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : disc.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {disc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {disc.status === 'Pending' ? (
                      <button
                        onClick={() => approveDiscount(disc.discount_code, user?.name || 'Billing Manager')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md shadow-xs transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Discount Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-600" />
              Request New Bill Concession
            </h3>

            <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
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
                  <p className={`mt-1 text-[10px] font-bold ${billLookupStatus === 'Bill not found.' ? 'text-rose-600' : 'text-emerald-600'}`}>
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
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  readOnly
                  required
                />
              </div>

              {uhid && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">
                  UHID: {uhid}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Original Bill (₹)</label>
                  <input
                    type="number"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                    readOnly
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pending Due (₹)</label>
                  <input
                    type="number"
                    value={pendingAmount}
                    className="w-full bg-rose-50 border border-rose-100 rounded-xl p-2.5 font-bold text-rose-700"
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="Fixed Amount">Fixed Amount (₹)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Discount Value</label>
                <input
                  type="number"
                  value={discountValue}
                  max={discountType === 'Fixed Amount' ? maxDiscountAmount : undefined}
                  onChange={(e) => {
                    const nextValue = Number(e.target.value);
                    if (discountType === 'Fixed Amount') {
                      setDiscountValue(Math.min(nextValue, maxDiscountAmount));
                    } else {
                      setDiscountValue(nextValue);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-purple-700 text-sm"
                  required
                />
                <p className="mt-1 text-[10px] font-bold text-slate-500">
                  Max concession allowed now: ₹{maxDiscountAmount.toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Concession Reason</label>
                <textarea
                  rows={2}
                  placeholder="Reason for discount (Senior citizen / Staff referral)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
