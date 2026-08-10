import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../context/HMSContext';
import {
  Users,
  CalendarCheck,
  UserPlus,
  BedDouble,
  UserCheck2,
  Search,
  CalendarPlus,
  Clock,
  ArrowUpRight,
  Activity,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

import { StaffShiftWidget } from '../../components/common/StaffShiftWidget';

export const ReceptionOverview: React.FC = () => {
  const navigate = useNavigate();
  const { patients, appointments, queue, beds, ipdAdmissions } = useHMS();

  // Metric counts
  const totalPatientsToday = patients.length;
  const scheduledAppointments = appointments.filter((a) => a.status === 'Scheduled').length;
  const pendingOnlineRequests = appointments.filter((a) => {
    const st = (a.status || '').toString().toLowerCase();
    return st === 'requested' || st === 'pending';
  });
  const walkInCount = queue.length;
  const activeAdmissions = ipdAdmissions.filter((a) => a.status === 'Admitted').length;
  const availableBeds = beds.filter((b) => b.status === 'Available').length;

  return (
    <div className="space-y-6">
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-800">
            Reception Desk Portal
          </span>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Hospital ERP Overview</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time tracking for OPD admissions, doctor queues, and bed allocation.
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
        {/* Card 1: Today's Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Patients</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl font-black text-slate-900">{totalPatientsToday}</h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Registered in patient database</p>
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

        {/* Card 3: Walk-in Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Walk-in OPD Queue</span>
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
          <p className="text-[11px] text-slate-500">Tokens active at reception</p>
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
                {patients.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-blue-600">{p.uhid}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="p-3 text-slate-600">
                      {p.age} yrs / {p.gender}
                    </td>
                    <td className="p-3 text-slate-600">{p.mobile}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'Admitted'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.status}
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
                ))}
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
            {queue.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md text-[11px]">
                    {q.tokenNumber}
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{q.patientName}</p>
                  <p className="text-[10px] text-slate-500">{q.doctorName}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      q.status === 'In Consultation'
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
