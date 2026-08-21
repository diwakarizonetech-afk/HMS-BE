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
import { ReorderItem, Vendor } from '../../types/store';
import { useHMS } from '../../context/HMSContext';
import { fetchReorderManagementApi, fetchStockInwardApi, fetchVendorsApi } from '../../services/api';
import { Modal } from '../../components/common/Modal';

export const ReorderManagementPage: React.FC = () => {
  const { addToast, storeItems, purchaseOrders, addPurchaseOrder } = useHMS();
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    fetchVendorsApi()
      .then((data) => {
        if (Array.isArray(data)) {
          setVendors(
            data.map((v: any): Vendor => ({
              id: v.id,
              vendorCode: v.vendor_code || v.vendorCode || '',
              vendorName: v.vendor_name || v.vendorName || '',
              category: v.category || 'Pharmaceuticals',
              contactPerson: v.contact_person || v.contactPerson || '',
              mobile: v.mobile || v.phone || '',
              email: v.email || '',
              gstNumber: v.gst_number || v.gstNumber || '',
              pan: v.pan || '',
              address: v.address || '',
              city: v.city || 'Bengaluru',
              state: v.state || 'Karnataka',
              country: v.country || 'India',
              paymentTerms: v.payment_terms || v.paymentTerms || 'Net 30',
              status: v.status || 'Active',
            }))
          );
        }
      })
      .catch((err) => console.warn('Error fetching vendors:', err));
  }, []);

  useEffect(() => {
    Promise.all([
      fetchReorderManagementApi().catch(() => []),
      fetchStockInwardApi().catch(() => []),
    ]).then(([reorderData, inwardData]) => {
      const items: ReorderItem[] = [];
      const seen = new Set<string>();

      // Track items that already have purchase orders created
      const poItemCodes = new Set<string>();
      (purchaseOrders || []).forEach((po) => {
        if (po && po.items) {
          po.items.forEach((i: any) => {
            const code = i.itemCode || i.item_code;
            if (code) poItemCodes.add(code);
          });
        }
      });

      if (Array.isArray(reorderData) && reorderData.length > 0) {
        reorderData.forEach((b: any) => {
          const code = b.item_code || b.itemCode || 'ITM-00';
          seen.add(code);
          items.push({
            id: b.id || `reorder-${code}`,
            itemCode: code,
            itemName: b.item_name || b.itemName || 'Item',
            category: b.category || 'Pharmaceuticals',
            currentStock: b.current_stock ?? b.currentStock ?? 0,
            reorderLevel: b.reorder_level ?? b.reorderLevel ?? 20,
            minStock: b.min_stock ?? b.minStock ?? 10,
            maxStock: b.max_stock ?? b.maxStock ?? 100,
            requiredQuantity: b.required_quantity ?? b.requiredQuantity ?? 50,
            unit: b.unit || 'Box',
            suggestedVendor: b.vendor_name || b.suggestedVendor || 'Primary Supplier',
            urgency: (b.current_stock ?? 0) === 0 ? 'Critical' : 'Moderate',
            status: poItemCodes.has(code) ? 'PO Created' : 'Pending',
          });
        });
      }

      storeItems.forEach((i) => {
        if (!seen.has(i.itemCode) && (i.currentStock || 0) <= (i.reorderLevel || 20)) {
          seen.add(i.itemCode);
          items.push({
            id: `reorder-${i.id}`,
            itemCode: i.itemCode,
            itemName: i.itemName,
            category: i.category,
            currentStock: i.currentStock,
            reorderLevel: i.reorderLevel,
            minStock: i.minStock,
            maxStock: i.maxStock,
            requiredQuantity: Math.max((i.maxStock || 100) - (i.currentStock || 0), 10),
            unit: i.unit,
            suggestedVendor: 'MedLife Distributors',
            urgency: (i.currentStock || 0) === 0 ? 'Critical' : 'Moderate',
            status: poItemCodes.has(i.itemCode) ? 'PO Created' : 'Pending',
          });
        }
      });

      if (Array.isArray(inwardData)) {
        inwardData.forEach((inw: any) => {
          const code = inw.item_code || inw.itemCode || '';
          const name = inw.item_name || inw.itemName || '';
          const qty = inw.quantity || 0;
          if (code && !seen.has(code) && qty < 50) {
            seen.add(code);
            items.push({
              id: `inw-reorder-${code}`,
              itemCode: code,
              itemName: name,
              category: 'Pharmaceuticals',
              currentStock: qty,
              reorderLevel: 50,
              minStock: 10,
              maxStock: 200,
              requiredQuantity: 150,
              unit: 'Strip of 10',
              suggestedVendor: inw.supplier || inw.supplier_name || 'Primary Vendor',
              urgency: qty === 0 ? 'Critical' : 'Moderate',
              status: poItemCodes.has(code) ? 'PO Created' : 'Pending',
            });
          }
        });
      }

      setReorderItems(items);
    }).catch(() => {});
  }, [storeItems, purchaseOrders]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Auto-PO Modal & Delete Modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReorderItem, setSelectedReorderItem] = useState<ReorderItem | null>(null);
  const [orderQty, setOrderQty] = useState(500);
  const [vendorName, setVendorName] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(50);
  const [poStatus, setPoStatus] = useState<'Approved' | 'Pending'>('Approved');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenPoModal = (item: ReorderItem) => {
    setSelectedReorderItem(item);
    setOrderQty(item.requiredQuantity);
    setVendorName(item.suggestedVendor || vendors[0]?.vendorName || 'Primary Supplier');
    const matchedItem = storeItems.find((s) => s.itemCode === item.itemCode);
    setUnitPrice(matchedItem?.unitPrice || 50);
    setPoStatus('Approved');
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

  const handleQuickApprove = async (item: ReorderItem) => {
    const matchedItem = storeItems.find((s) => s.itemCode === item.itemCode);
    const price = matchedItem?.unitPrice || 50;
    const poNum = `PO-2026-${String((purchaseOrders || []).length + 1).padStart(3, '0')}`;
    const poData = {
      poNumber: poNum,
      vendorName: item.suggestedVendor || 'Primary Vendor',
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Approved',
      remarks: `Auto-generated & approved from Reorder Management for low stock alert (${item.itemName})`,
      items: [
        {
          itemId: matchedItem?.id || item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.requiredQuantity,
          unitPrice: price,
          discount: 0,
          gst: 18,
          total: price * item.requiredQuantity * 1.18,
        },
      ],
    };

    try {
      await addPurchaseOrder(poData);
      setReorderItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'PO Created' } : i))
      );
      addToast(
        'success',
        'Reorder Approved & PO Generated',
        `Approved reorder for ${item.itemName} and created Purchase Order ${poNum} with status Approved.`
      );
    } catch (err: any) {
      console.error('Error generating PO from reorder:', err);
      addToast('error', 'Approval Failed', err?.message || 'Could not generate Purchase Order.');
    }
  };

  const handleGeneratePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReorderItem) return;
    setIsSubmitting(true);
    const matchedItem = storeItems.find((s) => s.itemCode === selectedReorderItem.itemCode);
    const poNum = `PO-2026-${String((purchaseOrders || []).length + 1).padStart(3, '0')}`;
    const poData = {
      poNumber: poNum,
      vendorName: vendorName || selectedReorderItem.suggestedVendor || 'Primary Supplier',
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: poStatus,
      remarks: `Generated from Reorder Management for low stock alert (${selectedReorderItem.itemName})`,
      items: [
        {
          itemId: matchedItem?.id || selectedReorderItem.id,
          itemCode: selectedReorderItem.itemCode,
          itemName: selectedReorderItem.itemName,
          quantity: orderQty,
          unitPrice: unitPrice,
          discount: 0,
          gst: 18,
          total: unitPrice * orderQty * 1.18,
        },
      ],
    };

    try {
      await addPurchaseOrder(poData);
      setReorderItems((prev) =>
        prev.map((i) => (i.id === selectedReorderItem.id ? { ...i, status: 'PO Created' } : i))
      );
      addToast(
        'success',
        `PO Issued (${poStatus})`,
        `Created Purchase Order ${poNum} for ${orderQty} units of ${selectedReorderItem.itemName}`
      );
      setIsPoModalOpen(false);
    } catch (err: any) {
      console.error('API error generating PO:', err);
      addToast('error', 'PO Generation Failed', err?.message || 'Could not issue Purchase Order.');
    } finally {
      setIsSubmitting(false);
    }
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
            Automated low-stock threshold detection, approval workflow & 1-click Purchase Order generation for items below safety buffer.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-900">{reorderItems.filter((i) => i.status !== 'PO Created' && i.status !== 'Approved').length} Items Require Action</p>
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
                <th className="py-3.5 px-4">Reorder Status</th>
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
                    <td className="py-3.5 px-4">
                      {item.status === 'PO Created' || item.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PO Created & Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'PO Created' || item.status === 'Approved' ? (
                          <a
                            href="/store/purchase-orders"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>View PO</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          </a>
                        ) : (
                          <>
                            <button
                              onClick={() => handleQuickApprove(item)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                              title="Approve Reorder & Issue Purchase Order directly"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Issue PO</span>
                            </button>
                            <button
                              onClick={() => handleOpenPoModal(item)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                              title="Customize Purchase Order details"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Custom PO</span>
                            </button>
                            <button
                              onClick={() => handleOpenDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Dismiss Alert"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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
          subtitle={`Auto-populated with vendor details & item details`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Vendor *</label>
                {vendors.length > 0 ? (
                  <select
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.vendorName}>
                        {v.vendorName} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PO Status upon Creation *</label>
                <select
                  value={poStatus}
                  onChange={(e) => setPoStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Approved">Approved (Ready for Goods Receipt)</option>
                  <option value="Pending">Pending (Requires PO Approval)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Est. Unit Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
              <span className="font-medium text-blue-900">Estimated Total Amount (incl. 18% GST):</span>
              <span className="font-black text-blue-700 text-sm">
                ₹{(orderQty * unitPrice * 1.18).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Issuing PO...' : 'Issue Purchase Order Now'}
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
