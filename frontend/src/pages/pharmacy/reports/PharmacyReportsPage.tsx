import React, { useState } from 'react';
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

const MONTHLY_REVENUE_DATA = [
  { month: 'Jan', sales: 380000, purchase: 220000, profit: 160000 },
  { month: 'Feb', sales: 410000, purchase: 250000, profit: 160000 },
  { month: 'Mar', sales: 440000, purchase: 260000, profit: 180000 },
  { month: 'Apr', sales: 390000, purchase: 210000, profit: 180000 },
  { month: 'May', sales: 460000, purchase: 280000, profit: 180000 },
  { month: 'Jun', sales: 490000, purchase: 300000, profit: 190000 },
  { month: 'Jul', sales: 485000, purchase: 290000, profit: 195000 },
];

const MEDICINE_SALES_REPORT = [
  { name: 'Paracetamol 650mg (Dolo 650)', category: 'Tablets', soldQty: 1420, revenue: 48280.0, margin: '33.8%' },
  { name: 'Augmentin 625 Duo', category: 'Tablets', soldQty: 480, revenue: 96720.0, margin: '33.0%' },
  { name: 'Pan 40 Tablets', category: 'Tablets', soldQty: 890, revenue: 69420.0, margin: '38.4%' },
  { name: 'Azee 500 Tablets', category: 'Tablets', soldQty: 320, revenue: 38080.0, margin: '47.8%' },
  { name: 'Lantus SoloStar Pen', category: 'Injections', soldQty: 65, revenue: 51675.0, margin: '27.0%' },
];

const SUPPLIER_WISE_REPORT = [
  { supplier: 'Apex Medical Distributors', totalOrders: 14, totalPurchases: 248000.0, status: 'Active' },
  { supplier: 'MedLife Pharma Agencies', totalOrders: 9, totalPurchases: 184500.0, status: 'Active' },
  { supplier: 'Cipla Regional Stockist', totalOrders: 12, totalPurchases: 142000.0, status: 'Active' },
  { supplier: 'ColdChain Biologics Ltd', totalOrders: 5, totalPurchases: 98000.0, status: 'Active' },
];

export const PharmacyReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'sales' | 'purchase' | 'stock' | 'expiry' | 'profit' | 'medicine' | 'supplier'
  >('sales');

  const [dateRange, setDateRange] = useState('This Month (July 2026)');

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
              Comprehensive financial audit reports, medicine margins, supplier breakdown & daily collections.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Chart Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {activeTab.toUpperCase()} Trend Analysis — 2026
            </h3>
            <p className="text-xs text-slate-500">Monthly breakdown of gross sales, inventory purchase cost & net profit</p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            {dateRange}
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                : 'Monthly Financial Audit Table'}
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            Audited & Verified
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
                  <th className="p-4">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {MEDICINE_SALES_REPORT.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{m.name}</td>
                    <td className="p-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">{m.category}</span></td>
                    <td className="p-4 font-bold text-slate-800">{m.soldQty} Units</td>
                    <td className="p-4 font-black text-emerald-700">₹{m.revenue.toFixed(2)}</td>
                    <td className="p-4 font-extrabold text-indigo-700">{m.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'supplier' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Supplier Distributor</th>
                  <th className="p-4">Total Orders Processed</th>
                  <th className="p-4">Total Purchases (₹)</th>
                  <th className="p-4">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SUPPLIER_WISE_REPORT.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{s.supplier}</td>
                    <td className="p-4 font-bold text-slate-800">{s.totalOrders} Orders</td>
                    <td className="p-4 font-black text-purple-700">₹{s.totalPurchases.toFixed(2)}</td>
                    <td className="p-4"><span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">{s.status}</span></td>
                  </tr>
                ))}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {MONTHLY_REVENUE_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{row.month} 2026</td>
                    <td className="p-4 font-bold text-emerald-700">₹{row.sales.toLocaleString()}</td>
                    <td className="p-4 font-bold text-purple-700">₹{row.purchase.toLocaleString()}</td>
                    <td className="p-4 font-black text-indigo-700">₹{row.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
