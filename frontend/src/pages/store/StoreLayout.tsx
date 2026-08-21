import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { StoreSidebar } from './StoreSidebar';
import { Header } from '../../components/dashboard/Header';
import { ToastContainer } from '../../components/common/ToastContainer';

export const StoreLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800">
      {/* Store Dedicated Sidebar Navigation */}
      <StoreSidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header setMobileSidebarOpen={setMobileSidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
