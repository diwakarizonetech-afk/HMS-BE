import React, { useState } from 'react';
import { Truck, Plus, Search, CheckCircle2, X, FileText, AlertTriangle } from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { SupplierReturn } from '../../../types/hms';

export const SupplierReturnsPage: React.FC = () => {
  const { supplierReturns: initialReturns } = usePharmacy();
  const [returns, setReturns] = useState<SupplierReturn[]>(initialReturns);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [supplierName, setSupplierName] = useState('Apex Medical Distributors');
  const [medName, setMedName] = useState('Augmentin 625 Duo');
  const [batchNo, setBatchNo] = useState('BAT-2025-412');
  const [qty, setQty] = useState(25);
  const [reason, setReason] = useState<'Expired' | 'Damaged' | 'Wrong Delivery'>('Expired');
  const [creditNoteNo, setCreditNoteNo] = useState('CN-APX-2041');
  const [amount, setAmount] = useState(3375.0);

  const filteredReturns = returns.filter((s) => {
    const retNum = s?.returnNumber || '';
    const supName = s?.supplierName || '';
    const medName = s?.medicineName || '';
    const cnNo = s?.creditNoteNo || '';
    const query = searchQuery.toLowerCase();
    return (
      retNum.toLowerCase().includes(query) ||
      supName.toLowerCase().includes(query) ||
      medName.toLowerCase().includes(query) ||
      cnNo.toLowerCase().includes(query)
    );
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSret: SupplierReturn = {
      id: `sret-${Date.now()}`,
      returnNumber: `SRET-2026-0${Math.floor(10 + Math.random() * 50)}`,
      supplierName,
      medicineName: medName,
      batchNumber: batchNo,
      quantity: Number(qty),
      reason,
      creditNoteNo,
      amount: Number(amount),
      status: 'Pending Credit',
      date: new Date().toISOString().split('T')[0],
    };
    setReturns((prev) => [newSret, ...prev]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-amber-600" /> Supplier Return & Credit Note Claims
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Dispatch expired, damaged, or wrongly delivered medicine batches to distributors for credit note adjustments.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" /> Create Supplier Return Claim
          </button>
        </div>

        {/* Search */}
        <div className="relative pt-2 border-t border-slate-100 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Supplier Name, Medicine, Batch or Credit Note #..."
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
                <th className="p-4">Claim Return #</th>
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Medicine & Batch</th>
                <th className="p-4">Returned Qty</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Credit Note #</th>
                <th className="p-4">Claim Amount (₹)</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredReturns.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-black text-amber-800">{s.returnNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{s.supplierName}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{s.medicineName}</p>
                    <p className="text-[10px] text-indigo-700 font-extrabold">{s.batchNumber}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-800">{s.quantity}</td>
                  <td className="p-4">
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                      {s.reason}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{s.creditNoteNo}</td>
                  <td className="p-4 font-black text-emerald-700">₹{s.amount.toFixed(2)}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        s.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Truck className="w-5 h-5 text-amber-600" /> Supplier Return & Credit Note Claim
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medicine Name</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-indigo-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Returned Qty</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Return Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  >
                    <option value="Expired">Expired</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Wrong Delivery">Wrong Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Note No</label>
                  <input
                    type="text"
                    value={creditNoteNo}
                    onChange={(e) => setCreditNoteNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Claim Refund Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Submit Supplier Return Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
