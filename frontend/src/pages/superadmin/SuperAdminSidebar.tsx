import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShieldCheck,
  History,
  Users,
  UserCheck,
  Lock,
  UserPlus,
  Building2,
  Building,
  Layers,
  Stethoscope,
  DollarSign,
  Clock,
  Calendar,
  Repeat,
  BedDouble,
  ChevronDown,
  ChevronRight,
  LogOut,
  Shield,
  Activity,
  Award,
} from 'lucide-react';

interface SuperAdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion section open states
  const [authMenuOpen, setAuthMenuOpen] = useState(() => location.pathname.includes('/super-admin/auth'));
  const [hospitalMenuOpen, setHospitalMenuOpen] = useState(() => location.pathname.includes('/super-admin/hospital'));
  const [ipdMenuOpen, setIpdMenuOpen] = useState(() => location.pathname.includes('/super-admin/ipd'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const subNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 pl-8 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  const authSubLinks = [
    { to: '/super-admin/auth/login-history', label: 'Login History', icon: History },
    { to: '/super-admin/auth/users', label: 'User Management', icon: Users },
    { to: '/super-admin/auth/roles', label: 'Role Management (RBAC)', icon: ShieldCheck },
    { to: '/super-admin/auth/permissions', label: 'Permission Management', icon: Lock },
    { to: '/super-admin/auth/department-assignment', label: 'Department Assignment', icon: UserCheck },
  ];

  const hospitalSubLinks = [
    { to: '/super-admin/hospital/profile', label: 'Hospital Profile', icon: Building2 },
    { to: '/super-admin/hospital/branches', label: 'Branch Management', icon: Building },
    { to: '/super-admin/hospital/departments', label: 'Department Management', icon: Layers },
    { to: '/super-admin/hospital/specializations', label: 'Doctor Specializations', icon: Stethoscope },
    { to: '/super-admin/hospital/consultation-charges', label: 'Consultation Charges', icon: DollarSign },
    { to: '/super-admin/hospital/working-hours', label: 'Working Hours', icon: Clock },
    { to: '/super-admin/hospital/leave-management', label: 'Leave Management', icon: Calendar },
    { to: '/super-admin/hospital/shift-rotation', label: 'Shift Rotation', icon: Repeat },
  ];

  const ipdSubLinks = [
    { to: '/super-admin/ipd/bed-occupancy', label: 'Bed Occupancy Dashboard', icon: BedDouble },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Drawer / Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h1>
            <span className="inline-block text-[10px] font-bold tracking-wider text-indigo-600 uppercase">
              Super Admin Portal
            </span>
          </div>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {/* Main Dashboard Link */}
          <NavLink
            to="/super-admin/dashboard"
            end
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          {/* Group 1: Authentication & User Management */}
          <div>
            <button
              onClick={() => setAuthMenuOpen(!authMenuOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="truncate">Auth & User Mgmt</span>
              </div>
              {authMenuOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {authMenuOpen && (
              <div className="mt-1 space-y-0.5">
                {authSubLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={subNavItemClass}
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 2: Hospital Setup */}
          <div>
            <button
              onClick={() => setHospitalMenuOpen(!hospitalMenuOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="truncate">Hospital Setup</span>
              </div>
              {hospitalMenuOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {hospitalMenuOpen && (
              <div className="mt-1 space-y-0.5">
                {hospitalSubLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={subNavItemClass}
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 3: IPD Management */}
          <div>
            <button
              onClick={() => setIpdMenuOpen(!ipdMenuOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BedDouble className="w-4 h-4 text-emerald-600" />
                <span className="truncate">IPD</span>
              </div>
              {ipdMenuOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {ipdMenuOpen && (
              <div className="mt-1 space-y-0.5">
                {ipdSubLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={subNavItemClass}
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Alexander Wright'}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Shield className="w-3 h-3 text-indigo-600" />
                  <span className="font-semibold text-indigo-600">Super Admin</span>
                </div>
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
