import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  Building2,
  Edit,
  Trash2,
} from 'lucide-react';
import { StockTransfer } from '../../types/store';
import { fetchStockTransferApi, createStockTransferApi, updateStockTransferApi, deleteStockTransferApi, fetchStockInwardApi, fetchStockOutwardApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const StockTransferPage: React.FC = () => {
  const { addToast, storeItems } = useHMS();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [inwardList, setInwardList] = useState<any[]>([]);
  const [outwardList, setOutwardList] = useState<any[]>([]);

  const loadTransfers = async () => {
    try {
      const data = await fetchStockTransferApi();
      if (Array.isArray(data)) {
        setTransfers(data.map((t: any): StockTransfer => ({
          id: t.id,
          transferNumber: t.transfer_number || t.transferNumber,
          source: t.from_location || t.source || 'Central Store Bay 1',
          destination: t.to_location || t.destination || 'Pharmacy Store',
          transferDate: t.transfer_date || t.transferDate || t.date || new Date().toISOString().split('T')[0],
          itemCode: t.item_code || t.itemCode,
          itemName: t.item_name || t.itemName,
          batchNumber: t.batch_number || t.batchNumber || '',
          quantity: t.quantity,
          status: t.status || 'Completed',
          requestedBy: t.requested_by || t.requestedBy || 'Pharmacy Staff',
        })));
      }
    } catch (err) {
      console.warn('Error fetching stock transfers from API:', err);
    }
  };

  useEffect(() => {
    loadTransfers();
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockTransfer | null>(null);

  const firstItem = availableProducts[0] || { itemCode: 'MED-001', itemName: 'Paracetamol 500mg', batchNumber: 'BAT-2026-X1' };

  const initialForm: Omit<StockTransfer, 'id'> = {
    transferNumber: `TR-2026-${String(transfers.length + 1).padStart(3, '0')}`,
    source: 'Central Store Bay 1',
    destination: 'Pharmacy Store',
    transferDate: new Date().toISOString().split('T')[0],
    itemCode: firstItem.itemCode,
    itemName: firstItem.itemName,
    batchNumber: firstItem.batchNumber,
    quantity: 50,
    status: 'Completed',
    requestedBy: 'Pharmacy Incharge',
  };

  const [formData, setFormData] = useState<Omit<StockTransfer, 'id'>>(initialForm);

  const handleOpenCreate = () => {
    setSelectedEntry(null);
    const topProd = availableProducts[0] || firstItem;
    setFormData({
      ...initialForm,
      transferNumber: `TR-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      itemCode: topProd.itemCode,
      itemName: topProd.itemName,
      batchNumber: topProd.batchNumber,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: StockTransfer) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: StockTransfer) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntry) return;
    try {
      await deleteStockTransferApi(selectedEntry.id);
      setTransfers((prev) => prev.filter((i) => i.id !== selectedEntry.id));
      addToast('info', 'Transfer Record Deleted', `Transfer ${selectedEntry.transferNumber} deleted.`);
    } catch (err) {
      console.warn('API error deleting stock transfer:', err);
      addToast('error', 'Delete Failed', 'Could not delete stock transfer from the database.');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedEntry(null);
    }
  };

  const handleItemSelect = (itemCode: string) => {
    const matched = availableProducts.find((i) => i.itemCode === itemCode);
    if (matched) {
      setFormData({
        ...formData,
        itemCode: matched.itemCode,
        itemName: matched.itemName,
        batchNumber: matched.batchNumber || formData.batchNumber,
      });
    }
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentProd = availableProducts.find((i) => i.itemCode === formData.itemCode);
    const availableQty = currentProd?.currentStock ?? 0;

    if (availableQty <= 0) {
      addToast('error', 'Item Out of Stock', `Selected item (${formData.itemName}) is currently out of stock (0 available). Cannot transfer stock.`);
      return;
    }

    if (formData.quantity > availableQty) {
      addToast('error', 'Stock Exceeded', `Cannot transfer ${formData.quantity} units. Only ${availableQty} units available in stock.`);
      return;
    }

    try {
      const result = selectedEntry
        ? await updateStockTransferApi(selectedEntry.id, formData)
        : await createStockTransferApi(formData);
      const mapped: StockTransfer = {
        id: result.id,
        transferNumber: result.transfer_number || result.transferNumber || formData.transferNumber,
        source: result.from_location || result.source || formData.source,
        destination: result.to_location || result.destination || formData.destination,
        transferDate: result.transfer_date || result.transferDate || result.date || formData.transferDate,
        itemCode: result.item_code || result.itemCode || formData.itemCode,
        itemName: result.item_name || result.itemName || formData.itemName,
        batchNumber: result.batch_number || result.batchNumber || formData.batchNumber,
        quantity: result.quantity || formData.quantity,
        status: result.status || formData.status,
        requestedBy: formData.requestedBy,
      };
      if (selectedEntry) {
        setTransfers((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
        addToast('success', 'Stock Transfer Updated', `Saved changes to transfer ${mapped.transferNumber}.`);
      } else {
        setTransfers((prev) => [mapped, ...prev]);
        addToast('success', 'Stock Transfer Created (API)', `Saved transfer ${formData.transferNumber} to database.`);
      }
    } catch (err) {
      console.warn('API error saving stock transfer:', err);
      addToast('error', 'Save Failed', 'Could not save stock transfer to database.');
    }
    setIsModalOpen(false);
  };

  const handleStatusChange = async (id: string, status: StockTransfer['status']) => {
    try {
      await updateStockTransferApi(id, { status });
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
      addToast('info', 'Status Updated', `Transfer status marked as ${status}.`);
    } catch (err) {
      console.warn('API error updating stock transfer status:', err);
      addToast('error', 'Update Failed', 'Could not update transfer status in the database.');
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter(
      (t) =>
        t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transfers, searchQuery]);

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage) || 1;
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(start, start + itemsPerPage);
  }, [filteredTransfers, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Stock Transfer</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Transfer Between Warehouses & Stores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Relocate stock between Central Store, Cold Storage Bays, Departmental Stores & Pharmacy.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Transfer #, Item, Source, Dest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transfer Ref</th>
                <th className="py-3.5 px-4">Source Location</th>
                <th className="py-3.5 px-4">Destination Location</th>
                <th className="py-3.5 px-4">Item Transferred</th>
                <th className="py-3.5 px-4">Transfer Qty</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedTransfers.length > 0 ? (
                paginatedTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-600">{t.transferNumber}</span>
                      <p className="text-[10px] text-slate-400">Date: {t.transferDate}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {t.source}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-bold">
                      {t.destination}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{t.itemName}</p>
                      <span className="text-[10px] text-blue-600 font-mono font-semibold">{t.itemCode}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shrink-0">
                        {t.quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : t.status === 'In Transit'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                          }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                          title="Edit Transfer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Delete Transfer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {t.status === 'In Transit' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'Completed')}
                            className="px-2 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            Mark Received
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No stock transfer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedTransfers.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredTransfers.length}</span> transfers
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
        title={selectedEntry ? `Edit Transfer (${formData.transferNumber})` : 'New Inter-Department Stock Transfer'}
        subtitle="Move items safely between stores, satellite pharmacies, and department dispensaries"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Transfer Reference #</label>
              <input
                type="text"
                disabled
                value={formData.transferNumber}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transfer Date</label>
              <input
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Source Location *</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Central Store Bay 1">Central Store Bay 1</option>
                <option value="Central Warehouse Gate 3">Central Warehouse Gate 3</option>
                <option value="Pharmacy Main Vault">Pharmacy Main Vault</option>
                <option value="Surgical Reserve Bay">Surgical Reserve Bay</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination Location *</label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Pharmacy Dispensary B">Pharmacy Dispensary B</option>
                <option value="IPD Pharmacy Sub-Store">IPD Pharmacy Sub-Store</option>
                <option value="ICU Ward Pharmacy Station">ICU Ward Pharmacy Station</option>
                <option value="Emergency Supply Cabinet">Emergency Supply Cabinet</option>
                <option value="Operation Theatre Dispensary">Operation Theatre Dispensary</option>
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
                    {i.itemName} ({i.itemCode}) — Batch: {i.batchNumber} | Available: {i.currentStock} units {i.currentStock <= 0 ? '(OUT OF STOCK)' : ''}
                  </option>
                ))}
              </select>
              {(() => {
                const currentProd = availableProducts.find((i) => i.itemCode === formData.itemCode);
                const stock = currentProd?.currentStock ?? 0;
                return (
                  <p className={`text-[11px] font-bold mt-1.5 flex items-center justify-between ${stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    <span>Available Stock Quantity:</span>
                    <span className="font-black text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{stock} units</span>
                  </p>
                );
              })()}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity to Transfer *</label>
              <input
                type="number"
                min={1}
                max={Math.max(1, availableProducts.find((i) => i.itemCode === formData.itemCode)?.currentStock ?? 1)}
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
              {(() => {
                const currentProd = availableProducts.find((i) => i.itemCode === formData.itemCode);
                const stock = currentProd?.currentStock ?? 0;
                const isExceeded = formData.quantity > stock;
                return isExceeded ? (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">
                    ⚠️ Quantity ({formData.quantity}) exceeds available stock ({stock} units). Only up to {stock} units can be transferred.
                  </p>
                ) : null;
              })()}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transfer Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="In Transit">In Transit</option>
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
              </select>
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
              disabled={(() => {
                const currentProd = availableProducts.find((i) => i.itemCode === formData.itemCode);
                const stock = currentProd?.currentStock ?? 0;
                return stock <= 0 || formData.quantity > stock;
              })()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {selectedEntry ? 'Update Transfer' : 'Initiate Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Stock Transfer"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete transfer record <span className="font-bold text-slate-900">{selectedEntry.transferNumber}</span> ({selectedEntry.itemName})?
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
