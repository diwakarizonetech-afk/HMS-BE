import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BillingSidebar } from './BillingSidebar';
import { Header } from '../../components/dashboard/Header';
import { ToastContainer } from '../../components/common/ToastContainer';
import { useAuth } from '../../context/AuthContext';
import { BillingProvider } from '../../context/BillingContext';
import { BillDocumentModal } from './components/BillDocumentModal';
import {
  Building2,
  Clock,
  Calendar,
  User,
  Wallet,
} from 'lucide-react';

const InnerBillingLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800">
      {/* Billing Sidebar (Light theme matching Reception & Doctor modules) */}
      <BillingSidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Global HMS Top Bar */}
        <Header setMobileSidebarOpen={setMobileSidebarOpen} />

        {/* Dedicated Billing Top Info Header Banner (Matching Receptionist & Doctor Module Aesthetic) */}
        <div className="bg-white text-slate-800 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">AegisCare HMS</h1>
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Billing & Revenue Management
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Centralized Hospital Billing, Payment Collections, Expenses & Revenue Tracking
                </p>
              </div>
            </div>

            {/* Logged-in Staff & Shift Metadata Banner */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{user?.name || 'Billing User'}</span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100/80 border border-blue-200 px-1.5 py-0.2 rounded-full uppercase">
                  {user?.role?.replace('_', ' ') || 'Billing Officer'}
                </span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{user?.branch || 'Main Hospital Branch'}</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Shift: Day (08:00 AM - 04:00 PM)</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{formattedDate} • {formattedTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Nested Routes Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Document Modal */}
      <BillDocumentModal />

      <ToastContainer />
    </div>
  );
};

export const BillingLayout: React.FC = () => {
  return (
    <BillingProvider>
      <InnerBillingLayout />
    </BillingProvider>
  );
};
