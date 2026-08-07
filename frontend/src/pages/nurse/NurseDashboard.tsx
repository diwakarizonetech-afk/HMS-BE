import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  BedDouble,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Pill,
  ArrowLeftRight,
  ClipboardList,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { useNurse } from '../../context/NurseContext';
import { useHMS } from '../../context/HMSContext';
import { StaffShiftWidget } from '../../components/common/StaffShiftWidget';

export const NurseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { vitals, transfers, notes, medications, activities } = useNurse();
  const { patients } = useHMS();

  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Computed metric numbers
  const todayPatientsCount = patients.length;
  const opdPatientsCount = patients.filter((p) => p.status === 'Active').length + 8;
  const ipdPatientsCount = patients.filter((p) => p.status === 'Admitted').length + 14;
  const pendingMedicationCount = medications.filter((m) => m.status === 'Scheduled').length;
  const completedMedicationCount = medications.filter((m) => m.status === 'Given').length;
  const criticalPatientsCount = notes.filter((n) => n.patientCondition === 'Critical').length + 2;

  // Filtered audit activities
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.nurseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activityFilter === 'All' || act.activityType === activityFilter;
    return matchesSearch && matchesFilter;
  });

  // Executive Top Summary Cards
  const summaryCards = [
    {
      title: "Today's Patients",
      value: todayPatientsCount,
      subtitle: 'Registered & scheduled today',
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'OPD Patients',
      value: opdPatientsCount,
      subtitle: 'Outpatient consultation queue',
      icon: Stethoscope,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'IPD Patients',
      value: ipdPatientsCount,
      subtitle: 'Currently admitted in wards',
      icon: BedDouble,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Pending Medication',
      value: pendingMedicationCount,
      subtitle: 'Scheduled due doses',
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Completed Medication',
      value: completedMedicationCount,
      subtitle: 'Administered shift doses',
      icon: CheckCircle2,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Critical Patients',
      value: criticalPatientsCount,
      subtitle: 'Requiring intensive observation',
      icon: AlertTriangle,
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header & Date Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Staff Nurse Portal</span>
            <span>/</span>
            <span className="text-blue-600">Executive Dashboard</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Nurse Overview Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time patient monitoring, vitals recording, ward transfers, and medication schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Shift: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (Morning)</span>
          </div>
        </div>
      </div>

      {/* Super Admin Assigned Duty Shift Widget */}
      <StaffShiftWidget portalRole="nurse" rosterRoute="/nurse/shift-roster" />

      {/* Top 6 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl ${c.bgColor} ${c.textColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{c.value}</div>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{c.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Nurse Quick Actions</span>
          </h2>
          <span className="text-xs text-slate-500">Instant workflow shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/nurse/opd/vitals')}
            className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-rose-700">Record Vitals</p>
                <p className="text-[10px] text-slate-500">Pre-consultation triage</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/nurse/ipd/medication-administration')}
            className="flex items-center justify-between p-4 rounded-xl border border-cyan-100 bg-cyan-50/50 hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/20">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-cyan-700">Medication Admin</p>
                <p className="text-[10px] text-slate-500">Dose administration log</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/nurse/ipd/ward-transfer')}
            className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">Ward Transfer</p>
                <p className="text-[10px] text-slate-500">Reallocate patient bed</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/nurse/ipd/nursing-notes')}
            className="flex items-center justify-between p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Nursing Notes</p>
                <p className="text-[10px] text-slate-500">Daily observation log</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Patients by Ward */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Patients by Ward</h3>
              <p className="text-[11px] text-slate-500">IPD occupancy per unit</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              88% ICU Occupancy
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              { ward: 'Intensive Care Unit (ICU)', count: 12, pct: 88, color: 'bg-rose-500' },
              { ward: 'General Ward', count: 24, pct: 75, color: 'bg-blue-500' },
              { ward: 'Deluxe Private Rooms', count: 8, pct: 60, color: 'bg-emerald-500' },
              { ward: 'Surgical Ward', count: 14, pct: 70, color: 'bg-amber-500' },
              { ward: 'Pediatric Care Unit', count: 6, pct: 45, color: 'bg-purple-500' },
            ].map((w, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${w.color}`} />
                    <span>{w.ward}</span>
                  </div>
                  <span className="font-bold text-slate-900">{w.count} Patients ({w.pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${w.color} rounded-full transition-all duration-500`}
                    style={{ width: `${w.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Daily Patients Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Patients Triage</h3>
              <p className="text-[11px] text-slate-500">Weekly vitals & OPD admissions</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              +14% vs last week
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { day: 'Mon, Jul 22', opd: 42, ipd: 18 },
              { day: 'Tue, Jul 23', opd: 48, ipd: 20 },
              { day: 'Wed, Jul 24', opd: 55, ipd: 22 },
              { day: 'Thu, Jul 25', opd: 39, ipd: 16 },
              { day: 'Fri, Jul 26', opd: 61, ipd: 24 },
              { day: 'Today', opd: 52, ipd: 21 },
            ].map((bar, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{bar.day}</span>
                  <span className="font-bold text-slate-900">{bar.opd} OPD • {bar.ipd} IPD</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${(bar.opd / 80) * 100}%` }}
                    title={`OPD: ${bar.opd}`}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(bar.ipd / 80) * 100}%` }}
                    title={`IPD: ${bar.ipd}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Medication Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medication Status</h3>
              <p className="text-[11px] text-slate-500">Shift dose fulfillment rate</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-3.5 pt-2">
            {[
              { status: 'Given / Administered', count: 48, pct: 75, color: 'bg-emerald-600' },
              { status: 'Scheduled (Upcoming)', count: 12, pct: 18, color: 'bg-blue-600' },
              { status: 'Delayed (>30 mins)', count: 3, pct: 4, color: 'bg-amber-500' },
              { status: 'Missed Doses', count: 2, pct: 3, color: 'bg-rose-500' },
            ].map((st, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                    <span>{st.status}</span>
                  </div>
                  <span>{st.count} doses ({st.pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${st.color} rounded-full`}
                    style={{ width: `${st.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Nursing Activities Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent Operational Audit Log</span>
            </h3>
            <p className="text-xs text-slate-500">Live feed of vitals, medications, transfers, and observations</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isFilterOpen || activityFilter !== 'All'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Log</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {isFilterOpen && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search patient or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Type:</span>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Activities</option>
                <option value="Vitals Recorded">Vitals Recorded</option>
                <option value="Medication Given">Medication Given</option>
                <option value="Nursing Note Added">Nursing Note Added</option>
                <option value="Ward Transfer">Ward Transfer</option>
                <option value="Patient Admitted">Patient Admitted</option>
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Activity Type</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Audit Details</th>
                <th className="py-3.5 px-4">Recorded By</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {act.timeAgo}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {act.activityType}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>
                        <p className="font-bold text-slate-900">{act.patientName}</p>
                        <p className="text-[10px] text-blue-600 font-mono">{act.patientUhid}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {act.details}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {act.nurseName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          act.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : act.status === 'Alert'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No recent activities match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
