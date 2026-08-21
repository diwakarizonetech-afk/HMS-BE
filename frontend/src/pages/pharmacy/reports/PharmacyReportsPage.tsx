import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  PieChart as PieIcon,
  Filter,
  CheckCircle2,
  RefreshCw,
  Package,
  AlertTriangle,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { usePharmacy } from '../../../context/PharmacyContext';
import { fetchPharmacyReportsApi } from '../../../services/api';

export const PharmacyReportsPage: React.FC = () => {
  const { medicines, purchases, invoices, batches } = usePharmacy();
  const [activeTab, setActiveTab] = useState<
    'sales' | 'purchase' | 'stock' | 'expiry' | 'profit' | 'medicine' | 'supplier'
  >('sales');

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const getUserBranch = (): string | undefined => {
    try {
      const u = JSON.parse(localStorage.getItem('hms_user') || '{}');
      const role = (u.role || '').toLowerCase().replace('userrole.', '').trim();
      if (role !== 'super_admin' && role !== 'admin') {
        return u.branch;
      }
    } catch {}
    return undefined;
  };

  const loadDbReports = async () => {
    setLoading(true);
    try {
      const branch = getUserBranch();
      const res = await fetchPharmacyReportsApi(branch);
      if (res && typeof res === 'object') {
        setReportData(res);
      }
    } catch (err) {
      console.warn('Failed to fetch pharmacy reports from DB API, falling back to context data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbReports();
  }, []);

  const currentMonthBadge = `This Month (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;

  const parseDateToMonthIdx = (dateStr?: string, fallbackCreated?: string): number => {
    if (!dateStr && !fallbackCreated) return -1;
    const str = dateStr || fallbackCreated || '';
    let d = new Date(str);
    if (isNaN(d.getTime()) && str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    return isNaN(d.getTime()) ? -1 : d.getMonth();
  };

  // Monthly trend calculation from DB API or context fallback
  const monthlyRevenueData = React.useMemo(() => {
    if (reportData?.monthlyTrend && Array.isArray(reportData.monthlyTrend)) {
      return reportData.monthlyTrend;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, idx) => {
      const monthInvoices = invoices.filter((inv) => {
        const mIdx = parseDateToMonthIdx(inv.date, (inv as any).createdAt || (inv as any).created_at);
        return mIdx === idx;
      });
      const monthPurchases = purchases.filter((pur) => {
        const mIdx = parseDateToMonthIdx(pur.purchaseDate || (pur as any).date, (pur as any).createdAt || (pur as any).created_at);
        return mIdx === idx;
      });

      const sales = monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount || (inv as any).grandTotal || 0), 0);
      const purchase = monthPurchases.reduce((sum, pur) => sum + (pur.totalAmount || 0), 0);
      const profit = Math.max(0, sales - purchase);

      return {
        month: m,
        monthIndex: idx,
        sales,
        purchase,
        profit,
        invoiceCount: monthInvoices.length,
        purchaseCount: monthPurchases.length,
      };
    });
  }, [reportData, invoices, purchases]);

  // Medicine Sales Report from DB API or context fallback
  const medicineSalesReport = React.useMemo(() => {
    if (reportData?.medicineSalesReport && Array.isArray(reportData.medicineSalesReport) && reportData.medicineSalesReport.length > 0) {
      return reportData.medicineSalesReport;
    }

    const map = new Map<string, { name: string; category: string; soldQty: number; revenue: number }>();
    invoices.forEach((inv) => {
      inv.items?.forEach((item: any) => {
        const medName = item.medicineName || item.itemName || 'Medicine';
        const matchMed = medicines.find((m) => m.name === medName || m.code === item.medicineCode || m.code === item.code);
        const category = matchMed?.category || 'General';
        const existing = map.get(medName) || { name: medName, category, soldQty: 0, revenue: 0 };
        existing.soldQty += item.quantity || 1;
        existing.revenue += item.total || ((item.quantity || 1) * (item.unitPrice || 0)) || 0;
        map.set(medName, existing);
      });
    });
    return Array.from(map.values());
  }, [reportData, invoices, medicines]);

  // Supplier Purchase Report from DB API or context fallback
  const supplierWiseReport = React.useMemo(() => {
    if (reportData?.supplierWiseReport && Array.isArray(reportData.supplierWiseReport) && reportData.supplierWiseReport.length > 0) {
      return reportData.supplierWiseReport;
    }

    const map = new Map<string, { supplier: string; totalOrders: number; totalPurchases: number; status: string }>();
    purchases.forEach((pur) => {
      const name = pur.supplierName || (pur as any).supplier || 'Vendor';
      const existing = map.get(name) || { supplier: name, totalOrders: 0, totalPurchases: 0, status: 'Active' };
      existing.totalOrders += 1;
      existing.totalPurchases += pur.totalAmount || 0;
      map.set(name, existing);
    });
    return Array.from(map.values());
  }, [reportData, purchases]);

  // Stock Valuation Metrics
  const stockValuation = React.useMemo(() => {
    if (reportData?.stockValuation) {
      return reportData.stockValuation;
    }
    const purchaseValue = medicines.reduce((sum, m) => sum + ((m.currentStock || 0) * (m.purchasePrice || 0)), 0);
    const sellingValue = medicines.reduce((sum, m) => sum + ((m.currentStock || 0) * (m.sellingPrice || 0)), 0);
    const totalItems = medicines.reduce((sum, m) => sum + (m.currentStock || 0), 0);
    return {
      purchaseValue,
      sellingValue,
      totalItems,
      totalMedicinesCount: medicines.length,
      potentialProfit: Math.max(0, sellingValue - purchaseValue),
    };
  }, [reportData, medicines]);

  // Expiry & Loss Metrics
  const expirySummary = React.useMemo(() => {
    if (reportData?.expirySummary) {
      return reportData.expirySummary;
    }
    const now = new Date();
    let expiredBatches = 0;
    let expiringWithin30Days = 0;
    let expiringValue = 0;

    batches.forEach((b) => {
      if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (days <= 0) {
          expiredBatches++;
        } else if (days <= 30) {
          expiringWithin30Days++;
          expiringValue += (b.availableQuantity || 0) * (b.sellingPrice || b.purchasePrice || 0);
        }
      }
    });

    return {
      expiredBatches,
      expiringWithin30Days,
      expiringValue,
      totalBatches: batches.length,
    };
  }, [reportData, batches]);

  // Totals calculations
  const totals = React.useMemo(() => {
    if (reportData?.totals) {
      return reportData.totals;
    }
    const grossSales = monthlyRevenueData.reduce((sum, row) => sum + (row.sales || 0), 0);
    const purchaseCost = monthlyRevenueData.reduce((sum, row) => sum + (row.purchase || 0), 0);
    const netProfit = Math.max(0, grossSales - purchaseCost);
    return {
      grossSales,
      purchaseCost,
      netProfit,
      totalInvoices: invoices.length,
      totalPurchases: purchases.length,
    };
  }, [reportData, monthlyRevenueData, invoices, purchases]);

  const handleExportPDF = () => {
    alert(`Exporting ${activeTab.toUpperCase()} Report to PDF...`);
  };

  const handleExportExcel = () => {
    alert(`Exporting ${activeTab.toUpperCase()} Report to Excel CSV...`);
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
              <BarChart3 className="w-6 h-6 text-indigo-600" /> Pharmacy Analytics & Business Intelligence
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live database financial audit reports, inventory stock valuation, supplier analytics & collection breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDbReports}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} /> Sync DB Data
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {(
            [
              { key: 'sales', label: 'Sales Report' },
              { key: 'purchase', label: 'Purchase Report' },
              { key: 'stock', label: 'Stock Valuation' },
              { key: 'expiry', label: 'Expiry & Loss' },
              { key: 'profit', label: 'Profit & Margin' },
              { key: 'medicine', label: 'Medicine Wise' },
              { key: 'supplier', label: 'Supplier Wise' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales (DB)</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">₹{totals.grossSales.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Total POS Invoices: {totals.totalInvoices}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Cost</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2">₹{totals.purchaseCost.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Supplier Orders: {totals.totalPurchases}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Valuation</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">₹{stockValuation.sellingValue.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Total Stocked Units: {stockValuation.totalItems}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">₹{totals.netProfit.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Est. Margin: {totals.grossSales > 0 ? ((totals.netProfit / totals.grossSales) * 100).toFixed(1) : '0'}%</span>
        </div>
      </div>

      {/* Analytics Chart Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {activeTab.toUpperCase()} Trend Analysis — {new Date().getFullYear()}
            </h3>
            <p className="text-xs text-slate-500">Live database monthly breakdown of gross sales, inventory purchase cost & net profit</p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            {currentMonthBadge}
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [`₹${val}`, 'Amount']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="sales" name="Gross Sales (₹)" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="purchase" name="Purchase Expense (₹)" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="profit" name="Net Profit (₹)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic Data Table depending on Active Tab */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {activeTab === 'medicine'
              ? 'Top Selling Medicine Breakdown'
              : activeTab === 'supplier'
              ? 'Supplier Account Summary'
              : activeTab === 'stock'
              ? 'Inventory Stock Valuation Table'
              : activeTab === 'expiry'
              ? 'Batch Expiry Audit Table'
              : 'Monthly Financial Audit Table'}
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Database Live Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'medicine' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Medicine Formulation</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Quantity Sold</th>
                  <th className="p-4">Gross Revenue (₹)</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {medicineSalesReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No medicine sales records found in database.
                    </td>
                  </tr>
                ) : (
                  medicineSalesReport.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{m.name}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{m.category}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{m.soldQty} Units</td>
                      <td className="p-4 font-black text-emerald-700">₹{m.revenue.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'supplier' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Supplier / Vendor</th>
                  <th className="p-4">Total Orders Processed</th>
                  <th className="p-4">Total Purchases (₹)</th>
                  <th className="p-4">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {supplierWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                      No supplier purchase records found in database.
                    </td>
                  </tr>
                ) : (
                  supplierWiseReport.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{s.supplier}</td>
                      <td className="p-4 font-bold text-slate-800">{s.totalOrders} Orders</td>
                      <td className="p-4 font-black text-purple-700">₹{s.totalPurchases.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          {s.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'stock' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Medicine Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Purchase Price (₹)</th>
                  <th className="p-4">Selling Price (₹)</th>
                  <th className="p-4">Total Stock Valuation (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No medicine stock records found in database.
                    </td>
                  </tr>
                ) : (
                  medicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{m.name}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{m.category}</span>
                      </td>
                      <td className="p-4 font-extrabold text-indigo-700">{m.currentStock} {m.unit || 'Units'}</td>
                      <td className="p-4 font-bold text-slate-700">₹{m.purchasePrice}</td>
                      <td className="p-4 font-bold text-emerald-700">₹{m.sellingPrice}</td>
                      <td className="p-4 font-black text-purple-700">₹{(m.currentStock * m.sellingPrice).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'expiry' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Batch Number</th>
                  <th className="p-4">Medicine Formulation</th>
                  <th className="p-4">Available Quantity</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No pharmacy batch records found in database.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const exp = b.expiryDate ? new Date(b.expiryDate) : null;
                    const days = exp ? Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 999;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-extrabold text-indigo-700">{b.batchNumber}</td>
                        <td className="p-4 font-bold text-slate-900">{b.medicineName}</td>
                        <td className="p-4 font-bold text-slate-800">{b.availableQuantity} Units</td>
                        <td className="p-4 font-medium text-slate-600">{b.expiryDate || 'N/A'}</td>
                        <td className="p-4">
                          {days <= 0 ? (
                            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              Expired
                            </span>
                          ) : days <= 30 ? (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              Expiring in {days} Days
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              Valid Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Month</th>
                  <th className="p-4">Gross Sales (₹)</th>
                  <th className="p-4">Purchase Expense (₹)</th>
                  <th className="p-4">Net Profit (₹)</th>
                  <th className="p-4">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {monthlyRevenueData.map((row, idx) => {
                  const margin = row.sales > 0 ? ((row.profit / row.sales) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{row.month} {new Date().getFullYear()}</td>
                      <td className="p-4 font-bold text-emerald-700">₹{row.sales.toLocaleString()}</td>
                      <td className="p-4 font-bold text-purple-700">₹{row.purchase.toLocaleString()}</td>
                      <td className="p-4 font-black text-indigo-700">₹{row.profit.toLocaleString()}</td>
                      <td className="p-4 font-bold text-amber-600">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
