import React, { useState, useEffect, useMemo } from 'react';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  RefreshCw,
  Layers,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { useHMS } from '../../../context/HMSContext';
import { Medicine } from '../../../types/hms';
import { fetchPharmacyTransfersApi, approvePharmacyTransferApi } from '../../../services/api';

export const MedicineListPage: React.FC = () => {
  const { medicines: contextMedicines, categories, addMedicine, updateMedicine, deleteMedicine, refreshData } = usePharmacy();
  const { addToast, storeItems } = useHMS();
  const [medicines, setMedicines] = useState<Medicine[]>(contextMedicines);
  const [selectedTransferId, setSelectedTransferId] = useState('');

  useEffect(() => {
    setMedicines(contextMedicines);
  }, [contextMedicines]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Store Transfers State
  const [storeTransfersModalOpen, setStoreTransfersModalOpen] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transfersData, setTransfersData] = useState<{
    transfers: any[];
    totalProductsSent: number;
    totalQuantitySent: number;
    pendingCount: number;
  }>({
    transfers: [],
    totalProductsSent: 0,
    totalQuantitySent: 0,
    pendingCount: 0,
  });

  const loadStoreTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const u = JSON.parse(localStorage.getItem('hms_user') || '{}');
      const role = (u.role || '').toLowerCase().replace('userrole.', '').trim();
      const branch = role !== 'super_admin' && role !== 'admin' ? u.branch : undefined;
      const res = await fetchPharmacyTransfersApi(branch);
      if (res && typeof res === 'object') {
        setTransfersData({
          transfers: res.transfers || [],
          totalProductsSent: res.totalProductsSent || 0,
          totalQuantitySent: res.totalQuantitySent || 0,
          pendingCount: res.pendingCount || 0,
        });
      }
    } catch (err) {
      console.warn('Failed to load store transfers from DB:', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  useEffect(() => {
    loadStoreTransfers();
  }, []);

  const handleApproveTransfer = async (transferId: string, itemName: string, qty: number) => {
    setApprovingId(transferId);
    try {
      const res = await approvePharmacyTransferApi(transferId);
      addToast(
        'success',
        'Transfer Approved! 🎉',
        res.message || `Approved ${qty} units of ${itemName}. Open '+ Add Medicine' modal to set selling price & add to inventory.`
      );
      await loadStoreTransfers();
      refreshData();
    } catch (err: any) {
      console.error('Approve transfer failed:', err);
      addToast('error', 'Approval Failed', err.message || 'Could not approve store transfer.');
    } finally {
      setApprovingId(null);
    }
  };

  // Form State for Add / Edit
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGeneric, setFormGeneric] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Tablets');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formDosageForm, setFormDosageForm] = useState('Tablet');
  const [formStrength, setFormStrength] = useState('');
  const [formUnit, setFormUnit] = useState('Strip of 10');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formGst, setFormGst] = useState(12);
  const [formStorage, setFormStorage] = useState('Store below 25°C');
  const [formRack, setFormRack] = useState('Rack A-01');
  const [formCurrentStock, setFormCurrentStock] = useState(100);

  // Filtering
  const filteredMedicines = medicines.filter((m) => {
    const name = m?.name || '';
    const code = m?.code || '';
    const generic = m?.genericName || '';
    const brand = m?.brand || '';
    const mfr = m?.manufacturer || '';
    const category = m?.category || '';
    const status = m?.status || 'Active';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      generic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mfr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const approvedIssuedProducts = useMemo(() => {
    const list: {
      id: string;
      transferNumber: string;
      itemCode: string;
      itemName: string;
      quantity: number;
      batchNumber: string;
      date: string;
      category?: string;
      unitPrice?: number;
      status: string;
    }[] = [];

    const map = new Map<string, typeof list[0]>();

    // Filter ONLY items that are APPROVED / COMPLETED / RECEIVED transfers issued by Store Manager
    (transfersData.transfers || [])
      .filter((t: any) => {
        const st = String(t.status || '').toLowerCase().trim();
        return st === 'approved' || st === 'completed' || st === 'received';
      })
      .forEach((t: any) => {
        const code = (t.itemCode || t.item_code || '').trim();
        const name = (t.itemName || t.item_name || '').trim();
        const itemKey = (code || name).toLowerCase();
        if (!itemKey) return;

        const storeMatch = storeItems.find(
          (si) =>
            (si.itemCode || '').toLowerCase().trim() === code.toLowerCase() ||
            (si.itemName || '').toLowerCase().trim() === name.toLowerCase()
        );

        if (map.has(itemKey)) {
          // Deduplicate & aggregate total issued quantity for this approved product
          const existing = map.get(itemKey)!;
          existing.quantity += Number(t.quantity || 0);
        } else {
          const itemObj = {
            id: String(t.id),
            transferNumber: t.transferNumber || t.transfer_number || `OUT-${t.id}`,
            itemCode: code || 'MED-001',
            itemName: name || 'Product',
            quantity: Number(t.quantity || 0),
            batchNumber: t.batchNumber || t.batch_number || 'STORE-BATCH',
            date: t.date || t.transferDate || new Date().toISOString().split('T')[0],
            category: storeMatch?.category || 'Pharmaceuticals',
            unitPrice: storeMatch?.unitPrice || 50,
            status: 'Approved',
          };
          map.set(itemKey, itemObj);
        }
      });

    return Array.from(map.values());
  }, [transfersData, storeItems]);

  const [addedTransferIds, setAddedTransferIds] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('hms_added_store_transfers') || '[]');
      return (parsed || []).filter((id: string) => !id.startsWith('ITM-') && !id.startsWith('MED-'));
    } catch {
      return [];
    }
  });

  const pendingStoreIssuedProducts = useMemo(() => {
    return approvedIssuedProducts.filter((st) => {
      // Remove ONLY the specific transfer ID that was added/processed
      const isAdded = addedTransferIds.includes(st.id);
      return !isAdded;
    });
  }, [approvedIssuedProducts, addedTransferIds]);

  const handleIssuedProductSelect = (transferId: string) => {
    setSelectedTransferId(transferId);
    if (!transferId) return;

    const matchedIssued = approvedIssuedProducts.find((i) => i.id === transferId || i.transferNumber === transferId);
    if (!matchedIssued) return;

    const matchedStoreItem = storeItems.find((si) => {
      const siCode = (si.itemCode || '').toLowerCase().trim();
      const siName = (si.itemName || '').toLowerCase().trim();
      const targetCode = (matchedIssued.itemCode || '').toLowerCase().trim();
      const targetName = (matchedIssued.itemName || '').toLowerCase().trim();
      return (siCode && siCode === targetCode) || (siName && siName === targetName);
    });

    // Check if a medicine with this code or name ALREADY exists in Pharmacy Medicine list
    const existingMed = medicines.find(
      (m) =>
        m.code.toLowerCase().trim() === matchedIssued.itemCode.toLowerCase().trim() ||
        m.name.toLowerCase().trim() === matchedIssued.itemName.toLowerCase().trim()
    );

    const issuedQtyToAdd = Number(matchedIssued.quantity || 0);
    const purchasePrice = matchedStoreItem?.unitPrice || matchedIssued.unitPrice || 50;
    const sellingPrice = matchedStoreItem?.unitPrice ? Math.round(matchedStoreItem.unitPrice * 1.25) : Math.round(purchasePrice * 1.25);
    const gstRate = matchedStoreItem?.gstPercentage ?? 12;

    if (existingMed) {
      // DO NOT create a duplicate! UPDATE existing medicine & ADD issued quantity to current stock
      setIsEditMode(true);
      setSelectedMedicine(existingMed);
      setFormCode(existingMed.code);
      setFormName(existingMed.name);
      setFormGeneric(matchedStoreItem?.genericComposition || existingMed.genericName || matchedIssued.itemName);
      setFormBrand(matchedStoreItem?.brand || existingMed.brand || 'Generic');
      setFormCategory(existingMed.category || matchedIssued.category || 'Pharmaceuticals');
      setFormManufacturer(existingMed.manufacturer || 'Standard Pharma');
      setFormDosageForm(matchedStoreItem?.dosageForm || existingMed.dosageForm || 'Tablet');
      setFormStrength(matchedStoreItem?.strength || existingMed.strength || 'Standard');
      setFormUnit(matchedStoreItem?.unit || existingMed.unit || 'Box');
      setFormPurchasePrice(purchasePrice);
      setFormSellingPrice(existingMed.sellingPrice || sellingPrice);
      setFormGst(gstRate);
      setFormStorage(existingMed.storageCondition || 'Store below 25°C');
      setFormRack(existingMed.rackLocation || 'Rack A-01');

      // Add issued quantity directly to existing product quantity!
      const newTotalStock = (existingMed.currentStock || 0) + issuedQtyToAdd;
      setFormCurrentStock(newTotalStock);

      addToast(
        'info',
        'Issued Product Matched! 📦',
        `Matched ${existingMed.name}. Fetched Item Master prices & specifications. Adding +${issuedQtyToAdd} units to stock (${existingMed.currentStock} → ${newTotalStock}).`
      );
    } else {
      // New product issued by Store Manager
      setIsEditMode(false);
      setSelectedMedicine(null);
      setFormCode(matchedIssued.itemCode);
      setFormName(matchedIssued.itemName);
      setFormGeneric(matchedStoreItem?.genericComposition || matchedIssued.itemName);
      setFormBrand(matchedStoreItem?.brand || 'Generic');
      setFormCategory(matchedIssued.category || 'Pharmaceuticals');
      setFormManufacturer('Standard Pharma');
      setFormDosageForm(matchedStoreItem?.dosageForm || 'Tablet');
      setFormStrength(matchedStoreItem?.strength || 'Standard');
      setFormUnit(matchedStoreItem?.unit || 'Box');
      setFormPurchasePrice(purchasePrice);
      setFormSellingPrice(sellingPrice);
      setFormGst(gstRate);
      setFormStorage('Store below 25°C');
      setFormRack('Rack A-01');
      setFormCurrentStock(issuedQtyToAdd);

      addToast(
        'success',
        'Issued Product Selected! 🏪',
        `Loaded ${matchedIssued.itemName} (+${issuedQtyToAdd} units). Fetched Item Master prices & specifications.`
      );
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedMedicine(null);
    setSelectedTransferId('');
    setFormCode(`MED-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormGeneric('');
    setFormBrand('');
    setFormCategory(categories[0]?.name || 'Tablets');
    setFormManufacturer('');
    setFormDosageForm('Tablet');
    setFormStrength('');
    setFormUnit('Strip of 10');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
    setFormGst(12);
    setFormStorage('Store below 25°C');
    setFormRack('Rack A-01');
    setFormCurrentStock(100);
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    setIsEditMode(true);
    setSelectedMedicine(med);
    const matchedIssued = approvedIssuedProducts.find(
      (st) =>
        st.itemCode.toLowerCase().trim() === med.code.toLowerCase().trim() ||
        st.itemName.toLowerCase().trim() === med.name.toLowerCase().trim()
    );
    setSelectedTransferId(matchedIssued ? matchedIssued.id : '');
    setFormCode(med.code);
    setFormName(med.name);
    setFormGeneric(med.genericName);
    setFormBrand(med.brand);
    setFormCategory(med.category);
    setFormManufacturer(med.manufacturer);
    setFormDosageForm(med.dosageForm);
    setFormStrength(med.strength);
    setFormUnit(med.unit);
    setFormPurchasePrice(med.purchasePrice);
    setFormSellingPrice(med.sellingPrice);
    setFormGst(med.gst);
    setFormStorage(med.storageCondition);
    setFormRack(med.rackLocation);
    setFormCurrentStock(med.currentStock);
    setAddEditModalOpen(true);
  };

  const handleOpenViewModal = (med: Medicine) => {
    setSelectedMedicine(med);
    setViewModalOpen(true);
  };

  const handleDeleteMedicine = async (med: Medicine) => {
    if (window.confirm(`Are you sure you want to delete ${med.name}?`)) {
      try {
        await deleteMedicine(med.id);
        addToast('success', 'Medicine Deleted', `${med.name} removed successfully.`);
      } catch (err) {
        addToast('error', 'Delete Failed', 'Could not delete medicine from database.');
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('error', 'Validation Error', 'Medicine name is required.');
      return;
    }

    if (!formSellingPrice || formSellingPrice <= 0) {
      addToast('error', 'Selling Price Required', 'Please fix a valid selling price before saving product to inventory.');
      return;
    }

    // Check if item already exists by code or name to prevent duplicates
    const existingCheck = medicines.find(
      (m) =>
        m.code.toLowerCase().trim() === formCode.toLowerCase().trim() ||
        m.name.toLowerCase().trim() === formName.toLowerCase().trim()
    );

    const payload = {
      code: formCode,
      name: formName,
      genericName: formGeneric || formName,
      brand: formBrand || 'Generic',
      category: formCategory,
      manufacturer: formManufacturer || 'Standard Pharma',
      dosageForm: formDosageForm,
      strength: formStrength || 'Standard',
      unit: formUnit,
      purchasePrice: Number(formPurchasePrice),
      sellingPrice: Number(formSellingPrice),
      gst: Number(formGst),
      storageCondition: formStorage,
      rackLocation: formRack,
      status: 'Active' as const,
      currentStock: Number(formCurrentStock),
      minStock: 10,
      maxStock: 500,
      reorderLevel: 20,
    };

    try {
      if ((isEditMode && selectedMedicine) || existingCheck) {
        const targetId = selectedMedicine?.id || existingCheck?.id!;
        await updateMedicine(targetId, payload);
        addToast(
          'success',
          'Price Fixed & Stock Updated! 🎉',
          `${formName} updated with fixed price ₹${formSellingPrice}. Total stock set to ${formCurrentStock} units.`
        );
      } else {
        await addMedicine(payload);
        addToast(
          'success',
          'Price Fixed & Product Added! 🎉',
          `${formName} added to Pharmacy inventory with fixed price ₹${formSellingPrice} and ${formCurrentStock} units.`
        );
      }

      // If linked to a store transfer, mark ONLY that specific transfer ID as added
      if (selectedTransferId) {
        setAddedTransferIds((prev) => {
          const updated = Array.from(new Set([...prev, selectedTransferId]));
          try {
            localStorage.setItem('hms_added_store_transfers', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        if (!selectedTransferId.startsWith('store-')) {
          try {
            await approvePharmacyTransferApi(selectedTransferId);
            await loadStoreTransfers();
          } catch (e) {
            console.warn('Auto-approve transfer notice:', e);
          }
        }
      }

      setAddEditModalOpen(false);
      refreshData();
    } catch (err) {
      addToast('error', 'Save Failed', 'Error persisting medicine details to DB.');
    }
  };

  const handleExportExcel = () => {
    const headers = ['Code,Name,Generic Name,Brand,Category,Unit,Purchase Price,Selling Price,GST,Rack,Stock,Status'];
    const rows = filteredMedicines.map(
      (m) =>
        `"${m.code}","${m.name}","${m.genericName}","${m.brand}","${m.category}","${m.unit}",${m.purchasePrice},${m.sellingPrice},${m.gst}%,"${m.rackLocation}",${m.currentStock},"${m.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Medicine_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" /> Medicine Master Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive hospital medicine database with pricing, rack locations, GST and store transfer approval.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadStoreTransfers();
                setStoreTransfersModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              title="View all products and quantities sent by the Store Manager"
            >
              <Truck className="w-4 h-4 text-indigo-600" /> Store Supplies
              {transfersData.pendingCount > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {transfersData.pendingCount} Pending
                </span>
              ) : (
                <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {transfersData.totalProductsSent} Items
                </span>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Print
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Code, Medicine Name, Generic Name, Brand, Manufacturer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Medicine Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Medicine Name & Generic</th>
                <th className="p-4">Brand / Mfr</th>
                <th className="p-4">Category</th>
                <th className="p-4">Form / Strength</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Purchase (₹)</th>
                <th className="p-4">Selling (₹)</th>
                <th className="p-4">GST</th>
                <th className="p-4">Rack Location</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-slate-400 font-medium">
                    No medicine records found. Click <strong>Add Medicine</strong> or receive stock from Store Manager.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-emerald-800">{med.code}</td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{med.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{med.genericName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{med.brand}</div>
                      <div className="text-[10px] text-slate-400">{med.manufacturer}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-extrabold">
                        {med.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      {med.dosageForm} ({med.strength})
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{med.unit}</td>
                    <td className="p-4 font-bold text-slate-700">₹{med.purchasePrice.toFixed(2)}</td>
                    <td className="p-4 font-extrabold text-emerald-700">₹{med.sellingPrice.toFixed(2)}</td>
                    <td className="p-4 font-semibold text-slate-600">{med.gst}%</td>
                    <td className="p-4 font-bold text-indigo-700">{med.rackLocation}</td>
                    <td className="p-4">
                      <span
                        className={`font-black text-xs px-2.5 py-1 rounded-full ${
                          med.currentStock > (med.minStock || 10)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : med.currentStock > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {med.currentStock}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          med.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {med.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenViewModal(med)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(med)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Medicine"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(med)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Store Dispatched Products & Inventory Transfer Console */}
      {storeTransfersModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" /> Store Dispatched Products Console
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Products and stock quantities issued/transferred by the Store Manager to Pharmacy.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadStoreTransfers}
                  disabled={loadingTransfers}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTransfers ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={() => setStoreTransfersModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-indigo-600 uppercase block">Total Dispatched Items</span>
                <span className="text-xl font-black text-indigo-900 mt-1 block">{transfersData.totalProductsSent}</span>
                <span className="text-[10px] text-indigo-600">Dispatched by Store Manager</span>
              </div>

              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">Total Units Sent</span>
                <span className="text-xl font-black text-purple-900 mt-1 block">{transfersData.totalQuantitySent.toLocaleString()}</span>
                <span className="text-[10px] text-purple-600">Total Stock Quantity</span>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Pending Approvals</span>
                <span className="text-xl font-black text-rose-700 mt-1 block">{transfersData.pendingCount}</span>
                <span className="text-[10px] text-rose-600">Awaiting Pharmacy Receipt</span>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Approved & Stocked</span>
                <span className="text-xl font-black text-emerald-800 mt-1 block">
                  {transfersData.totalProductsSent - transfersData.pendingCount}
                </span>
                <span className="text-[10px] text-emerald-600">Added to DB Medicine Stock</span>
              </div>
            </div>

            {/* Transferred Products Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Transfer #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product Name & Code</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Quantity Sent</th>
                    <th className="p-3">Sender (Store Manager)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transfersData.transfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No store product transfers found in database.
                      </td>
                    </tr>
                  ) : (
                    transfersData.transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-extrabold text-indigo-700">{t.transferNumber}</td>
                        <td className="p-3 font-medium text-slate-600">{t.date}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{t.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{t.itemCode}</div>
                        </td>
                        <td className="p-3 font-bold text-purple-700">{t.batchNumber}</td>
                        <td className="p-3">
                          <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {t.quantity} Units
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{t.sender}</td>
                        <td className="p-3">
                          {t.status === 'Pending Approval' ? (
                            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Pending Approval
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {t.status === 'Pending Approval' ? (
                            <button
                              onClick={() => handleApproveTransfer(t.id, t.itemName, t.quantity)}
                              disabled={approvingId === t.id}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 mx-auto"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> {approvingId === t.id ? 'Approving...' : 'Approve & Receive Stock'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stock Received
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setStoreTransfersModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Medicine Details */}
      {viewModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedMedicine.name}</h3>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedMedicine.code}
                </span>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Generic Name</span>
                <span className="font-bold text-slate-800">{selectedMedicine.genericName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Brand</span>
                <span className="font-bold text-slate-800">{selectedMedicine.brand}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                <span className="font-bold text-slate-800">{selectedMedicine.category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Manufacturer</span>
                <span className="font-bold text-slate-800">{selectedMedicine.manufacturer}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dosage Form</span>
                <span className="font-bold text-slate-800">{selectedMedicine.dosageForm}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Strength</span>
                <span className="font-bold text-slate-800">{selectedMedicine.strength}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Purchase Price</span>
                <span className="font-extrabold text-slate-900">₹{selectedMedicine.purchasePrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Selling Price</span>
                <span className="font-black text-emerald-700">₹{selectedMedicine.sellingPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">GST Rate</span>
                <span className="font-bold text-slate-800">{selectedMedicine.gst}%</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Stock</span>
                <span className="font-black text-purple-700">{selectedMedicine.currentStock} {selectedMedicine.unit}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Rack Location</span>
                <span className="font-bold text-indigo-700">{selectedMedicine.rackLocation}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Storage Condition</span>
                <span className="font-bold text-slate-800">{selectedMedicine.storageCondition}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Medicine */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isEditMode ? `Edit Medicine — ${formName}` : 'Add New Medicine to Database'}
              </h3>
              <button onClick={() => setAddEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* ── Select Approved Issued Product Sent by Store Manager ── */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-blue-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600 animate-pulse" /> Select Approved Product Sent by Store Manager *
                  </label>
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                    📦 Pending Store Issues: {pendingStoreIssuedProducts.length} Products
                  </span>
                </div>

                <select
                  value={selectedTransferId}
                  onChange={(e) => handleIssuedProductSelect(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs text-xs"
                >
                  <option value="">
                    {pendingStoreIssuedProducts.length > 0
                      ? "-- Select approved product sent by Store Manager --"
                      : "-- No pending store-issued products (All Added) --"}
                  </option>

                  {pendingStoreIssuedProducts.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.itemName} ({st.itemCode}) — Issued: {st.quantity} units
                    </option>
                  ))}
                </select>

                {selectedTransferId ? (
                  <div className="pt-1">
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-100/90 border border-emerald-300 text-emerald-950 rounded-xl font-bold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Status: <strong>STORE ISSUED PRODUCT SELECTED</strong> — Auto-filled prices & specifications. Saving will add it to Pharmacy stock and remove it from this pending dropdown.</span>
                    </div>
                  </div>
                ) : pendingStoreIssuedProducts.length === 0 ? (
                  <div className="pt-1">
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-100/90 border border-emerald-300 text-emerald-950 rounded-xl font-medium text-[11px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>All products issued by Store Manager have been added to Pharmacy stock.</span>
                    </div>
                  </div>
                ) : null}

                <p className="text-[10px] text-slate-600 font-medium">
                  💡 Select a pending product issued by the Store Manager to populate medicine specifications. Once saved, it will be automatically removed from this list.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicine Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Dolo 650"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage Form</label>
                  <input
                    type="text"
                    value={formDosageForm}
                    onChange={(e) => setFormDosageForm(e.target.value)}
                    placeholder="e.g. Tablet, Syrup, Injection"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Packaging</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Strip of 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3.5 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 rounded-xl border border-emerald-300/80 shadow-2xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 mb-1 flex items-center justify-between">
                    <span>Selling Price (₹) *</span>
                    <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-md shadow-xs">Fix Price Required</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    placeholder="Set Selling Price"
                    className="w-full bg-white border-2 border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 font-black text-emerald-900 outline-none text-sm shadow-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST (%)</label>
                  <input
                    type="number"
                    value={formGst}
                    onChange={(e) => setFormGst(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-indigo-900 mb-1 flex items-center justify-between">
                    <span>Total Product Stock</span>
                    <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md shadow-xs">+Issued Added</span>
                  </label>
                  <input
                    type="number"
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                    className="w-full bg-white border-2 border-indigo-400 rounded-xl px-3 py-2 font-black text-indigo-900 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Condition</label>
                  <input
                    type="text"
                    value={formStorage}
                    onChange={(e) => setFormStorage(e.target.value)}
                    placeholder="e.g. Store below 25°C"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rack Location</label>
                  <input
                    type="text"
                    value={formRack}
                    onChange={(e) => setFormRack(e.target.value)}
                    placeholder="e.g. Rack A-04"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isEditMode ? 'Update Medicine' : 'Save New Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
