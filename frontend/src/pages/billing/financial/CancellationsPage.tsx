import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useAuth } from '../../../context/AuthContext';
import { XCircle, ShieldAlert, PlusCircle } from 'lucide-react';

export const CancellationsPage: React.FC = () => {
  const { cancellations, cancelBill } = useBilling();
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !reason) {
      alert('Please fill in mandatory bill cancellation details.');
      return;
    }

    try {
      await cancelBill(billNumber, reason, user?.name || '');
      setShowModal(false);
      setBillNumber('');
      setReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel bill.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Bill Cancellation Audit Log</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial cancellation records are preserved for complete audit compliance without silent deletion.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Cancel a Bill
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Cancelled Bills: <span className="text-slate-900 font-extrabold">{cancellations.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Cancellation Code</th>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3 text-right">Original Amount</th>
                <th className="px-4 py-3">Cancellation Reason</th>
                <th className="px-4 py-3">Cancelled By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cancellations.map((can) => (
                <tr key={can.cancellation_code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-slate-700">{can.cancellation_code}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{can.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{can.patient_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    ₹{can.original_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-rose-700 font-medium max-w-xs truncate">{can.cancellation_reason}</td>
                  <td className="px-4 py-3 text-slate-600">{can.requested_by}</td>
                  <td className="px-4 py-3 text-slate-500">{can.cancellation_date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      Cancelled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Cancel Hospital Bill
            </h3>

            <form onSubmit={handleSubmitCancellation} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Bill Number</label>
                <input
                  type="text"
                  placeholder="Enter bill number"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cancellation Reason</label>
                <textarea
                  rows={3}
                  placeholder="State clear reason for bill cancellation..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium">
                Note: Financial cancellations will preserve an immutable record in the audit trail.
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
