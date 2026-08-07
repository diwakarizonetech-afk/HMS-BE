import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Clock,
  Calendar,
  Sun,
  Sunset,
  Moon,
  ShieldCheck,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { ShiftRotation } from '../../types/superAdmin';

interface StaffShiftRosterPageProps {
  portalRole?: 'reception' | 'nurse' | 'store' | 'doctor' | 'lab' | 'pharmacy';
}

export const StaffShiftRosterPage: React.FC<StaffShiftRosterPageProps> = ({ portalRole }) => {
  const location = useLocation();
  const { shiftRotations } = useSuperAdmin();

  // Determine current portal context from prop or route path
  const currentRole =
    portalRole ||
    (location.pathname.includes('/nurse')
      ? 'nurse'
      : location.pathname.includes('/store')
      ? 'store'
      : location.pathname.includes('/doctor')
      ? 'doctor'
      : location.pathname.includes('/lab')
      ? 'lab'
      : location.pathname.includes('/pharmacy')
      ? 'pharmacy'
      : 'reception');

  // Filter shift rotation for the current logged-in role default employee
  const myShift: ShiftRotation | undefined = shiftRotations.find((s) => {
    if (currentRole === 'nurse') {
      return s.employeeId === 'EMP-NUR-005' || s.department.includes('ICU') || s.employeeName.toLowerCase().includes('nurse');
    }
    if (currentRole === 'store') {
      return s.employeeId === 'EMP-STR-008' || s.department.includes('Store') || s.department.includes('Inventory');
    }
    if (currentRole === 'doctor') {
      return s.employeeId.startsWith('DOC') || s.department.includes('OPD') || s.department.includes('Medical') || s.employeeName.toLowerCase().includes('dr');
    }
    if (currentRole === 'lab') {
      return s.employeeId.includes('LAB') || s.department.includes('Lab') || s.department.includes('Pathology');
    }
    if (currentRole === 'pharmacy') {
      return s.employeeId.includes('PHAR') || s.department.includes('Pharmacy');
    }
    // Reception
    return s.employeeId === 'EMP-REC-003' || s.department.includes('Front Desk') || s.department.includes('Reception');
  });

  // Department Roster: all staff shifts relevant to this module
  const departmentShifts = shiftRotations.filter((s) => {
    if (currentRole === 'nurse') {
      return s.department.includes('ICU') || s.department.includes('Emergency') || (s.employeeName || '').toLowerCase().includes('nurse');
    }
    if (currentRole === 'store') {
      return s.department.includes('Store') || s.department.includes('Inventory') || (s.employeeId || '').includes('EMP-USR-101') || (s.employeeName || '').toLowerCase().includes('stock') || (s.employeeName || '').toLowerCase().includes('store');
    }
    if (currentRole === 'doctor') {
      return s.department.includes('OPD') || s.department.includes('Medical') || s.department.includes('Doctor') || (s.employeeName || '').toLowerCase().includes('dr') || (s.employeeId || '').startsWith('DOC');
    }
    if (currentRole === 'lab') {
      return s.department.includes('Lab') || s.department.includes('Pathology') || (s.employeeId || '').includes('LAB');
    }
    if (currentRole === 'pharmacy') {
      return s.department.includes('Pharmacy') || (s.employeeId || '').includes('PHAR');
    }
    return s.department.includes('Front Desk') || s.department.includes('Reception');
  });

  const displayShifts = departmentShifts.length > 0 ? departmentShifts : shiftRotations;

  const getShiftIcon = (shiftType: string) => {
    switch (shiftType) {
      case 'Morning':
        return <Sun className="w-6 h-6 text-amber-500" />;
      case 'Evening':
        return <Sunset className="w-6 h-6 text-blue-500" />;
      case 'Night':
        return <Moon className="w-6 h-6 text-indigo-500" />;
      default:
        return <Clock className="w-6 h-6 text-slate-500" />;
    }
  };

  const getShiftBadgeStyle = (shiftType: string) => {
    switch (shiftType) {
      case 'Morning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Evening':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Night':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const activeTimings = myShift
    ? myShift.assignedShift === 'Morning'
      ? myShift.morningShift
      : myShift.assignedShift === 'Evening'
      ? myShift.eveningShift
      : myShift.nightShift
    : '08:00 AM - 04:00 PM';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span className="capitalize">{currentRole} Portal</span>
            <span>/</span>
            <span className="text-indigo-600 font-bold">Duty Shift Roster</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Assigned Shift & Roster Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time shift assignment allocated by Super Admin Control Center.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Synced with Super Admin</span>
        </div>
      </div>

      {/* Featured Active Shift Card */}
      {myShift ? (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Active Shift Assignment
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Effective Date: {myShift.effectiveDate}
                </span>
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  {myShift.assignedShift} Shift
                  {getShiftIcon(myShift.assignedShift)}
                </h2>
                <p className="text-indigo-200 text-sm font-mono mt-1 font-bold">
                  Working Hours: {activeTimings}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-2 font-medium">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{myShift.employeeName} ({myShift.employeeId})</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dept: {myShift.department}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Branch: {myShift.branch}</span>
                </div>
              </div>
            </div>

            {/* Shift Rotations Overview Grid */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 w-full md:w-80 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block border-b border-white/10 pb-2">
                Shift Slot Timings
              </span>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center justify-between p-2 rounded-xl ${myShift.assignedShift === 'Morning' ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-400/30' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> Morning</span>
                  <span className="font-mono text-[11px]">{myShift.morningShift}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-xl ${myShift.assignedShift === 'Evening' ? 'bg-blue-500/20 text-blue-200 font-bold border border-blue-400/30' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Sunset className="w-3.5 h-3.5" /> Evening</span>
                  <span className="font-mono text-[11px]">{myShift.eveningShift}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-xl ${myShift.assignedShift === 'Night' ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-400/30' : 'text-slate-300'}`}>
                  <span className="flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> Night</span>
                  <span className="font-mono text-[11px]">{myShift.nightShift}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-800">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm">No Active Shift Roster Found</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Super Admin has not assigned a specific shift rotation yet. Default duty hours apply.
            </p>
          </div>
        </div>
      )}

      {/* Department Team Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Department Shift Roster</h3>
            <p className="text-xs text-slate-500">Live shift schedule for staff members in your department</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
            {displayShifts.length} Staff Schedules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Staff Name</th>
                <th className="py-3.5 px-4">Emp ID</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Current Shift</th>
                <th className="py-3.5 px-4">Shift Timings</th>
                <th className="py-3.5 px-4">Effective Date</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayShifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{s.employeeName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{s.employeeId}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{s.department}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getShiftBadgeStyle(
                        s.assignedShift
                      )}`}
                    >
                      {s.assignedShift} Shift
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px]">
                    {s.assignedShift === 'Morning'
                      ? s.morningShift
                      : s.assignedShift === 'Evening'
                      ? s.eveningShift
                      : s.nightShift}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{s.effectiveDate}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
