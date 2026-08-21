import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Pill,
  Activity,
  CreditCard,
  Receipt,
  Clock,
  Percent,
  RefreshCw,
  XCircle,
  Truck,
  BarChart3,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
  Building2,
  DollarSign,
  Wallet,
  CalendarDays,
} from 'lucide-react';

interface BillingSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavGroup {
  title: string;
  items: {
    name: string;
    path: string;
    icon: React.ElementType;
    iconColor?: string;
    badge?: string;
  }[];
}

export const BillingSidebar: React.FC<BillingSidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Billing & Invoices': true,
    'Payments & Collections': true,
    'Financial Management': true,
    'Reports & Analytics': false,
    'Audit & Settings': false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Billing & Invoices',
      items: [
        { name: 'All Bills', path: '/billing/invoices', icon: FileText, iconColor: 'text-blue-600' },
        { name: 'Create New Bill', path: '/billing/create', icon: PlusCircle, badge: 'New', iconColor: 'text-emerald-600' },
        { name: 'OPD Billing', path: '/billing/opd', icon: Stethoscope, iconColor: 'text-cyan-600' },
        { name: 'IPD Billing', path: '/billing/ipd', icon: BedDouble, iconColor: 'text-purple-600' },
        { name: 'Lab Billing', path: '/billing/lab', icon: FlaskConical, iconColor: 'text-teal-600' },
        { name: 'Pharmacy Billing', path: '/billing/pharmacy', icon: Pill, iconColor: 'text-amber-600' },
        { name: 'Procedure Billing', path: '/billing/procedure', icon: Activity, iconColor: 'text-rose-600' },
      ],
    },
    {
      title: 'Payments & Collections',
      items: [
        { name: 'Payment Collection', path: '/billing/payments', icon: CreditCard, iconColor: 'text-indigo-600' },
        { name: 'Receipts', path: '/billing/receipts', icon: Receipt, iconColor: 'text-violet-600' },
        { name: 'Outstanding Dues', path: '/billing/outstanding', icon: Clock, badge: 'Dues', iconColor: 'text-orange-600' },
      ],
    },
    {
      title: 'Financial Management',
      items: [
        { name: 'Discounts & Concessions', path: '/billing/discounts', icon: Percent, iconColor: 'text-emerald-600' },
        { name: 'Refund Management', path: '/billing/refunds', icon: RefreshCw, iconColor: 'text-sky-600' },
        { name: 'Bill Cancellation', path: '/billing/cancellations', icon: XCircle, iconColor: 'text-red-600' },
        { name: 'Supplier Payables', path: '/billing/supplier-payables', icon: Truck, iconColor: 'text-indigo-600' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container - Light Theme to match Reception & Doctor Modules */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white text-slate-700 border-r border-slate-200 flex flex-col transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shrink-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        {/* Top Branding Section (Matching Reception & Doctor Brand Header) */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h2>
              <span className="inline-block text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
                BILLING PORTAL
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Body Section */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-2 custom-scrollbar">
          {/* Dashboard Overview Main Link */}
          <div>
            <NavLink
              to="/billing/dashboard"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ${isActive
                  ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-slate-700 font-semibold hover:bg-slate-100/80 hover:text-blue-700'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${location.pathname === '/billing/dashboard' ? 'text-white' : 'text-indigo-500'}`} />
                <span>Dashboard Overview</span>
              </div>
            </NavLink>
          </div>

          {/* Grouped Accordions */}
          {navGroups.map((group) => {
            const isExpanded = expandedSections[group.title];
            return (
              <React.Fragment key={group.title}>
                <div className="space-y-1">
                  <button
                    onClick={() => toggleSection(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-slate-400 uppercase hover:text-slate-700 transition-colors"
                  >
                    <span>{group.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pl-1 space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          location.pathname + location.search === item.path ||
                          (item.path !== '/billing/reports' && location.pathname === item.path);
                        return (
                          <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ${isActive
                                ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/25'
                                : 'text-slate-700 font-semibold hover:bg-slate-100/80 hover:text-blue-700'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.iconColor || 'text-slate-500'}`} />
                              <span>{item.name}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive
                                    ? 'bg-white/20 text-white'
                                    : item.badge === 'New'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>

                {group.title === 'Financial Management' && (
                  <div className="pt-1">
                    <NavLink
                      to="/billing/reports"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ${isActive || location.pathname.startsWith('/billing/reports')
                          ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/25'
                          : 'text-slate-700 font-semibold hover:bg-slate-100/80 hover:text-blue-700'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <BarChart3 className={`w-4 h-4 ${location.pathname.startsWith('/billing/reports') ? 'text-white' : 'text-blue-600'}`} />
                        <span>Reports & Analytics</span>
                      </div>
                    </NavLink>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* User Profile Footer (Matching Reception / Doctor Footer Style) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                {(user?.name || 'F')[0]}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Finance Officer'}</p>
                <p className="text-[10px] text-blue-600 font-semibold truncate uppercase">
                  {user?.role?.replace('_', ' ') || 'Billing Officer'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
