import React, { useEffect, useMemo, useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useHMS } from '../../../context/HMSContext';
import { SupplierPayable, SupplierPayablesAnalytics } from '../../../types/billing';
import { fetchSupplierPayablesAnalyticsApi } from '../../../services/api';
import {
  Truck,
  CheckCircle2,
  CreditCard,
  X,
  BarChart3,
  Download,
  Package,
  Tags,
  TrendingUp,
  RefreshCw,
  Calendar,
  Wallet,
} from 'lucide-react';

type Period = 'day' | 'month' | 'year';

const rupee = (amount?: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const todayIso = () => new Date().toISOString().split('T')[0];

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const SupplierPayablesPage: React.FC = () => {
  const { supplierPayables, paySupplier } = useBilling();
  const { addToast } = useHMS();

  const [period, setPeriod] = useState<Period>('month');
  const [reportDate, setReportDate] = useState<string>(todayIso());
  const [analytics, setAnalytics] = useState<SupplierPayablesAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [selectedPayable, setSelectedPayable] = useState<SupplierPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayIso());
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchSupplierPayablesAnalyticsApi({ period, date: reportDate });
      setAnalytics(data);
    } catch (err: any) {
      addToast('error', 'Report Load Failed', err?.message || 'Could not load supplier analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period, reportDate, supplierPayables.length]);

  const totals = analytics?.totals;
  const displayPayables = analytics?.payables?.length ? analytics.payables : supplierPayables;
  const totalOutstandingPayables = displayPayables.reduce((acc, p) => acc + Number(p.outstanding_amount || 0), 0);
  const totalInvoicesSum = displayPayables.reduce((acc, p) => acc + Number(p.invoice_amount || 0), 0);
  const maxTrendValue = useMemo(
    () => Math.max(1, ...(analytics?.daily_summary || []).map((r) => Math.max(r.purchase_value, r.payable_value, r.revenue_value))),
    [analytics]
  );

  const handleOpenPayModal = (sp: SupplierPayable) => {
    setSelectedPayable(sp);
    setPaymentAmount(String(sp.outstanding_amount));
    setPaymentMode('Bank Transfer');
    setReferenceNo('');
    setPaymentDate(todayIso());
    setRemarks('');
  };

  const handleClosePayModal = () => setSelectedPayable(null);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast('error', 'Validation Error', 'Please enter a valid payment amount.');
      return;
    }

    if (amountNum > selectedPayable.outstanding_amount) {
      addToast('error', 'Validation Error', `Payment amount cannot exceed outstanding balance (${rupee(selectedPayable.outstanding_amount)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await paySupplier(selectedPayable.invoice_number, amountNum, paymentMode, referenceNo, remarks);
      addToast('success', 'Payment Recorded', `${rupee(amountNum)} payment recorded successfully for ${selectedPayable.supplier_name}!`);
      handleClosePayModal();
      await loadAnalytics();
    } catch (err: any) {
      addToast('error', 'Payment Failed', err?.message || 'Failed to record supplier payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPurchases = () => {
    const rows = (analytics?.purchase_details || []).map((p) => ({
      Source: p.source,
      Reference: p.reference,
      Invoice: p.invoice_number || '',
      Supplier: p.supplier_name,
      Date: p.purchase_date,
      Items: p.items,
      ItemCount: p.item_count,
      Amount: p.amount,
      Branch: p.branch || '',
    }));
    if (!rows.length) return addToast('warning', 'No Data', 'No purchase details available to download.');
    downloadCsv(`supplier-purchases-${period}-${reportDate}.csv`, rows);
  };

  const downloadCategoryRevenue = () => {
    const rows = (analytics?.category_revenue || []).map((c) => ({
      Category: c.category,
      ItemCount: c.item_count,
      QuantitySold: c.quantity_sold,
      Revenue: c.revenue,
    }));
    if (!rows.length) return addToast('warning', 'No Data', 'No category revenue available to download.');
    downloadCsv(`medicine-category-revenue-${period}-${reportDate}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Supplier Payables & Store Revenue</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Store purchases, pharmacy category revenue, supplier invoices, paid amounts, and outstanding payables.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-extrabold">
            {(['day', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 rounded-lg capitalize ${period === p ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
          />
          <button
            onClick={loadAnalytics}
            disabled={analyticsLoading}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Store / Pharmacy Purchases</span><Package className="w-4 h-4" /></div>
          <p className="text-xl font-black text-slate-900 mt-2">{rupee(totals?.purchase_value || totalInvoicesSum)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{totals?.purchase_count || 0} purchase records</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Medicine Category Revenue</span><Tags className="w-4 h-4" /></div>
          <p className="text-xl font-black text-emerald-700 mt-2">{rupee(totals?.category_revenue_total)}</p>
          <p className="text-[11px] text-slate-500 mt-1">From pharmacy bills, POS and prescriptions</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Supplier Invoice Total</span><Calendar className="w-4 h-4" /></div>
          <p className="text-xl font-black text-slate-900 mt-2">{rupee(totals?.payable_invoice_total || totalInvoicesSum)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{totals?.payable_count || displayPayables.length} payable invoices</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400"><span className="text-[11px] font-bold uppercase">Pending Payables</span><Wallet className="w-4 h-4" /></div>
          <p className="text-xl font-black text-rose-600 mt-2">{rupee(totals?.outstanding_total || totalOutstandingPayables)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Paid: {rupee(totals?.paid_total || (totalInvoicesSum - totalOutstandingPayables))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" /> Medicine Category Revenue</h2>
              <p className="text-[11px] text-slate-500 mt-1">Separate revenue by medicine category.</p>
            </div>
            <button onClick={downloadCategoryRevenue} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Qty Sold</th><th className="px-4 py-3 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(analytics?.category_revenue || []).map((c) => (
                  <tr key={c.category} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{c.category}</td>
                    <td className="px-4 py-3 text-right">{c.item_count}</td>
                    <td className="px-4 py-3 text-right">{c.quantity_sold}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">{rupee(c.revenue)}</td>
                  </tr>
                ))}
                {!analytics?.category_revenue?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-bold">No category revenue found for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Revenue & Purchase Trend</h2>
            <p className="text-[11px] text-slate-500 mt-1">Day-wise movement inside the selected period.</p>
          </div>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
            {(analytics?.daily_summary || []).map((row) => (
              <div key={row.date} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600"><span>{row.date}</span><span>{rupee(row.purchase_value + row.revenue_value)}</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="bg-indigo-500" style={{ width: `${Math.min(100, (row.purchase_value / maxTrendValue) * 100)}%` }} />
                  <div className="bg-emerald-500" style={{ width: `${Math.min(100, (row.revenue_value / maxTrendValue) * 100)}%` }} />
                </div>
              </div>
            ))}
            {!analytics?.daily_summary?.length && <div className="py-12 text-center text-slate-500 text-xs font-bold">No trend data found for this period.</div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600" /> Store / Pharmacy Purchase Details</h2>
            <p className="text-[11px] text-slate-500 mt-1">What was purchased, supplier, invoice/reference, and amount.</p>
          </div>
          <button onClick={downloadPurchases} className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-extrabold flex items-center gap-2">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(analytics?.purchase_details || []).map((p) => (
                <tr key={`${p.source}-${p.reference}-${p.purchase_date}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{p.purchase_date}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">{p.source}</span></td>
                  <td className="px-4 py-3 font-bold text-blue-700">{p.reference}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={p.items}>{p.items}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{rupee(p.amount)}</td>
                </tr>
              ))}
              {!analytics?.purchase_details?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-bold">No purchase details found for this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Active Supplier Payables: <span className="text-slate-900 font-extrabold">{displayPayables.length}</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Supplier Name</th><th className="px-4 py-3">Invoice Number</th><th className="px-4 py-3">Purchase Date</th><th className="px-4 py-3">Source Module</th><th className="px-4 py-3 text-right">Invoice Amount</th><th className="px-4 py-3 text-right">Paid Amount</th><th className="px-4 py-3 text-right">Outstanding Payable</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayPayables.map((sp) => (
                <tr key={sp.invoice_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-slate-900">{sp.supplier_name}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{sp.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-500">{sp.purchase_date}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">{sp.module_source}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{rupee(sp.invoice_amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">{rupee(sp.paid_amount)}</td>
                  <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">{rupee(sp.outstanding_amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{sp.due_date || 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${sp.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : sp.payment_status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{sp.payment_status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sp.outstanding_amount > 0 ? (
                      <button onClick={() => handleOpenPayModal(sp)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 mx-auto">
                        <CreditCard className="w-3.5 h-3.5" /><span>Pay Supplier</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 justify-center"><CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid</span>
                    )}
                  </td>
                </tr>
              ))}
              {!displayPayables.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-bold">No supplier payables found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><CreditCard className="w-5 h-5" /></div>
                <div><h3 className="font-extrabold text-slate-900 text-sm">Record Vendor Payment</h3><p className="text-[10px] font-semibold text-slate-500">Invoice: <span className="text-blue-600">{selectedPayable.invoice_number}</span> ({selectedPayable.module_source})</p></div>
              </div>
              <button onClick={handleClosePayModal} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Amount</span><span className="font-black text-slate-800 text-sm">{rupee(selectedPayable.invoice_amount)}</span></div>
                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Already Paid</span><span className="font-black text-emerald-700 text-sm">{rupee(selectedPayable.paid_amount)}</span></div>
                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Due Balance</span><span className="font-black text-rose-600 text-sm">{rupee(selectedPayable.outstanding_amount)}</span></div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier / Vendor Name</label>
                  <input type="text" disabled value={selectedPayable.supplier_name} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Amount (₹) <span className="text-rose-500">*</span></label>
                    <input type="number" required min={1} max={selectedPayable.outstanding_amount} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter payment amount" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Method <span className="text-rose-500">*</span></label>
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none">
                      <option value="Bank Transfer">Bank Transfer / NEFT</option><option value="UPI / QR Code">UPI / QR Code</option><option value="Cash">Cash</option><option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transaction Ref / UTR No. <span className="text-rose-500">*</span></label>
                    <input type="text" required value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Enter transaction reference" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                    <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Notes / Remarks (Optional)</label>
                  <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter payment remarks" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={handleClosePayModal} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /><span>{isSubmitting ? 'Processing...' : 'Confirm & Record Payment'}</span></button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
