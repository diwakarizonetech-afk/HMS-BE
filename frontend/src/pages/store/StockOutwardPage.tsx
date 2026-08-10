import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  Building2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Send,
  UserCheck,
  Edit,
  Trash2,
} from 'lucide-react';
import { StockOutward } from '../../types/store';
import { fetchStockOutwardApi, createStockOutwardApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const StockOutwardPage: React.FC = () => {
  const { addToast, storeItems } = useHMS();
  const [outwardList, setOutwardList] = useState<StockOutward[]>([]);

  const loadOutwardList = async () => {
    try {
      const data = await fetchStockOutwardApi();
      if (Array.isArray(data)) {
        setOutwardList(data.map((o: any): StockOutward => ({
          id: o.id,
          outwardNumber: o.outward_number || o.outwardNumber,
          date: o.date,
          department: o.issued_to_department || o.department || '',
          receivedBy: o.issued_to_person || o.receivedBy || '',
          itemCode: o.item_code || o.itemCode,
          itemName: o.item_name || o.itemName || '',
          batchNumber: o.batch_number || o.batchNumber || '',
          quantity: o.quantity,
          reason: o.reason || 'Department Request',
        })));
      }
    } catch (err) {
      console.warn('Error fetching stock outward from API:', err);
    }
  };

  useEffect(() => {
    loadOutwardList();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockOutward | null>(null);

  const initialForm: Omit<StockOutward, 'id'> = {
    outwardNumber: `OUT-2026-${String(outwardList.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    department: 'ICU Ward 3',
    receivedBy: 'Nurse Anita Sharma',
    itemCode: storeItems[0]?.itemCode || 'MED-001',
    itemName: storeItems[0]?.itemName || 'Paracetamol 500mg',
    batchNumber: 'BAT-2026-X1',
    quantity: 20,
    reason: 'Routine Consumption',
  };

  const [formData, setFormData] = useState<Omit<StockOutward, 'id'>>(initialForm);

  const handleOpenCreate = () => {
    setSelectedEntry(null);
    setFormData({
      ...initialForm,
      outwardNumber: `OUT-2026-${String(outwardList.length + 1).padStart(3, '0')}`,
      itemCode: storeItems[0]?.itemCode || 'MED-001',
      itemName: storeItems[0]?.itemName || 'Paracetamol 500mg',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: StockOutward) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: StockOutward) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEntry) {
      setOutwardList((prev) => prev.filter((i) => i.id !== selectedEntry.id));
      addToast('info', 'Record Deleted', `Outward entry ${selectedEntry.outwardNumber} deleted.`);
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

  const handleSaveOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createStockOutwardApi(formData);
      const mapped: StockOutward = {
        id: created.id,
        outwardNumber: created.outward_number || created.outwardNumber || formData.outwardNumber,
        date: created.date || formData.date,
        department: created.issued_to_department || created.department || formData.department,
        receivedBy: created.issued_to_person || created.receivedBy || formData.receivedBy,
        itemCode: created.item_code || created.itemCode || formData.itemCode,
        itemName: created.item_name || created.itemName || formData.itemName,
        batchNumber: created.batch_number || created.batchNumber || formData.batchNumber,
        quantity: created.quantity || formData.quantity,
        reason: formData.reason,
        issuedBy: created.issued_by || created.issuedBy || 'Store Manager',
      };
      setOutwardList((prev) => [mapped, ...prev]);
      addToast('success', 'Stock Issued (API)', `Issued ${formData.quantity} units to ${formData.department} in database.`);
    } catch (err: any) {
      console.warn('API error logging stock outward:', err);
      addToast('error', 'Save Failed', err.message || 'Could not save stock outward to database.');
    }
    setIsModalOpen(false);
  };

  const filteredList = useMemo(() => {
    return outwardList.filter(
      (entry) =>
        entry.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reason.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [outwardList, searchQuery]);

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
            <span className="text-blue-600">Stock Outward</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Outward & Departmental Issuance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Issue stock supplies to Pharmacy, Operation Theatre (OT), ICU Wards, Pathology Lab, and Doctor requisitions.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Issue Stock to Dept</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Department, Item, Reason..."
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
                <th className="py-3.5 px-4">Department / Unit</th>
                <th className="py-3.5 px-4">Item Issued</th>
                <th className="py-3.5 px-4">Issued Qty</th>
                <th className="py-3.5 px-4">Requested By / Doctor</th>
                <th className="py-3.5 px-4">Issuance Reason</th>
                <th className="py-3.5 px-4">Issued By</th>
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
                      <span className="font-bold text-slate-900 block">{row.department}</span>
                      <span className="text-[10px] text-slate-500">
                        {row.pharmacy || row.operationTheatre || row.ward || row.lab || 'Main Unit'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{row.itemName}</p>
                      <span className="text-[10px] text-blue-600 font-mono font-semibold">{row.itemCode}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shrink-0">
                        -{row.quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">
                      {row.doctor || 'Dept Head'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {row.reason}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {row.issuedBy}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                          title="Edit Issuance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Delete Issuance"
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
                    No stock outward history records found.
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEntry ? 'Edit Stock Issuance' : 'Issue Stock (Stock Outward)'}
        subtitle="Specify receiving department, ward, doctor & stock quantities"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveOutward} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Pharmacy">Pharmacy</option>
                <option value="Operation Theatre">Operation Theatre</option>
                <option value="ICU Wards">ICU Wards</option>
                <option value="Pathology Lab">Pathology Lab</option>
                <option value="Radiology">Radiology</option>
                <option value="Emergency Department">Emergency Department</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sub Unit / Ward / Lab</label>
              <input
                type="text"
                value={formData.ward || formData.operationTheatre || formData.lab || ''}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                placeholder="e.g. OT Suite 2 / ICU Bed Ward"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Item *</label>
              <select
                value={formData.itemCode}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {storeItems.map((i) => (
                  <option key={i.id} value={i.itemCode}>
                    {i.itemName} ({i.itemCode}) - Avail: {i.currentStock}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity to Issue *</label>
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
              <label className="block font-bold text-slate-700 mb-1">Requisitioning Doctor / Officer</label>
              <input
                type="text"
                value={formData.doctor}
                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                placeholder="Dr. Vikram Malhotra"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Issuance Reason</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Regular Ward Refill / Emergency Kit"
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
              {selectedEntry ? 'Update Stock Issuance' : 'Issue Stock Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Stock Outward"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete outward issuance record for <span className="font-bold text-slate-900">{selectedEntry.itemName}</span> to <span className="font-bold text-slate-900">{selectedEntry.department}</span>?
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
