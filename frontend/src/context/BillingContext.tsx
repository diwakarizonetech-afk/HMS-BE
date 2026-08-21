import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Bill,
  PaymentCollection,
  DiscountRequest,
  RefundRequest,
  BillCancellation,
  SupplierPayable,
  BillingAuditLog,
  BillingKPIs,
} from '../types/billing';
import {
  fetchBillsApi,
  fetchBillingKPIsApi,
  createBillApi,
  fetchPaymentCollectionsApi,
  recordPaymentCollectionApi,
  fetchDiscountRequestsApi,
  createDiscountRequestApi,
  fetchRefundRequestsApi,
  createRefundRequestApi,
  fetchBillCancellationsApi,
  createBillCancellationApi,
  fetchSupplierPayablesApi,
  paySupplierApi,
  fetchBillingAuditLogsApi,
  updateDiscountStatusApi,
  updateRefundStatusApi,
} from '../services/api';

interface BillingContextType {
  bills: Bill[];
  collections: PaymentCollection[];
  discounts: DiscountRequest[];
  refunds: RefundRequest[];
  cancellations: BillCancellation[];
  supplierPayables: SupplierPayable[];
  auditLogs: BillingAuditLog[];
  kpis: BillingKPIs;
  loading: boolean;
  selectedBillForModal: Bill | null;
  setSelectedBillForModal: (bill: Bill | null) => void;
  selectedReceiptForModal: PaymentCollection | null;
  setSelectedReceiptForModal: (receipt: PaymentCollection | null) => void;
  refreshBillingData: () => Promise<void>;
  createNewBill: (billData: Partial<Bill>) => Promise<Bill>;
  collectPayment: (paymentData: Partial<PaymentCollection>) => Promise<PaymentCollection>;
  requestDiscount: (discountData: Partial<DiscountRequest>) => Promise<DiscountRequest>;
  requestRefund: (refundData: Partial<RefundRequest>) => Promise<RefundRequest>;
  approveDiscount: (id: string, approverName: string) => Promise<void>;
  approveRefund: (id: string, approverName: string) => Promise<void>;
  cancelBill: (billNumber: string, reason: string, staffName: string) => Promise<void>;
  paySupplier: (invoiceNumber: string, amount: number, paymentMode: string, referenceNo: string, remarks?: string) => Promise<void>;
}

const defaultKPIs: BillingKPIs = {
  today_revenue: 0,
  today_billing: 0,
  today_collection: 0,
  total_outstanding: 0,
  today_refunds: 0,
  today_discounts: 0,
  opd_revenue: 0,
  ipd_revenue: 0,
  lab_revenue: 0,
  pharmacy_revenue: 0,
  procedure_revenue: 0,
  total_revenue: 0,
  total_expenses: 0,
  net_revenue: 0,
};

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [collections, setCollections] = useState<PaymentCollection[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRequest[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [cancellations, setCancellations] = useState<BillCancellation[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>([]);
  const [auditLogs, setAuditLogs] = useState<BillingAuditLog[]>([]);
  const [kpis, setKpis] = useState<BillingKPIs>(defaultKPIs);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedBillForModal, setSelectedBillForModal] = useState<Bill | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<PaymentCollection | null>(null);

  const refreshBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        billsRes,
        kpiRes,
        paymentsRes,
        discountsRes,
        refundsRes,
        cancellationsRes,
        payablesRes,
        auditRes,
      ] = await Promise.allSettled([
        fetchBillsApi(),
        fetchBillingKPIsApi(),
        fetchPaymentCollectionsApi(),
        fetchDiscountRequestsApi(),
        fetchRefundRequestsApi(),
        fetchBillCancellationsApi(),
        fetchSupplierPayablesApi(),
        fetchBillingAuditLogsApi(),
      ]);

      if (billsRes.status === 'fulfilled' && Array.isArray(billsRes.value)) {
        setBills(billsRes.value);
      }
      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setKpis(kpiRes.value);
      }
      if (paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)) {
        setCollections(paymentsRes.value);
      }
      if (discountsRes.status === 'fulfilled' && Array.isArray(discountsRes.value)) {
        setDiscounts(discountsRes.value);
      }
      if (refundsRes.status === 'fulfilled' && Array.isArray(refundsRes.value)) {
        setRefunds(refundsRes.value);
      }
      if (cancellationsRes.status === 'fulfilled' && Array.isArray(cancellationsRes.value)) {
        setCancellations(cancellationsRes.value);
      }
      if (payablesRes.status === 'fulfilled' && Array.isArray(payablesRes.value)) {
        setSupplierPayables(payablesRes.value);
      }
      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value)) {
        setAuditLogs(auditRes.value);
      }
    } catch (err) {
      console.warn('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBillingData();
  }, [refreshBillingData]);

  const createNewBill = async (billData: Partial<Bill>): Promise<Bill> => {
    try {
      const res = await createBillApi(billData);
      await refreshBillingData();
      return res;
    } catch (err) {
      console.error('Failed to create bill:', err);
      throw err;
    }
  };

  const collectPayment = async (paymentData: Partial<PaymentCollection>): Promise<PaymentCollection> => {
    try {
      const res = await recordPaymentCollectionApi(paymentData);
      await refreshBillingData();
      return res;
    } catch (err) {
      console.error('Failed to collect payment:', err);
      throw err;
    }
  };

  const requestDiscount = async (discountData: Partial<DiscountRequest>): Promise<DiscountRequest> => {
    try {
      const res = await createDiscountRequestApi(discountData);
      await refreshBillingData();
      return res;
    } catch (err) {
      console.error('Failed to request discount:', err);
      throw err;
    }
  };

  const requestRefund = async (refundData: Partial<RefundRequest>): Promise<RefundRequest> => {
    try {
      const res = await createRefundRequestApi(refundData);
      await refreshBillingData();
      return res;
    } catch (err) {
      console.error('Failed to request refund:', err);
      throw err;
    }
  };

  const approveDiscount = async (id: string, approverName: string) => {
    await updateDiscountStatusApi(id, { status: 'Approved', approved_by: approverName });
    await refreshBillingData();
  };

  const approveRefund = async (id: string, approverName: string) => {
    await updateRefundStatusApi(id, { status: 'Processed', approved_by: approverName });
    await refreshBillingData();
  };

  const cancelBill = async (billNumber: string, reason: string, staffName: string) => {
    const targetBill = bills.find((b) => b.bill_number === billNumber);
    if (!targetBill) {
      throw new Error('Bill not found. Cancellation requires an existing bill.');
    }

    await createBillCancellationApi({
      bill_number: billNumber,
      patient_name: targetBill.patient_name,
      uhid: targetBill.uhid,
      original_amount: targetBill.net_amount,
      cancellation_reason: reason,
      requested_by: staffName,
      cancellation_date: new Date().toISOString().split('T')[0],
      status: 'Cancelled',
    });
    await refreshBillingData();
  };

  const paySupplier = async (invoiceNumber: string, amount: number, paymentMode: string, referenceNo: string, remarks?: string) => {
    await paySupplierApi(invoiceNumber, {
      amount,
      payment_mode: paymentMode,
      reference_no: referenceNo,
      remarks,
    });
    await refreshBillingData();
  };

  return (
    <BillingContext.Provider
      value={{
        bills,
        collections,
        discounts,
        refunds,
        cancellations,
        supplierPayables,
        auditLogs,
        kpis,
        loading,
        selectedBillForModal,
        setSelectedBillForModal,
        selectedReceiptForModal,
        setSelectedReceiptForModal,
        refreshBillingData,
        createNewBill,
        collectPayment,
        requestDiscount,
        requestRefund,
        approveDiscount,
        approveRefund,
        cancelBill,
        paySupplier,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
