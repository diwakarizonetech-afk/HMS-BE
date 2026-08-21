import React from 'react';
import { Clock, Sun, Sunset, Moon, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { useAuth } from '../../context/AuthContext';

interface StaffShiftWidgetProps {
  portalRole: 'reception' | 'nurse' | 'store';
  rosterRoute: string;
}

export const StaffShiftWidget: React.FC<StaffShiftWidgetProps> = ({ portalRole, rosterRoute }) => {
  const navigate = useNavigate();
  const { shiftRotations } = useSuperAdmin();
  const { user } = useAuth();

  // Find assigned shift for current user specifically
  const shift = shiftRotations.find((s) => {
    if (user) {
      const uName = (user.name || '').toLowerCase().replace(/^dr\.\s*/i, '').trim();
      const uId = (user.id || '').toLowerCase().trim();
      const sEmpId = (s.employeeId || '').toLowerCase().trim();
      const sName = (s.employeeName || '').toLowerCase().replace(/^dr\.\s*/i, '').trim();

      if (uId && sEmpId === uId) return true;
      if (uName && sName && (sName === uName || sName.includes(uName) || uName.includes(sName))) return true;
    }
    return false;
  });

  if (!shift) return null;

  const activeTimings =
    shift.assignedShift === 'Morning'
      ? shift.morningShift
      : shift.assignedShift === 'Evening'
      ? shift.eveningShift
      : shift.nightShift;

  const getShiftBadgeStyle = (shiftType: string) => {
    switch (shiftType) {
      case 'Morning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Evening':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Night':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border ${getShiftBadgeStyle(
            shift.assignedShift
          )}`}
        >
          {shift.assignedShift === 'Morning' ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : shift.assignedShift === 'Evening' ? (
            <Sunset className="w-5 h-5 text-blue-500" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-500" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Assigned Shift Roster
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Super Admin Allocated
            </span>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-slate-900">{shift.assignedShift} Shift</p>
            <span className="text-slate-300">•</span>
            <p className="text-xs font-mono font-bold text-indigo-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {activeTimings}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(rosterRoute)}
        className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <span>View Full Roster Schedule</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
      </button>
    </div>
  );
};
