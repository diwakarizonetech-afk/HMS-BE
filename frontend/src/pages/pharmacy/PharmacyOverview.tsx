import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Pill,
  Boxes,
  ClockAlert,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  PackageCheck,
  ShoppingCart,
  FileCheck2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { usePharmacy } from '../../context/PharmacyContext';



export const PharmacyOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { medicines, batches, prescriptions, invoices, purchases } = usePharmacy();

  // Metrics summary
  const safeMedicines = Array.isArray(medicines) ? medicines : [];
  const safeBatches = Array.isArray(batches) ? batches : [];
  const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safePurchases = Array.isArray(purchases) ? purchases : [];

  const totalMedicines = safeMedicines.length;
  const availableStock = safeMedicines.reduce((acc, m) => acc + (m?.currentStock || 0), 0);
  const lowStockCount = safeMedicines.filter((m) => (m?.currentStock || 0) <= (m?.minStock || 0)).length;
  const expiredCount = safeBatches.filter((b) => b?.batchStatus === 'Expired' || (b?.expiryDate && !isNaN(new Date(b.expiryDate).getTime()) && new Date(b.expiryDate) < new Date())).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = safeInvoices.filter((inv) => (inv?.date || inv?.createdAt || inv?.created_at || '').startsWith(todayStr));
  const todaySalesTotal = todayInvoices.reduce((sum, inv) => sum + (inv?.totalAmount || inv?.grandTotal || 0), 0);
  const todayTxnCount = todayInvoices.length;

  const monthlyRevenueTotal = safeInvoices.reduce((sum, inv) => sum + (inv?.totalAmount || inv?.grandTotal || 0), 0);

  const shiftTimingText = user?.shiftTiming || '08:00 AM – 04:00 PM';
  const shiftNameText = user?.shiftName || 'Pharmacy Shift A';

  const stockOverviewData = [
    { name: 'Available Stock', value: availableStock, color: '#10b981' },
    { name: 'Low Stock', value: lowStockCount, color: '#f59e0b' },
    { name: 'Expired Stock', value: expiredCount, color: '#ef4444' },
    { name: 'Reserved (IPD)', value: safePrescriptions.filter((p) => p?.status === 'Pending').length, color: '#3b82f6' },
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklySalesData = daysOfWeek.map((day) => {
    const dayInvoices = safeInvoices.filter((inv) => {
      if (!inv?.date) return false;
      const d = new Date(inv.date);
      return !isNaN(d.getTime()) && d.toLocaleDateString('en-US', { weekday: 'short' }) === day;
    });
    const dayTotal = dayInvoices.reduce((sum, inv) => sum + (inv?.totalAmount || inv?.grandTotal || 0), 0);
    return {
      day,
      sales: dayTotal,
      revenue: dayTotal,
      quantity: dayInvoices.length,
    };
  });

  const lowStockAlerts = safeMedicines.filter((m) => (m?.currentStock || 0) <= (m?.minStock || 0)).slice(0, 4);
  const expiryAlerts = safeBatches.filter((b) => b?.batchStatus === 'Expired' || (b?.expiryDate && !isNaN(new Date(b.expiryDate).getTime()) && new Date(b.expiryDate) <= new Date(Date.now() + 30 * 86400000))).slice(0, 4);

  const dynamicActivities = React.useMemo(() => {
    const list: { id: string; type: string; title: string; time: string; user: string }[] = [];
    safeInvoices.slice(0, 4).forEach((inv) => {
      const invTotal = inv?.totalAmount || inv?.grandTotal || 0;
      list.push({
        id: `inv-${inv?.id || Math.random()}`,
        type: 'POS Sales',
        title: `Invoice ${inv?.invoiceNumber || ''} completed for ₹${invTotal.toLocaleString()}`,
        time: inv?.date || 'Today',
        user: inv?.billerName || 'Pharmacy Staff',
      });
    });
    return list;
  }, [safeInvoices]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Healthcare Pharmacy Console
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Live Inventory Sync
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">Pharmacy Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking for medicine stock, batch expiry alerts, prescription dispensing & POS revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Shift Timing Card */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50/60 px-4 py-2 rounded-2xl border border-cyan-200/80 flex items-center gap-3 shadow-2xs whitespace-nowrap">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pharmacy Shift Timing</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Duty
                </span>
              </div>
              <p className="text-xs font-black text-slate-900 mt-0.5 whitespace-nowrap">
                {shiftTimingText} <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full ml-1 whitespace-nowrap">{shiftNameText}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/pharmacy/pos/direct-sales')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" /> Open POS Console
          </button>
        </div>
      </div>

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Medicines */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Medicines</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{totalMedicines}</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Master
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Formulations cataloged</p>
        </div>

        {/* Card 2: Available Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Stock</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{availableStock}</h2>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Units
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Total units in racks</p>
        </div>

        {/* Card 3: Low Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{lowStockCount}</h2>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Needs Order
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Below minimum threshold</p>
        </div>

        {/* Card 4: Expired Medicines */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expired Batches</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{expiredCount}</h2>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Quarantined
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Expired batch stock</p>
        </div>

        {/* Card 5: Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">₹{todaySalesTotal.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              Live
            </span>
          </div>
          <p className="text-[10px] text-slate-400">{todayTxnCount} Transactions today</p>
        </div>

        {/* Card 6: Monthly Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">₹{monthlyRevenueTotal.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">OPD & POS sales combined</p>
        </div>
      </div>

      {/* Second Section: Charts (70% Left + 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 70% (8 Cols): Weekly Sales Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Medicine Sales & Revenue Analytics</h3>
              <p className="text-xs text-slate-500">Daily revenue trends and total medicine quantity sold</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit">
              Current Week Performance
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${val}`, 'Revenue']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sales" name="Sales (₹)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 30% (4 Cols): Stock Overview Donut Chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Inventory Stock Breakdown</h3>
            <p className="text-xs text-slate-500">Live distribution of medicine batch status</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockOverviewData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stockOverviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Badges Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {stockOverviewData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 truncate">{item.name}</p>
                  <p className="text-xs font-black text-slate-800">{item.value} Units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Section: 4 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Recent Activities */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Recent Activities
            </h3>
          </div>
          <div className="space-y-3 text-xs">
            {dynamicActivities.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No recent activity recorded.</p>
            ) : (
              dynamicActivities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{act.type}</span>
                    <span className="text-slate-400">{act.time}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-xs leading-tight">{act.title}</p>
                  <p className="text-[10px] text-slate-500">By {act.user}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Recent Prescriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" /> Pending Prescriptions
            </h3>
            <button
              onClick={() => navigate('/pharmacy/prescription/list')}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {safePrescriptions.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No pending prescriptions.</p>
            ) : (
              safePrescriptions.map((rx) => (
                <div key={rx.id || rx.prescriptionNumber} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-700 text-xs">{rx.prescriptionNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rx.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {rx.status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{rx.patientName} ({rx.patientUhid})</p>
                  <p className="text-[10px] text-slate-500">By {rx.doctorName} • {(rx.items || []).length} Medicines</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Today's Expiry Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ClockAlert className="w-4 h-4 text-rose-600" /> Expiry Alerts
            </h3>
            <button
              onClick={() => navigate('/pharmacy/stock/inventory')}
              className="text-[10px] font-bold text-rose-600 hover:underline"
            >
              View Stock
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {expiryAlerts.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No batch expiry warnings.</p>
            ) : (
              expiryAlerts.map((exp) => {
                const expTime = exp.expiryDate ? new Date(exp.expiryDate).getTime() : 0;
                const daysLeft = expTime && !isNaN(expTime) ? Math.ceil((expTime - Date.now()) / (1000 * 3600 * 24)) : 0;
                return (
                  <div
                    key={exp.id || exp.batchNumber}
                    className={`p-3 rounded-xl border space-y-1 ${daysLeft < 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="font-black">{exp.batchNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full ${daysLeft < 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                        {daysLeft < 0 ? 'EXPIRED' : `${daysLeft} Days Left`}
                      </span>
                    </div>
                    <p className="font-bold text-xs">{exp.medicineName}</p>
                    <p className="text-[10px] opacity-80">Expiry Date: {exp.expiryDate || 'N/A'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock Alerts
            </h3>
            <button
              onClick={() => navigate('/pharmacy/stock/inventory')}
              className="text-[10px] font-bold text-amber-700 hover:underline"
            >
              Reorder
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {lowStockAlerts.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No low stock items.</p>
            ) : (
              lowStockAlerts.map((low) => (
                <div key={low.id || low.code} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1">
                  <div className="flex items-center justify-between font-bold text-[10px]">
                    <span className="text-rose-700 font-extrabold">{low.currentStock} left</span>
                    <span className="text-amber-800">Min: {low.minStock}</span>
                  </div>
                  <p className="font-bold text-xs">{low.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">Category: {low.category}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
