import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Truck,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Activity,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StoreActivity, Vendor, StockOutward, StockInward, StockTransfer } from '../../types/store';
import { StaffShiftWidget } from '../../components/common/StaffShiftWidget';
import { useHMS } from '../../context/HMSContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchVendorsApi,
  fetchStockOutwardApi,
  fetchStockInwardApi,
  fetchStockTransferApi,
} from '../../services/api';

export const StoreOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { storeItems, purchaseOrders } = useHMS();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stockOutwardList, setStockOutwardList] = useState<StockOutward[]>([]);
  const [stockInwardList, setStockInwardList] = useState<StockInward[]>([]);
  const [transfersList, setTransfersList] = useState<StockTransfer[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchVendorsApi(user?.branch).catch(() => []),
      fetchStockOutwardApi(user?.branch).catch(() => []),
      fetchStockInwardApi(user?.branch).catch(() => []),
      fetchStockTransferApi(user?.branch).catch(() => []),
    ]).then(([vData, oData, iData, tData]) => {
      if (!active) return;
      if (Array.isArray(vData)) setVendors(vData);
      if (Array.isArray(oData)) setStockOutwardList(oData);
      if (Array.isArray(iData)) setStockInwardList(iData);
      if (Array.isArray(tData)) setTransfersList(tData);
    });
    return () => {
      active = false;
    };
  }, [user?.branch]);

  // 1. Dynamic Metric Cards
  const metrics = [
    {
      title: 'Total Items',
      value: storeItems.length.toString(),
      subtitle: 'Registered in Item Master',
      icon: Boxes,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Vendors',
      value: vendors.length.toString(),
      subtitle: 'Active verified suppliers',
      icon: Truck,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Purchase Orders',
      value: purchaseOrders.length.toString(),
      subtitle: 'Active purchase orders',
      icon: ShoppingBag,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Reorder Alerts',
      value: storeItems.filter((i) => (i.currentStock || 0) <= (i.reorderLevel || 0)).length.toString(),
      subtitle: 'Items at or below reorder level',
      icon: AlertTriangle,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  // 2. Dynamic Monthly Purchase Data from DB
  const monthlyPurchaseBars = useMemo(() => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
      const now = new Date();
      const months = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push({ month: monthLabel, val: '₹0.0 L', pct: 0 });
      }
      return months;
    }

    const monthMap = new Map<string, number>();
    purchaseOrders.forEach((po) => {
      const pDate = po.purchaseDate || po.createdDate || new Date().toISOString();
      const d = new Date(pDate);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const amt = po.totalAmount || 0;
      monthMap.set(key, (monthMap.get(key) || 0) + amt);
    });

    const entries = Array.from(monthMap.entries());
    const maxVal = Math.max(...entries.map(([, v]) => v), 1);

    return entries.slice(-5).map(([month, amount]) => {
      const lakhs = (amount / 100000).toFixed(1);
      const pct = Math.min(Math.round((amount / maxVal) * 100), 100);
      return {
        month,
        val: `₹${lakhs} L`,
        pct: pct || 5,
      };
    });
  }, [purchaseOrders]);

  // 3. Dynamic Monthly Department Consumption from DB
  const departmentConsumptionData = useMemo(() => {
    const deptColors: Record<string, string> = {
      'Operation Theatre': 'bg-rose-500',
      'Central Pharmacy': 'bg-blue-500',
      'ICU & Wards': 'bg-emerald-500',
      'Pathology & Lab': 'bg-purple-500',
      'Radiology / ER': 'bg-amber-500',
    };

    if (!stockOutwardList || stockOutwardList.length === 0) {
      const defaultDepts = [
        'Operation Theatre',
        'Central Pharmacy',
        'ICU & Wards',
        'Pathology & Lab',
        'Radiology / ER',
      ];
      return defaultDepts.map((dept) => ({
        dept,
        val: '0%',
        color: deptColors[dept] || 'bg-slate-500',
      }));
    }

    const totalQty = stockOutwardList.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 1;
    const map = new Map<string, number>();
    stockOutwardList.forEach((o) => {
      const dept = o.department || 'General Ward';
      map.set(dept, (map.get(dept) || 0) + (o.quantity || 0));
    });

    const result = Array.from(map.entries()).map(([dept, qty], i) => {
      const pctVal = Math.round((qty / totalQty) * 100);
      const colorKeys = Object.values(deptColors);
      return {
        dept,
        val: `${pctVal}%`,
        color: deptColors[dept] || colorKeys[i % colorKeys.length],
      };
    });

    return result.sort((a, b) => parseInt(b.val) - parseInt(a.val));
  }, [stockOutwardList]);

  // 4. Dynamic Stock Category Distribution from DB
  const stockCategoryData = useMemo(() => {
    const defaultCategories = ['Pharmaceuticals', 'Surgical Supplies', 'Medical Equipment', 'Lab Reagents', 'Consumables'];
    const catColors = ['bg-blue-600', 'bg-indigo-600', 'bg-teal-600', 'bg-purple-600', 'bg-amber-600'];

    if (!storeItems || storeItems.length === 0) {
      return defaultCategories.map((category, i) => ({
        category,
        share: '₹0',
        pct: 0,
        color: catColors[i % catColors.length],
      }));
    }

    const catMap = new Map<string, number>();
    let totalValue = 0;
    storeItems.forEach((item) => {
      const cat = item.category || 'General';
      const val = (item.currentStock || 0) * (item.unitPrice || 100);
      catMap.set(cat, (catMap.get(cat) || 0) + val);
      totalValue += val;
    });

    if (totalValue === 0) totalValue = 1;

    return Array.from(catMap.entries()).map(([category, val], i) => {
      const pct = Math.round((val / totalValue) * 100);
      return {
        category,
        share: `₹${val.toLocaleString()}`,
        pct,
        color: catColors[i % catColors.length],
      };
    });
  }, [storeItems]);

  // 5. Dynamic Live Store Activity Audit Log
  const activities = useMemo(() => {
    const list: StoreActivity[] = [];

    purchaseOrders.slice(0, 3).forEach((po) => {
      list.push({
        id: `po-${po.id}`,
        date: po.purchaseDate || po.createdDate || 'Today',
        activity: 'Purchase Order Issued',
        item: `PO #${po.poNumber}`,
        quantity: `${po.items?.length || 1} line items`,
        user: po.vendorName || 'Supplier',
        status: po.status === 'Fulfilled' || po.status === 'Approved' ? 'Completed' : 'Pending',
      });
    });

    stockInwardList.slice(0, 3).forEach((inw) => {
      list.push({
        id: `inw-${inw.id}`,
        date: inw.date || 'Today',
        activity: 'Stock Inward Receipt',
        item: inw.itemName || inw.itemCode || 'Store Item',
        quantity: `${inw.quantity || 0} units`,
        user: inw.supplier || 'Store Officer',
        status: 'Completed',
      });
    });

    stockOutwardList.slice(0, 3).forEach((outw) => {
      list.push({
        id: `outw-${outw.id}`,
        date: outw.date || 'Today',
        activity: 'Stock Issued Outward',
        item: outw.itemName || outw.itemCode || 'Store Item',
        quantity: `${outw.quantity || 0} units`,
        user: outw.receivedBy || outw.department || 'Dept Staff',
        status: 'Completed',
      });
    });

    transfersList.slice(0, 2).forEach((tr) => {
      list.push({
        id: `tr-${tr.id}`,
        date: tr.transferDate || 'Today',
        activity: 'Inter-Store Stock Transfer',
        item: tr.itemName || tr.itemCode || 'Store Item',
        quantity: `${tr.quantity || 0} units`,
        user: tr.requestedBy || 'Inventory Mgr',
        status: tr.status === 'Completed' ? 'Completed' : 'In Progress',
      });
    });

    return list;
  }, [purchaseOrders, stockInwardList, stockOutwardList, transfersList]);

  // Filtered Activity Log Logic
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.quantity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || act.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeFiltersCount = (searchTerm ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store Officer Portal</span>
            <span>/</span>
            <span className="text-blue-600">Dashboard</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Store Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock monitoring, purchase analytics, and departmental consumption tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Today: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Staff Duty Shift Widget */}
      <StaffShiftWidget portalRole="store" rosterRoute="/store/shift-roster" />

      {/* 4 Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {m.title}
                </span>
                <div className={`p-2.5 rounded-xl ${m.bgColor} ${m.textColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{m.value}</div>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">{m.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchase Chart (Dynamic DB Data) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Purchase</h3>
              <p className="text-[11px] text-slate-500">Expenditure trends from database</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Live DB Sync
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {monthlyPurchaseBars.map((bar, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{bar.month}</span>
                  <span className="font-bold text-slate-900">{bar.val}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Consumption Chart (Dynamic DB Data) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Consumption</h3>
              <p className="text-[11px] text-slate-500">Stock issue by department (DB)</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Outward Dispatches
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {departmentConsumptionData.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                    <span>{d.dept}</span>
                  </div>
                  <span className="font-bold text-slate-900">{d.val}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${d.color} rounded-full`}
                    style={{ width: d.val }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Category Distribution (Dynamic DB Data) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Category Distribution</h3>
              <p className="text-[11px] text-slate-500">Item Master valuation allocation</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-3.5 pt-2">
            {stockCategoryData.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>{cat.category}</span>
                  <span>{cat.share} ({cat.pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full`}
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Recent Store Activities Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent Store Activities</span>
            </h3>
            <p className="text-xs text-slate-500">Live operational audit log of database transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Log</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {isFilterOpen && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by activity, item, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Approved">Approved</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            {(searchTerm || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer px-2 py-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Item / Order</th>
                <th className="py-3 px-4">Quantity / Details</th>
                <th className="py-3 px-4">User / Source</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {act.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {act.activity}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{act.item}</td>
                    <td className="py-3 px-4 text-slate-900 font-bold">{act.quantity}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{act.user}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          act.status === 'Completed' || act.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : act.status === 'In Progress'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {act.status === 'Completed' || act.status === 'Approved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{act.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No store activity recorded in database matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
