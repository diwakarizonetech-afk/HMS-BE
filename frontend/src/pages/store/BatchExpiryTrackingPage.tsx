import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Trash2,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import { BatchItem } from '../../types/store';
import { fetchBatchesApi, fetchStockInwardApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const BatchExpiryTrackingPage: React.FC = () => {
  const { addToast } = useHMS();
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  const loadBatches = async () => {
    try {
      const [data, inwardData] = await Promise.all([
        fetchBatchesApi().catch(() => []),
        fetchStockInwardApi().catch(() => []),
      ]);

      const list: BatchItem[] = [];
      const seen = new Set<string>();

      if (Array.isArray(data)) {
        data.forEach((b: any) => {
          const expStr = b.expiry_date || b.expiryDate || '';
          let calcDays = b.days_to_expiry ?? b.daysToExpiry;
          if (calcDays === undefined && expStr) {
            try {
              const expDate = new Date(expStr).getTime();
              const today = new Date().getTime();
              calcDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            } catch {
              calcDays = 0;
            }
          }
          const daysToExpiry = calcDays ?? 0;
          const bNo = b.batch_number || b.batchNumber || '';
          if (bNo) seen.add(bNo);
          list.push({
            id: b.id,
            batchNumber: bNo,
            itemId: b.item_id || b.itemId || '',
            itemCode: b.item_code || b.itemCode || '',
            itemName: b.item_name || b.itemName || '',
            mfgDate: b.mfg_date || b.manufacturing_date || b.mfgDate || '2026-01-01',
            expiryDate: expStr,
            availableQuantity: b.available_quantity ?? b.availableQuantity ?? b.quantity ?? 0,
            quantity: b.available_quantity ?? b.availableQuantity ?? b.quantity ?? 0,
            expiredQuantity: b.expired_quantity ?? b.expiredQuantity ?? 0,
            daysToExpiry: daysToExpiry,
            status: b.status || (daysToExpiry < 0 ? 'Expired' : daysToExpiry <= 60 ? 'Near Expiry' : 'Normal'),
            supplier: b.supplier_name || b.supplier || '',
            location: b.location || 'Central Store',
          });
        });
      }

      if (Array.isArray(inwardData)) {
        inwardData.forEach((inw: any) => {
          const bNo = inw.batch_number || inw.batchNumber || '';
          if (bNo && !seen.has(bNo)) {
            seen.add(bNo);
            const expStr = inw.expiry_date || inw.expiryDate || '2027-12-31';
            let daysToExpiry = 365;
            try {
              const expDate = new Date(expStr).getTime();
              const today = new Date().getTime();
              daysToExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            } catch {
              daysToExpiry = 180;
            }
            list.push({
              id: inw.id || `inward-batch-${bNo}`,
              batchNumber: bNo,
              itemId: inw.item_id || inw.itemId || '',
              itemCode: inw.item_code || inw.itemCode || 'MED-001',
              itemName: inw.item_name || inw.itemName || 'Inward Product',
              mfgDate: inw.date || '2026-01-01',
              expiryDate: expStr,
              availableQuantity: inw.quantity || 60,
              quantity: inw.quantity || 60,
              expiredQuantity: 0,
              daysToExpiry: daysToExpiry,
              status: daysToExpiry < 0 ? 'Expired' : daysToExpiry <= 60 ? 'Near Expiry' : 'Normal',
              supplier: inw.supplier || inw.supplier_name || 'Vendor',
              location: inw.warehouse || 'Central Store Bay 1',
            });
          }
        });
      }

      setBatchItems(list);
    } catch (err) {
      console.warn('Error fetching batch items from API:', err);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [actionType, setActionType] = useState<'discard' | 'return' | null>(null);

  const handleActionConfirm = () => {
    if (!selectedBatch || !actionType) return;

    if (actionType === 'discard') {
      setBatchItems((prev) => prev.filter((b) => b.id !== selectedBatch.id));
      addToast('info', 'Batch Discarded', `Batch ${selectedBatch.batchNumber} marked as discarded & written off.`);
    } else {
      setBatchItems((prev) => prev.filter((b) => b.id !== selectedBatch.id));
      addToast('success', 'Return Initiated', `Return note issued to vendor for ${selectedBatch.batchNumber}.`);
    }

    setSelectedBatch(null);
    setActionType(null);
  };

  const filteredBatches = useMemo(() => {
    return batchItems.filter((b) => {
      const matchesSearch =
        b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.itemCode.toLowerCase().includes(searchQuery.toLowerCase());

      const d = b.daysToExpiry ?? 0;
      let matchesFilter = true;
      if (filterType === 'Expired') {
        matchesFilter = d <= 0;
      } else if (filterType === 'Near Expiry 30') {
        matchesFilter = d > 0 && d <= 30;
      } else if (filterType === 'Near Expiry 60') {
        matchesFilter = d > 0 && d <= 60;
      }

      return matchesSearch && matchesFilter;
    });
  }, [batchItems, searchQuery, filterType]);

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBatches.slice(start, start + itemsPerPage);
  }, [filteredBatches, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Batch & Expiry Tracking</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Batch & Expiry Date Surveillance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor batch shelf-life, prevent distribution of expired pharmaceuticals & handle vendor returns.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Batch #, Item Name, Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Expiry Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
          >
            <option value="All">All Batches</option>
            <option value="Near Expiry 30">Expiring within 30 Days</option>
            <option value="Near Expiry 60">Expiring within 60 Days</option>
            <option value="Expired">Already Expired</option>
          </select>
        </div>
      </div>

      {/* Batch Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Batch #</th>
                <th className="py-3.5 px-4">Item Name & Code</th>
                <th className="py-3.5 px-4">Batch Qty</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Days Remaining</th>
                <th className="py-3.5 px-4">Shelf Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length > 0 ? (
                paginatedList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{batch.itemName}</p>
                      <span className="text-[10px] text-blue-600 font-mono font-semibold">{batch.itemCode}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {batch.availableQuantity} units
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {batch.expiryDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-black ${
                          batch.daysToExpiry <= 0
                            ? 'text-rose-600'
                            : batch.daysToExpiry <= 30
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {batch.daysToExpiry <= 0 ? 'EXPIRED' : `${batch.daysToExpiry} days`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          batch.status === 'Expired'
                            ? 'bg-rose-100 text-rose-700'
                            : batch.status === 'Near Expiry'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setActionType('return');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Undo2 className="w-3 h-3 text-blue-600" />
                          <span>Return to Vendor</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setActionType('discard');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Write Off</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No batch tracking records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedList.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredBatches.length}</span> batches
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {selectedBatch && actionType && (
        <Modal
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          title={actionType === 'discard' ? 'Confirm Batch Write Off' : 'Return Batch to Supplier'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Are you sure you want to {actionType === 'discard' ? 'discard and write off' : 'issue a return note for'}{' '}
              <span className="font-bold text-slate-900">{selectedBatch.availableQuantity} units</span> of Batch{' '}
              <span className="font-mono font-bold text-blue-600">{selectedBatch.batchNumber}</span> ({selectedBatch.itemName})?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleActionConfirm}
                className={`px-4 py-2 rounded-xl font-bold text-white cursor-pointer ${
                  actionType === 'discard' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm {actionType === 'discard' ? 'Write Off' : 'Return'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
