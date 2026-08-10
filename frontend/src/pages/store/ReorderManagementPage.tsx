import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { ReorderItem } from '../../types/store';
import { useHMS } from '../../context/HMSContext';
import { fetchReorderBatchesApi } from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const ReorderManagementPage: React.FC = () => {
  const { addToast, storeItems } = useHMS();
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);

  useEffect(() => {
    // Dynamically derive reorder alerts from storeItems in DB
    const derived: ReorderItem[] = storeItems
      .filter((i) => (i.currentStock || 0) <= (i.reorderLevel || 0))
      .map((i): ReorderItem => ({
        id: `reorder-${i.id}`,
        itemCode: i.itemCode,
        itemName: i.itemName,
        category: i.category,
        currentStock: i.currentStock,
        reorderLevel: i.reorderLevel,
        minStock: i.minStock,
        maxStock: i.maxStock,
        requiredQuantity: (i.maxStock || 100) - (i.currentStock || 0),
        unit: i.unit,
        suggestedVendor: 'Primary Supplier',
        urgency: (i.currentStock || 0) === 0 ? 'Critical' : 'Moderate',
        status: 'Pending',
      }));

    fetchReorderBatchesApi()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const apiItems = data.map((b: any): ReorderItem => ({
            id: b.id,
            itemCode: b.item_code || b.itemCode || 'ITM-00',
            itemName: b.item_name || b.itemName || 'Batch Item',
            category: b.category || 'Pharmaceuticals',
            currentStock: b.current_stock ?? b.currentStock ?? 0,
            reorderLevel: b.reorder_level ?? b.reorderLevel ?? 10,
            minStock: b.min_stock ?? b.minStock ?? 5,
            maxStock: b.max_stock ?? b.maxStock ?? 100,
            requiredQuantity: b.required_quantity ?? b.requiredQuantity ?? 50,
            unit: b.unit || 'Box',
            suggestedVendor: b.vendor_name || b.suggestedVendor || 'Primary Vendor',
            urgency: b.urgency || 'Moderate',
            status: b.status || 'Pending',
          }));
          setReorderItems(apiItems);
        } else {
          setReorderItems(derived);
        }
      })
      .catch(() => {
        setReorderItems(derived);
      });
  }, [storeItems]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Auto-PO Modal & Delete Modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReorderItem, setSelectedReorderItem] = useState<ReorderItem | null>(null);
  const [orderQty, setOrderQty] = useState(500);

  const handleOpenPoModal = (item: ReorderItem) => {
    setSelectedReorderItem(item);
    setOrderQty(item.requiredQuantity);
    setIsPoModalOpen(true);
  };

  const handleOpenDelete = (item: ReorderItem) => {
    setSelectedReorderItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedReorderItem) {
      setReorderItems((prev) => prev.filter((i) => i.id !== selectedReorderItem.id));
      addToast('info', 'Alert Dismissed', `Dismissed reorder alert for ${selectedReorderItem.itemName}.`);
      setIsDeleteModalOpen(false);
      setSelectedReorderItem(null);
    }
  };

  const handleGeneratePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReorderItem) return;

    addToast(
      'success',
      'PO Auto-Generated',
      `Generated Purchase Order for ${orderQty} units of ${selectedReorderItem.itemName} to ${selectedReorderItem.suggestedVendor}`
    );

    // Remove or update item status
    setReorderItems((prev) => prev.filter((i) => i.id !== selectedReorderItem.id));
    setIsPoModalOpen(false);
  };

  const filteredItems = useMemo(() => {
    return reorderItems.filter(
      (item) =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.suggestedVendor || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reorderItems, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Reorder Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Reorder Management & Automated Replenishment</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated low-stock threshold detection & 1-click Purchase Order generation for items below safety buffer.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-900">{reorderItems.length} Items Require Reorder</p>
            <p className="text-[10px] text-amber-700">Stock below min threshold</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Low Stock Item, Code, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
      </div>

      {/* Reorder Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item Name & Code</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Reorder Level</th>
                <th className="py-3.5 px-4">Suggested Reorder Qty</th>
                <th className="py-3.5 px-4">Preferred Vendor</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length > 0 ? (
                paginatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.itemName}</p>
                          <span className="text-[10px] text-blue-600 font-mono font-semibold">{item.itemCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg text-xs">
                        {item.currentStock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.reorderLevel} units
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      +{item.requiredQuantity} units
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.suggestedVendor}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenPoModal(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Generate PO</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Dismiss Alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    All items are adequately stocked! No reorders pending.
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
            <span className="font-bold text-slate-800">{filteredItems.length}</span> low stock alerts
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

      {/* Auto PO Modal */}
      {selectedReorderItem && (
        <Modal
          isOpen={isPoModalOpen}
          onClose={() => setIsPoModalOpen(false)}
          title={`Generate Purchase Order: ${selectedReorderItem.itemName}`}
          subtitle={`Auto-populated with vendor ${selectedReorderItem.suggestedVendor}`}
          maxWidth="lg"
        >
          <form onSubmit={handleGeneratePo} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Item Code:</span>
                <span className="font-bold text-blue-600 font-mono">{selectedReorderItem.itemCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Current Stock Level:</span>
                <span className="font-bold text-rose-600">{selectedReorderItem.currentStock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Safety Buffer (Reorder Threshold):</span>
                <span className="font-bold text-slate-800">{selectedReorderItem.reorderLevel} units</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Vendor</label>
              <input
                type="text"
                disabled
                value={selectedReorderItem.suggestedVendor}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Order Quantity *</label>
              <input
                type="number"
                min={1}
                required
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Issue Purchase Order Now
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedReorderItem && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Dismiss Reorder Alert"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to dismiss the low-stock reorder alert for <span className="font-bold text-slate-900">{selectedReorderItem.itemName}</span>?
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
                Yes, Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
