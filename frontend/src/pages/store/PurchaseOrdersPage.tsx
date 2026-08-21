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
  Layers,
  Pill,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { PurchaseOrder, POItem, Vendor, MEDICINE_CATEGORIES, OTHER_HOSPITAL_CATEGORIES } from '../../types/store';
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
  const [isAltModalOpen, setIsAltModalOpen] = useState(false);
  const [activeAltRowId, setActiveAltRowId] = useState<string | null>(null);
  const [altSearchQuery, setAltSearchQuery] = useState('');
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
      category: defaultItem?.category || 'Antibiotics',
      genericComposition: defaultItem?.genericComposition || '',
      strength: defaultItem?.strength || '',
      dosageForm: defaultItem?.dosageForm || 'Tablet',
      quantity: 10,
      unitPrice: defaultItem?.unitPrice || 0,
      discount: 0,
      gst: defaultItem?.gstPercentage || 0,
      total: calculateLineTotal(10, defaultItem?.unitPrice || 0, 0, defaultItem?.gstPercentage || 0),
    };
    setPoItems((prev) => [...prev, newRow]);
  };

  // Helper to filter store items by category with subcategory & keyword fallback
  const filterStoreItemsByCategory = (items: ItemMaster[], category: string): ItemMaster[] => {
    if (!items || items.length === 0) return [];
    if (!category || category === 'All' || category === 'Pharmaceuticals (All Medicines)') return items;

    const target = category.toLowerCase().trim();

    const matched = items.filter((i) => {
      const mainCat = (i.category || '').toLowerCase().trim();
      const subCat = (i.subCategory || '').toLowerCase().trim();
      const name = (i.itemName || '').toLowerCase().trim();
      const generic = (i.genericComposition || '').toLowerCase().trim();

      // 1. Direct match on main category or subCategory
      if (mainCat === target || subCat === target) return true;

      // 2. Contains match in mainCategory, subCategory, name, or generic composition
      if (mainCat.includes(target) || subCat.includes(target) || name.includes(target) || generic.includes(target)) {
        return true;
      }

      // 3. Keyword / Medical sub-class matching
      if (target.includes('respiratory') && (name.includes('salbutamol') || name.includes('inhaler') || name.includes('budesonide') || generic.includes('salbutamol') || generic.includes('budesonide'))) return true;
      if (target.includes('antibiotic') && (name.includes('amoxicillin') || name.includes('azithromycin') || name.includes('cefixime') || name.includes('ciprofloxacin') || generic.includes('amox') || generic.includes('cefi'))) return true;
      if (target.includes('pain') && (name.includes('paracetamol') || name.includes('ibuprofen') || name.includes('tramadol') || name.includes('diclofenac') || generic.includes('paracetamol'))) return true;
      if (target.includes('diabetes') && (name.includes('metformin') || name.includes('glimepiride') || name.includes('insulin') || generic.includes('metformin'))) return true;
      if (target.includes('cardio') && (name.includes('amlodipine') || name.includes('atorvastatin') || name.includes('telmisartan') || generic.includes('amlodipine'))) return true;

      // 4. Fallback for pharmaceuticals if selected category is a medicine category
      const isMedSubcat = MEDICINE_CATEGORIES.some((m) => m.toLowerCase() === target || target.includes(m.toLowerCase()));
      if (isMedSubcat && (mainCat === 'pharmaceuticals' || mainCat === 'medicines' || mainCat.includes('pharma'))) {
        return true;
      }

      return false;
    });

    return matched.length > 0 ? matched : items;
  };

  const handleUpdateItemRow = (id: string, field: keyof POItem, value: any) => {
    setPoItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        let updated = { ...row, [field]: value };

        if (field === 'category') {
          // Find matching products in the selected category using category filter helper
          const categoryItems = filterStoreItemsByCategory(storeItems, String(value));

          if (categoryItems.length > 0) {
            const firstMatched = categoryItems[0];
            updated.itemId = firstMatched.id;
            updated.itemCode = firstMatched.itemCode;
            updated.itemName = firstMatched.itemName;
            updated.genericComposition = firstMatched.genericComposition || firstMatched.itemName;
            updated.strength = firstMatched.strength || 'Standard';
            updated.dosageForm = firstMatched.dosageForm || 'Tablet';
            updated.unitPrice = firstMatched.unitPrice;
            updated.gst = firstMatched.gstPercentage;
          }
        } else if (field === 'itemId') {
          const matched = storeItems.find((i) => i.id === value);
          if (matched) {
            updated.itemCode = matched.itemCode;
            updated.itemName = matched.itemName;
            updated.category = matched.category || updated.category || 'Pharmaceuticals';
            updated.genericComposition = matched.genericComposition || matched.itemName;
            updated.strength = matched.strength || 'Standard';
            updated.dosageForm = matched.dosageForm || 'Tablet';
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

  const handleSelectAltBrand = (rowId: string, matchedItem: any) => {
    setPoItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const updated = {
          ...row,
          itemId: matchedItem.id,
          itemCode: matchedItem.itemCode,
          itemName: matchedItem.itemName,
          category: matchedItem.category || row.category || 'Antibiotics',
          genericComposition: matchedItem.genericComposition || row.genericComposition || '',
          strength: matchedItem.strength || row.strength || '',
          dosageForm: matchedItem.dosageForm || row.dosageForm || 'Tablet',
          unitPrice: matchedItem.unitPrice,
          gst: matchedItem.gstPercentage,
        };
        updated.total = calculateLineTotal(updated.quantity, updated.unitPrice, updated.discount, updated.gst);
        return updated;
      })
    );
    setIsAltModalOpen(false);
    setActiveAltRowId(null);
    addToast('success', 'Brand Swapped', `Selected ${matchedItem.itemName} (${matchedItem.genericComposition || 'Generic Equivalent'})`);
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
          category: first.category || 'Antibiotics',
          genericComposition: first.genericComposition || '',
          strength: first.strength || '',
          dosageForm: first.dosageForm || 'Tablet',
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

  const getNextPONumber = (pos: PurchaseOrder[]) => {
    let maxNum = 0;
    const currentYear = new Date().getFullYear();
    pos.forEach((p) => {
      if (p.poNumber) {
        const parts = p.poNumber.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `PO-${currentYear}-${String(maxNum + 1).padStart(3, '0')}`;
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
      const poNum = getNextPONumber(purchaseOrders);
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
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Not Updated'
            ? po.status !== 'Fulfilled' && po.status !== 'Completed'
            : statusFilter === 'Fulfilled'
              ? po.status === 'Fulfilled' || po.status === 'Completed'
              : po.status === statusFilter;
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
            <option value="Not Updated">Not Updated / Pending Receipt</option>
            <option value="Fulfilled">Fulfilled / Updated</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
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
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${po.status === 'Fulfilled' || po.status === 'Completed'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : po.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : po.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : po.status === 'Rejected'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {po.status === 'Fulfilled' || po.status === 'Completed'
                            ? '✓ Fulfilled (Updated)'
                            : `${po.status} (Not Updated)`}
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

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {poItems.map((item, idx) => {
                const prod = storeItems.find((s) => s.id === item.itemId);
                const avail = prod ? (prod.currentStock ?? prod.openingStock ?? 0) : 0;
                const isLow = prod ? avail <= (prod.minStock || 10) : false;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    {/* Header Row: Category, Item Selection, and Alt Brands Trigger */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Category</label>
                        <select
                          value={item.category || 'Antibiotics'}
                          onChange={(e) => handleUpdateItemRow(item.id, 'category', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-900 outline-none text-xs"
                        >
                          <optgroup label="Medicines & Pharmaceuticals">
                            {MEDICINE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Other Hospital Items">
                            {OTHER_HOSPITAL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="md:col-span-6">
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[10px] font-bold text-slate-500 block">Item / Brand Name</label>
                          <span className={`text-[10px] font-bold ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                            Avail Stock: {avail} {prod?.unit || 'Box'}(es) {isLow ? '⚠️ Low' : '✓ In Stock'}
                          </span>
                        </div>
                        <select
                          value={item.itemId}
                          onChange={(e) => handleUpdateItemRow(item.id, 'itemId', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-900 outline-none text-xs cursor-pointer shadow-2xs"
                        >
                          {(() => {
                            const listToRender = filterStoreItemsByCategory(storeItems, item.category);

                            return listToRender.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.itemName} ({i.itemCode}) — ₹{i.unitPrice} [{i.category}]
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      <div className="md:col-span-3 flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAltRowId(item.id);
                            setAltSearchQuery(item.genericComposition || item.itemName.split(' ')[0] || '');
                            setIsAltModalOpen(true);
                          }}
                          className="w-full py-1.5 px-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Find Alternatives</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Row: Generic/Composition, Strength, Dosage Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-500 block">Generic / Composition</label>
                          <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">Auto-filled</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Glimepiride + Metformin"
                          value={item.genericComposition || ''}
                          onChange={(e) => handleUpdateItemRow(item.id, 'genericComposition', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-900 text-xs outline-none focus:bg-white focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-500 block">Strength</label>
                          <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">Auto-filled</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. 2 mg + 500 mg"
                          value={item.strength || ''}
                          onChange={(e) => handleUpdateItemRow(item.id, 'strength', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-900 text-xs outline-none focus:bg-white focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-500 block">Dosage Form</label>
                          <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">Auto-filled</span>
                        </div>
                        <select
                          value={item.dosageForm || 'Tablet'}
                          onChange={(e) => handleUpdateItemRow(item.id, 'dosageForm', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-semibold text-slate-900 text-xs outline-none focus:bg-white focus:border-blue-400"
                        >
                          <option value="Tablet">Tablet</option>
                          <option value="Capsule">Capsule</option>
                          <option value="Syrup">Syrup</option>
                          <option value="Injection">Injection</option>
                          <option value="IV Fluid">IV Fluid</option>
                          <option value="Ointment">Ointment / Gel</option>
                          <option value="Drops">Drops</option>
                          <option value="Inhaler">Inhaler</option>
                          <option value="Medical Supply">Medical Supply</option>
                          <option value="Equipment">Equipment</option>
                        </select>
                      </div>
                    </div>

                    {/* Numeric Inputs Row: Qty, Unit Price, Disc, GST, Line Total */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center pt-1 border-t border-slate-200/50">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemRow(item.id, 'quantity', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItemRow(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Disc %</label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => handleUpdateItemRow(item.id, 'discount', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">GST %</label>
                        <input
                          type="number"
                          value={item.gst}
                          onChange={(e) => handleUpdateItemRow(item.id, 'gst', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none text-xs"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pl-2 bg-slate-100/70 p-1.5 rounded-lg border border-slate-200/70">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block">Line Total</span>
                          <span className="font-extrabold text-blue-700 text-xs">₹{(item.total || 0).toFixed(2)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="text-rose-500 hover:bg-rose-100 font-bold p-1 rounded-md transition-colors cursor-pointer"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          maxWidth="3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
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
                  const cat = i.category || prod?.category || 'General';
                  const comp = i.genericComposition || prod?.genericComposition || '';
                  const str = i.strength || prod?.strength || '';
                  const form = i.dosageForm || prod?.dosageForm || 'Tablet';

                  return (
                    <div key={i.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{i.itemName || (i as any).item_name || ''}</span>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">({i.itemCode || (i as any).item_code || ''})</span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Category: {cat}</span>
                        </div>
                        {(comp || str) && (
                          <p className="text-[10px] text-slate-500 font-medium italic">
                            Generic/Composition: {comp || 'N/A'} {str ? `(${str})` : ''} • Form: {form}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                          <span>Order Qty: <strong>{i.quantity || 0}</strong> units @ ₹{i.unitPrice || 0} ({i.gst || 0}% GST)</span>
                          {currentStock !== null && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              In Stock: {currentStock} {prod?.unit || 'Box'}(es)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-900 text-sm">₹{(i.total || 0).toFixed(2)}</span>
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
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official PO</span>
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
          maxWidth="4xl"
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

            {/* Table with Category & Composition */}
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                  <th className="p-2 border border-slate-200">Brand / Item Name</th>
                  <th className="p-2 border border-slate-200">Category</th>
                  <th className="p-2 border border-slate-200">Generic / Composition & Strength</th>
                  <th className="p-2 border border-slate-200 text-center">Dosage Form</th>
                  <th className="p-2 border border-slate-200 text-center">Qty</th>
                  <th className="p-2 border border-slate-200 text-right">Rate</th>
                  <th className="p-2 border border-slate-200 text-right">GST</th>
                  <th className="p-2 border border-slate-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPO.items || []).map((i) => {
                  const prod = storeItems.find((s) => s.id === i.itemId || s.itemCode === i.itemCode);
                  const cat = i.category || prod?.category || 'General';
                  const comp = i.genericComposition || prod?.genericComposition || '-';
                  const str = i.strength || prod?.strength || '';
                  const form = i.dosageForm || prod?.dosageForm || 'Tablet';

                  return (
                    <tr key={i.id} className="border border-slate-200">
                      <td className="p-2 border border-slate-200 font-bold text-slate-900">
                        {i.itemName || (i as any).item_name || ''}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">({i.itemCode || (i as any).item_code || ''})</span>
                      </td>
                      <td className="p-2 border border-slate-200 font-medium text-slate-700">{cat}</td>
                      <td className="p-2 border border-slate-200 text-slate-700 italic">
                        {comp} {str ? `(${str})` : ''}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-medium">{form}</td>
                      <td className="p-2 border border-slate-200 text-center font-bold">{i.quantity || 0}</td>
                      <td className="p-2 border border-slate-200 text-right">₹{i.unitPrice || 0}</td>
                      <td className="p-2 border border-slate-200 text-right">{i.gst || 0}%</td>
                      <td className="p-2 border border-slate-200 text-right font-extrabold text-slate-900">₹{(i.total || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Alternative Brands / Generic Lookup Modal (Matching Image 2 Parity) */}
      <Modal
        isOpen={isAltModalOpen}
        onClose={() => {
          setIsAltModalOpen(false);
          setActiveAltRowId(null);
        }}
        title="Generic / Composition + Strength + Dosage Form"
        subtitle="Lookup & switch brand substitutes based on generic composition & live stock status"
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Search bar */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by Generic Composition, Brand Name, or Strength..."
              value={altSearchQuery}
              onChange={(e) => setAltSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400"
            />
            {altSearchQuery && (
              <button
                onClick={() => setAltSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Reference Image 2 Table Layout */}
          <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                Generic / Composition + Strength + Dosage Form Catalog
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Live Inventory Status Sync
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-[11px] font-bold text-slate-300 border-b border-slate-700">
                    <th className="py-2.5 px-4">Brand Name</th>
                    <th className="py-2.5 px-4">Generic / Composition</th>
                    <th className="py-2.5 px-4">Strength</th>
                    <th className="py-2.5 px-4">Dosage Form</th>
                    <th className="py-2.5 px-4 text-center">Stock Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs font-medium">
                  {(() => {
                    const activeRow = poItems.find((r) => r.id === activeAltRowId);
                    const q = altSearchQuery.toLowerCase().trim();

                    const matches = storeItems.filter((i) => {
                      if (!q) return true;
                      return (
                        i.itemName.toLowerCase().includes(q) ||
                        (i.genericComposition && i.genericComposition.toLowerCase().includes(q)) ||
                        (i.strength && i.strength.toLowerCase().includes(q)) ||
                        i.category.toLowerCase().includes(q)
                      );
                    });

                    if (matches.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No matching brands or generic compositions found.
                          </td>
                        </tr>
                      );
                    }

                    return matches.map((item) => {
                      const stockCount = item.currentStock ?? item.openingStock ?? 0;
                      const hasStock = stockCount > 0;
                      const isCurrentlySelected = activeRow?.itemId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-800/50 transition-colors ${isCurrentlySelected ? 'bg-indigo-950/60' : ''
                            }`}
                        >
                          <td className="py-3 px-4 font-bold text-white">
                            {item.itemName}
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              {item.itemCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            {item.genericComposition || (
                              <span className="text-slate-500 italic">Unspecified</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {item.strength || (
                              <span className="text-slate-500 font-sans italic">Standard</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {item.dosageForm || 'Tablet'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hasStock ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                ✅ {stockCount}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-950/90 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                ❌ 0
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isCurrentlySelected ? (
                              <span className="text-[11px] font-bold text-emerald-400">
                                Current Selected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => activeAltRowId && handleSelectAltBrand(activeAltRowId, item)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Select Brand
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

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
