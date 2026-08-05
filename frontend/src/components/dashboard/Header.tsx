import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHMS } from '../../context/HMSContext';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  Shield,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  setMobileSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { patients, notifications, markNotificationRead } = useHMS();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredPatients = searchQuery.trim()
    ? patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.mobile.includes(searchQuery)
      )
    : [];

  const handleSelectPatient = (uhid: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(`/reception/patient/search?query=${encodeURIComponent(uhid)}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Global Search (Name, UHID, Mobile)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                Patient Search Results ({filteredPatients.length})
              </div>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p.uhid)}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50/60 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        UHID: <span className="font-semibold text-blue-600">{p.uhid}</span> • {p.gender}, {p.age}y • {p.mobile}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'Admitted'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No patient matches "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Hospital Alerts</h4>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                      !n.read ? 'bg-blue-50/30 font-medium' : 'opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 px-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-blue-600 font-semibold hover:underline"
                >
                  Close Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            {user?.name?.[0] || 'R'}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900">{user?.name || 'Reception'}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span className="capitalize font-semibold text-blue-600">{user?.role || 'reception'}</span>
            </div>
          </div>
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
