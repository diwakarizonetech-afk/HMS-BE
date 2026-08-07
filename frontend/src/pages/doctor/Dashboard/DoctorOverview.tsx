import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchDoctorsApi, fetchAppointmentsApi } from '../../../services/api';
import {
  Users, CalendarCheck, Clock, AlertTriangle, BedDouble, Stethoscope,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Bell, ListChecks, FileText,
  CalendarOff, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Interfaces ────────────────────────────────────────────────
interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  qualification: string;
  experience: number;
  roomNo: string;
  consultationFee: number;
  status: string;
}

interface DashboardMetrics {
  todayPatients: number;
  todayAppointments: number;
  pendingFollowUps: number;
  completedConsultations: number;
  criticalPatients: number;
  ipdPatients: number;
  upcomingAppointments: number;
  avgConsultationTime: number;
}

interface ScheduleItem {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: string;
  room?: string;
}

interface TaskItem {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  dueTime?: string;
}

interface MedicalAlert {
  id: string;
  patientName: string;
  patientUhid: string;
  alertType: string;
  message: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
  acknowledged: boolean;
}

interface DoctorNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
}

interface WeeklyChartData {
  day: string;
  consultations: number;
  followUps: number;
}

interface GenderDistribution {
  name: string;
  value: number;
  color: string;
}

interface DoctorPatient {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  status: string;
  diagnosis?: string;
}

// ─── Constants ─────────────────────────────────────────────────
const ALERT_SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  High: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  Low: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
};

const DEFAULT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Completed: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'In Progress': { bg: 'bg-amber-100', text: 'text-amber-800' },
  Scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Rejected: { bg: 'bg-rose-100', text: 'text-rose-800' },
  Critical: { bg: 'bg-rose-100', text: 'text-rose-800' },
  Active: { bg: 'bg-blue-100', text: 'text-blue-800' },
  OPD: { bg: 'bg-blue-100', text: 'text-blue-800' },
  IPD: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  High: { bg: 'bg-rose-100', text: 'text-rose-800' },
  Medium: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Low: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

// ─── Mock Data ─────────────────────────────────────────────────
const DEFAULT_PROFILE: DoctorProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  department: '',
  specialization: '',
  qualification: '',
  experience: 0,
  roomNo: '',
  consultationFee: 0,
  status: 'Available',
};

const DEFAULT_METRICS: DashboardMetrics = {
  todayPatients: 0,
  todayAppointments: 0,
  pendingFollowUps: 0,
  completedConsultations: 0,
  criticalPatients: 0,
  ipdPatients: 0,
  upcomingAppointments: 0,
  avgConsultationTime: 0,
};

const SCHEDULE: ScheduleItem[] = [];

const TASKS: TaskItem[] = [];

const ALERTS: MedicalAlert[] = [];

const NOTIFICATIONS: DoctorNotification[] = [];

const WEEKLY_CHART: WeeklyChartData[] = [
  { day: 'Mon', consultations: 0, followUps: 0 },
  { day: 'Tue', consultations: 0, followUps: 0 },
  { day: 'Wed', consultations: 0, followUps: 0 },
  { day: 'Thu', consultations: 0, followUps: 0 },
  { day: 'Fri', consultations: 0, followUps: 0 },
  { day: 'Sat', consultations: 0, followUps: 0 },
  { day: 'Sun', consultations: 0, followUps: 0 },
];

const GENDER_DATA: GenderDistribution[] = [
  { name: 'Male', value: 0, color: '#3b82f6' },
  { name: 'Female', value: 0, color: '#ec4899' },
  { name: 'Other', value: 0, color: '#8b5cf6' },
];

const RECENT_PATIENTS: DoctorPatient[] = [];

// ─── Inline Sub-Components ─────────────────────────────────────
const StatusBadge: React.FC<{ status: string; dot?: boolean; size?: 'sm' | 'md' }> = ({
  status,
  dot = true,
  size = 'sm',
}) => {
  const color = DEFAULT_STATUS_COLORS[status] || { bg: 'bg-slate-200', text: 'text-slate-700' };
  const sizeClass = size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${color.bg} ${color.text} ${sizeClass}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
};

const DashboardCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
  onClick?: () => void;
}> = ({ title, value, icon, iconBg, trend, subtitle, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-300' : ''
      }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    <div className="flex items-baseline justify-between">
      <h2 className="text-3xl font-black text-slate-900">{value}</h2>
      {trend && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${trend.positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
          }`}>
          {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend.value}
        </span>
      )}
    </div>
    {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="w-9 h-9 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-8 bg-slate-200 rounded w-16" />
          <div className="h-2.5 bg-slate-100 rounded w-32" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded w-full" />
      ))}
    </div>
  </div>
);

const WeeklyBarChart: React.FC<{ data: WeeklyChartData[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={240}>
    <BarChart data={data} barCategoryGap="20%">
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11, fontWeight: 600 }} />
      <Bar dataKey="consultations" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Consultations" />
      <Bar dataKey="followUps" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Follow-Ups" />
    </BarChart>
  </ResponsiveContainer>
);

const GenderPieChart: React.FC<{ data: GenderDistribution[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
        {data.map((entry, index) => (
          <Cell key={index} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600 }} />
      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
    </PieChart>
  </ResponsiveContainer>
);

// ─── Main Component ───────────────────────────────────────────
export const DoctorOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // State
  const [profile, setProfile] = useState<DoctorProfile>(DEFAULT_PROFILE);
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS);
  const [schedule] = useState<ScheduleItem[]>(SCHEDULE);
  const [tasks, setTasks] = useState<TaskItem[]>(TASKS);
  const [alerts, setAlerts] = useState<MedicalAlert[]>(ALERTS);
  const [notifications, setNotifications] = useState<DoctorNotification[]>(NOTIFICATIONS);
  const [weeklyChart] = useState<WeeklyChartData[]>(WEEKLY_CHART);
  const [genderData] = useState<GenderDistribution[]>(GENDER_DATA);
  const [recentPatients] = useState<DoctorPatient[]>(RECENT_PATIENTS);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Load the real logged-in doctor's profile (matched by email against the
  // Doctor roster, same lookup pattern used elsewhere in the app) and
  // real today's-appointment metrics scoped to this doctor. Previously this
  // page showed a hardcoded fake identity ("Dr. Vikram Malhotra", Cardiology)
  // and fabricated metric numbers to every doctor regardless of who logged
  // in or which department they belonged to.
  useEffect(() => {
    if (!user) return;
    const loadDoctorData = async () => {
      try {
        const [doctors, appointments] = await Promise.all([
          fetchDoctorsApi(),
          fetchAppointmentsApi(),
        ]);
        const matchedDoctor = doctors.find(
          (d) => d.email && user.email && d.email.toLowerCase() === user.email.toLowerCase()
        );

        setProfile({
          id: matchedDoctor?.id || user.id,
          name: matchedDoctor?.name || user.name,
          email: matchedDoctor?.email || user.email,
          phone: DEFAULT_PROFILE.phone,
          department: matchedDoctor?.department || user.department || '',
          specialization: matchedDoctor?.specialization || '',
          qualification: DEFAULT_PROFILE.qualification,
          experience: DEFAULT_PROFILE.experience,
          roomNo: matchedDoctor?.roomNo || '',
          consultationFee: matchedDoctor?.consultationFee || 0,
          status: matchedDoctor?.status || 'Available',
        });

        const today = new Date().toISOString().split('T')[0];
        const myId = matchedDoctor?.id;
        const myName = matchedDoctor?.name || user.name;
        const myAppointments = appointments.filter(
          (a) => (myId && a.doctorId === myId) || a.doctorName === myName
        );
        const todaysAppointments = myAppointments.filter((a) => a.date === today);

        setMetrics({
          todayPatients: new Set(todaysAppointments.map((a) => a.patientUhid)).size,
          todayAppointments: todaysAppointments.length,
          pendingFollowUps: myAppointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length,
          completedConsultations: todaysAppointments.filter((a) => a.status === 'Completed').length,
          criticalPatients: 0,
          ipdPatients: 0,
          upcomingAppointments: myAppointments.filter((a) => a.date > today).length,
          avgConsultationTime: DEFAULT_METRICS.avgConsultationTime,
        });
      } catch (err) {
        console.warn('Could not load doctor profile/metrics from backend:', err);
      }
    };
    loadDoctorData();
  }, [user]);

  // Fetch real notifications from backend and poll every 15 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        const apiHost = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
        const res = await fetch(`${apiHost}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: DoctorNotification[] = data.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              time: n.time || n.createdAt || 'Just now',
              type: n.type || 'info',
              read: n.read ?? false,
            }));
            setNotifications(mapped);
          }
        }
      } catch (e) {
        // backend unavailable — keep empty list
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    // Also persist mark-as-read to backend
    const token = localStorage.getItem('hms_token');
    const apiHost = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    fetch(`${apiHost}/api/v1/notifications/${notifId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { });
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const shiftTimingText = user?.shiftTiming || '08:00 AM – 04:00 PM';
  const shiftNameText = user?.shiftName || 'Morning Shift';

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner ─────────────────── */}
      {(() => {
        const doctorName = profile.name || user?.name || 'Doctor';
        const formattedGreetingName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
        const cleanName = doctorName.replace(/^Dr\.\s*/i, '').trim();
        const nameParts = cleanName.split(' ').filter(Boolean);
        const avatarInitials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
          : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'DR');

        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xl shrink-0 shadow-md">
                {avatarInitials}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  Doctor Console
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {formattedGreetingName}
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {profile.specialization || 'Physician'} • {profile.department || user?.department || 'OPD'} • Room {profile.roomNo || 'OPD-101'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Shift Timing Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 px-4 py-2 rounded-2xl border border-blue-200/80 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift Timing</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Duty
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-900 mt-0.5">
                    {shiftTimingText} <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full ml-1">{shiftNameText}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80 text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Today</p>
                <p className="text-xs font-bold text-blue-600">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── KPI Metric Cards ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardCard
          title="Today's Patients"
          value={metrics.todayPatients}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          trend={{ value: '+12%', positive: true }}
          subtitle="Total patients in OPD today"
          onClick={() => navigate('/doctor/consultation')}
        />
        <DashboardCard
          title="Appointments"
          value={metrics.todayAppointments}
          icon={<CalendarCheck className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          subtitle={`${metrics.upcomingAppointments} upcoming`}
          onClick={() => navigate('/doctor/consultation')}
        />
        <DashboardCard
          title="Pending Follow-Ups"
          value={metrics.pendingFollowUps}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Patients requiring follow-up"
          onClick={() => navigate('/doctor/consultation')}
        />
        <DashboardCard
          title="Completed Today"
          value={metrics.completedConsultations}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          trend={{ value: '75%', positive: true }}
          subtitle="Consultations finished"
          onClick={() => navigate('/doctor/consultation')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardCard
          title="OPD Consultations"
          value={metrics.todayPatients}
          icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="Outpatient consultations today"
          onClick={() => navigate('/doctor/consultation')}
        />
        <DashboardCard
          title="IPD Patients"
          value={metrics.ipdPatients}
          icon={<BedDouble className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          subtitle="Under your care in wards"
          onClick={() => navigate('/doctor/ipd-consultation')}
        />
        <DashboardCard
          title="Upcoming Appts"
          value={metrics.upcomingAppointments}
          icon={<CalendarCheck className="w-5 h-5 text-cyan-600" />}
          iconBg="bg-cyan-50"
          subtitle="Remaining today"
          onClick={() => navigate('/doctor/consultation')}
        />
        <DashboardCard
          title="Avg. Consult Time"
          value={`${metrics.avgConsultationTime}m`}
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          iconBg="bg-teal-50"
          subtitle="Per patient average"
          onClick={() => navigate('/doctor/consultation')}
        />
      </div>

      {/* ─── Charts Row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Consultation Graph */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Consultations</h3>
              <p className="text-[11px] text-slate-500">This week's OPD & follow-up breakdown</p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">This Week</span>
          </div>
          <WeeklyBarChart data={weeklyChart} />
        </div>

        {/* Gender Distribution */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Patient Gender Distribution</h3>
          <p className="text-[11px] text-slate-500 mb-4">This month's patient demographics</p>
          <GenderPieChart data={genderData} />
        </div>
      </div>

      {/* ─── Quick Actions ─────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/doctor/consultation')}
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 hover:bg-blue-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-blue-600 transition-colors">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Start Consultation</p>
              <p className="text-[10px] text-slate-500 group-hover:text-blue-100">OPD patient queue</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/doctor/ipd-consultation')}
            className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Medical History</p>
              <p className="text-[10px] text-slate-500 group-hover:text-indigo-100">IPD EMR Records</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/doctor/leave')}
            className="flex items-center gap-3 p-4 rounded-xl bg-cyan-50/80 border border-cyan-200/80 hover:bg-cyan-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-cyan-600 transition-colors">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">Apply Leave</p>
              <p className="text-[10px] text-slate-500 group-hover:text-cyan-100">Request time off</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/doctor/consultation')}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition-all duration-200 group text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-white">IPD Rounds</p>
              <p className="text-[10px] text-slate-500 group-hover:text-emerald-100">Ward patients</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
