import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  Package,
  Calendar,
  Warehouse,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';
import { StockInward } from '../../types/store';
import { fetchStockInwardApi, createStockInwardApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const StockInwardPage: React.FC = () => {
  const { addToast, storeItems } = useHMS();
  const [inwardList, setInwardList] = useState<StockInward[]>([]);

  const loadInwardList = async () => {
    try {
      const data = await fetchStockInwardApi();
      if (Array.isArray(data)) {
        setInwardList(data.map((i: any): StockInward => ({
          id: i.id,
          inwardNumber: i.inward_number || i.inwardNumber,
          date: i.date,
          supplier: i.supplier_name || i.supplier || '',
          poNumber: i.po_number || i.poNumber || '',
          itemCode: i.item_code || i.itemCode,
          itemName: i.item_name || i.itemName,
          batchNumber: i.batch_number || i.batchNumber || '',
          quantity: i.quantity,
          unitPrice: i.unit_price ?? i.unitPrice ?? 0,
        })));
      }
    } catch (err) {
      console.warn('Error loading stock inward from API:', err);
    }
  };

  useEffect(() => {
    loadInwardList();
  }, []);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockInward | null>(null);

  const initialForm: Omit<StockInward, 'id'> = {
    inwardNumber: `INW-2026-${String(inwardList.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    supplier: 'MedLife Distributors',
    poNumber: 'PO-2026-001',
    itemCode: storeItems[0]?.itemCode || 'MED-001',
    itemName: storeItems[0]?.itemName || 'Paracetamol 500mg',
    batchNumber: 'BAT-2026-X1',
    quantity: 100,
    unitPrice: 15,
  };

  const [formData, setFormData] = useState<Omit<StockInward, 'id'>>(initialForm);

  const handleOpenCreate = () => {
    setSelectedEntry(null);
    setFormData({
      ...initialForm,
      inwardNumber: `INW-2026-${String(inwardList.length + 1).padStart(3, '0')}`,
      itemCode: storeItems[0]?.itemCode || 'MED-001',
      itemName: storeItems[0]?.itemName || 'Paracetamol 500mg',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: StockInward) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: StockInward) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEntry) {
      setInwardList((prev) => prev.filter((i) => i.id !== selectedEntry.id));
      addToast('info', 'Record Deleted', `Inward entry ${selectedEntry.inwardNumber} deleted.`);
      setIsDeleteModalOpen(false);
      setSelectedEntry(null);
    }
  };

  const handleItemSelect = (itemCode: string) => {
    const matched = storeItems.find((i) => i.itemCode === itemCode);
    if (matched) {
      setFormData({
        ...formData,
        itemCode: matched.itemCode,
        itemName: matched.itemName,
      });
    }
  };

  const handleSaveInward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createStockInwardApi(formData);
      const mapped: StockInward = {
        id: created.id,
        inwardNumber: created.inward_number || created.inwardNumber || formData.inwardNumber,
        date: created.date || formData.date,
        supplier: created.supplier_name || created.supplier || formData.supplier,
        poNumber: created.po_number || created.poNumber || formData.poNumber,
        itemCode: created.item_code || created.itemCode || formData.itemCode,
        itemName: created.item_name || created.itemName || formData.itemName,
        batchNumber: created.batch_number || created.batchNumber || formData.batchNumber,
        quantity: created.quantity || formData.quantity,
        unitPrice: created.unit_price ?? created.unitPrice ?? formData.unitPrice,
      };
      setInwardList((prev) => [mapped, ...prev]);
      addToast('success', 'Stock Inward Logged (API)', `Saved ${formData.quantity} units of ${formData.itemName} to database.`);
    } catch (err) {
      console.warn('API error logging stock inward:', err);
      addToast('error', 'Save Failed', 'Could not save stock inward to database.');
    }
    setIsModalOpen(false);
  };

  const filteredList = useMemo(() => {
    return inwardList.filter(
      (entry) =>
        (entry.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.itemCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.batchNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.supplier || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inwardList, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Stock Inward</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Inward Receipts & Batch Assignment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record fresh inventory receipts, batch numbers, manufacturing/expiry dates & warehouse bays.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Inward Entry</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Item, Batch #, Supplier..."
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
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Item & Code</th>
                <th className="py-3.5 px-4">Quantity Inward</th>
                <th className="py-3.5 px-4">Batch Number</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Warehouse & Received By</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length > 0 ? (
                paginatedList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {row.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{row.itemName}</p>
                      <span className="text-[10px] text-blue-600 font-mono font-semibold">{row.itemCode}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shrink-0">
                        +{row.quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {row.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {row.expiryDate}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">
                      {row.supplier}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-bold text-slate-900">{row.warehouse}</p>
                      <p className="text-[10px] text-slate-500">{row.receivedBy}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                          title="Edit Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No stock inward records found.
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
            <span className="font-bold text-slate-800">{filteredList.length}</span> records
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEntry ? 'Edit Stock Inward Entry' : 'Record Stock Inward'}
        subtitle={selectedEntry ? `Modify inward record details` : 'Log received stock into store inventory'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveInward} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Item *</label>
              <select
                value={formData.itemCode}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {storeItems.map((i) => (
                  <option key={i.id} value={i.itemCode}>
                    {i.itemName} ({i.itemCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity Received *</label>
              <input
                type="number"
                min={1}
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="BAT-10029X"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="MedLife Distributors"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Warehouse Bay / Location</label>
              <input
                type="text"
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                placeholder="Central Store Bay 1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
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
              {selectedEntry ? 'Update Inward Log' : 'Save Stock Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Stock Inward"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete inward entry for <span className="font-bold text-slate-900">{selectedEntry.itemName}</span> ({selectedEntry.batchNumber})?
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
