import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Building,
  Layers,
  UserCheck,
  Users,
  Activity,
  BedDouble,
  Clock,
  Plus,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Stethoscope,
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, users, branches, departments, specializations, roles, activities, addUser, addBranch, addDepartment, addSpecialization } = useSuperAdmin();
  const { addToast } = useHMS();

  // Quick Action Modal States
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  const getNextEmployeeId = (roleName: string = 'doctor') => {
    const roleCodeMap: Record<string, string> = {
      doctor: 'DOC',
      nurse: 'NUR',
      receptionist: 'REC',
      reception: 'REC',
      'store manager': 'STR',
      store: 'STR',
      'lab technician': 'LAB',
      lab: 'LAB',
      pharmacist: 'PHAR',
      pharmacy: 'PHAR',
      cashier: 'CSH',
      super_admin: 'ADM',
      admin: 'ADM',
    };
    const code = roleCodeMap[roleName.toLowerCase()] || 'USR';

    const numbers = users
      .map((u) => {
        const empIdStr = u.employeeId || u.userId || u.id || '';
        const match = empIdStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 100;
    return `EMP-${code}-${maxNum + 1}`;
  };

  // Quick User Form
  const [userForm, setUserForm] = useState({
    employeeId: getNextEmployeeId('doctor'),
    fullName: '',
    email: '',
    phone: '',
    role: 'doctor',
    department: 'Cardiology',
    branch: 'AegisCare Main Campus (BKC)',
    status: 'Active' as const,
    password: '',
    confirmPassword: '',
  });

  // Quick Branch Form
  const [branchForm, setBranchForm] = useState({
    branchName: '',
    managerName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Mumbai',
    status: 'Active' as const,
    totalStaff: 50,
    bedCount: 100,
  });

  // Quick Dept Form
  const [deptForm, setDeptForm] = useState({
    departmentName: '',
    headOfDepartment: '',
    email: '',
    phone: '',
    floorLocation: '2nd Floor',
    doctorCount: 5,
    bedCount: 20,
    status: 'Active' as const,
  });

  // Quick Specialization Form
  const [specForm, setSpecForm] = useState({
    specializationName: '',
    category: 'Surgical Specialty',
    associatedDepartment: 'Cardiology',
    description: '',
    doctorCount: 2,
    status: 'Active' as const,
  });

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.fullName || !userForm.email) {
      addToast('error', 'Validation Error', 'Full Name & Email are required.');
      return;
    }
    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      addToast('error', 'Validation Error', 'Passwords do not match.');
      return;
    }
    const isDoctor = userForm.role.toLowerCase() === 'doctor';
    addUser({
      ...userForm,
      department: isDoctor ? userForm.department : 'N/A',
      password: userForm.password || 'ChangeMe@123',
    });
    setActiveQuickAction(null);
    setUserForm({
      employeeId: getNextEmployeeId('doctor'),
      fullName: '',
      email: '',
      phone: '',
      role: 'doctor',
      department: 'Cardiology',
      branch: 'AegisCare Main Campus (BKC)',
      status: 'Active',
      password: '',
      confirmPassword: '',
    });
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.branchName) {
      addToast('error', 'Validation Error', 'Branch Name is required.');
      return;
    }
    addBranch(branchForm);
    setActiveQuickAction(null);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.departmentName) {
      addToast('error', 'Validation Error', 'Department Name is required.');
      return;
    }
    addDepartment(deptForm);
    setActiveQuickAction(null);
  };

  const handleSaveSpecialization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specForm.specializationName) {
      addToast('error', 'Validation Error', 'Specialization Name is required.');
      return;
    }
    addSpecialization(specForm);
    setActiveQuickAction(null);
  };

  // Role distribution data calculation
  const roleCounts: Record<string, number> = {
    Doctor: users.filter((u) => u.role === 'doctor').length,
    Nurse: users.filter((u) => u.role === 'nurse').length,
    Receptionist: users.filter((u) => u.role === 'reception').length,
    StoreManager: users.filter((u) => u.role === 'store').length,
    SuperAdmin: users.filter((u) => u.role === 'super_admin' || u.role === 'admin').length,
  };

  const totalUsersCount = users.length || 1;
  const docPct = users.length > 0 ? Math.round((roleCounts.Doctor / totalUsersCount) * 100) : 0;
  const nursePct = users.length > 0 ? Math.round((roleCounts.Nurse / totalUsersCount) * 100) : 0;
  const recepPct = users.length > 0 ? Math.round((roleCounts.Receptionist / totalUsersCount) * 100) : 0;
  const storePct = users.length > 0 ? Math.round((roleCounts.StoreManager / totalUsersCount) * 100) : 0;
  const adminPct = users.length > 0 ? Math.round((roleCounts.SuperAdmin / totalUsersCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Enterprise HMS</span>
            <span>/</span>
            <span className="text-indigo-600">Super Admin Portal</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central management for multi-branch hospitals, RBAC, clinical departments, staff and bed capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/auth/users')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Manage Users</span>
          </button>
          <button
            onClick={() => setActiveQuickAction('addUser')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* 8 Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Total Hospitals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospitals</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{stats.totalHospitals}</p>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> Configured
          </span>
        </div>

        {/* Total Branches */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branches</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{branches.length}</p>
          <span className="text-[10px] font-semibold text-indigo-600">{branches.length} Registered</span>
        </div>

        {/* Total Departments */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Depts</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{departments.length}</p>
          <span className="text-[10px] font-semibold text-cyan-600">{departments.length} Units</span>
        </div>

        {/* Total Doctors */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctors</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{stats.totalDoctors}</p>
          <span className="text-[10px] font-semibold text-violet-600">{stats.totalDoctors} Active</span>
        </div>

        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{users.length}</p>
          <span className="text-[10px] font-semibold text-emerald-600">All Roles</span>
        </div>

        {/* Active Users */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Users</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">
            {users.filter((u) => u.status === 'Active').length}
          </p>
          <span className="text-[10px] font-semibold text-teal-600">Operational</span>
        </div>

        {/* Today's Login */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today Logins</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{stats.todaysLogins}</p>
          <span className="text-[10px] font-semibold text-amber-600">Active Sessions</span>
        </div>

        {/* Bed Occupancy % */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600">{stats.bedOccupancyPercent}%</p>
          <span className="text-[10px] font-semibold text-rose-600">IPD Capacity</span>
        </div>
      </div>

      {/* Charts & Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Users by Role */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Users by Role Distribution</span>
              </h3>
              <p className="text-[11px] text-slate-500">Breakdown of system users per staff role category</p>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {users.length} Total Users
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Doctors ({roleCounts.Doctor})</span>
                <span className="text-slate-500">{docPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${docPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Nurses ({roleCounts.Nurse})</span>
                <span className="text-slate-500">{nursePct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${nursePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Receptionists ({roleCounts.Receptionist})</span>
                <span className="text-slate-500">{recepPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${recepPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Store & Inventory Managers ({roleCounts.StoreManager})</span>
                <span className="text-slate-500">{storePct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${storePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Admins & Super Admins ({roleCounts.SuperAdmin})</span>
                <span className="text-slate-500">{adminPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${adminPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Branch Wise Users & Capacity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Branch Wise Staff & Capacity</span>
              </h3>
              <p className="text-[11px] text-slate-500">Active personnel and bed capacity across registered hospital branches</p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {branches.length} Active Branches
            </span>
          </div>

          {branches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No hospital branches registered yet. Click Quick Action Hub to add a branch.
            </div>
          ) : (
            <div className="space-y-3.5">
              {branches.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{b.branchName}</span>
                    <span className="font-semibold text-blue-600">{b.totalStaff} Staff • {b.bedCount} Beds</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                    <div className="bg-blue-600 h-2" style={{ width: `${Math.min(100, (b.totalStaff / (users.length || 1)) * 100)}%` }} />
                    <div className="bg-emerald-500 h-2" style={{ width: `${Math.min(100, ((b.bedCount || 0) / 100) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Recent Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Action Hub */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Quick Action Hub</span>
            </h3>
            <p className="text-[11px] text-slate-500">Instantly provision users, branches, departments & specializations</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setActiveQuickAction('addUser')}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Add New User</h4>
                  <p className="text-[10px] text-slate-500">Provision doctor, nurse, admin credentials</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </button>

            <button
              onClick={() => setActiveQuickAction('addBranch')}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Add Hospital Branch</h4>
                  <p className="text-[10px] text-slate-500">Register new hospital branch location</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </button>

            <button
              onClick={() => setActiveQuickAction('addDepartment')}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-600 font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Add Clinical Department</h4>
                  <p className="text-[10px] text-slate-500">Create specialty or OPD unit</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600" />
            </button>

            <button
              onClick={() => setActiveQuickAction('addSpecialization')}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-violet-500 hover:bg-violet-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 font-bold flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Add Doctor Specialization</h4>
                  <p className="text-[10px] text-slate-500">Define medical specialty scope</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
            </button>
          </div>
        </div>

        {/* Right Column: Recent Activities Stream */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Recent System Activities</span>
              </h3>
              <p className="text-[11px] text-slate-500">Real-time audit log of administrative updates & registrations</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Live Audit Log
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No administrative system activities recorded yet.
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{act.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                        Actor: <span className="text-indigo-600 font-semibold">{act.actor}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md shrink-0">
                    {act.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTION MODALS */}
      {/* 1. Add User Modal */}
      <Modal
        isOpen={activeQuickAction === 'addUser'}
        onClose={() => setActiveQuickAction(null)}
        title="Add New HMS User Account"
        subtitle="Provision staff login credentials and department assignment"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Employee ID</label>
                <button
                  type="button"
                  onClick={() => {
                    const match = userForm.employeeId.match(/^(.*?)(\d+)$/);
                    if (match) {
                      const prefix = match[1];
                      const num = parseInt(match[2], 10) + 1;
                      setUserForm({ ...userForm, employeeId: `${prefix}${num}` });
                    } else {
                      setUserForm({ ...userForm, employeeId: getNextEmployeeId(userForm.role) });
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  + Increment ID
                </button>
              </div>
              <input
                type="text"
                value={userForm.employeeId}
                onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Rajesh Khanna"
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. rkhanna@hms.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98000 11122"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign Role</label>
              <select
                value={userForm.role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  const isDoctor = selectedRole.toLowerCase() === 'doctor';
                  setUserForm({
                    ...userForm,
                    role: selectedRole,
                    employeeId: getNextEmployeeId(selectedRole),
                    department: isDoctor ? (userForm.department === 'N/A' || !userForm.department ? (departments[0]?.departmentName || 'Cardiology') : userForm.department) : 'N/A',
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="reception">Receptionist</option>
                <option value="store">Store Manager</option>
                <option value="lab">Lab Technician</option>
                <option value="pharmacy">Pharmacist</option>
                <option value="cashier">Cashier</option>
                <option value="super_admin">Super Admin</option>
                {roles
                  .filter((r) => !['doctor', 'nurse', 'receptionist', 'reception', 'store manager', 'store', 'lab technician', 'lab', 'pharmacist', 'pharmacy', 'cashier', 'super admin', 'super_admin', 'admin'].includes(r.roleName.toLowerCase()))
                  .map((r) => (
                    <option key={r.id} value={r.roleName}>
                      {r.roleName} (Custom Role)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Assign Department {userForm.role.toLowerCase() !== 'doctor' && <span className="text-[10px] font-normal text-slate-400 ml-1">(Doctor Only)</span>}
              </label>
              <select
                disabled={userForm.role.toLowerCase() !== 'doctor'}
                value={userForm.role.toLowerCase() === 'doctor' ? userForm.department : 'N/A'}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2 font-semibold outline-none transition-colors ${userForm.role.toLowerCase() === 'doctor'
                    ? 'bg-slate-50 border-slate-200 text-slate-900 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {userForm.role.toLowerCase() === 'doctor' ? (
                  departments.map((d) => (
                    <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                  ))
                ) : (
                  <option value="N/A">N/A (Doctor Only)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign Branch</label>
              <select
                value={userForm.branch}
                onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.branchName}>{b.branchName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="•••••••• (Default: ChangeMe@123)"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={userForm.confirmPassword}
                onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveQuickAction(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Save & Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Branch Modal */}
      <Modal
        isOpen={activeQuickAction === 'addBranch'}
        onClose={() => setActiveQuickAction(null)}
        title="Add Hospital Branch Location"
        subtitle="Register new hospital campus or medical hub"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. AegisCare East Wing (Pune)"
                value={branchForm.branchName}
                onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Manager Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sunil Kulkarni"
                  value={branchForm.managerName}
                  onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={branchForm.city}
                  onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                placeholder="e.g. Viman Nagar, Airport Road"
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveQuickAction(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Save Branch
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Department Modal */}
      <Modal
        isOpen={activeQuickAction === 'addDepartment'}
        onClose={() => setActiveQuickAction(null)}
        title="Add Clinical Department"
        subtitle="Define new hospital department or medical division"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Oncology & Cancer Care"
                value={deptForm.departmentName}
                onChange={(e) => setDeptForm({ ...deptForm, departmentName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Head of Department</label>
              <input
                type="text"
                placeholder="e.g. Dr. Ramesh Nambiar"
                value={deptForm.headOfDepartment}
                onChange={(e) => setDeptForm({ ...deptForm, headOfDepartment: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveQuickAction(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Save Department
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Specialization Modal */}
      <Modal
        isOpen={activeQuickAction === 'addSpecialization'}
        onClose={() => setActiveQuickAction(null)}
        title="Add Doctor Specialization"
        subtitle="Define new medical specialization"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSpecialization} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Specialization Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pediatric Cardiologist"
                value={specForm.specializationName}
                onChange={(e) => setSpecForm({ ...specForm, specializationName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Associated Department</label>
              <select
                value={specForm.associatedDepartment}
                onChange={(e) => setSpecForm({ ...specForm, associatedDepartment: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveQuickAction(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Save Specialization
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
