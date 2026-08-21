import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHMS } from '../../context/HMSContext';
import { matchBranch } from '../../utils/helpers';
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
  Calendar,
  CalendarPlus,
} from 'lucide-react';

interface HeaderProps {
  setMobileSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { patients, notifications, markNotificationRead, markAllNotificationsRead } = useHMS();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const userBranch = user?.branch || 'All';
  const isSuperAdminOrAdmin = (user?.role || '').toString().toLowerCase().includes('admin');

  const visibleNotifications = notifications.filter((n) => {
    return isSuperAdminOrAdmin || userBranch === 'All' || !n.branch || matchBranch(n.branch, userBranch);
  });

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

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
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === 'Admitted'
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
            <div className="absolute right-0 mt-2 w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Hospital Alerts</h4>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                </div>
              </div>

              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const todayLocal = new Date().toLocaleDateString('en-CA');

                const followUpNotifs = visibleNotifications.filter((n) => {
                  const isFollowUp = n.eventType === 'follow_up_assigned' || (n.title && n.title.toLowerCase().includes('follow-up'));
                  return isFollowUp && !n.read;
                });

                const regularNotifs = visibleNotifications.filter((n) => {
                  const isFollowUp = n.eventType === 'follow_up_assigned' || (n.title && n.title.toLowerCase().includes('follow-up'));
                  return !isFollowUp;
                });

                return (
                  <div className="max-h-80 overflow-y-auto">
                    {/* Top Highlighted Section: Doctor Assigned Follow-Up Dates */}
                    {followUpNotifs.length > 0 && (
                      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-3 space-y-2 border-b border-indigo-700">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                            Doctor Follow-ups ({followUpNotifs.length})
                          </span>
                          <span className="text-[9px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.5 rounded font-bold border border-cyan-400/30">
                            Reception Priority
                          </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {followUpNotifs.map((n) => {
                            const dateMatch = n.message.match(/(\d{4}-\d{2}-\d{2})/);
                            const extractedDate = n.followUpDate || (dateMatch ? dateMatch[1] : '');
                            const isDueToday = extractedDate && (extractedDate <= today || extractedDate <= todayLocal);

                            return (
                            <div
                              key={n.id}
                              onClick={() => markNotificationRead(n.id)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                !n.read
                                  ? 'bg-white/15 border-cyan-400/40 shadow-xs'
                                  : 'bg-white/5 border-white/10 opacity-75'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-white text-xs">
                                <span className="text-cyan-300 font-extrabold flex items-center gap-1">
                                  {n.title}
                                  {isDueToday ? (
                                    <span className="text-[9px] bg-rose-500/80 text-white px-1.5 py-0.2 rounded font-bold">Due Today</span>
                                  ) : extractedDate ? (
                                    <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1.5 py-0.2 rounded font-semibold">{extractedDate}</span>
                                  ) : null}
                                </span>
                                <span className="text-[10px] text-slate-300">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-200 mt-1 leading-snug">{n.message}</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markNotificationRead(n.id);
                                  }}
                                  className="text-[10px] text-slate-300 hover:text-emerald-300 underline cursor-pointer"
                                >
                                  Dismiss
                                </button>
                                {n.relatedRecordId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNotifications(false);
                                      navigate(`/reception/appointment/book?uhid=${encodeURIComponent(n.relatedRecordId || '')}${extractedDate ? `&date=${extractedDate}` : ''}&notifId=${n.id}`);
                                    }}
                                    className="text-[10px] font-bold text-cyan-900 bg-cyan-300 hover:bg-cyan-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                  >
                                    <CalendarPlus className="w-3 h-3" /> Book Follow-Up
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Standard Alerts List */}
                    <div className="divide-y divide-slate-100">
                      {regularNotifs.map((n) => (
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
                      {followUpNotifs.length === 0 && regularNotifs.length === 0 && (
                        <div className="p-6 text-center text-xs text-slate-400">No notifications available.</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {unreadCount > 0 ? (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                ) : <span />}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-slate-500 font-semibold hover:text-slate-700 cursor-pointer"
                >
                  Close Alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        {(() => {
          const rawName = user?.name || '';
          const cleanName = rawName.replace(/^Dr\.\s*/i, '').trim();
          const avatarLetter = cleanName ? cleanName[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U');
          const displayName = rawName || (user?.username ? `User (${user.username})` : 'Staff User');
          const rawRole = (user?.role || 'Staff').toString().replace(/userrole\./i, '').replace(/_/g, ' ');
          const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

          return (
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs font-bold">
                {avatarLetter}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span className="capitalize font-semibold text-blue-600">{roleDisplay}</span>
                  {user?.branch && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-slate-600 truncate max-w-[140px]" title={user.branch}>{user.branch}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
