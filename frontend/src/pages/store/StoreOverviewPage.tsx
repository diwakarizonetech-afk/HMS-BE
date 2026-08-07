import React, { useState } from 'react';
import {
  Boxes,
  Truck,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Activity,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StoreActivity } from '../../types/store';
import { StaffShiftWidget } from '../../components/common/StaffShiftWidget';
import { useHMS } from '../../context/HMSContext';

export const StoreOverviewPage: React.FC = () => {
  const { storeItems, purchaseOrders } = useHMS();
  const [activities] = useState<StoreActivity[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filtered activity logic
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

  // Cards data from dynamic context
  const metrics = [
    {
      title: 'Total Items',
      value: storeItems.length.toString(),
      subtitle: 'Registered in Item Master',
      icon: Boxes,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Vendors',
      value: '0',
      subtitle: 'Active verified suppliers',
      icon: Truck,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Purchase Orders',
      value: purchaseOrders.length.toString(),
      subtitle: 'Active purchase orders',
      icon: ShoppingBag,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Reorder Alerts',
      value: storeItems.filter((i) => i.currentStock <= i.reorderLevel).length.toString(),
      subtitle: 'Items at or below reorder level',
      icon: AlertTriangle,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
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

      {/* Super Admin Assigned Duty Shift Widget */}
      <StaffShiftWidget portalRole="store" rosterRoute="/store/shift-roster" />

      {/* 8 Executive Dashboard Metric Cards */}
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

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchase Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Purchase</h3>
              <p className="text-[11px] text-slate-500">Expenditure trends (in ₹ Lakhs)</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              +12.4% vs last mo
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { month: 'Mar 2026', val: '₹14.2 L', pct: 60 },
              { month: 'Apr 2026', val: '₹18.5 L', pct: 80 },
              { month: 'May 2026', val: '₹12.0 L', pct: 50 },
              { month: 'Jun 2026', val: '₹21.4 L', pct: 90 },
              { month: 'Jul 2026 (MTD)', val: '₹16.8 L', pct: 72 },
            ].map((bar, i) => (
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

        {/* Monthly Consumption Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Consumption</h3>
              <p className="text-[11px] text-slate-500">Stock issue by department</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              High Demand: OT
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              { dept: 'Operation Theatre', val: '38%', color: 'bg-rose-500' },
              { dept: 'Central Pharmacy', val: '28%', color: 'bg-blue-500' },
              { dept: 'ICU & Wards', val: '18%', color: 'bg-emerald-500' },
              { dept: 'Pathology & Lab', val: '10%', color: 'bg-purple-500' },
              { dept: 'Radiology / ER', val: '6%', color: 'bg-amber-500' },
            ].map((d, i) => (
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

        {/* Stock Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Category Distribution</h3>
              <p className="text-[11px] text-slate-500">Inventory value allocation</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              { category: 'Pharmaceuticals', share: '₹22,40,000', pct: 46, color: 'bg-blue-600' },
              { category: 'Surgical Supplies', share: '₹12,10,000', pct: 25, color: 'bg-indigo-600' },
              { category: 'Medical Equipment', share: '₹8,50,000', pct: 18, color: 'bg-teal-600' },
              { category: 'Lab Reagents', share: '₹3,50,000', pct: 7, color: 'bg-purple-600' },
              { category: 'Consumables', share: '₹2,00,000', pct: 4, color: 'bg-amber-600' },
            ].map((cat, i) => (
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

      {/* Recent Activities Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent Store Activities</span>
            </h3>
            <p className="text-xs text-slate-500">Live operational audit log of store transactions</p>
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
                <option value="Alert">Alert</option>
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
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">User</th>
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
                          act.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : act.status === 'Approved'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : act.status === 'In Progress'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : act.status === 'Alert'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
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
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No activity logs match your filter criteria.
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

