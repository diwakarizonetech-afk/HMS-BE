import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Edit,
  Trash2,
} from 'lucide-react';
import { PurchaseOrder, POItem, Vendor } from '../../types/store';
import { fetchVendorsApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const PurchaseOrdersPage: React.FC = () => {
  const { addToast, purchaseOrders: contextPOs, storeItems, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = useHMS();
  const purchaseOrders = contextPOs;
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    fetchVendorsApi().then((data) => {
      if (Array.isArray(data)) {
        setVendors(data.map((v: any): Vendor => ({
          id: v.id,
          vendorCode: v.vendor_code || v.vendorCode,
          vendorName: v.vendor_name || v.vendorName,
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
        })));
      }
    }).catch((err) => console.warn('Error loading vendors in PO page:', err));
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Form State
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // PO Line Items
  const [poItems, setPoItems] = useState<POItem[]>([]);

  const calculateLineTotal = (qty: number, price: number, discPct: number, gstPct: number) => {
    const discounted = qty * price * (1 - discPct / 100);
    return discounted * (1 + gstPct / 100);
  };

  const handleAddItemRow = () => {
    const defaultItem = storeItems[0];
    const newRow: POItem = {
      id: `poi-${Date.now()}`,
      itemId: defaultItem?.id || '',
      itemCode: defaultItem?.itemCode || '',
      itemName: defaultItem?.itemName || '',
      quantity: 10,
      unitPrice: defaultItem?.unitPrice || 0,
      discount: 0,
      gst: defaultItem?.gstPercentage || 0,
      total: calculateLineTotal(10, defaultItem?.unitPrice || 0, 0, defaultItem?.gstPercentage || 0),
    };
    setPoItems((prev) => [...prev, newRow]);
  };

  const handleUpdateItemRow = (id: string, field: keyof POItem, value: any) => {
    setPoItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        let updated = { ...row, [field]: value };
        if (field === 'itemId') {
          const matched = storeItems.find((i) => i.id === value);
          if (matched) {
            updated.itemCode = matched.itemCode;
            updated.itemName = matched.itemName;
            updated.unitPrice = matched.unitPrice;
            updated.gst = matched.gstPercentage;
          }
        }

        updated.total = calculateLineTotal(
          updated.quantity,
          updated.unitPrice,
          updated.discount,
          updated.gst
        );
        return updated;
      })
    );
  };

  const handleRemoveItemRow = (id: string) => {
    if (poItems.length === 1) {
      addToast('error', 'Action Restricted', 'Purchase Order must have at least 1 item.');
      return;
    }
    setPoItems((prev) => prev.filter((r) => r.id !== id));
  };

  // Grand Total Calculation
  const subTotal = useMemo(() => poItems.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0), [poItems]);
  const totalDiscount = useMemo(
    () => poItems.reduce((sum, r) => sum + r.quantity * r.unitPrice * (r.discount / 100), 0),
    [poItems]
  );
  const totalGst = useMemo(
    () =>
      poItems.reduce((sum, r) => {
        const discounted = r.quantity * r.unitPrice * (1 - r.discount / 100);
        return sum + discounted * (r.gst / 100);
      }, 0),
    [poItems]
  );
  const grandTotal = subTotal - totalDiscount + totalGst;

  // Create / Edit / Delete Handlers
  const handleOpenCreate = () => {
    setSelectedPO(null);
    setSelectedVendorId(vendors[0]?.id || '');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setExpectedDelivery(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    if (storeItems.length > 0) {
      const first = storeItems[0];
      setPoItems([
        {
          id: `poi-${Date.now()}`,
          itemId: first.id,
          itemCode: first.itemCode,
          itemName: first.itemName,
          quantity: 10,
          unitPrice: first.unitPrice,
          discount: 0,
          gst: first.gstPercentage,
          total: calculateLineTotal(10, first.unitPrice, 0, first.gstPercentage),
        },
      ]);
    } else {
      setPoItems([]);
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setSelectedVendorId(po.vendorId);
    setPurchaseDate(po.purchaseDate);
    setExpectedDelivery(po.expectedDelivery);
    setPoItems(po.items);
    setIsCreateModalOpen(true);
  };

  const handleOpenDelete = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedPO) {
      await deletePurchaseOrder(selectedPO.id);
      setIsDeleteModalOpen(false);
      setSelectedPO(null);
    }
  };

  // Submit PO
  const handleSavePO = async (asDraft: boolean) => {
    const vendor = vendors.find((v) => v.id === selectedVendorId) || { id: selectedVendorId, vendorName: 'General Vendor' };

    if (selectedPO) {
      const updatedData = {
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        purchaseDate,
        expectedDelivery,
        items: poItems,
        subTotal,
        totalDiscount,
        totalGst,
        totalAmount: grandTotal,
        status: asDraft ? 'Draft' : selectedPO.status,
      };
      await updatePurchaseOrder(selectedPO.id, updatedData);
    } else {
      const poNum = `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
      const newPO: Omit<PurchaseOrder, 'id'> = {
        poNumber: poNum,
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        purchaseDate,
        expectedDelivery,
        items: poItems,
        subTotal,
        totalDiscount,
        totalGst,
        totalAmount: grandTotal,
        status: asDraft ? 'Draft' : 'Pending',
        createdDate: new Date().toISOString().split('T')[0],
      };

      await addPurchaseOrder(newPO);
    }
    setIsCreateModalOpen(false);
  };

  const handleStatusChange = async (id: string, newStatus: PurchaseOrder['status']) => {
    try {
      await updatePurchaseOrder(id, { status: newStatus });
      addToast('info', 'Status Updated', `PO status changed to ${newStatus}.`);
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update PO status.');
    }
  };

  const filteredPOs = useMemo(() => {
    return (purchaseOrders || []).filter((po) => {
      if (!po) return false;
      const poNum = (po.poNumber || (po as any).po_number || '').toLowerCase();
      const vName = (po.vendorName || (po as any).vendor_name || '').toLowerCase();
      const query = (searchQuery || '').toLowerCase();
      const matchesSearch = poNum.includes(query) || vName.includes(query);
      const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage) || 1;
  const paginatedPOs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPOs.slice(start, start + itemsPerPage);
  }, [filteredPOs, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Purchase Orders</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Purchase Orders (PO) Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Issue official purchase orders to vendors, track total amounts, tax & approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PO Number, Vendor Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Fulfilled">Fulfilled</option>
          </select>
        </div>
      </div>

      {/* Main PO Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-4">Vendor</th>
                <th className="py-3.5 px-4">Purchase / Delivery Date</th>
                <th className="py-3.5 px-4">Line Items</th>
                <th className="py-3.5 px-4">Total Amount (₹)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedPOs.length > 0 ? (
                paginatedPOs.map((po) => {
                  const totalAmt = Number(po.totalAmount ?? (po as any).total_amount ?? 0);
                  const itemsList = po.items || [];
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600">{po.poNumber}</span>
                        <p className="text-[10px] text-slate-400">Created: {po.createdDate || ''}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {po.vendorName || ''}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <p className="text-slate-700">Po Date: {po.purchaseDate || ''}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Exp. Delivery: {po.expectedDelivery || ''}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{itemsList.length} item(s)</span>
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">
                          {itemsList.map((i) => i.itemName || (i as any).item_name || '').join(', ')}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        ₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : po.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : po.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : po.status === 'Fulfilled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(po)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          title="Edit PO"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(po)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Print PO"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {po.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(po.id, 'Approved')}
                              className="px-2 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(po.id, 'Rejected')}
                              className="px-2 py-1 bg-rose-600 text-white rounded-md text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedPOs.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredPOs.length}</span> orders
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

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order (PO)"
        subtitle="Specify vendor, items, unit prices, discounts & tax line calculations"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Vendor *</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendorName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">PO Items Breakdown</h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {poItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs items-center"
                >
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block">Item</label>
                    <select
                      value={item.itemId}
                      onChange={(e) => handleUpdateItemRow(item.id, 'itemId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-900 outline-none text-xs"
                    >
                      {storeItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.itemName} ({i.itemCode}) — Avail: {i.currentStock ?? i.openingStock ?? 0} {i.unit || 'Box'}s
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const prod = storeItems.find((s) => s.id === item.itemId);
                      if (!prod) return null;
                      const avail = prod.currentStock ?? prod.openingStock ?? 0;
                      const isLow = avail <= (prod.minStock || 10);
                      return (
                        <span className={`text-[10px] font-bold block mt-0.5 ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                          Avail Stock: {avail} {prod.unit || 'Box'}(es) {isLow ? '⚠️ Low' : '✓ Available'}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemRow(item.id, 'quantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Price (₹)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItemRow(item.id, 'unitPrice', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Disc % / GST %</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Disc"
                        value={item.discount}
                        onChange={(e) => handleUpdateItemRow(item.id, 'discount', Number(e.target.value))}
                        className="w-1/2 bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 font-semibold text-slate-900 outline-none text-center"
                      />
                      <input
                        type="number"
                        placeholder="GST"
                        value={item.gst}
                        onChange={(e) => handleUpdateItemRow(item.id, 'gst', Number(e.target.value))}
                        className="w-1/2 bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 font-semibold text-slate-900 outline-none text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pl-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total</span>
                      <span className="font-bold text-slate-900">₹{(item.total || 0).toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(item.id)}
                      className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Calculation Summary */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 flex flex-col sm:flex-row justify-between items-center text-xs gap-3">
            <div className="space-y-1">
              <p className="text-slate-600">Subtotal: <span className="font-bold text-slate-900">₹{(subTotal || 0).toFixed(2)}</span></p>
              <p className="text-slate-600">Total Discount: <span className="font-bold text-emerald-600">-₹{(totalDiscount || 0).toFixed(2)}</span></p>
              <p className="text-slate-600">Total GST Tax: <span className="font-bold text-blue-600">+₹{(totalGst || 0).toFixed(2)}</span></p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block">Calculated Grand Total</span>
              <span className="text-xl font-black text-blue-700">₹{(grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleSavePO(true)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Save Draft
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePO(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Create PO & Submit
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* View PO Details Modal */}
      {selectedPO && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          subtitle={`Vendor: ${selectedPO.vendorName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 font-medium">Purchase Date:</span>
                <p className="font-bold text-slate-900">{selectedPO.purchaseDate}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Expected Delivery:</span>
                <p className="font-bold text-emerald-600">{selectedPO.expectedDelivery}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">PO Status:</span>
                <p className="font-bold text-blue-600">{selectedPO.status}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Grand Total:</span>
                <p className="font-black text-slate-900 text-sm">₹{Number(selectedPO.totalAmount ?? (selectedPO as any).total_amount ?? 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Itemized Breakdown & Product Availability</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(selectedPO.items || []).map((i) => {
                  const prod = storeItems.find((s) => s.id === i.itemId || s.itemCode === i.itemCode);
                  const currentStock = prod ? (prod.currentStock ?? prod.openingStock ?? 0) : null;
                  return (
                    <div key={i.id} className="p-3 bg-white flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{i.itemName || (i as any).item_name || ''} <span className="text-[10px] text-slate-400 font-mono">({i.itemCode || (i as any).item_code || ''})</span></p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>Order Qty: <strong>{i.quantity || 0}</strong> units @ ₹{i.unitPrice || 0} ({i.gst || 0}% GST)</span>
                          {currentStock !== null && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              In Stock: {currentStock} {prod?.unit || 'Box'}(es)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">₹{(i.total || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PO</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable PO Sheet Modal */}
      {selectedPO && (
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Print Purchase Order Document"
          maxWidth="3xl"
        >
          <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-6 text-slate-800 text-xs">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-blue-900">AEGISCARE MULTI-SPECIALITY HOSPITAL</h2>
                <p className="text-slate-500">Central Stores & Materials Procurement Department</p>
                <p className="text-[11px] text-slate-500 mt-1">GSTIN: 29AAACA9999P1Z1 • Phone: +91 80 4000 8000</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900 block">{selectedPO.poNumber}</span>
                <span className="text-[11px] font-bold text-blue-600 uppercase">OFFICIAL PURCHASE ORDER</span>
                <p className="text-slate-500 mt-1">Date: {selectedPO.purchaseDate}</p>
              </div>
            </div>

            {/* Vendor & Delivery info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendor Details</span>
                <p className="font-bold text-slate-900">{selectedPO.vendorName}</p>
                <p className="text-slate-600">Expected Delivery: {selectedPO.expectedDelivery}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivery Location</span>
                <p className="font-bold text-slate-900">AegisCare Central Warehouse</p>
                <p className="text-slate-600">Gate 3, Hospital Complex, Main Store</p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase">
                  <th className="p-2 border border-slate-200">Item</th>
                  <th className="p-2 border border-slate-200 text-center">Qty</th>
                  <th className="p-2 border border-slate-200 text-right">Rate</th>
                  <th className="p-2 border border-slate-200 text-right">GST</th>
                  <th className="p-2 border border-slate-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPO.items || []).map((i) => (
                  <tr key={i.id} className="border border-slate-200">
                    <td className="p-2 border border-slate-200 font-semibold">{i.itemName || (i as any).item_name || ''} ({i.itemCode || (i as any).item_code || ''})</td>
                    <td className="p-2 border border-slate-200 text-center font-bold">{i.quantity || 0}</td>
                    <td className="p-2 border border-slate-200 text-right">₹{i.unitPrice || 0}</td>
                    <td className="p-2 border border-slate-200 text-right">{i.gst || 0}%</td>
                    <td className="p-2 border border-slate-200 text-right font-bold">₹{(i.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-4">
              <div className="text-[10px] text-slate-400">
                Authorized Purchase Officer Signature
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">Grand Total: ₹{Number(selectedPO.totalAmount ?? (selectedPO as any).total_amount ?? 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                  addToast('success', 'Print Triggered', 'Sending PO to printer...');
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedPO && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Purchase Order"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete purchase order <span className="font-bold text-slate-900">{selectedPO.poNumber}</span> issued to <span className="font-bold text-slate-900">{selectedPO.vendorName}</span>?
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
