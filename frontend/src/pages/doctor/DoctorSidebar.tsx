import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Stethoscope,
  FileText,
  CalendarOff,
  ChevronDown,
  ChevronRight,
  LogOut,
  Activity,
  ClipboardList,
  BedDouble,
  Siren,
} from 'lucide-react';

interface DoctorSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Fixed to viewport left side */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h1>
            <span className="inline-block text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
              DOCTOR PORTAL
            </span>
          </div>
        </div>

        {/* Navigation - Scrollable if items exceed height */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink
            to="/doctor/dashboard"
            end
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/doctor/consultation"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <Stethoscope className="w-4 h-4" />
            <span>OPD Consultation</span>
          </NavLink>

          <NavLink
            to="/doctor/ipd-consultation"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <BedDouble className="w-4 h-4" />
            <span>IPD Consultation</span>
          </NavLink>

          <NavLink
            to="/doctor/leave"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <CalendarOff className="w-4 h-4" />
            <span>Leave Management</span>
          </NavLink>

          <NavLink
            to="/doctor/shift-roster"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Shift Roster</span>
          </NavLink>
        </div>

        {/* User Card & Logout - Docked at bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name ? user.name.replace(/^Dr\.\s*/i, '').trim()[0]?.toUpperCase() : 'D'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || (user?.username ? `Dr. ${user.username}` : 'Doctor')}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.branch || user?.department || 'Main Branch'}
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
