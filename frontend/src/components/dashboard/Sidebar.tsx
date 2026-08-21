import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  UserCheck,
  PhoneCall,
  Calendar,
  CalendarPlus,
  UserCheck2,
  Clock,
  CalendarSync,
  XCircle,
  BedDouble,
  UserPlus2,
  Grid,
  ChevronDown,
  ChevronRight,
  LogOut,
  Activity,
  Siren,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion section states
  const [erOpen, setErOpen] = useState(() => location.pathname.includes('/er'));
  const [patientOpen, setPatientOpen] = useState(() => location.pathname.includes('/patient'));
  const [aptOpen, setAptOpen] = useState(() => location.pathname.includes('/appointment'));
  const [ipdOpen, setIpdOpen] = useState(() => location.pathname.includes('/ipd'));

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
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 pl-9 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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

      {/* Sidebar Drawer / Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h1>
            <span className="inline-block text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
              Reception Portal
            </span>
          </div>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main Dashboard Link */}
          <NavLink
            to="/reception/dashboard"
            end
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/reception/appointment/book"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <CalendarPlus className="w-4 h-4 text-rose-600" />
            <span>OPD Booking / Emergency</span>
          </NavLink>

          {/* 1. Patient Management Group */}
          <div>
            <button
              onClick={() => setPatientOpen(!patientOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Patient Management</span>
              </div>
              {patientOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {patientOpen && (
              <div className="mt-1 space-y-0.5">
                <NavLink
                  to="/reception/patient/register"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Patient</span>
                </NavLink>
                <NavLink
                  to="/reception/patient/search"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Patient</span>
                </NavLink>
                <NavLink
                  to="/reception/patient/update"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 2. Appointment Management Group */}
          <div>
            <button
              onClick={() => setAptOpen(!aptOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Appointment Mgmt</span>
              </div>
              {aptOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {aptOpen && (
              <div className="mt-1 space-y-0.5">
                <NavLink
                  to="/reception/appointment/book"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                </NavLink>
                <NavLink
                  to="/reception/appointment/availability"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Doctor Availability</span>
                </NavLink>
                <NavLink
                  to="/reception/appointment/queue"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Queue Management</span>
                </NavLink>
                <NavLink
                  to="/reception/appointment/reschedule"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <CalendarSync className="w-3.5 h-3.5" />
                  <span>Reschedule Apt</span>
                </NavLink>
                <NavLink
                  to="/reception/appointment/cancel"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Apt</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 3. IPD Management Group */}
          <div>
            <button
              onClick={() => setIpdOpen(!ipdOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BedDouble className="w-4 h-4 text-emerald-600" />
                <span>IPD Management</span>
              </div>
              {ipdOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {ipdOpen && (
              <div className="mt-1 space-y-0.5">
                <NavLink
                  to="/reception/ipd/admit"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <UserPlus2 className="w-3.5 h-3.5" />
                  <span>Admit Patient</span>
                </NavLink>
                <NavLink
                  to="/reception/ipd/beds"
                  onClick={() => setMobileOpen(false)}
                  className={subNavItemClass}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Bed Allocation Grid</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name ? user.name.replace(/^Dr\.\s*/i, '').trim()[0]?.toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || (user?.username ? `User (${user.username})` : 'Staff User')}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.branch ? `Branch: ${user.branch}` : user?.email}</p>
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
