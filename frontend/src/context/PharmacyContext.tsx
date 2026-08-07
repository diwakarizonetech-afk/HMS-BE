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
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const API_BASE = rawApiUrl.endsWith('/api/v1') ? `${rawApiUrl}/pharmacy` : `${rawApiUrl}/api/v1/pharmacy`;

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
    try {
      const token = localStorage.getItem("hms_token");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const [catRes, medRes, batRes, purRes, rxRes, invRes, crRes, srRes] = await Promise.all([
        fetch(`${API_BASE}/categories`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/medicines`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/batches`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/purchases`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/prescriptions`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/invoices`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/customer-returns`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/supplier-returns`, { headers }).then(r => r.ok ? r.json() : []),
      ]);

      setCategories(catRes);
      setMedicines(medRes);
      setBatches(batRes);
      setPurchases(purRes);
      setPrescriptions(rxRes);
      setInvoices(invRes);
      setCustomerReturns(crRes);
      setSupplierReturns(srRes);
    } catch (e) {
      console.warn("Failed to load pharmacy data from backend, using mock fallbacks:", e);
    }
  };

  React.useEffect(() => {
    refreshData();
  }, []);

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
        refreshData
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
      refreshData: () => {}
    };
  }
  return context;
};
