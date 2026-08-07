import React, { useState } from 'react';
import {
  ClockAlert,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Printer,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { Batch } from '../../../types/hms';

export const ExpiryTrackingPage: React.FC = () => {
  const { batches: initialBatches } = usePharmacy();
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [activeTab, setActiveTab] = useState<'30days' | '60days' | 'expired'>('30days');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to calculate days remaining relative to today (2026-07-24)
  const calculateDaysRemaining = (expiryDateStr: string): number => {
    const today = new Date().getTime();
    const exp = new Date(expiryDateStr).getTime();
    const diffTime = exp - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Enriched batch data with remaining days
  const enrichedBatches = batches.map((b) => ({
    ...b,
    daysRemaining: calculateDaysRemaining(b.expiryDate),
  }));

  // Filtering by active Tab
  const filteredBatches = enrichedBatches.filter((b) => {
    const medName = b?.medicineName || '';
    const batchNum = b?.batchNumber || '';
    const supName = b?.supplierName || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      medName.toLowerCase().includes(query) ||
      batchNum.toLowerCase().includes(query) ||
      supName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (activeTab === 'expired') {
      return b.daysRemaining <= 0;
    } else if (activeTab === '30days') {
      return b.daysRemaining > 0 && b.daysRemaining <= 30;
    } else if (activeTab === '60days') {
      return b.daysRemaining > 30 && b.daysRemaining <= 60;
    }
    return true;
  });

  const count30 = enrichedBatches.filter((b) => b.daysRemaining > 0 && b.daysRemaining <= 30).length;
  const count60 = enrichedBatches.filter((b) => b.daysRemaining > 30 && b.daysRemaining <= 60).length;
  const countExpired = enrichedBatches.filter((b) => b.daysRemaining <= 0).length;

  const handleMarkExpired = (id: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, batchStatus: 'Expired', availableQuantity: 0 } : b))
    );
    alert('Batch marked as Expired & quarantined from active POS dispensing.');
  };

  const handleReturnSupplier = (b: Batch) => {
    alert(`Initiating supplier return claim for batch ${b.batchNumber} to ${b.supplierName}.`);
  };

  const handleDispose = (b: Batch) => {
    if (confirm(`Safely dispose expired batch ${b.batchNumber} according to bio-waste protocols?`)) {
      setBatches((prev) => prev.filter((item) => item.id !== b.id));
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClockAlert className="w-6 h-6 text-rose-600 animate-pulse" /> Batch Expiry Tracking & Quarantine
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring of near-expiry and expired medicine batches to prevent invalid dispensing.
            </p>
          </div>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Printer className="w-4 h-4" /> Print Expiry Report
          </button>
        </div>

        {/* Tabs & Search Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setActiveTab('30days')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === '30days'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Expiring in 30 Days</span>
              <span className="bg-white/20 text-white px-2 py-0.2 rounded-full text-[10px]">{count30}</span>
            </button>

            <button
              onClick={() => setActiveTab('60days')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === '60days'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring in 60 Days</span>
              <span className="bg-slate-200 text-slate-800 px-2 py-0.2 rounded-full text-[10px]">{count60}</span>
            </button>

            <button
              onClick={() => setActiveTab('expired')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'expired'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Expired Medicines</span>
              <span className="bg-white/20 text-white px-2 py-0.2 rounded-full text-[10px]">{countExpired}</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine or batch..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Medicine Name</th>
                <th className="p-4">Batch Number</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Days Remaining</th>
                <th className="p-4">Stock Left</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                    No batches found under current filter tab.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr
                    key={b.id}
                    className={`transition-colors ${
                      b.daysRemaining <= 0 ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-4 font-bold text-slate-900 text-xs">{b.medicineName}</td>
                    <td className="p-4 font-extrabold text-indigo-700">{b.batchNumber}</td>
                    <td className="p-4 text-slate-600">{b.supplierName}</td>
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {b.expiryDate}
                    </td>
                    <td className="p-4">
                      {b.daysRemaining <= 0 ? (
                        <span className="font-extrabold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full text-[11px]">
                          EXPIRED ({Math.abs(b.daysRemaining)} days ago)
                        </span>
                      ) : (
                        <span
                          className={`font-bold px-2.5 py-1 rounded-full text-[11px] ${
                            b.daysRemaining <= 30
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {b.daysRemaining} Days Left
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-black text-slate-900 text-xs">{b.availableQuantity} Units</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {b.daysRemaining > 0 && b.batchStatus !== 'Expired' && (
                          <button
                            onClick={() => handleMarkExpired(b.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                          >
                            Mark Expired
                          </button>
                        )}
                        <button
                          onClick={() => handleReturnSupplier(b)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Return Supplier
                        </button>
                        <button
                          onClick={() => handleDispose(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
