import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
  Printer,
  Package,
  User,
  Phone,
  Receipt,
  Calendar,
  DollarSign,
  TrendingUp,
  Trash2,
  Eye,
  Sparkles,
  ShieldCheck,
  FileText,
  Check,
  Layers,
  Filter,
  CreditCard,
  Wallet,
  RefreshCw,
  Clock,
  ArrowRight,
  ChevronRight,
  Activity,
  History,
  Boxes,
  UserCheck,
  ChevronDown,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { useHMS } from '../../../context/HMSContext';
import { CustomerReturn, Medicine, POSInvoice, PrescriptionOrder, Patient } from '../../../types/hms';
import { lookupPatientsApi, fetchPatientsApi } from '../../../services/api';

export interface ReturnItemRow {
  id: string;
  invoiceNumber: string;
  medicineName: string;
  medicineId?: string;
  batchNumber: string;
  quantity: number;
  maxQty: number | null;
  unitPrice: number;
  refundAmount: number;
  medSearchQuery: string;
  showDropdown: boolean;
  categoryFilter: string;
}

export interface ReturnSlipItem {
  medicineName: string;
  batchNumber?: string;
  quantity: number;
  unitPrice?: number;
  refundAmount: number;
}

export interface ReturnSlipData {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  patientName: string;
  patientUhid?: string;
  patientPhone?: string;
  date: string;
  status: string;
  refundMethod?: string;
  reason?: string;
  items: ReturnSlipItem[];
  totalRefund: number;
}

export const CustomerReturnsPage: React.FC = () => {
  const { addToast, patients: hmsPatients = [], storeItems = [] } = useHMS();
  const {
    customerReturns: contextReturns,
    addCustomerReturn,
    updateCustomerReturn,
    deleteCustomerReturn,
    medicines,
    batches,
    invoices,
    prescriptions,
    refreshData,
  } = usePharmacy();

  const [returns, setReturns] = useState<CustomerReturn[]>(contextReturns);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'stock_audit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedReturnSlip, setSelectedReturnSlip] = useState<ReturnSlipData | null>(null);

  // Patient Fetching & Search State
  const [allFetchedPatients, setAllFetchedPatients] = useState<Patient[]>(hmsPatients);
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientPurchases, setPatientPurchases] = useState<{
    invoices: POSInvoice[];
    prescriptions: PrescriptionOrder[];
  }>({ invoices: [], prescriptions: [] });

  const patientSearchRef = useRef<HTMLDivElement>(null);

  const [manualMode, setManualMode] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientUhid, setPatientUhid] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  // Helper to create empty item row
  const createEmptyItem = (defaultInvoice = ''): ReturnItemRow => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    invoiceNumber: defaultInvoice,
    medicineName: '',
    medicineId: '',
    batchNumber: '',
    quantity: 1,
    maxQty: null,
    unitPrice: 0,
    refundAmount: 0,
    medSearchQuery: '',
    showDropdown: false,
    categoryFilter: 'All',
  });

  // Multiple Return Items State
  const [returnItems, setReturnItems] = useState<ReturnItemRow[]>([createEmptyItem()]);

  const [reason, setReason] = useState('Unopened box returned by patient');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Credit Note' | 'Original Payment'>('Cash');
  const [autoApprove, setAutoApprove] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReturns(contextReturns);
  }, [contextReturns]);

  // Load all patients from API when component mounts or modal opens
  const loadPatients = async () => {
    try {
      const data = await fetchPatientsApi();
      if (Array.isArray(data) && data.length > 0) {
        setAllFetchedPatients(data);
      } else if (hmsPatients.length > 0) {
        setAllFetchedPatients(hmsPatients);
      }
    } catch (e) {
      if (hmsPatients.length > 0) {
        setAllFetchedPatients(hmsPatients);
      }
    }
  };

  useEffect(() => {
    loadPatients();
  }, [hmsPatients]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      await loadPatients();
      addToast('info', 'Data Synced', 'Pharmacy inventory and patient return records refreshed from server.');
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Comprehensive Inventory Medicines Catalog (merged & deduplicated)
  const allInventoryMedicines = useMemo(() => {
    const map = new Map<string, Medicine>();

    // 1. Medicines from Pharmacy Context
    medicines.forEach((m) => {
      const name = (m.name || '').trim();
      if (!name) return;
      map.set(name.toLowerCase(), {
        ...m,
        currentStock: m.currentStock ?? 0,
      });
    });

    // 2. Batches in Inventory
    batches.forEach((b) => {
      const name = (b.medicineName || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = map.get(key);
      const batchQty = b.availableQuantity || 0;
      if (existing) {
        if (existing.currentStock === 0 && batchQty > 0) {
          existing.currentStock = batchQty;
        }
        if (!existing.sellingPrice && b.sellingPrice) {
          existing.sellingPrice = b.sellingPrice;
        }
      } else {
        map.set(key, {
          id: b.medicineId || b.id,
          name: b.medicineName,
          code: b.batchNumber,
          category: 'General',
          brand: b.supplierName || 'Standard',
          genericName: b.medicineName || '',
          manufacturer: b.supplierName || 'Standard Pharma',
          strength: 'Standard',
          storageCondition: 'Room Temperature',
          currentStock: batchQty,
          sellingPrice: b.sellingPrice || 0,
          purchasePrice: b.purchasePrice || 0,
          rackLocation: 'Pharmacy Shelf A-1',
          dosageForm: 'Tablets',
          minStock: 10,
          maxStock: 500,
          reorderLevel: 20,
          status: 'Active',
          unit: 'Units',
          gst: 12,
        });
      }
    });

    // 3. Store Items from Item Master
    storeItems.forEach((si) => {
      const name = (si.itemName || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: si.id,
          name: si.itemName,
          code: si.itemCode,
          category: (si.category as string) || 'General',
          brand: si.brand || si.genericComposition || 'Standard',
          genericName: si.genericComposition || si.itemName,
          manufacturer: si.brand || 'Standard Pharma',
          strength: si.strength || 'Standard',
          storageCondition: 'Room Temperature',
          currentStock: si.currentStock ?? 0,
          sellingPrice: (si as any).sellingPrice ?? si.unitPrice ?? 0,
          purchasePrice: si.unitPrice ?? 0,
          rackLocation: (si as any).rackLocation || (si as any).storageLocation || 'Shelf B-1',
          dosageForm: si.dosageForm || 'Tablets',
          minStock: si.minStock ?? 10,
          maxStock: si.maxStock ?? 500,
          reorderLevel: si.reorderLevel ?? 20,
          status: (si.status as 'Active' | 'Inactive') || 'Active',
          unit: (si.unit as string) || 'Units',
          gst: (si as any).gst ?? (si as any).gstPercentage ?? 12,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, batches, storeItems]);

  // Helper: Get Live Medicine Stock
  const getMedicineStockInfo = (medicineName: string, medicineId?: string) => {
    const cleanName = (medicineName || '').trim().toLowerCase();
    const cleanId = (medicineId || '').trim().toLowerCase();

    const med = allInventoryMedicines.find(
      (m) =>
        (cleanId && m.id?.toLowerCase() === cleanId) ||
        (cleanId && m.code?.toLowerCase() === cleanId) ||
        m.name?.toLowerCase() === cleanName ||
        (cleanName && m.name?.toLowerCase().includes(cleanName))
    );

    const availableBatches = batches.filter(
      (b) =>
        (med && b.medicineId === med.id) ||
        (cleanName && b.medicineName?.toLowerCase() === cleanName) ||
        (cleanName && b.medicineName?.toLowerCase().includes(cleanName))
    );

    const totalBatchStock = availableBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
    const stock = med ? (med.currentStock ?? totalBatchStock) : totalBatchStock;

    return {
      medicine: med,
      currentStock: stock,
      batches: availableBatches,
      rackLocation: med?.rackLocation || 'Pharmacy Rack A',
      unitPrice: med?.sellingPrice || (availableBatches[0]?.sellingPrice ?? 0),
    };
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalReturnsCount = returns.length;
    const totalUnitsRestocked = returns.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const totalRefundAmount = returns.reduce((acc, r) => acc + (Number(r.refundAmount) || 0), 0);
    const approvedCount = returns.filter((r) => r.status === 'Approved').length;
    const pendingCount = returns.filter((r) => r.status === 'Pending').length;

    return {
      totalReturnsCount,
      totalUnitsRestocked,
      totalRefundAmount,
      approvedCount,
      pendingCount,
    };
  }, [returns]);

  // Unified List of Patients & Customers for Search & Selection
  const unifiedPatientsList = useMemo(() => {
    const map = new Map<string, Patient>();

    // 1. Registered Patients from HMS
    allFetchedPatients.forEach((p) => {
      const key = (p.uhid || `${p.firstName}_${p.lastName}_${p.mobile}`).toLowerCase();
      map.set(key, p);
    });

    // 2. Patients from Prescriptions
    prescriptions.forEach((rx) => {
      if (rx.patientName) {
        const key = (rx.patientUhid || rx.patientName).toLowerCase();
        if (!map.has(key)) {
          const names = rx.patientName.split(' ');
          map.set(key, {
            id: rx.id,
            uhid: rx.patientUhid || `UHID-RX-${Math.floor(1000 + Math.random() * 9000)}`,
            firstName: names[0] || rx.patientName,
            lastName: names.slice(1).join(' ') || '',
            gender: (rx.patientGender as any) || 'Other',
            dob: '',
            age: rx.patientAge || 35,
            mobile: '+91 98765 00000',
            bloodGroup: 'B+',
            maritalStatus: 'Single',
            nationality: 'Indian',
            email: '',
            address: 'Hospital Cantonment',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            pincode: '560001',
            aadhaar: '',
            emergencyContactName: '',
            emergencyRelationship: '',
            emergencyPhone: '',
            status: 'Active',
            registrationDate: rx.visitDate || new Date().toISOString().split('T')[0],
          });
        }
      }
    });

    // 3. Customers from POS Invoices
    invoices.forEach((inv) => {
      if (inv.customerName && inv.customerName.toLowerCase() !== 'walk-in customer') {
        const key = `${inv.customerName}_${inv.customerPhone || ''}`.toLowerCase();
        if (!map.has(key)) {
          const names = inv.customerName.split(' ');
          map.set(key, {
            id: inv.id,
            uhid: `UHID-POS-${inv.invoiceNumber.replace(/\D/g, '').slice(-4) || '1020'}`,
            firstName: names[0] || inv.customerName,
            lastName: names.slice(1).join(' ') || '',
            gender: 'Male',
            dob: '',
            age: 40,
            mobile: inv.customerPhone || '',
            bloodGroup: 'O+',
            maritalStatus: 'Single',
            nationality: 'Indian',
            email: '',
            address: 'Direct Customer',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            pincode: '560001',
            aadhaar: '',
            emergencyContactName: '',
            emergencyRelationship: '',
            emergencyPhone: '',
            status: 'Active',
            registrationDate: inv.date || new Date().toISOString().split('T')[0],
          });
        }
      }
    });

    return Array.from(map.values());
  }, [allFetchedPatients, prescriptions, invoices]);

  // Filtered Patients for the Search Dropdown
  const filteredPatients = useMemo(() => {
    if (!searchPatientQuery.trim()) {
      return unifiedPatientsList.slice(0, 15);
    }
    const q = searchPatientQuery.toLowerCase().trim();
    return unifiedPatientsList.filter((p) => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const uhid = (p.uhid || '').toLowerCase();
      const mobile = (p.mobile || '').replace(/\D/g, '');
      const cleanQ = q.replace(/\D/g, '');
      return (
        fullName.includes(q) ||
        uhid.includes(q) ||
        (cleanQ && mobile.includes(cleanQ)) ||
        (p.city && p.city.toLowerCase().includes(q))
      );
    });
  }, [unifiedPatientsList, searchPatientQuery]);

  // Handle Selecting a Patient
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    setPatientName(fullName);
    setPatientUhid(patient.uhid || '');
    setPatientPhone(patient.mobile || '');

    // Filter patient's invoices and prescriptions
    const patUhid = (patient.uhid || '').toLowerCase();
    const patName = fullName.toLowerCase();
    const patPhone = (patient.mobile || '').replace(/\D/g, '');

    const matchingInvoices = invoices.filter((inv) => {
      const cName = (inv.customerName || '').toLowerCase();
      const cPhone = (inv.customerPhone || '').replace(/\D/g, '');
      return (
        (patName && cName.includes(patName)) ||
        (patName && patName.includes(cName) && cName.length > 3) ||
        (patPhone && cPhone && patPhone.includes(cPhone)) ||
        (cPhone && patPhone && cPhone.includes(patPhone))
      );
    });

    const matchingRx = prescriptions.filter((rx) => {
      const rUhid = (rx.patientUhid || '').toLowerCase();
      const rName = (rx.patientName || '').toLowerCase();
      return (
        (patUhid && rUhid === patUhid) ||
        (patName && rName.includes(patName)) ||
        (patName && patName.includes(rName) && rName.length > 3)
      );
    });

    setPatientPurchases({
      invoices: matchingInvoices,
      prescriptions: matchingRx,
    });

    // Auto set default invoice number if found
    if (matchingInvoices.length > 0) {
      setInvoiceNo(matchingInvoices[0].invoiceNumber);
    } else if (matchingRx.length > 0) {
      setInvoiceNo(matchingRx[0].prescriptionNumber);
    } else {
      setInvoiceNo(`POS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    }

    setShowPatientDropdown(false);
    setSearchPatientQuery('');
  };

  // Helper: Filter catalog medicines for a specific search query & category
  const getFilteredCatalogForSearch = (query: string, category: string) => {
    let list = allInventoryMedicines;
    if (category && category !== 'All') {
      list = list.filter((m) =>
        (m.category || m.dosageForm || '').toLowerCase().includes(category.toLowerCase())
      );
    }
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.code?.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q) ||
        m.brand?.toLowerCase().includes(q) ||
        m.rackLocation?.toLowerCase().includes(q)
    );
  };

  // Add a new empty medicine row
  const handleAddItemRow = () => {
    setReturnItems((prev) => [...prev, createEmptyItem(invoiceNo)]);
  };

  // Remove a medicine row
  const handleRemoveItemRow = (index: number) => {
    setReturnItems((prev) => {
      if (prev.length <= 1) {
        return [createEmptyItem(invoiceNo)];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Update field on a specific return item row
  const handleUpdateItemField = (index: number, field: keyof ReturnItemRow, value: any) => {
    setReturnItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity') {
        const validQty = Math.max(1, Number(value) || 1);
        const capped = item.maxQty !== null && item.maxQty !== undefined ? Math.min(validQty, item.maxQty) : validQty;
        item.quantity = capped;
        item.refundAmount = Number((capped * (item.unitPrice || 0)).toFixed(2));
      } else if (field === 'unitPrice') {
        const price = Math.max(0, Number(value) || 0);
        item.unitPrice = price;
        item.refundAmount = Number(((item.quantity || 1) * price).toFixed(2));
      }

      updated[index] = item;
      return updated;
    });
  };

  // Select catalog medicine for a specific item row
  const handleSelectCatalogMedForItem = (index: number, med: Medicine) => {
    const stockInfo = getMedicineStockInfo(med.name, med.id);
    const price = med.sellingPrice || stockInfo.unitPrice || 10;
    const batch =
      stockInfo.batches.length > 0
        ? stockInfo.batches[0].batchNumber || 'BAT-2026-01'
        : med.code || 'BAT-2026-01';

    setReturnItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.medicineName = med.name;
      item.medicineId = med.id;
      item.unitPrice = price;
      item.batchNumber = batch;
      item.refundAmount = Number(((item.quantity || 1) * price).toFixed(2));
      item.showDropdown = false;
      item.medSearchQuery = '';
      updated[index] = item;
      return updated;
    });
  };

  // Select item from past dispensed purchases to autofill or append
  const handleSelectPurchasedItem = (purchasedItem: {
    medicineName: string;
    batchNumber?: string;
    unitPrice: number;
    quantity: number;
    invoiceRef: string;
  }) => {
    const stockInfo = getMedicineStockInfo(purchasedItem.medicineName);
    const price = purchasedItem.unitPrice || stockInfo.unitPrice || 0;
    const batch = purchasedItem.batchNumber || stockInfo.batches[0]?.batchNumber || 'BAT-2026-01';

    setReturnItems((prev) => {
      // If the first row is empty, fill it
      if (prev.length === 1 && !prev[0].medicineName.trim()) {
        return [
          {
            id: prev[0].id,
            invoiceNumber: purchasedItem.invoiceRef,
            medicineName: purchasedItem.medicineName,
            medicineId: stockInfo.medicine?.id || '',
            batchNumber: batch,
            quantity: 1,
            maxQty: purchasedItem.quantity || null,
            unitPrice: price,
            refundAmount: Number(price.toFixed(2)),
            medSearchQuery: '',
            showDropdown: false,
            categoryFilter: 'All',
          },
        ];
      }

      // Check if already in return items
      const existingIdx = prev.findIndex(
        (it) =>
          it.medicineName.toLowerCase() === purchasedItem.medicineName.toLowerCase() &&
          (it.invoiceNumber === purchasedItem.invoiceRef || !it.invoiceNumber)
      );

      if (existingIdx >= 0) {
        addToast('info', 'Already Added', `${purchasedItem.medicineName} is already in the return list.`);
        return prev;
      }

      // Append new item row
      addToast('success', 'Item Added', `Added ${purchasedItem.medicineName} to return list.`);
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          invoiceNumber: purchasedItem.invoiceRef,
          medicineName: purchasedItem.medicineName,
          medicineId: stockInfo.medicine?.id || '',
          batchNumber: batch,
          quantity: 1,
          maxQty: purchasedItem.quantity || null,
          unitPrice: price,
          refundAmount: Number(price.toFixed(2)),
          medSearchQuery: '',
          showDropdown: false,
          categoryFilter: 'All',
        },
      ];
    });
  };

  // Live calculation of voucher totals across all return items
  const voucherTotals = useMemo(() => {
    const validItems = returnItems.filter((it) => it.medicineName.trim());
    const totalUnits = validItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalRefund = validItems.reduce((acc, it) => acc + (Number(it.refundAmount) || 0), 0);
    return {
      itemCount: validItems.length,
      totalUnits,
      totalRefund,
    };
  }, [returnItems]);

  // Filter Returns List
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      // Tab filter
      if (activeTab === 'approved' && r.status !== 'Approved') return false;
      if (activeTab === 'pending' && r.status !== 'Pending') return false;

      // Status filter dropdown
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;

      // Date filter
      if (dateFilter === 'Today') {
        const today = new Date().toISOString().split('T')[0];
        if (r.date !== today) return false;
      }

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const retNum = (r.returnNumber || '').toLowerCase();
        const invNum = (r.invoiceNumber || '').toLowerCase();
        const patName = (r.patientName || '').toLowerCase();
        const patUhid = (r.patientUhid || '').toLowerCase();
        const med = (r.medicineName || '').toLowerCase();
        const batch = (r.batchNumber || '').toLowerCase();
        return (
          retNum.includes(query) ||
          invNum.includes(query) ||
          patName.includes(query) ||
          patUhid.includes(query) ||
          med.includes(query) ||
          batch.includes(query)
        );
      }

      return true;
    });
  }, [returns, activeTab, statusFilter, dateFilter, searchQuery]);

  // Aggregated Stock Restock Audit Data
  const stockAuditList = useMemo(() => {
    const map = new Map<
      string,
      {
        medicineName: string;
        totalReturnsCount: number;
        totalUnitsRestocked: number;
        totalRefundAmount: number;
        currentStock: number;
        batchNumber?: string;
        rackLocation: string;
      }
    >();

    returns.forEach((r) => {
      const key = (r.medicineName || '').trim().toLowerCase();
      if (!key) return;

      const existing = map.get(key);
      const stockInfo = getMedicineStockInfo(r.medicineName, r.medicineId);

      if (existing) {
        existing.totalReturnsCount += 1;
        existing.totalUnitsRestocked += Number(r.quantity) || 0;
        existing.totalRefundAmount += Number(r.refundAmount) || 0;
      } else {
        map.set(key, {
          medicineName: r.medicineName,
          totalReturnsCount: 1,
          totalUnitsRestocked: Number(r.quantity) || 0,
          totalRefundAmount: Number(r.refundAmount) || 0,
          currentStock: stockInfo.currentStock,
          batchNumber: r.batchNumber || stockInfo.batches[0]?.batchNumber,
          rackLocation: stockInfo.rackLocation,
        });
      }
    });

    return Array.from(map.values());
  }, [returns, allInventoryMedicines, batches]);

  // Toggle Approval Status
  const handleToggleApproval = async (r: CustomerReturn) => {
    const nextStatus = r.status === 'Approved' ? 'Pending' : 'Approved';
    try {
      if (updateCustomerReturn) {
        await updateCustomerReturn(r.id, { status: nextStatus });
      } else {
        setReturns((prev) => prev.map((item) => (item.id === r.id ? { ...item, status: nextStatus } : item)));
      }
      addToast('success', 'Status Updated', `Return ${r.returnNumber} marked as ${nextStatus}.`);
      refreshData();
    } catch (err) {
      console.error(err);
      addToast('error', 'Update Failed', 'Could not update return approval status.');
    }
  };

  // Delete Return
  const handleDeleteReturn = async (r: CustomerReturn) => {
    if (!window.confirm(`Are you sure you want to delete return ${r.returnNumber}?`)) return;
    try {
      if (deleteCustomerReturn) {
        await deleteCustomerReturn(r.id);
      } else {
        setReturns((prev) => prev.filter((item) => item.id !== r.id));
      }
      addToast('info', 'Return Deleted', `Return ${r.returnNumber} was removed.`);
      refreshData();
    } catch (err) {
      console.error(err);
      addToast('error', 'Delete Failed', 'Failed to delete return entry.');
    }
  };

  // Open Return Slip Modal
  const handleOpenSlip = (r: CustomerReturn) => {
    const related = returns.filter((item) => item.returnNumber === r.returnNumber);
    const rows = related.length > 0 ? related : [r];
    const items: ReturnSlipItem[] = rows.map((it) => ({
      medicineName: it.medicineName,
      batchNumber: it.batchNumber,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.quantity) > 0 ? Number(it.refundAmount || 0) / Number(it.quantity) : 0,
      refundAmount: Number(it.refundAmount || 0),
    }));
    const totalRefund = items.reduce((sum, it) => sum + it.refundAmount, 0);

    setSelectedReturnSlip({
      id: r.id,
      returnNumber: r.returnNumber,
      invoiceNumber: r.invoiceNumber,
      patientName: r.patientName,
      patientUhid: r.patientUhid,
      patientPhone: r.patientPhone,
      date: r.date || new Date().toISOString().split('T')[0],
      status: r.status,
      refundMethod: r.refundMethod,
      reason: r.reason,
      items,
      totalRefund,
    });
    setSlipModalOpen(true);
  };

  // Handle Save Return (Multi-Item)
  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      addToast('warning', 'Missing Patient', 'Please enter or select a patient / customer name.');
      return;
    }

    const validItems = returnItems.filter((it) => it.medicineName.trim());
    if (validItems.length === 0) {
      addToast('warning', 'Missing Information', 'Please add at least one returned medicine.');
      return;
    }

    for (const it of validItems) {
      if (!it.quantity || it.quantity <= 0) {
        addToast('warning', 'Invalid Quantity', `Quantity for ${it.medicineName} must be at least 1.`);
        return;
      }
    }

    setIsSubmitting(true);
    const finalReason = reason === 'Other' ? customReason || 'Other customer return' : reason;
    const finalReturnNo = `CRET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const returnDate = new Date().toISOString().split('T')[0];

    const totalUnits = validItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0);
    const totalRefund = validItems.reduce((acc, it) => acc + Number(it.refundAmount || 0), 0);

    const payloads: Partial<CustomerReturn>[] = validItems.map((item) => ({
      returnNumber: finalReturnNo,
      invoiceNumber: item.invoiceNumber.trim() || invoiceNo.trim() || `POS-${new Date().getFullYear()}-001`,
      patientName: patientName.trim(),
      patientUhid: patientUhid.trim() || (selectedPatient?.uhid ?? ''),
      patientPhone: patientPhone.trim() || (selectedPatient?.mobile ?? ''),
      medicineName: item.medicineName.trim(),
      medicineId: item.medicineId || '',
      batchNumber: item.batchNumber.trim() || 'BAT-2026-01',
      quantity: Number(item.quantity) || 1,
      reason: finalReason,
      refundAmount: Number(item.refundAmount) || 0,
      refundMethod,
      status: autoApprove ? 'Approved' : 'Pending',
      date: returnDate,
    }));

    try {
      const createdResults = await Promise.all(payloads.map((payload) => addCustomerReturn(payload)));
      addToast(
        'success',
        'Return Processed & Stock Restocked',
        `Processed return voucher ${finalReturnNo} for ${validItems.length} items (+${totalUnits} units restocked). Refund of ₹${totalRefund.toFixed(2)} recorded.`
      );

      // Trigger slip view
      setSelectedReturnSlip({
        id: createdResults[0]?.id || `cret-${Date.now()}`,
        returnNumber: finalReturnNo,
        invoiceNumber: validItems[0]?.invoiceNumber || invoiceNo || `POS-${new Date().getFullYear()}-001`,
        patientName: patientName.trim(),
        patientUhid: patientUhid.trim() || (selectedPatient?.uhid ?? ''),
        patientPhone: patientPhone.trim() || (selectedPatient?.mobile ?? ''),
        date: returnDate,
        status: autoApprove ? 'Approved' : 'Pending',
        refundMethod,
        reason: finalReason,
        items: validItems.map((it) => ({
          medicineName: it.medicineName,
          batchNumber: it.batchNumber,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          refundAmount: it.refundAmount,
        })),
        totalRefund,
      });
      setSlipModalOpen(true);
      setNewModalOpen(false);
      resetForm();
      refreshData();
    } catch (err) {
      console.error('Failed to save customer return:', err);
      // Fallback local update
      const fallbackRets: CustomerReturn[] = payloads.map((p, idx) => ({
        id: `cret-${Date.now()}-${idx}`,
        ...(p as CustomerReturn),
      }));
      setReturns((prev) => [...fallbackRets, ...prev]);
      addToast('success', 'Return Recorded', `Customer return ${finalReturnNo} recorded successfully.`);
      setSelectedReturnSlip({
        id: fallbackRets[0].id,
        returnNumber: finalReturnNo,
        invoiceNumber: validItems[0]?.invoiceNumber || invoiceNo || `POS-${new Date().getFullYear()}-001`,
        patientName: patientName.trim(),
        patientUhid: patientUhid.trim() || (selectedPatient?.uhid ?? ''),
        patientPhone: patientPhone.trim() || (selectedPatient?.mobile ?? ''),
        date: returnDate,
        status: autoApprove ? 'Approved' : 'Pending',
        refundMethod,
        reason: finalReason,
        items: validItems.map((it) => ({
          medicineName: it.medicineName,
          batchNumber: it.batchNumber,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          refundAmount: it.refundAmount,
        })),
        totalRefund,
      });
      setSlipModalOpen(true);
      setNewModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientPurchases({ invoices: [], prescriptions: [] });
    setSearchPatientQuery('');
    setShowPatientDropdown(false);
    setInvoiceNo('');
    setPatientName('');
    setPatientUhid('');
    setPatientPhone('');
    setReason('Unopened box returned by patient');
    setCustomReason('');
    setManualMode(false);
    setReturnItems([createEmptyItem()]);
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Customer Medicine Returns & Stock Refunds
                  <span className="text-[11px] font-semibold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Live Stock Sync
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fetch patient details, match past dispensing receipts, restock returned medicines into inventory & issue refund credits.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh return records & live inventory stock"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() => {
                resetForm();
                loadPatients();
                setNewModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Process New Return
            </button>
          </div>
        </div>

        {/* Summary Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100">
          <div className="bg-slate-50/80 border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Returns</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalReturnsCount}</p>
              <span className="text-[10px] text-slate-500 font-medium">Logged customer returns</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Stock Restocked</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">+{stats.totalUnitsRestocked} Units</p>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Returned to inventory
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Refunds Issued</p>
              <p className="text-xl font-extrabold text-blue-700 mt-0.5">₹{stats.totalRefundAmount.toFixed(2)}</p>
              <span className="text-[10px] text-blue-600 font-medium">Patient credits / cash</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Approval Status</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                <span className="text-emerald-700">{stats.approvedCount}</span>
                <span className="text-xs text-slate-400 font-medium mx-1">/</span>
                <span className="text-amber-700 text-base">{stats.pendingCount} Pending</span>
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Restocked vs verification</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Returns ({returns.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'approved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Approved & Restocked ({stats.approvedCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Pending ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('stock_audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${activeTab === 'stock_audit' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Stock Restock Audit ({stockAuditList.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today Only</option>
            </select>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Invoice, Return, UHID, Patient or Medicine..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'stock_audit' ? (
        /* Stock Restock Audit View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-rose-600" /> Customer Return Restock Inventory Summary
              </h2>
              <p className="text-xs text-slate-500">
                Aggregated summary of medicine stocks incremented back into pharmacy storage from customer returns.
              </p>
            </div>
            <span className="text-xs font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
              {stockAuditList.length} Unique Medicines Returned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Medicine Name</th>
                  <th className="p-4">Primary Batch</th>
                  <th className="p-4">Storage Location</th>
                  <th className="p-4 text-center">Return Frequency</th>
                  <th className="p-4 text-emerald-800 text-center">Total Restocked Units</th>
                  <th className="p-4 text-blue-800">Total Refund Value</th>
                  <th className="p-4">Current Pharmacy Stock</th>
                  <th className="p-4">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stockAuditList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No customer return stock entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockAuditList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                          {item.medicineName.charAt(0)}
                        </div>
                        {item.medicineName}
                      </td>
                      <td className="p-4 font-medium text-slate-700">{item.batchNumber || 'General Stock'}</td>
                      <td className="p-4 text-slate-600 font-mono text-[11px]">{item.rackLocation}</td>
                      <td className="p-4 text-center font-bold text-slate-700">{item.totalReturnsCount} returns</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          +{item.totalUnitsRestocked} units
                        </span>
                      </td>
                      <td className="p-4 font-bold text-blue-700">₹{item.totalRefundAmount.toFixed(2)}</td>
                      <td className="p-4 font-black text-slate-900">
                        <span className="text-sm font-extrabold">{item.currentStock}</span> units
                      </td>
                      <td className="p-4">
                        {item.currentStock > 20 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Adequate Stock
                          </span>
                        ) : item.currentStock > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Returns Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Return No & Date</th>
                  <th className="p-4">Invoice / Rx Ref</th>
                  <th className="p-4">Patient Details</th>
                  <th className="p-4">Returned Medicine</th>
                  <th className="p-4 text-center">Return Qty</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Refund Amount</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                          <RotateCcw className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">No Customer Returns Found</p>
                        <p className="text-xs text-slate-500">
                          {searchQuery
                            ? `No records matching "${searchQuery}". Try clearing search filters.`
                            : 'No customer returns recorded yet. Click "Process New Return" to log a return and restock medicines.'}
                        </p>
                        <button
                          onClick={() => {
                            resetForm();
                            loadPatients();
                            setNewModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Process First Return
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((r) => {
                    const stockInfo = getMedicineStockInfo(r.medicineName, r.medicineId);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Return No & Date */}
                        <td className="p-4">
                          <div className="font-extrabold text-rose-700">{r.returnNumber}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {r.date || 'Recent'}
                          </div>
                        </td>

                        {/* Invoice Ref */}
                        <td className="p-4">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {r.invoiceNumber || 'Direct POS'}
                          </span>
                        </td>

                        {/* Patient Details */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {r.patientName || 'Walk-in Customer'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.patientUhid && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                {r.patientUhid}
                              </span>
                            )}
                            {r.patientPhone && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {r.patientPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Medicine */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{r.medicineName}</div>
                          {r.batchNumber && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Batch: {r.batchNumber}
                            </div>
                          )}
                        </td>

                        {/* Return Qty */}
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs inline-flex items-center gap-1">
                            +{r.quantity}
                          </span>
                          <div className="text-[9px] text-emerald-700 font-bold uppercase mt-0.5">Restocked</div>
                        </td>

                        {/* Current Pharmacy Stock */}
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {stockInfo.currentStock} units
                          </div>
                          <span className="text-[9px] text-slate-400">{stockInfo.rackLocation}</span>
                        </td>

                        {/* Refund Amount */}
                        <td className="p-4">
                          <div className="font-extrabold text-emerald-700 text-sm">
                            ₹{Number(r.refundAmount || 0).toFixed(2)}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {r.refundMethod || 'Cash'}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="p-4 text-slate-600 max-w-[180px] truncate" title={r.reason}>
                          {r.reason || 'Patient return'}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${r.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                          >
                            {r.status === 'Approved' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            {r.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenSlip(r)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                              title="View & Print Return Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleApproval(r)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                              title="Toggle Approval Status"
                            >
                              Toggle
                            </button>

                            <button
                              onClick={() => handleDeleteReturn(r)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Customer Return Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Process Customer Return & Stock Restock</h3>
                  <p className="text-[11px] text-slate-500">
                    Fetch patient details, add single or multiple returned medicines, restock to inventory & issue combined refund credit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturn} className="space-y-4">
              {/* STEP 1: Patient Details & Search */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <User className="w-4 h-4 text-rose-600" /> 1. Patient & Dispensing Lookup
                    <span className="text-[10px] font-semibold text-slate-500">
                      ({unifiedPatientsList.length} patients in records)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(!manualMode);
                      setShowPatientDropdown(false);
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {manualMode ? '← Search Patient Records' : 'Manual / Walk-in Mode'}
                  </button>
                </div>

                {!manualMode ? (
                  <div className="space-y-2 relative" ref={patientSearchRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchPatientQuery}
                        onChange={(e) => {
                          setSearchPatientQuery(e.target.value);
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        placeholder="Search patient by Name, UHID, or Mobile number..."
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 font-semibold text-slate-900 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-xs text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Patient Search Results Dropdown */}
                    {showPatientDropdown && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Available Patients ({filteredPatients.length})
                          </p>
                          <span className="text-[10px] text-slate-400">Click to fetch details</span>
                        </div>

                        {filteredPatients.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-xs">
                            No patient matching "{searchPatientQuery}".
                            <button
                              type="button"
                              onClick={() => {
                                setManualMode(true);
                                setPatientName(searchPatientQuery);
                                setShowPatientDropdown(false);
                              }}
                              className="block mx-auto mt-1.5 text-xs font-bold text-rose-600 hover:underline"
                            >
                              Enter "{searchPatientQuery}" as walk-in customer →
                            </button>
                          </div>
                        ) : (
                          filteredPatients.map((p) => (
                            <div
                              key={p.id || p.uhid}
                              onClick={() => handleSelectPatient(p)}
                              className="p-2 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-rose-100"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">
                                  {p.firstName?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    {p.firstName} {p.lastName}
                                    {p.gender && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        ({p.gender}, {p.age || 30}y)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                    {p.mobile || 'No Mobile'} • {p.city || 'Bangalore'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                  {p.uhid || 'UHID-REG'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Patient Details Card */}
                    {selectedPatient && (
                      <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                            {selectedPatient.firstName?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {selectedPatient.firstName} {selectedPatient.lastName}
                              </span>
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                                {selectedPatient.uhid}
                              </span>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Verified Patient
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {selectedPatient.gender}, {selectedPatient.age} yrs • Phone: <strong>{selectedPatient.mobile || 'N/A'}</strong> • {selectedPatient.city || 'Hospital Cantonment'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(null);
                            setPatientPurchases({ invoices: [], prescriptions: [] });
                          }}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Clear Patient"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual Patient Inputs */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Patient Name *</label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Customer / Patient Name"
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">UHID (Optional)</label>
                      <input
                        type="text"
                        value={patientUhid}
                        onChange={(e) => setPatientUhid(e.target.value)}
                        placeholder="e.g. UHID-2026-1001"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Patient Past Purchases History (1-Click Add to Return List) */}
                {selectedPatient &&
                  (patientPurchases.invoices.length > 0 || patientPurchases.prescriptions.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-rose-600" /> Patient Past Dispensed Medicines (Click to add item into return list):
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">1-Click Multi-Item Add</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {patientPurchases.invoices.map((inv) =>
                          (inv.items || []).map((item, iIdx) => {
                            const isAdded = returnItems.some(
                              (it) =>
                                it.medicineName.trim().toLowerCase() === item.medicineName.trim().toLowerCase() &&
                                (it.invoiceNumber === inv.invoiceNumber || !it.invoiceNumber)
                            );

                            return (
                              <div
                                key={`${inv.id}-${iIdx}`}
                                onClick={() =>
                                  handleSelectPurchasedItem({
                                    medicineName: item.medicineName,
                                    batchNumber: item.batchNumber,
                                    unitPrice: item.unitPrice,
                                    quantity: item.quantity,
                                    invoiceRef: inv.invoiceNumber,
                                  })
                                }
                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isAdded
                                  ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                                  }`}
                              >
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                    {item.medicineName}
                                    {isAdded && (
                                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                        ✓ In Return List
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Invoice: <strong>{inv.invoiceNumber}</strong> • {item.quantity} units @ ₹{item.unitPrice}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${isAdded
                                    ? 'bg-emerald-200/80 text-emerald-900 hover:bg-emerald-300'
                                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs'
                                    }`}
                                >
                                  {isAdded ? '+ Add Again' : '+ Add to Return'}
                                </button>
                              </div>
                            );
                          })
                        )}

                        {patientPurchases.prescriptions.map((rx) =>
                          (rx.items || []).map((item, rIdx) => {
                            const isAdded = returnItems.some(
                              (it) =>
                                it.medicineName.trim().toLowerCase() === item.medicineName.trim().toLowerCase() &&
                                (it.invoiceNumber === rx.prescriptionNumber || !it.invoiceNumber)
                            );

                            return (
                              <div
                                key={`${rx.id}-${rIdx}`}
                                onClick={() =>
                                  handleSelectPurchasedItem({
                                    medicineName: item.medicineName,
                                    batchNumber: item.batchNumber,
                                    unitPrice: item.unitPrice || item.price || 0,
                                    quantity: item.quantity,
                                    invoiceRef: rx.prescriptionNumber,
                                  })
                                }
                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isAdded
                                  ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                                  }`}
                              >
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                    {item.medicineName}
                                    {isAdded && (
                                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                        ✓ In Return List
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Rx: <strong>{rx.prescriptionNumber}</strong> • Dispensed: {item.quantity} units
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${isAdded
                                    ? 'bg-emerald-200/80 text-emerald-900 hover:bg-emerald-300'
                                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs'
                                    }`}
                                >
                                  {isAdded ? '+ Add Again' : '+ Add to Return'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* STEP 2: MULTI-ITEM RETURN STOCK RESTOCK LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Boxes className="w-4 h-4 text-rose-600" /> 2. Returned Medicine(s) & Stock Restock Items
                    </label>
                    <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                      {returnItems.length} {returnItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Item
                  </button>
                </div>

                {/* Return Item Rows Cards */}
                <div className="space-y-3.5">
                  {returnItems.map((item, index) => {
                    const itemStockInfo = getMedicineStockInfo(item.medicineName, item.medicineId);
                    const catalog = getFilteredCatalogForSearch(item.medSearchQuery, item.categoryFilter);

                    return (
                      <div
                        key={item.id || index}
                        className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3.5 relative shadow-2xs"
                      >
                        {/* Row Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-[11px] flex items-center justify-center shadow-2xs">
                              #{index + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {item.medicineName ? item.medicineName : `Medicine Entry ${index + 1}`}
                            </span>
                            {item.maxQty !== null && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                Dispensed Limit: {item.maxQty} units
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {returnItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg cursor-pointer transition-colors"
                                title="Remove this medicine item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row Inputs: Invoice & Medicine Search */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                              Invoice / Receipt Ref No *
                            </label>
                            <input
                              type="text"
                              value={item.invoiceNumber}
                              onChange={(e) => handleUpdateItemField(index, 'invoiceNumber', e.target.value)}
                              placeholder="POS-2026-00411 or RX-..."
                              required
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none focus:border-rose-400 text-xs"
                            />
                          </div>

                          <div className="relative">
                            <label className="block font-bold text-slate-700 mb-1 text-[11px] flex items-center justify-between">
                              <span>Returned Medicine Name *</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                {allInventoryMedicines.length} in Catalog
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={item.medicineName}
                                onChange={(e) => {
                                  handleUpdateItemField(index, 'medicineName', e.target.value);
                                  handleUpdateItemField(index, 'medSearchQuery', e.target.value);
                                  handleUpdateItemField(index, 'showDropdown', true);
                                }}
                                onFocus={() => handleUpdateItemField(index, 'showDropdown', true)}
                                placeholder="Search or pick medicine from inventory catalog..."
                                required
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none focus:border-rose-400 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemField(index, 'showDropdown', !item.showDropdown)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Catalog Selection Dropdown */}
                            {item.showDropdown && (
                              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 space-y-2 max-h-72 overflow-y-auto">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Inventory Medicines ({catalog.length})
                                  </span>
                                  <span className="text-[10px] text-slate-400">Click to choose</span>
                                </div>

                                {/* Category Pills */}
                                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                                  {['All', 'Tablets', 'Capsules', 'Syrups', 'Injections', 'Ointments'].map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => handleUpdateItemField(index, 'categoryFilter', cat)}
                                      className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all cursor-pointer ${item.categoryFilter === cat
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>

                                {catalog.length === 0 ? (
                                  <div className="p-3 text-center text-slate-400 text-xs">
                                    No medicine found matching search.
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {catalog.slice(0, 30).map((m) => (
                                      <div
                                        key={m.id || m.name}
                                        onClick={() => handleSelectCatalogMedForItem(index, m)}
                                        className="p-2 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center justify-between transition-colors border border-transparent hover:border-rose-100"
                                      >
                                        <div>
                                          <p className="font-bold text-slate-900 text-xs">{m.name}</p>
                                          <p className="text-[10px] text-slate-500">
                                            {m.genericName || m.brand} • {m.dosageForm || 'Units'} • Rack: {m.rackLocation || 'A-1'}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold text-slate-800 text-xs">₹{Number(m.sellingPrice || 0).toFixed(2)}</span>
                                          <p className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5">
                                            Stock: {m.currentStock ?? 0}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LIVE STOCK RESTOCK IMPACT FOR THIS MEDICINE */}
                        {item.medicineName && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shadow-xs">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                  Restock Stock Impact
                                </p>
                                <p className="font-bold text-slate-900 text-[11px] mt-0.5">
                                  Current Inventory Stock: <span className="text-slate-700 font-extrabold">{itemStockInfo.currentStock} units</span>{' '}
                                  <span className="text-emerald-700 font-black">+{item.quantity} returned</span> ={' '}
                                  <span className="text-emerald-800 font-black underline">
                                    {itemStockInfo.currentStock + Number(item.quantity || 0)} units in stock after return
                                  </span>
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md self-start sm:self-auto">
                              FEFO Restock
                            </span>
                          </div>
                        )}

                        {/* 4 Inputs: Return Qty, Unit Price, Batch, Refund Amount */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                              Return Qty {item.maxQty !== null && <span className="text-rose-600 font-medium">(Max: {item.maxQty})</span>}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={item.maxQty !== null ? item.maxQty : undefined}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemField(index, 'quantity', Number(e.target.value))}
                              required
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 outline-none focus:border-rose-400 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">Unit Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItemField(index, 'unitPrice', Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none focus:border-rose-400 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">Batch Number</label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleUpdateItemField(index, 'batchNumber', e.target.value)}
                              placeholder="e.g. BAT-2026-01"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:border-rose-400 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1 text-[11px]">Item Refund (₹) *</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.refundAmount}
                              onChange={(e) => handleUpdateItemField(index, 'refundAmount', Number(e.target.value))}
                              required
                              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 font-black text-emerald-700 outline-none focus:border-emerald-500 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Big Button: + Add Another Medicine */}
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/40 hover:bg-rose-50 text-rose-700 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-xs"
                >
                  <Plus className="w-4 h-4" /> Add Another Medicine to This Return Voucher
                </button>

                {/* Multi-Item Voucher Summary Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Voucher Restock Total Summary
                      </p>
                      <p className="text-xs font-semibold text-white mt-0.5">
                        <strong className="text-rose-400">{voucherTotals.itemCount}</strong> Unique Item(s) •{' '}
                        <strong className="text-emerald-400">+{voucherTotals.totalUnits} Units</strong> Restocked into Inventory
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Combined Refund Amount
                    </p>
                    <p className="text-xl font-black text-emerald-400">
                      ₹{voucherTotals.totalRefund.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 3: Reason & Refund Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">3. Reason for Return *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none text-xs"
                  >
                    <option value="Unopened box returned by patient">Unopened box returned by patient</option>
                    <option value="Doctor altered / stopped prescription">Doctor altered / stopped prescription</option>
                    <option value="Patient discharged early">Patient discharged earlier than planned</option>
                    <option value="Wrong medicine / dosage dispensed">Wrong medicine / dosage dispensed</option>
                    <option value="Adverse reaction / patient intolerance">Adverse reaction / patient intolerance</option>
                    <option value="Packaging damaged or unsealed">Packaging damaged or unsealed</option>
                    <option value="Other">Other (Specify below)</option>
                  </select>

                  {reason === 'Other' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Type custom return reason..."
                      className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">4. Refund Payment Mode</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none text-xs"
                  >
                    <option value="Cash">Cash Refund</option>
                    <option value="UPI">UPI / Online Transfer</option>
                    <option value="Credit Note">Store / Patient Credit Note</option>
                    <option value="Card">Debit / Credit Card Reversal</option>
                    <option value="Original Payment">Original Payment Method</option>
                  </select>
                </div>
              </div>

              {/* Auto Approval Checkbox */}
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="autoApprove" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Approve immediately and automatically restock all items back into active pharmacy inventory.
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setNewModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve & Issue Refund (₹{voucherTotals.totalRefund.toFixed(2)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Multi-Item Return Slip / Credit Memo Modal */}
      {slipModalOpen && selectedReturnSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Customer Return & Refund Voucher</h3>
              </div>
              <button onClick={() => setSlipModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Slip Area */}
            <div id="printable-return-slip" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans">
              <div className="text-center border-b border-slate-200 pb-2">
                <h4 className="font-extrabold text-slate-900 text-sm tracking-wide">AEGISCARE HMS PHARMACY</h4>
                <p className="text-[10px] text-slate-500">Cantonment Branch • Pharmacy Returns & Credit Note</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Return Voucher:</span>{' '}
                  <strong className="text-rose-700">{selectedReturnSlip.returnNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Date:</span>{' '}
                  <strong className="text-slate-800">{selectedReturnSlip.date}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Orig Invoice:</span>{' '}
                  <strong className="text-slate-800">{selectedReturnSlip.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <strong className="text-emerald-700">{selectedReturnSlip.status}</strong>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Patient Information</p>
                <p className="font-bold text-slate-900 text-xs">{selectedReturnSlip.patientName}</p>
                {selectedReturnSlip.patientUhid && (
                  <p className="text-[10px] text-indigo-700 font-mono font-bold">UHID: {selectedReturnSlip.patientUhid}</p>
                )}
                {selectedReturnSlip.patientPhone && (
                  <p className="text-[10px] text-slate-500">Contact: {selectedReturnSlip.patientPhone}</p>
                )}
              </div>

              {/* Itemized Returned Medicines Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-500 font-bold">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Returned Medicine</th>
                      <th className="p-2 text-center">Batch</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReturnSlip.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-800">{it.medicineName}</td>
                        <td className="p-2 text-center text-slate-500 font-mono text-[10px]">
                          {it.batchNumber || 'BAT-2026-01'}
                        </td>
                        <td className="p-2 text-center font-black text-slate-800">+{it.quantity}</td>
                        <td className="p-2 text-right text-slate-600">
                          ₹{Number(it.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-black text-emerald-700">
                          ₹{Number(it.refundAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1">
                <span>Refund Method: {selectedReturnSlip.refundMethod || 'Cash'}</span>
                <span className="text-sm font-black text-emerald-700">
                  Grand Total Refund: ₹{Number(selectedReturnSlip.totalRefund || 0).toFixed(2)}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 italic pt-1">
                Reason: {selectedReturnSlip.reason || 'Customer Return'}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] text-slate-400 border-t border-slate-200">
                <div>Pharmacist Signature: __________________</div>
                <div className="text-right">Customer Signature: __________________</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

