import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarOff, Plus, Calendar, Clock, CheckCircle2,
  AlertCircle, FileText, Upload, X, Filter, Inbox, Pill,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchLeavesApi, createLeaveApi } from '../../services/api';

// ─── Interfaces ────────────────────────────────────────────────
type LeaveType = 'Casual Leave' | 'Medical Leave' | 'Emergency Leave' | 'Annual Leave';

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  supportingDocument?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  remarks?: string;
}

interface LeaveStatistics {
  totalCasual: number;
  usedCasual: number;
  totalMedical: number;
  usedMedical: number;
  totalEmergency: number;
  usedEmergency: number;
  totalAnnual: number;
  usedAnnual: number;
}

// ─── Constants & Mock Data ─────────────────────────────────────
const LEAVE_TYPES: LeaveType[] = [
  'Casual Leave',
  'Medical Leave',
  'Emergency Leave',
  'Annual Leave',
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Rejected: { bg: 'bg-rose-100', text: 'text-rose-800' },
};

const DUMMY_PHARMACY_LEAVE_REQUESTS: LeaveRequest[] = [];

const DUMMY_PHARMACY_LEAVE_STATS: LeaveStatistics = {
  totalCasual: 12,
  usedCasual: 0,
  totalMedical: 10,
  usedMedical: 0,
  totalEmergency: 5,
  usedEmergency: 0,
  totalAnnual: 15,
  usedAnnual: 0,
};

// ─── Inline Sub-Components ─────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color = STATUS_COLORS[status] || { bg: 'bg-slate-200', text: 'text-slate-700' };
  return (
    <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-full ${color.bg} ${color.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

const FilterDropdown: React.FC<{ label: string; value: string; options: string[]; onChange: (val: string) => void }> = ({ value, options, onChange }) => (
  <div className="flex items-center gap-2">
    <Filter className="w-3.5 h-3.5 text-slate-400" />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const EmptyState: React.FC<{ title?: string; message?: string }> = ({
  title = 'No Data Found',
  message = 'There are no records to display at this time.',
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Inbox className="w-8 h-8 text-slate-300" />
    </div>
    <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────
export const PharmacyLeavePage: React.FC = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(DUMMY_PHARMACY_LEAVE_REQUESTS);
  const [statistics] = useState<LeaveStatistics>(DUMMY_PHARMACY_LEAVE_STATS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentName, setDocumentName] = useState('');

  useEffect(() => {
    const loadLeaves = async () => {
      try {
        const rows = await fetchLeavesApi();
        const mine = (Array.isArray(rows) ? rows : []).filter(
          (r: any) =>
            r.employee_id === user?.id ||
            r.employee_name === user?.name ||
            r.employee_id === user?.username ||
            (r.role && r.role.toLowerCase().includes('pharm')) ||
            (user?.name && r.employee_name?.toLowerCase().includes(user.name.toLowerCase()))
        );
        const mapped: LeaveRequest[] = mine.map((r: any) => ({
          id: r.id,
          staffId: r.employee_id,
          staffName: r.employee_name,
          role: r.role || 'Pharmacist',
          leaveType: r.leave_type,
          startDate: r.start_date,
          endDate: r.end_date,
          totalDays: r.total_days,
          reason: r.reason,
          status: r.approval_status,
          appliedDate: r.applied_date,
        }));
        setLeaveRequests(mapped);
      } catch (e) {
        console.warn('PharmacyLeavePage: could not fetch leave requests:', e);
      } finally {
        setLoading(false);
      }
    };
    loadLeaves();
  }, [user?.id, user?.name]);

  const filteredRequests =
    filterStatus === 'All'
      ? leaveRequests
      : leaveRequests.filter((r) => r.status === filterStatus);

  const calculateDays = useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, []);

  const handleSubmit = () => {
    if (!startDate || !endDate || !reason.trim()) return;
    setSubmitting(true);
    (async () => {
      const totalDays = calculateDays(startDate, endDate);
      try {
        const created = await createLeaveApi({
          employeeId: user?.id || 'unknown',
          employeeName: user?.name || 'Pharmacist',
          role: 'Pharmacist',
          department: (user as any)?.department || 'Pharmacy',
          leaveType,
          fromDate: startDate,
          toDate: endDate,
          totalDays,
          reason,
          approvalStatus: 'Pending',
          appliedDate: new Date().toISOString().split('T')[0],
        });
        const newRequest: LeaveRequest = {
          id: created.id,
          staffId: created.employee_id,
          staffName: created.employee_name,
          role: created.role || 'Pharmacist',
          leaveType: created.leave_type,
          startDate: created.start_date,
          endDate: created.end_date,
          totalDays: created.total_days,
          reason: created.reason,
          supportingDocument: documentName || undefined,
          status: created.approval_status,
          appliedDate: created.applied_date,
        };
        setLeaveRequests((prev) => [newRequest, ...prev]);
        setLeaveType('Casual Leave');
        setStartDate('');
        setEndDate('');
        setReason('');
        setDocumentName('');
        setShowForm(false);
      } catch (e) {
        console.error('Failed to submit leave request:', e);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const totalDays = calculateDays(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pharmacy Staff Leave Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Apply for pharmacy staff leave and track your HOD approval status.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Apply Leave'}
        </button>
      </div>

      {/* ─── Leave Statistics Cards ─────────────────────── */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Casual Leave</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-slate-900">{statistics.usedCasual}</h2>
              <span className="text-xs text-slate-400">/ {statistics.totalCasual}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(statistics.usedCasual / statistics.totalCasual) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{statistics.totalCasual - statistics.usedCasual} remaining</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Leave</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-slate-900">{statistics.usedMedical}</h2>
              <span className="text-xs text-slate-400">/ {statistics.totalMedical}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-rose-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(statistics.usedMedical / statistics.totalMedical) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{statistics.totalMedical - statistics.usedMedical} remaining</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency Leave</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-slate-900">{statistics.usedEmergency}</h2>
              <span className="text-xs text-slate-400">/ {statistics.totalEmergency}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(statistics.usedEmergency / statistics.totalEmergency) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{statistics.totalEmergency - statistics.usedEmergency} remaining</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual Leave</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarOff className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-slate-900">{statistics.usedAnnual}</h2>
              <span className="text-xs text-slate-400">/ {statistics.totalAnnual}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(statistics.usedAnnual / statistics.totalAnnual) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{statistics.totalAnnual - statistics.usedAnnual} remaining</p>
          </div>
        </div>
      )}

      {/* ─── Apply Leave Form ──────────────────────────── */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Apply for Pharmacy Leave</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex-1">
                <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Reason *</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide reason for your pharmacy leave request..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Upload Supporting Document</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors border border-slate-200">
                  <Upload className="w-3.5 h-3.5" /> Choose File
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setDocumentName(e.target.files?.[0]?.name || '')}
                  />
                </label>
                {documentName && (
                  <span className="text-[11px] text-slate-600 font-medium">{documentName}</span>
                )}
              </div>
            </div>

            <div className="flex items-end">
              {totalDays > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">
                    Total: {totalDays} Day{totalDays > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !startDate || !endDate || !reason.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Leave History Table ───────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pharmacy Leave History</h3>
            <p className="text-xs text-slate-500">Your past and pending pharmacy leave applications</p>
          </div>
          <FilterDropdown
            label="Status"
            value={filterStatus}
            options={['All', 'Pending', 'Approved', 'Rejected']}
            onChange={setFilterStatus}
          />
        </div>

        {filteredRequests.length === 0 ? (
          <EmptyState title="No Leave Records" message="No leave requests match the current filter." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{leave.startDate}</td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{leave.endDate}</td>
                    <td className="p-3 font-black text-slate-900 text-center">{leave.totalDays}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate">{leave.reason}</td>
                    <td className="p-3"><StatusBadge status={leave.status} /></td>
                    <td className="p-3">
                      {leave.approvedBy ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                          ✓ {leave.approvedBy}
                        </span>
                      ) : leave.remarks ? (
                        <span className="text-[10px] font-semibold text-rose-700" title={leave.remarks}>
                          See remarks
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending review</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{leave.appliedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
