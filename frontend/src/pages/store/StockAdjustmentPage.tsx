import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Search,
  Filter,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Edit,
  Trash2,
} from 'lucide-react';
import { StockAdjustment, AdjustmentType } from '../../types/store';
import {
  fetchStockAdjustmentApi,
  createStockAdjustmentApi,
  updateStockAdjustmentApi,
  deleteStockAdjustmentApi,
  fetchStockInwardApi,
  fetchStockOutwardApi,
} from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const StockAdjustmentPage: React.FC = () => {
  const { addToast, storeItems } = useHMS();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [outwardList, setOutwardList] = useState<any[]>([]);

  const loadAdjustments = async () => {
    try {
      const data = await fetchStockAdjustmentApi();
      if (Array.isArray(data)) {
        setAdjustments(data.map((a: any): StockAdjustment => ({
          id: a.id,
          adjustmentNumber: a.adjustment_number || a.adjustmentNumber,
          date: a.date || new Date().toISOString().split('T')[0],
          itemCode: a.item_code || a.itemCode,
          itemName: a.item_name || a.itemName,
          type: (a.type as AdjustmentType) || (a.adjusted_quantity < a.system_quantity ? 'Damage' : 'Manual Correction'),
          currentQuantity: a.system_quantity ?? a.systemQuantity ?? a.currentQuantity ?? 0,
          adjustedQuantity: a.physical_quantity ?? a.physicalQuantity ?? a.adjustedQuantity ?? 0,
          reason: a.reason || 'Audit Variance',
          approvedBy: a.approved_by || a.adjusted_by || a.adjustedBy || 'Store Officer',
        })));
      }
    } catch (err) {
      console.warn('Error fetching stock adjustments from API:', err);
    }
  };

  useEffect(() => {
    loadAdjustments();
    Promise.all([
      fetchStockInwardApi().catch(() => []),
      fetchStockOutwardApi().catch(() => []),
    ]).then(([inw, out]) => {
      if (Array.isArray(inw)) setInwardList(inw);
      if (Array.isArray(out)) setOutwardList(out);
    });
  }, []);

  const availableProducts = useMemo(() => {
    const list: { itemCode: string; itemName: string; batchNumber: string; currentStock: number }[] = [];
    const seen = new Set<string>();

    storeItems.forEach((i) => {
      const codeKey = (i.itemCode || '').toLowerCase().trim();
      const matchedInward = inwardList.find(
        (inw) => (inw.item_code || inw.itemCode || '').toLowerCase().trim() === codeKey
      );
      const batch = matchedInward?.batch_number || matchedInward?.batchNumber || 'BAT-2026-X1';

      if (codeKey) seen.add(codeKey);
      list.push({
        itemCode: i.itemCode,
        itemName: i.itemName,
        batchNumber: batch,
        currentStock: Math.max(0, i.currentStock ?? 0),
      });
    });

    inwardList.forEach((inw) => {
      const code = inw.item_code || inw.itemCode || 'MED-001';
      const name = inw.item_name || inw.itemName || 'Product';
      const batch = inw.batch_number || inw.batchNumber || 'BAT-2026-X1';
      const codeKey = code.toLowerCase().trim();

      if (!seen.has(codeKey)) {
        seen.add(codeKey);
        list.push({
          itemCode: code,
          itemName: name,
          batchNumber: batch,
          currentStock: Number(inw.quantity || 0),
        });
      }
    });

    return list;
  }, [inwardList, storeItems]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockAdjustment | null>(null);

  const firstItem = availableProducts[0] || { itemCode: 'MED-001', itemName: 'Paracetamol 500mg', currentStock: 100 };

  const initialForm: Omit<StockAdjustment, 'id'> = {
    adjustmentNumber: `ADJ-2026-${String(adjustments.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    itemCode: firstItem.itemCode,
    itemName: firstItem.itemName,
    type: 'Damage',
    currentQuantity: firstItem.currentStock,
    adjustedQuantity: Math.max(0, firstItem.currentStock - 5),
    reason: 'Damaged in storage bay',
    approvedBy: 'Store Officer',
  };

  const [formData, setFormData] = useState<Omit<StockAdjustment, 'id'>>(initialForm);

  const handleOpenCreate = () => {
    setSelectedEntry(null);
    const topProd = availableProducts[0] || firstItem;
    setFormData({
      ...initialForm,
      adjustmentNumber: `ADJ-2026-${String(adjustments.length + 1).padStart(3, '0')}`,
      itemCode: topProd.itemCode,
      itemName: topProd.itemName,
      currentQuantity: topProd.currentStock,
      adjustedQuantity: Math.max(0, topProd.currentStock - 5),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: StockAdjustment) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: StockAdjustment) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntry) return;
    try {
      await deleteStockAdjustmentApi(selectedEntry.id);
      setAdjustments((prev) => prev.filter((i) => i.id !== selectedEntry.id));
      addToast('info', 'Record Deleted', `Adjustment ${selectedEntry.adjustmentNumber} deleted.`);
    } catch (err) {
      console.warn('API error deleting stock adjustment:', err);
      addToast('error', 'Delete Failed', 'Could not delete adjustment from database.');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedEntry(null);
    }
  };

  const handleItemSelect = (itemCode: string) => {
    const item = availableProducts.find((i) => i.itemCode === itemCode);
    if (item) {
      setFormData({
        ...formData,
        itemCode: item.itemCode,
        itemName: item.itemName,
        currentQuantity: item.currentStock,
        adjustedQuantity: Math.max(0, item.currentStock - 5),
      });
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = selectedEntry
        ? await updateStockAdjustmentApi(selectedEntry.id, formData)
        : await createStockAdjustmentApi(formData);
      const mapped: StockAdjustment = {
        id: result.id || selectedEntry?.id || `adj-${Date.now()}`,
        adjustmentNumber: result.adjustment_number || result.adjustmentNumber || formData.adjustmentNumber,
        date: result.date || formData.date,
        itemCode: result.item_code || result.itemCode || formData.itemCode,
        itemName: result.item_name || result.itemName || formData.itemName,
        type: formData.type,
        currentQuantity: result.current_quantity ?? result.currentQuantity ?? result.system_quantity ?? result.systemQuantity ?? formData.currentQuantity,
        adjustedQuantity: result.adjusted_quantity ?? result.adjustedQuantity ?? result.physical_quantity ?? result.physicalQuantity ?? formData.adjustedQuantity,
        reason: result.reason || formData.reason,
        approvedBy: result.approved_by || result.approvedBy || result.adjusted_by || result.adjustedBy || formData.approvedBy,
      };
      if (selectedEntry) {
        setAdjustments((prev) => prev.map((a) => (a.id === mapped.id ? mapped : a)));
        addToast('success', 'Stock Adjustment Updated', `Saved changes to adjustment ${mapped.adjustmentNumber}.`);
      } else {
        setAdjustments((prev) => [mapped, ...prev]);
        addToast('success', 'Stock Adjusted (API)', `Saved adjustment ${formData.adjustmentNumber} to database.`);
      }
    } catch (err) {
      console.warn('API error saving stock adjustment:', err);
      addToast('error', 'Save Failed', 'Could not save stock adjustment to database.');
    }
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      const matchesSearch =
        adj.adjustmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adj.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adj.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'All' || adj.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [adjustments, searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredAdjustments.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdjustments.slice(start, start + itemsPerPage);
  }, [filteredAdjustments, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Stock Adjustment</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Adjustment & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log quantity corrections for damaged, lost, expired stock or audit physical counts.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Adjustment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Adj #, Item, Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Damage">Damage</option>
            <option value="Lost">Lost</option>
            <option value="Expired">Expired</option>
            <option value="Manual Correction">Manual Correction</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Adj #</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Item & Code</th>
                <th className="py-3.5 px-4">Qty Before → After</th>
                <th className="py-3.5 px-4">Adjustment Reason</th>
                <th className="py-3.5 px-4">Approved By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length > 0 ? (
                paginatedList.map((adj) => {
                  const diff = adj.adjustedQuantity - adj.currentQuantity;
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {adj.adjustmentNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            adj.type === 'Damage'
                              ? 'bg-rose-100 text-rose-700'
                              : adj.type === 'Lost'
                              ? 'bg-amber-100 text-amber-700'
                              : adj.type === 'Expired'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {adj.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{adj.itemName}</p>
                        <span className="text-[10px] text-blue-600 font-mono font-semibold">{adj.itemCode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">
                            {adj.currentQuantity} → <span className="text-blue-600">{adj.adjustedQuantity}</span>
                          </p>
                          <span className={`text-[10px] font-bold ${diff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {diff > 0 ? `+${diff}` : diff} net change
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-xs truncate">
                        {adj.reason}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {adj.approvedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {adj.date}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(adj)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                            title="Edit Adjustment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(adj)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Delete Adjustment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No stock adjustment logs found.
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
            <span className="font-bold text-slate-800">{filteredAdjustments.length}</span> logs
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEntry ? `Edit Adjustment (${formData.adjustmentNumber})` : 'New Stock Adjustment Log'}
        subtitle="Correct system inventory quantities for damage, breakage, loss, or audit findings"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Adjustment Ref #</label>
              <input
                type="text"
                disabled
                value={formData.adjustmentNumber}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Adjustment Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AdjustmentType })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Damage">Damage / Breakage</option>
                <option value="Lost">Loss / Missing</option>
                <option value="Expired">Expiry Discard</option>
                <option value="Manual Correction">Audit Physical Count</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Item *</label>
              <select
                value={formData.itemCode}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {availableProducts.map((i, idx) => (
                  <option key={`${i.itemCode}-${idx}`} value={i.itemCode}>
                    {i.itemName} ({i.itemCode}) — Batch: {i.batchNumber} | Remaining Stock: {i.currentStock} units
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Recorded Stock</label>
              <input
                type="number"
                disabled
                value={formData.currentQuantity}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">New Adjusted Stock Qty *</label>
              <input
                type="number"
                min={0}
                required
                value={formData.adjustedQuantity}
                onChange={(e) => setFormData({ ...formData, adjustedQuantity: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-700 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Approving Officer / Supervisor</label>
              <input
                type="text"
                value={formData.approvedBy}
                onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                placeholder="Purchase Head - Dr. Arvind N"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Adjustment Reason & Notes *</label>
              <textarea
                rows={2}
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Detailed reason for inventory correction..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {selectedEntry ? 'Update Adjustment' : 'Save Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Adjustment"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete adjustment entry <span className="font-bold text-slate-900">{selectedEntry.adjustmentNumber}</span> for <span className="font-bold text-slate-900">{selectedEntry.itemName}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
