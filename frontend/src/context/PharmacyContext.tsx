import React, { createContext, useContext, useState } from 'react';
import {
  Medicine,
  MedicineCategory,
  Batch,
  PurchaseEntry,
  PrescriptionOrder,
  POSInvoice,
  CustomerReturn,
  SupplierReturn,
} from '../types/hms';
import {
  fetchCategoriesApi,
  createCategoryApi,
  fetchMedicinesApi,
  createMedicineApi,
  updateMedicineApi as updateMedApi,
  deleteMedicineApi as deleteMedApi,
  fetchPharmacyBatchesApi,
  createPharmacyBatchApi,
  fetchPurchasesApi,
  createPurchaseApi,
  fetchCustomerReturnsApi,
  createCustomerReturnApi,
  updateCustomerReturnApi,
  deleteCustomerReturnApi,
  fetchSupplierReturnsApi,
  createSupplierReturnApi,
  fetchInvoicesApi,
  fetchPrescriptionsApi,
} from '../services/api';

export const REMOVED_MOCK_FLAG = true;

interface PharmacyContextType {
  categories: MedicineCategory[];
  medicines: Medicine[];
  batches: Batch[];
  purchases: PurchaseEntry[];
  prescriptions: PrescriptionOrder[];
  invoices: POSInvoice[];
  customerReturns: CustomerReturn[];
  supplierReturns: SupplierReturn[];
  setCategories: React.Dispatch<React.SetStateAction<MedicineCategory[]>>;
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseEntry[]>>;
  setPrescriptions: React.Dispatch<React.SetStateAction<PrescriptionOrder[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<POSInvoice[]>>;
  setCustomerReturns: React.Dispatch<React.SetStateAction<CustomerReturn[]>>;
  setSupplierReturns: React.Dispatch<React.SetStateAction<SupplierReturn[]>>;
  refreshData: () => void;
  addCategory: (payload: any) => Promise<any>;
  addMedicine: (payload: any) => Promise<any>;
  updateMedicine: (id: string, payload: any) => Promise<any>;
  deleteMedicine: (id: string) => Promise<void>;
  addBatch: (payload: any) => Promise<any>;
  addPurchase: (payload: any) => Promise<any>;
  addCustomerReturn: (payload: any) => Promise<any>;
  updateCustomerReturn: (id: string, payload: any) => Promise<any>;
  deleteCustomerReturn: (id: string) => Promise<void>;
  addSupplierReturn: (payload: any) => Promise<any>;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

export const PharmacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<MedicineCategory[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>([]);
  const [invoices, setInvoices] = useState<POSInvoice[]>([]);
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>([]);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);

  const refreshData = async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    let userBranch: string | undefined = undefined;
    try {
      const u = JSON.parse(localStorage.getItem('hms_user') || '{}');
      const role = (u.role || '').toLowerCase().replace('userrole.', '').trim();
      if (role !== 'super_admin' && role !== 'admin') {
        userBranch = u.branch;
      }
    } catch {}

    try {
      const [catRes, medRes, batRes, purRes, crRes, srRes, invRes, rxRes] = await Promise.all([
        fetchCategoriesApi(userBranch).catch(() => []),
        fetchMedicinesApi(userBranch).catch(() => []),
        fetchPharmacyBatchesApi(userBranch).catch(() => []),
        fetchPurchasesApi(userBranch).catch(() => []),
        fetchCustomerReturnsApi(userBranch).catch(() => []),
        fetchSupplierReturnsApi(userBranch).catch(() => []),
        fetchInvoicesApi(userBranch).catch(() => []),
        fetchPrescriptionsApi(userBranch).catch(() => []),
      ]);

      if (Array.isArray(catRes)) setCategories(catRes);
      if (Array.isArray(medRes)) setMedicines(medRes);
      if (Array.isArray(batRes)) setBatches(batRes);
      if (Array.isArray(purRes)) setPurchases(purRes);
      if (Array.isArray(crRes)) setCustomerReturns(crRes);
      if (Array.isArray(srRes)) setSupplierReturns(srRes);
      if (Array.isArray(invRes)) setInvoices(invRes);
      if (Array.isArray(rxRes)) setPrescriptions(rxRes);
    } catch (e) {
      console.warn("Failed to load pharmacy data from backend:", e);
    }
  };

  React.useEffect(() => {
    refreshData();
    window.addEventListener('hms_auth_change', refreshData);
    return () => {
      window.removeEventListener('hms_auth_change', refreshData);
    };
  }, []);

  const addCategory = async (payload: any) => {
    const created = await createCategoryApi(payload);
    setCategories((prev) => [created, ...prev]);
    return created;
  };

  const addMedicine = async (payload: any) => {
    const created = await createMedicineApi(payload);
    setMedicines((prev) => [created, ...prev]);
    return created;
  };

  const updateMedicine = async (id: string, payload: any) => {
    const updated = await updateMedApi(id, payload);
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    return updated;
  };

  const deleteMedicine = async (id: string) => {
    await deleteMedApi(id);
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const addBatch = async (payload: any) => {
    const created = await createPharmacyBatchApi(payload);
    setBatches((prev) => [created, ...prev]);
    return created;
  };

  const addPurchase = async (payload: any) => {
    const created = await createPurchaseApi(payload);
    setPurchases((prev) => [created, ...prev]);
    return created;
  };

  const addCustomerReturn = async (payload: any) => {
    const created = await createCustomerReturnApi(payload);
    setCustomerReturns((prev) => [created, ...prev]);
    return created;
  };

  const updateCustomerReturn = async (id: string, payload: any) => {
    const updated = await updateCustomerReturnApi(id, payload);
    setCustomerReturns((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    return updated;
  };

  const deleteCustomerReturn = async (id: string) => {
    await deleteCustomerReturnApi(id);
    setCustomerReturns((prev) => prev.filter((r) => r.id !== id));
  };

  const addSupplierReturn = async (payload: any) => {
    const created = await createSupplierReturnApi(payload);
    setSupplierReturns((prev) => [created, ...prev]);
    return created;
  };

  return (
    <PharmacyContext.Provider
      value={{
        categories,
        medicines,
        batches,
        purchases,
        prescriptions,
        invoices,
        customerReturns,
        supplierReturns,
        setCategories,
        setMedicines,
        setBatches,
        setPurchases,
        setPrescriptions,
        setInvoices,
        setCustomerReturns,
        setSupplierReturns,
        refreshData,
        addCategory,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addBatch,
        addPurchase,
        addCustomerReturn,
        updateCustomerReturn,
        deleteCustomerReturn,
        addSupplierReturn,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    return {
      categories: [],
      medicines: [],
      batches: [],
      purchases: [],
      prescriptions: [],
      invoices: [],
      customerReturns: [],
      supplierReturns: [],
      setCategories: () => {},
      setMedicines: () => {},
      setBatches: () => {},
      setPurchases: () => {},
      setPrescriptions: () => {},
      setInvoices: () => {},
      setCustomerReturns: () => {},
      setSupplierReturns: () => {},
      refreshData: () => {},
      addCategory: async () => {},
      addMedicine: async () => {},
      updateMedicine: async () => {},
      deleteMedicine: async () => {},
      addBatch: async () => {},
      addPurchase: async () => {},
      addCustomerReturn: async () => {},
      updateCustomerReturn: async () => {},
      deleteCustomerReturn: async () => {},
      addSupplierReturn: async () => {},
    };
  }
  return context;
};

