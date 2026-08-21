import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Pill,
  Tags,
  Warehouse,
  FileCheck2,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  ChevronDown,
  ChevronRight,
  LogOut,
  Cross,
  Package,
  CalendarOff,
} from 'lucide-react';

interface PharmacySidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const PharmacySidebar: React.FC<PharmacySidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion toggle states
  const [medicineMasterOpen, setMedicineMasterOpen] = useState(
    location.pathname.includes('/pharmacy/medicine')
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-bold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Pill className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h1>
            <span className="inline-block text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
              PHARMACY MODULE
            </span>
          </div>
        </div>

        {/* Navigation - Scrollable List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {/* Dashboard */}
          <NavLink
            to="/pharmacy/dashboard"
            end
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </NavLink>

          {/* Medicine Master Menu Accordion */}
          <div>
            <button
              onClick={() => setMedicineMasterOpen(!medicineMasterOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>Medicine Master</span>
              </div>
              {medicineMasterOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {medicineMasterOpen && (
              <div className="mt-1 space-y-0.5">
                <NavLink
                  to="/pharmacy/medicine/list"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Medicine List</span>
                </NavLink>
                <NavLink
                  to="/pharmacy/medicine/categories"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Tags className="w-3.5 h-3.5" />
                  <span>Medicine Categories</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Stock Control */}
          <NavLink
            to="/pharmacy/stock/inventory"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <Warehouse className="w-4 h-4" />
            <span>Stock & Inventory</span>
          </NavLink>

          {/* Prescription Dispensing */}
          <NavLink
            to="/pharmacy/prescription/list"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <span>Prescription Dispensing</span>
          </NavLink>

          {/* Direct Sales (POS) */}
          <NavLink
            to="/pharmacy/pos/direct-sales"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <ShoppingCart className="w-4 h-4 text-cyan-600" />
            <span>Direct Sales (POS)</span>
          </NavLink>

          {/* Customer Returns */}
          <NavLink
            to="/pharmacy/returns/customer"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Customer Returns</span>
          </NavLink>

          {/* Reports */}
          <NavLink
            to="/pharmacy/reports"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Analytics & Reports</span>
          </NavLink>

          {/* Leave Management */}
          <NavLink
            to="/pharmacy/leave"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <CalendarOff className="w-4 h-4 text-purple-600" />
            <span>Leave Management</span>
          </NavLink>
        </div>

        {/* User Card & Logout - Bottom Docked */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || (user?.username ? `User (${user.username})` : 'Pharmacist')}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.branch || user?.department || user?.email || 'Main Branch'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
