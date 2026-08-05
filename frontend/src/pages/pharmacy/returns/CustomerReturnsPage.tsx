import React, { useState } from 'react';
import { RotateCcw, Search, Plus, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { CustomerReturn } from '../../../types/hms';

export const CustomerReturnsPage: React.FC = () => {
  const { customerReturns: initialReturns } = usePharmacy();
  const [returns, setReturns] = useState<CustomerReturn[]>(initialReturns);
  const [searchQuery, setSearchQuery] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Form
  const [invoiceNo, setInvoiceNo] = useState('POS-2026-00411');
  const [patientName, setPatientName] = useState('Suresh Kumar');
  const [medName, setMedName] = useState('Paracetamol 650mg');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('Unopened box returned by patient');
  const [refundAmount, setRefundAmount] = useState(34.0);

  const filteredReturns = returns.filter(
    (r) =>
      r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleApproval = (id: string) => {
    setReturns((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'Approved' ? 'Pending' : 'Approved' } : r
      )
    );
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const newRet: CustomerReturn = {
      id: `cret-${Date.now()}`,
      returnNumber: `CRET-2026-0${Math.floor(16 + Math.random() * 50)}`,
      invoiceNumber: invoiceNo,
      patientName,
      medicineName: medName,
      quantity: Number(qty),
      reason,
      refundAmount: Number(refundAmount),
      status: 'Approved',
      date: new Date().toISOString().split('T')[0],
    };
    setReturns((prev) => [newRet, ...prev]);
    setNewModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-rose-600" /> Customer Medicine Returns & Refunds
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Process customer medicine returns against invoice receipts, log reasons & issue refund credits.
            </p>
          </div>

          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" /> Process New Return
          </button>
        </div>

        {/* Search */}
        <div className="relative pt-2 border-t border-slate-100 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Invoice No, Return No or Patient Name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Return No</th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Returned Medicine</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Refund Amount (₹)</th>
                <th className="p-4">Approval Status</th>
                <th className="p-4 text-center">Toggle Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredReturns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-black text-rose-700">{r.returnNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{r.invoiceNumber}</td>
                  <td className="p-4 text-slate-800 font-semibold">{r.patientName}</td>
                  <td className="p-4 font-bold text-slate-900">{r.medicineName}</td>
                  <td className="p-4 font-bold text-slate-800">{r.quantity}</td>
                  <td className="p-4 text-slate-600">{r.reason}</td>
                  <td className="p-4 font-black text-emerald-700">₹{r.refundAmount.toFixed(2)}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleApproval(r.id)}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <RotateCcw className="w-5 h-5 text-rose-600" /> Process Customer Return
              </h3>
              <button onClick={() => setNewModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturn} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Receipt No *</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient / Customer Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Returned Medicine Name</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Returned Qty</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Return Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  Approve & Issue Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
