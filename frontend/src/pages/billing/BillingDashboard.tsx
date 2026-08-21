import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../../context/BillingContext';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  RefreshCw,
  Percent,
  PlusCircle,
  Receipt,
  FileText,
  Building2,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Pill,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  Download,
  Filter,
  Wallet,
  PieChart as PieChartIcon,
} from 'lucide-react';

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { bills, collections, refunds, kpis, setSelectedBillForModal, setSelectedReceiptForModal } = useBilling();

  const [dateFilter, setDateFilter] = useState<'Today' | 'This Week' | 'This Month' | 'This Year'>('Today');

  // Filtered collections summary
  const cashColl = collections.filter((c) => c.payment_mode === 'Cash').reduce((acc, c) => acc + c.current_payment, 0);
  const upiColl = collections.filter((c) => c.payment_mode === 'UPI').reduce((acc, c) => acc + c.current_payment, 0);
  const cardColl = collections.filter((c) => c.payment_mode === 'Card').reduce((acc, c) => acc + c.current_payment, 0);
  const bankColl = collections.filter((c) => c.payment_mode === 'Bank Transfer').reduce((acc, c) => acc + c.current_payment, 0);
  const otherColl = collections.filter((c) => c.payment_mode === 'Other').reduce((acc, c) => acc + c.current_payment, 0);
  const totalModeColl = cashColl + upiColl + cardColl + bankColl + otherColl;
  const revenueSources = [
    { label: 'IPD Inpatient Care', amount: kpis.ipd_revenue, color: 'bg-indigo-600' },
    { label: 'OPD Consultations', amount: kpis.opd_revenue, color: 'bg-blue-500' },
    { label: 'Laboratory Investigations', amount: kpis.lab_revenue, color: 'bg-teal-500' },
    { label: 'Pharmacy Medicine Sales', amount: kpis.pharmacy_revenue, color: 'bg-emerald-500' },
    { label: 'Procedures & Diagnostics', amount: kpis.procedure_revenue, color: 'bg-purple-500' },
  ];
  const totalSourceRevenue = revenueSources.reduce((sum, source) => sum + source.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Billing & Revenue Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized hospital billing, collections, revenue and financial monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/billing/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Bill
          </button>
          <button
            onClick={() => navigate('/billing/payments')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Collect Payment
          </button>
          <button
            onClick={() => navigate('/billing/invoices')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Generate Invoice
          </button>
          <button
            onClick={() => navigate('/billing/outstanding')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            View Outstanding
          </button>
        </div>
      </div>

      {/* Row 1: Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">₹{kpis.today_revenue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Collected Today</p>
          </div>
        </div>

        {/* Today's Billing */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Billing</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">₹{kpis.today_billing.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Total Bill Value Generated</p>
          </div>
        </div>

        {/* Today's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Collection</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700">₹{kpis.today_collection.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Actual Money Received Today</p>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Dues</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-rose-600">₹{kpis.total_outstanding.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-amber-700 font-bold mt-1">Amount Still Pending</p>
          </div>
        </div>

        {/* Today's Refunds */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Refunds</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">₹{kpis.today_refunds.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Processed Refunds Today</p>
          </div>
        </div>

        {/* Today's Discounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Discounts</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">₹{kpis.today_discounts.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Approved Concessions</p>
          </div>
        </div>
      </div>

      {/* Row 2: Department Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">OPD Revenue</p>
            <p className="text-base font-extrabold text-slate-900">₹{kpis.opd_revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">IPD Revenue</p>
            <p className="text-base font-extrabold text-slate-900">₹{kpis.ipd_revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Lab Revenue</p>
            <p className="text-base font-extrabold text-slate-900">₹{kpis.lab_revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pharmacy Revenue</p>
            <p className="text-base font-extrabold text-slate-900">₹{kpis.pharmacy_revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Procedure Revenue</p>
            <p className="text-base font-extrabold text-slate-900">₹{kpis.procedure_revenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Row 3: Financial Analytics Grid (Revenue vs Expense, Payment Mode Breakdown, Revenue Source Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Revenue vs Expense Overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Revenue vs Expense Overview
              </h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Financial Statement
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-600">Total Gross Hospital Revenue</span>
                <span className="font-extrabold text-slate-900 text-sm">₹{kpis.total_revenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="font-bold text-rose-800">Total Relevant Billing Expenses</span>
                <span className="font-extrabold text-rose-700 text-sm">₹{kpis.total_expenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-1">
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Formula: Total Revenue - Total Expenses</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Net Hospital Revenue</span>
                  <span className="text-xl font-black text-emerald-400">₹{kpis.net_revenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Expenses include supplier purchases & refunds</span>
            <span className="text-emerald-600 font-semibold">Net Margin: ~76.7%</span>
          </div>
        </div>

        {/* Card 2: Daily Collection Summary (Payment Modes) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              Daily Collection Summary
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Real-Time
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-medium">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Cash Collection
              </span>
              <span className="font-bold text-slate-900">₹{cashColl.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                UPI Collection
              </span>
              <span className="font-bold text-slate-900">₹{upiColl.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Card Collection
              </span>
              <span className="font-bold text-slate-900">₹{cardColl.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Bank Transfer
              </span>
              <span className="font-bold text-slate-900">₹{bankColl.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Other Payment Modes
              </span>
              <span className="font-bold text-slate-900">₹{otherColl.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 font-extrabold text-sm mt-3">
              <span>Total Collections Today</span>
              <span className="text-blue-800">₹{totalModeColl.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Revenue Source Breakdown Chart with Filter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              Revenue Source Breakdown
            </h3>
            {/* Filter */}
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          {/* Visual Progress Bars */}
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>IPD Inpatient Care</span>
                <span>₹{kpis.ipd_revenue.toLocaleString('en-IN')} ({totalSourceRevenue > 0 ? ((kpis.ipd_revenue / totalSourceRevenue) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${totalSourceRevenue > 0 ? (kpis.ipd_revenue / totalSourceRevenue) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>OPD Consultations</span>
                <span>₹{kpis.opd_revenue.toLocaleString('en-IN')} ({totalSourceRevenue > 0 ? ((kpis.opd_revenue / totalSourceRevenue) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalSourceRevenue > 0 ? (kpis.opd_revenue / totalSourceRevenue) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Laboratory Investigations</span>
                <span>₹{kpis.lab_revenue.toLocaleString('en-IN')} ({totalSourceRevenue > 0 ? ((kpis.lab_revenue / totalSourceRevenue) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${totalSourceRevenue > 0 ? (kpis.lab_revenue / totalSourceRevenue) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Pharmacy Medicine Sales</span>
                <span>₹{kpis.pharmacy_revenue.toLocaleString('en-IN')} ({totalSourceRevenue > 0 ? ((kpis.pharmacy_revenue / totalSourceRevenue) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalSourceRevenue > 0 ? (kpis.pharmacy_revenue / totalSourceRevenue) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Procedures & Diagnostics</span>
                <span>₹{kpis.procedure_revenue.toLocaleString('en-IN')} ({totalSourceRevenue > 0 ? ((kpis.procedure_revenue / totalSourceRevenue) * 100).toFixed(1) : '0.0'}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalSourceRevenue > 0 ? (kpis.procedure_revenue / totalSourceRevenue) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
