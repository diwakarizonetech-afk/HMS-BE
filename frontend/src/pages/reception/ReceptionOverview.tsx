import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../context/HMSContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  CalendarCheck,
  UserPlus,
  BedDouble,
  UserCheck2,
  Search,
  CalendarPlus,
  Calendar,
  Bell,
  Clock,
  ArrowUpRight,
  Activity,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

import { StaffShiftWidget } from '../../components/common/StaffShiftWidget';
import { matchBranch } from '../../utils/helpers';

export const ReceptionOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients, appointments, queue, beds, ipdAdmissions, notifications, markNotificationRead, refreshData } = useHMS();

  const userBranch = user?.branch || 'All';
  const isSuperAdminOrAdmin = (user?.role || '').toString().toLowerCase().includes('admin');

  // Filter doctor assigned follow up date notifications:
  // 1. Must match current reception user's branch
  // 2. Follow-up date must be today or past due (do not show future dates like tomorrow until tomorrow arrives)
  // 3. Must be unread / active (once booking is confirmed, it is marked read/removed)
  const followUpNotifications = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLocal = new Date().toLocaleDateString('en-CA');

    return notifications.filter((n) => {
      const isFollowUp = n.eventType === 'follow_up_assigned' || (n.title && n.title.toLowerCase().includes('follow-up'));
      if (!isFollowUp) return false;
      if (n.read) return false;

      // Branch Check: only show in same branch reception
      const branchMatches = isSuperAdminOrAdmin || userBranch === 'All' || !n.branch || matchBranch(n.branch, userBranch);
      if (!branchMatches) return false;

      // Date Check: if follow-up date is tomorrow or future, only show when that date arrives (date <= today)
      const extractedDate = n.followUpDate || (n.message.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '');
      if (extractedDate) {
        const hasArrived = extractedDate <= today || extractedDate <= todayLocal;
        if (!hasArrived) return false;
      }

      return true;
    });
  }, [notifications, userBranch, isSuperAdminOrAdmin]);

  // Auto-refresh real-time data on mount and poll every 10s
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Robust, case-insensitive metric calculations
  const totalPatientsToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLocal = new Date().toLocaleDateString('en-CA');
    const registeredToday = patients.filter((p) => {
      const regDate = p.registrationDate || p.createdDate || p.createdAt;
      if (!regDate) return false;
      const d = regDate.toString().split('T')[0];
      return d === today || d === todayLocal;
    }).length;
    return registeredToday > 0 ? registeredToday : patients.length;
  }, [patients]);

  const scheduledAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const st = (a.status || '').toString().toLowerCase().trim();
      return st === 'scheduled' || st === 'confirmed' || st === 'booked' || st === 'pending' || st === 'waiting' || st === 'in progress';
    }).length;
  }, [appointments]);

  const pendingOnlineRequests = useMemo(() => {
    return appointments.filter((a) => {
      const st = (a.status || '').toString().toLowerCase().trim();
      return st === 'requested' || st === 'pending' || st === 'online_requested';
    });
  }, [appointments]);

  const walkInCount = useMemo(() => {
    return queue.filter((q) => {
      const st = (q.status || '').toString().toLowerCase().trim();
      return st !== 'completed' && st !== 'cancelled';
    }).length;
  }, [queue]);

  const activeAdmissions = useMemo(() => {
    return ipdAdmissions.filter((a) => {
      const st = (a.status || '').toString().toLowerCase().trim();
      return st === 'admitted' || st === 'active' || st === 'in_ward';
    }).length;
  }, [ipdAdmissions]);

  const availableBeds = useMemo(() => {
    const freeCount = beds.filter((b) => {
      const st = (b.status || '').toString().toLowerCase().trim();
      return st === 'available' || st === 'vacant' || st === 'free' || st === 'unoccupied';
    }).length;
    if (freeCount > 0) return freeCount;
    if (beds.length > 0) return Math.max(0, beds.length - activeAdmissions);
    return 15; // default fallback bed capacity
  }, [beds, activeAdmissions]);

  return (
    <div className="space-y-6">
      {/* Doctor Assigned Follow-Up Dates Alert Card (Branch-scoped & Date-aware) */}
      {followUpNotifications.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-indigo-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center font-bold border border-cyan-400/30 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-wide">Doctor Assigned Patient Follow-Up Dates Due Today</h3>
                  <span className="text-[10px] font-extrabold bg-cyan-400 text-cyan-950 px-2 py-0.5 rounded-full uppercase">
                    {followUpNotifications.length} Due Now
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Follow-up visits assigned by attending doctors for your branch. Review and confirm booking to clear notification.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/reception/appointment/book')}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-cyan-950 font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <CalendarPlus className="w-4 h-4" /> Book Appointment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {followUpNotifications.map((n) => {
              const dateMatch = n.message.match(/(\d{4}-\d{2}-\d{2})/);
              const extractedDate = n.followUpDate || (dateMatch ? dateMatch[1] : '');

              return (
                <div
                  key={n.id}
                  className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 hover:border-cyan-400/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800">
                        Follow-Up Due
                      </span>
                      <span className="text-[10px] text-slate-300 font-medium">{n.time}</span>
                    </div>
                    {extractedDate ? (
                      <div className="text-base font-black text-cyan-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        {extractedDate}
                      </div>
                    ) : null}
                    <p className="text-xs text-white font-semibold leading-snug">{n.message}</p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-indigo-200">Ref UHID: <strong className="text-white">{n.relatedRecordId || 'Patient'}</strong></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markNotificationRead(n.id)}
                        className="text-[10px] font-bold text-slate-300 hover:text-emerald-300 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 cursor-pointer transition-colors"
                        title="Mark booking confirmed & remove from alerts"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => navigate(`/reception/appointment/book?uhid=${encodeURIComponent(n.relatedRecordId || '')}${extractedDate ? `&date=${extractedDate}` : ''}&notifId=${n.id}`)}
                        className="text-[11px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Book Date →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Online Requests Alert Banner */}
      {pendingOnlineRequests.length > 0 && (
        <div className="bg-amber-500 text-white p-4.5 rounded-2xl shadow-md flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0 text-amber-100" />
            <div>
              <h4 className="font-extrabold text-sm">{pendingOnlineRequests.length} Pending Online Appointment Request(s) Received!</h4>
              <p className="text-xs text-amber-100">Patients have submitted online booking requests for your branch. Please verify doctor availability and confirm booking.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reception/appointment/book')}
            className="px-4 py-2 rounded-xl bg-white text-amber-950 font-bold text-xs shadow hover:bg-amber-50 shrink-0 cursor-pointer"
          >
            Review & Confirm
          </button>
        </div>
      )}
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-800">
              Reception Desk Portal
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Branch: {user?.branch || 'Main Campus (BKC)'}
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Hospital ERP Overview</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time branch operational desk for appointments, live OPD queue, and ward bed allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
            <p className="text-[10px] text-slate-300 uppercase font-semibold">Live System Time</p>
            <p className="text-xs font-bold text-cyan-300">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin Assigned Duty Shift Widget */}
      <StaffShiftWidget portalRole="reception" rosterRoute="/reception/shift-roster" />

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Patients Directory & Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registered Patients</span>
              <span className="text-[10px] text-indigo-600 font-bold">Network-Wide Access</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-black text-slate-900">{patients.length}</h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              +{totalPatientsToday} today
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Universal patient registry across all branches</p>
        </div>

        {/* Card 2: Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Appointments</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-black text-slate-900">{scheduledAppointments}</h2>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
          <p className="text-[11px] text-slate-500">{appointments.length} Total appointments logged</p>
        </div>

        {/* Card 3: OPD Patient Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active OPD Queue</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-black text-slate-900">{walkInCount}</h2>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              In Queue
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Patients waiting for doctor</p>
        </div>

        {/* Card 4: IPD Admissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">IPD Admissions</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-black text-slate-900">{activeAdmissions}</h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {availableBeds} Beds Free
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Currently admitted in wards</p>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Reception Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/reception/patient/register')}
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 hover:bg-blue-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-blue-600 transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Register Patient</p>
              <p className="text-[10px] text-slate-500 group-hover:text-blue-100">Generate new UHID</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reception/patient/search')}
            className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Search Patient</p>
              <p className="text-[10px] text-slate-500 group-hover:text-indigo-100">Find by UHID or Name</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reception/appointment/book')}
            className="flex items-center gap-3 p-4 rounded-xl bg-cyan-50/80 border border-cyan-200/80 hover:bg-cyan-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-cyan-600 transition-colors">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Book Appointment</p>
              <p className="text-[10px] text-slate-500 group-hover:text-cyan-100">Schedule OPD Doctor</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reception/ipd/admit')}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Admit Patient</p>
              <p className="text-[10px] text-slate-500 group-hover:text-emerald-100">Allocate IPD Bed</p>
            </div>
          </button>
        </div>
      </div>

      {/* Two Column Section: Recent Activity Table & Live Queue Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Patients Activity Table */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Patient Directory</h3>
              <p className="text-xs text-slate-500">Latest patient registrations & active status</p>
            </div>
            <button
              onClick={() => navigate('/reception/patient/search')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              View All Patients →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-lg">UHID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Age / Gender</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.slice(0, 5).map((p) => {
                  const isEmergency = Boolean(p.isEmergency || (p.status || '').toLowerCase() === 'emergency' || (p.category || '').toLowerCase() === 'emergency');
                  return (
                  <tr key={p.id} className={`transition-colors ${isEmergency ? 'bg-rose-50/30' : 'hover:bg-slate-50/80'}`}>
                    <td className="p-3 font-bold text-blue-600">{p.uhid}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{p.firstName} {p.lastName}</span>
                        {isEmergency && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {p.age} yrs / {p.gender}
                    </td>
                    <td className="p-3 text-slate-600">{p.mobile}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isEmergency
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : p.status === 'Admitted'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {isEmergency ? 'Emergency' : p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate(`/reception/patient/update?uhid=${p.uhid}`)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* OPD Live Queue Stream */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live OPD Queue</h3>
              <p className="text-xs text-slate-500">Active consultation tokens</p>
            </div>
            <button
              onClick={() => navigate('/reception/appointment/queue')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Manage →
            </button>
          </div>

          <div className="space-y-2.5">
            {[...queue]
              .sort((a, b) => {
                const getWeight = (st: string) => (st === 'Completed' ? 1 : st === 'Skipped' ? 2 : 0);
                const wDiff = getWeight(a.status) - getWeight(b.status);
                if (wDiff !== 0) return wDiff;
                const emDiff = (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0);
                if (emDiff !== 0) return emDiff;
                return (b.priority || 0) - (a.priority || 0);
              })
              .slice(0, 4)
              .map((q) => (
              <div
                key={q.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  q.isEmergency
                    ? 'border-rose-300 bg-rose-50/60 border-l-4 border-l-rose-500'
                    : 'border-slate-100 bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                      q.isEmergency ? 'text-rose-800 bg-rose-100' : 'text-blue-700 bg-blue-100'
                    }`}>
                      {q.tokenNumber}
                    </span>
                    {q.isEmergency && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 mt-1">{q.patientName}</p>
                  <p className="text-[10px] text-slate-500">{q.doctorName}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      q.isEmergency
                        ? 'bg-rose-100 text-rose-800'
                        : q.status === 'In Consultation'
                        ? 'bg-emerald-100 text-emerald-800'
                        : q.status === 'Waiting'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {q.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{q.waitingTimeMinutes}m wait</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
