import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLab } from '../../context/LabContext';
import { useAuth } from '../../context/AuthContext';
import {
  TestTube,
  FlaskConical,
  Cog,
  FileCheck2,
  AlertTriangle,
  Stethoscope,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const WEEKLY_PERFORMANCE_DATA = [
  { day: 'Mon', collected: 24, completed: 20 },
  { day: 'Tue', collected: 32, completed: 28 },
  { day: 'Wed', collected: 28, completed: 26 },
  { day: 'Thu', collected: 35, completed: 30 },
  { day: 'Fri', collected: 30, completed: 25 },
  { day: 'Sat', collected: 15, completed: 12 },
  { day: 'Sun', collected: 5, completed: 4 },
];

const STATUS_DISTRIBUTION_DATA = [
  { name: 'Pending', value: 12, color: '#eab308' },
  { name: 'In Processing', value: 8, color: '#a855f7' },
  { name: 'Completed', value: 24, color: '#10b981' },
  { name: 'Verified', value: 36, color: '#3b82f6' },
];

export const LabOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sampleCollections,
    sampleProcessingList,
    labResults,
    labReports,
    activities,
  } = useLab();

  // Metric Computations
  const totalTestOrders = sampleCollections.length + 42;
  const samplesCollectedToday = sampleCollections.filter((s) => s.status === 'Collected').length + 24;
  const samplesInProcessing = sampleProcessingList.filter((p) => p.status === 'In Processing').length;
  const completedTestsToday = labResults.filter((r) => r.status === 'Completed' || r.status === 'Verified').length + 38;
  const pendingReports = labReports.filter((r) => r.status === 'Generated' || r.status === 'Draft').length;
  const criticalResultsCount = labResults.filter((r) => r.flag === 'Critical' || r.status === 'Critical').length;
  const pendingDoctorReviews = labReports.filter((r) => r.doctorReviewStatus === 'Pending Review').length;
  const monthlyRevenue = '₹ 6,85,400';

  // Task Counts
  const pendingCollectionCount = sampleCollections.filter((s) => s.status === 'Pending').length;
  const pendingProcessingCount = sampleProcessingList.filter((p) => p.status === 'Pending').length;
  const pendingResultEntryCount = sampleProcessingList.filter((p) => p.status === 'Completed').length;
  const pendingReportGenCount = labResults.filter((r) => r.status === 'Completed' && r.verifiedBy !== 'Pending').length;
  const pendingDocReviewCount = pendingDoctorReviews;

  const shiftTimingText = user?.shiftTiming || '07:00 AM – 03:00 PM';
  const shiftNameText = user?.shiftName || 'Morning Lab Shift';

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              Laboratory Information System (LIS)
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Live Analyzer Sync Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Healthcare Laboratory Operations Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking for sample collection, analyzer processing, critical result alerts, report generation & doctor verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Shift Timing Card */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50/60 px-4 py-2 rounded-2xl border border-cyan-200/80 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lab Shift Timing</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Duty
                </span>
              </div>
              <p className="text-xs font-black text-slate-900 mt-0.5">
                {shiftTimingText} <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full ml-1">{shiftNameText}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/lab/result-entry')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <FileCheck2 className="w-4 h-4" /> Enter Patient Test Results
          </button>
          <button
            onClick={() => navigate('/lab/report-generation')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" /> Generate Reports
          </button>
        </div>
      </div>

      {/* 8 Dashboard Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Test Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Test Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{totalTestOrders}</h2>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +18%
            </span>
          </div>
          <p className="text-[10px] text-slate-400">OPD & IPD orders today</p>
        </div>

        {/* Card 2: Samples Collected Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Samples Collected Today</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <TestTube className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{samplesCollectedToday}</h2>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
              Barcoded
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Specimens logged with UHID</p>
        </div>

        {/* Card 3: Samples In Processing */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Samples In Processing</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Cog className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{samplesInProcessing}</h2>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Analyzer Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Currently in automated run</p>
        </div>

        {/* Card 4: Completed Tests Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Tests Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{completedTestsToday}</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Passed QC
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Results verified & saved</p>
        </div>

        {/* Card 5: Pending Reports */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Reports</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{pendingReports}</h2>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              In Draft
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Awaiting PDF release</p>
        </div>

        {/* Card 6: Critical Results */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical Results</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-rose-700">{criticalResultsCount}</h2>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full uppercase">
              STAT Alert
            </span>
          </div>
          <p className="text-[10px] text-rose-600 font-semibold">Immediate doctor alert sent</p>
        </div>

        {/* Card 7: Pending Doctor Reviews */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Doctor Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{pendingDoctorReviews}</h2>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              For Sign-off
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Pathologist review queue</p>
        </div>

        {/* Card 8: Monthly Laboratory Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Lab Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{monthlyRevenue}</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              July 2026
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Routine & STAT test billings</p>
        </div>
      </div>

      {/* Charts Section: 70% Left + 30% Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 70% (8 Cols): Weekly Laboratory Performance */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Laboratory Performance</h3>
              <p className="text-xs text-slate-500">Samples collected vs. tests completed and revenue generation</p>
            </div>
            <span className="text-[11px] font-bold text-cyan-800 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200 w-fit">
              Current Week LIS Metrics
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="collected" name="Samples Collected" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Tests Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 30% (4 Cols): Laboratory Status Distribution */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Laboratory Status Distribution</h3>
            <p className="text-xs text-slate-500">Real-time status breakdown across LIS workflow</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STATUS_DISTRIBUTION_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {STATUS_DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {STATUS_DISTRIBUTION_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 truncate">{item.name}</p>
                  <p className="text-xs font-black text-slate-800">{item.value} Orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activities & Today's Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side (7 Cols): Recent Activities */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" /> Recent Laboratory Activities
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Live Audit Log</span>
          </div>

          <div className="space-y-3 text-xs">
            {activities.map((act) => (
              <div
                key={act.id}
                className={`p-3 rounded-xl border space-y-1 transition-all ${
                  act.priority === 'Critical'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200/80 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      act.priority === 'Critical'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-cyan-100 text-cyan-800'
                    }`}
                  >
                    {act.type}
                  </span>
                  <span className="text-slate-400">{act.time}</span>
                </div>
                <p className="font-semibold text-xs leading-tight mt-1">{act.title}</p>
                <p className="text-[10px] text-slate-500">By {act.user}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side (5 Cols): Today's Pending Tasks */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Today's Actionable Tasks
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Requires Action
            </span>
          </div>

          <div className="space-y-3">
            {/* Task 1: Pending Result Entry */}
            <div
              onClick={() => navigate('/lab/result-entry')}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pending Patient Result Entry</h4>
                  <p className="text-[10px] text-slate-500">Key-in test parameters for patient orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                  {pendingResultEntryCount + 3} Patients
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Task 3: Pending Result Entry */}
            <div
              onClick={() => navigate('/lab/result-entry')}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pending Result Entry</h4>
                  <p className="text-[10px] text-slate-500">Analyzer values waiting for manual key-in</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  {pendingResultEntryCount} Tests
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Task 4: Pending Report Generation */}
            <div
              onClick={() => navigate('/lab/report-generation')}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pending Report Generation</h4>
                  <p className="text-[10px] text-slate-500">Verified results ready for LIS report compilation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  {pendingReportGenCount} Reports
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Task 5: Pending Doctor Review */}
            <div
              onClick={() => navigate('/lab/doctor-review')}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pending Doctor Review</h4>
                  <p className="text-[10px] text-slate-500">Pathologist digital verification queue</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                  {pendingDocReviewCount} Pending
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
