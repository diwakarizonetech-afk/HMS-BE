import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FlaskConical,
  TestTube,
  Cog,
  FileSpreadsheet,
  FileCheck2,
  Stethoscope,
  BarChart3,
  LogOut,
  Microscope,
  CalendarOff,
} from 'lucide-react';

interface LabSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const LabSidebar: React.FC<LabSidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
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

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Microscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">AegisCare HMS</h1>
            <span className="inline-block text-[10px] font-semibold tracking-wider text-cyan-600 uppercase">
              LAB TECHNICIAN MODULE
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {/* Dashboard */}
          <NavLink
            to="/lab/dashboard"
            end
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </NavLink>

          {/* Test Master */}
          <NavLink
            to="/lab/test-master"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <FlaskConical className="w-4 h-4 text-cyan-600" />
            <span>Test Master</span>
          </NavLink>

          {/* OP Register */}
          <NavLink
            to="/lab/result-entry"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            <span>OP Register</span>
          </NavLink>

          {/* Report Generation */}
          <NavLink
            to="/lab/report-generation"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Report Generation</span>
          </NavLink>

          {/* Doctor Review */}
          <NavLink
            to="/lab/doctor-review"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            <span>Doctor Review</span>
          </NavLink>

          {/* Laboratory Reports */}
          <NavLink
            to="/lab/reports"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span>LIS Reports & Analytics</span>
          </NavLink>

          {/* Leave Management */}
          <NavLink
            to="/lab/leave"
            onClick={() => setMobileOpen(false)}
            className={navItemClass}
          >
            <CalendarOff className="w-4 h-4 text-purple-600" />
            <span>Leave Management</span>
          </NavLink>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'L'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || (user?.username ? `User (${user.username})` : 'Lab Technician')}
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
