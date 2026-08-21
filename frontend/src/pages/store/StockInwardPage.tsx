import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Boxes,
} from 'lucide-react';
import { StockInward } from '../../types/store';
import {
  fetchStockInwardApi,
  createStockInwardApi,
  updateStockInwardApi,
  deleteStockInwardApi,
  fetchStockOutwardApi,
} from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const StockInwardPage: React.FC = () => {
  const { addToast, storeItems, updateStoreItem, refreshData } = useHMS();
  const [inwardList, setInwardList] = useState<StockInward[]>([]);
  const [outwardList, setOutwardList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockInward | null>(null);

  const loadInwardList = async () => {
    try {
      const [data, outwardData] = await Promise.all([
        fetchStockInwardApi().catch(() => []),
        fetchStockOutwardApi().catch(() => []),
      ]);

      if (Array.isArray(data)) {
        const seenKeys = new Set<string>();
        const mappedList: StockInward[] = [];

        data.forEach((i: any) => {
          const num = i.inward_number || i.inwardNumber || `INW-${i.id}`;
          const batch = i.batch_number || i.batchNumber || '';
          const code = i.item_code || i.itemCode || '';
          const key = num ? `${num}-${batch}-${code}` : `ID-${i.id}`;

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            mappedList.push({
              id: i.id,
              inwardNumber: num,
              date: i.date || new Date().toISOString().split('T')[0],
              supplier: i.supplier_name || i.supplier || 'MedLife Distributors',
              poNumber: i.po_number || i.poNumber || 'PO-2026-001',
              itemCode: code || 'MED-001',
              itemName: i.item_name || i.itemName || 'Item',
              batchNumber: batch || 'BAT-2026-X1',
              quantity: Number(i.quantity || 0),
              unitPrice: i.unit_price ?? i.unitPrice ?? 0,
              expiryDate: i.expiry_date || i.expiryDate || '2027-12-31',
              warehouse: i.warehouse || 'Central Store Bay 1',
              receivedBy: i.received_by || i.receivedBy || 'Store Officer',
            });
          }
        });

        setInwardList(mappedList);
      }

      if (Array.isArray(outwardData)) {
        setOutwardList(outwardData);
      }
    } catch (err) {
      console.warn('Error loading stock inward from API:', err);
    }
  };

  useEffect(() => {
    loadInwardList();
  }, []);

  // Calculate FIFO remaining stock for each Stock Inward entry
  const inwardRemainingMap = useMemo(() => {
    const outwardByItem: Record<string, number> = {};
    const outwardByBatch: Record<string, number> = {};

    outwardList.forEach((o: any) => {
      const code = (o.item_code || o.itemCode || '').toLowerCase().trim();
      const batch = (o.batch_number || o.batchNumber || '').toLowerCase().trim();
      const qty = Number(o.quantity || 0);

      if (batch) outwardByBatch[batch] = (outwardByBatch[batch] || 0) + qty;
      if (code) outwardByItem[code] = (outwardByItem[code] || 0) + qty;
    });

    const inwardGroups: Record<string, StockInward[]> = {};
    inwardList.forEach((entry) => {
      const codeKey = (entry.itemCode || '').toLowerCase().trim();
      const batchKey = (entry.batchNumber || '').toLowerCase().trim();
      const groupKey = batchKey ? `batch:${batchKey}` : `code:${codeKey}`;
      if (!inwardGroups[groupKey]) inwardGroups[groupKey] = [];
      inwardGroups[groupKey].push(entry);
    });

    const remainingMap: Record<string, number> = {};

    Object.entries(inwardGroups).forEach(([groupKey, entries]) => {
      let totalOutward = 0;
      if (groupKey.startsWith('batch:')) {
        const batch = groupKey.replace('batch:', '');
        totalOutward = outwardByBatch[batch] || 0;
      } else {
        const code = groupKey.replace('code:', '');
        totalOutward = outwardByItem[code] || 0;
      }

      // Sort entries chronologically (oldest first, reverse of inwardList order)
      const sortedEntries = [...entries].reverse();
      let unallocatedOutward = totalOutward;

      sortedEntries.forEach((entry) => {
        const initialQty = Number(entry.quantity || 0);
        const deducted = Math.min(initialQty, unallocatedOutward);
        unallocatedOutward -= deducted;
        remainingMap[entry.id] = Math.max(0, initialQty - deducted);
      });
    });

    return remainingMap;
  }, [inwardList, outwardList]);

  // KPI Summary Statistics
  const kpiStats = useMemo(() => {
    const totalItems = inwardList.length;
    let totalInitialQty = 0;
    let totalRemainingQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inwardList.forEach((entry) => {
      const init = Number(entry.quantity || 0);
      const rem = inwardRemainingMap[entry.id] ?? init;
      totalInitialQty += init;
      totalRemainingQty += rem;

      if (rem === 0) {
        outOfStockCount++;
      } else if (rem <= 20) {
        lowStockCount++;
      }
    });

    const availableCount = totalItems - outOfStockCount;

    return {
      totalItems,
      totalInitialQty,
      totalRemainingQty,
      availableCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [inwardList, inwardRemainingMap]);

  // Search & Filtered List
  const filteredList = useMemo(() => {
    return inwardList.filter((entry) => {
      const rem = inwardRemainingMap[entry.id] ?? entry.quantity;

      if (activeTab === 'available' && rem === 0) return false;
      if (activeTab === 'low' && (rem === 0 || rem > 20)) return false;
      if (activeTab === 'out' && rem > 0) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        (entry.itemName || '').toLowerCase().includes(q) ||
        (entry.itemCode || '').toLowerCase().includes(q) ||
        (entry.batchNumber || '').toLowerCase().includes(q) ||
        (entry.supplier || '').toLowerCase().includes(q) ||
        (entry.warehouse || '').toLowerCase().includes(q) ||
        (entry.poNumber || '').toLowerCase().includes(q)
      );
    });
  }, [inwardList, inwardRemainingMap, activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

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
    expiryDate: '2027-12-31',
    warehouse: 'Central Store Bay 1',
    receivedBy: 'Store Officer',
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
    setFormData({
      inwardNumber: entry.inwardNumber || `INW-2026-001`,
      date: entry.date || new Date().toISOString().split('T')[0],
      supplier: entry.supplier || 'MedLife Distributors',
      poNumber: entry.poNumber || 'PO-2026-001',
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      batchNumber: entry.batchNumber || 'BAT-2026-X1',
      quantity: entry.quantity,
      unitPrice: entry.unitPrice ?? 0,
      expiryDate: entry.expiryDate || '2027-12-31',
      warehouse: entry.warehouse || 'Central Store Bay 1',
      receivedBy: entry.receivedBy || 'Store Officer',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (entry: StockInward) => {
    setSelectedEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedEntry) {
      try {
        await deleteStockInwardApi(selectedEntry.id);
      } catch (err) {
        console.warn('API delete stock inward warning:', err);
      }
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
      if (selectedEntry) {
        const updated = await updateStockInwardApi(selectedEntry.id, formData).catch(() => ({
          ...selectedEntry,
          ...formData,
        }));
        const mapped: StockInward = {
          id: updated.id || selectedEntry.id,
          inwardNumber: updated.inward_number || updated.inwardNumber || formData.inwardNumber,
          date: updated.date || formData.date,
          supplier: updated.supplier_name || updated.supplier || formData.supplier,
          poNumber: updated.po_number || updated.poNumber || formData.poNumber,
          itemCode: updated.item_code || updated.itemCode || formData.itemCode,
          itemName: updated.item_name || updated.itemName || formData.itemName,
          batchNumber: updated.batch_number || updated.batchNumber || formData.batchNumber,
          quantity: Number(updated.quantity ?? formData.quantity),
          unitPrice: updated.unit_price ?? updated.unitPrice ?? formData.unitPrice,
          expiryDate: updated.expiry_date || updated.expiryDate || formData.expiryDate,
          warehouse: updated.warehouse || formData.warehouse,
          receivedBy: updated.received_by || updated.receivedBy || formData.receivedBy,
        };
        setInwardList((prev) => prev.map((i) => (i.id === mapped.id ? mapped : i)));
        addToast('success', 'Stock Inward Updated', `Updated entry ${mapped.inwardNumber} (${mapped.quantity} units).`);
      } else {
        const created = await createStockInwardApi(formData);
        const mapped: StockInward = {
          id: created.id || `inw-${Date.now()}`,
          inwardNumber: created.inward_number || created.inwardNumber || formData.inwardNumber,
          date: created.date || formData.date,
          supplier: created.supplier_name || created.supplier || formData.supplier,
          poNumber: created.po_number || created.poNumber || formData.poNumber,
          itemCode: created.item_code || created.itemCode || formData.itemCode,
          itemName: created.item_name || created.itemName || formData.itemName,
          batchNumber: created.batch_number || created.batchNumber || formData.batchNumber,
          quantity: Number(created.quantity || formData.quantity),
          unitPrice: created.unit_price ?? created.unitPrice ?? formData.unitPrice,
          expiryDate: created.expiry_date || created.expiryDate || formData.expiryDate,
          warehouse: created.warehouse || formData.warehouse,
          receivedBy: created.received_by || created.receivedBy || formData.receivedBy,
        };
        setInwardList((prev) => [mapped, ...prev]);
        addToast('success', 'Stock Inward Logged', `Saved ${formData.quantity} units of ${formData.itemName}.`);
      }

      // Sync Item Master currentStock in HMSContext
      const matchedItem = storeItems.find(
        (i) => i.itemCode === formData.itemCode || i.itemName.toLowerCase() === formData.itemName.toLowerCase()
      );
      if (matchedItem) {
        const addedQty = selectedEntry ? Math.max(0, formData.quantity - selectedEntry.quantity) : formData.quantity;
        if (addedQty > 0) {
          try {
            updateStoreItem(matchedItem.id, { currentStock: (matchedItem.currentStock || 0) + addedQty });
          } catch (e) {
            console.warn('Error updating store item stock in context:', e);
          }
        }
      }

      if (typeof refreshData === 'function') {
        refreshData();
      }
    } catch (err) {
      console.warn('API error saving stock inward:', err);
      addToast('error', 'Save Failed', 'Could not save stock inward to database.');
    }
    setIsModalOpen(false);
  };

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
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Inward Entry</span>
        </button>
      </div>

      {/* KPI Cards (Structured like Pharmacy Stock Management) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* Total Inward Entries */}
        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">Total Items</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{kpiStats.totalItems} Receipts</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{kpiStats.totalInitialQty} Units Total Inward</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Available Stock */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">Available Stock</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{kpiStats.totalRemainingQty} Units</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{kpiStats.availableCount} Receipts Available</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 rounded-2xl border border-amber-100 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-amber-600 uppercase">Low Stock Alerts</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{kpiStats.lowStockCount} Receipts</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">&le; 20 units remaining</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Medicine, Code, Batch #, Supplier..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stock ({kpiStats.totalItems})
          </button>
          <button
            onClick={() => {
              setActiveTab('available');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'available' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Available Stock ({kpiStats.availableCount})
          </button>
          <button
            onClick={() => {
              setActiveTab('low');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Low Stock Alerts ({kpiStats.lowStockCount})
          </button>
        </div>
      </div>

      {/* Structured Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">S.NO</th>
                <th className="py-3.5 px-4">CODE & ITEM NAME</th>
                <th className="py-3.5 px-4">QUANTITY (INITIAL / REMAINING)</th>
                <th className="py-3.5 px-4">BATCH NUMBER</th>
                <th className="py-3.5 px-4">EXPIRY DATE</th>
                <th className="py-3.5 px-4">WAREHOUSE / LOCATION</th>
                <th className="py-3.5 px-4">SUPPLIER</th>
                <th className="py-3.5 px-4 text-center">STOCK STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedList.length > 0 ? (
                paginatedList.map((row, idx) => {
                  const remaining = inwardRemainingMap[row.id] ?? row.quantity;
                  const sno = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {sno}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900 text-sm">{row.itemName}</p>
                        <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                          {row.itemCode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center font-extrabold text-slate-800 text-sm">
                            {row.quantity} Units <span className="text-[10px] font-normal text-slate-400 ml-1.5">(Initial)</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            {remaining} Units <span className="text-[10px] font-medium text-slate-400">remaining</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {row.batchNumber || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.expiryDate || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Warehouse className="w-3.5 h-3.5 text-blue-500" />
                          <span>{row.warehouse || 'Central Store'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">{row.receivedBy || 'Store Officer'}</p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {row.supplier || 'MedLife Distributors'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {remaining > 20 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            AVAILABLE
                          </span>
                        ) : remaining > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            OUT OF STOCK
                          </span>
                        )}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No stock inward records found matching filters.
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
        subtitle={selectedEntry ? `Modify inward record details & updated quantity` : 'Log received stock into store inventory'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveInward} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Item *</label>
              <select
                value={formData.itemCode}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="BAT-2026-X1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="MedLife Distributors"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Warehouse Bay / Location</label>
              <input
                type="text"
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                placeholder="Central Store Bay 1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
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
