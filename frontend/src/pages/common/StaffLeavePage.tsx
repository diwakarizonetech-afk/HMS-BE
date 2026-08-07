import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  FileText,
  User,
} from 'lucide-react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { useHMS } from '../../context/HMSContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';

interface StaffLeavePageProps {
  portalRole: string;
  defaultEmpId: string;
  defaultName: string;
  defaultDept: string;
}

export const StaffLeavePage: React.FC<StaffLeavePageProps> = ({
  portalRole,
  defaultEmpId,
  defaultName,
  defaultDept,
}) => {
  const { leaveRequests, addLeaveRequest, deleteLeaveRequest } = useSuperAdmin();
  const { addToast } = useHMS();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const empName = user?.name || defaultName;
  const empId = defaultEmpId;
  const dept = user?.department || defaultDept;

  const initialForm = {
    employeeId: empId,
    employeeName: empName,
    role: portalRole,
    department: dept,
    leaveType: 'Casual Leave' as const,
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    totalDays: 2,
    reason: '',
    approvalStatus: 'Pending' as const,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      addToast('error', 'Validation Error', 'Please enter a reason for your leave request.');
      return;
    }

    addLeaveRequest(formData);
    setIsModalOpen(false);
    addToast('success', 'Leave Request Submitted', 'Your request has been sent to Super Admin for approval.');
  };

  // Filter leave requests relevant to this portal role/user
  const myLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      const matchesSearch =
        l.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || l.approvalStatus === selectedStatus;

      // Match either role or employee name
      const matchesRole =
        l.role.toLowerCase() === portalRole.toLowerCase() ||
        l.employeeName.toLowerCase().includes(empName.toLowerCase());

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [leaveRequests, searchQuery, selectedStatus, portalRole, empName]);

  // Statistics
  const totalApplied = myLeaves.length;
  const approvedCount = myLeaves.filter((l) => l.approvalStatus === 'Approved').length;
  const pendingCount = myLeaves.filter((l) => l.approvalStatus === 'Pending').length;
  const rejectedCount = myLeaves.filter((l) => l.approvalStatus === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>{portalRole} Portal</span>
            <span>/</span>
            <span className="text-indigo-600">Leave Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Leave Applications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Apply for leave, track approval status from Super Admin & view your leave history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply New Leave</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Applied</span>
          <p className="text-2xl font-black text-slate-900">{totalApplied}</p>
          <span className="text-[10px] font-semibold text-slate-500">Leave Requests</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved</span>
          <p className="text-2xl font-black text-emerald-600">{approvedCount}</p>
          <span className="text-[10px] font-semibold text-emerald-600">By Super Admin</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</span>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <span className="text-[10px] font-semibold text-amber-600">Awaiting Decision</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
          <p className="text-2xl font-black text-rose-600">{rejectedCount}</p>
          <span className="text-[10px] font-semibold text-rose-600">Declined</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leave type or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leave History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Total Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Super Admin Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {myLeaves.length > 0 ? (
                myLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{l.employeeName}</p>
                        <p className="text-[10px] font-mono text-indigo-600 font-bold">{l.employeeId}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{l.leaveType}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px]">
                      {l.fromDate} to {l.toDate}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{l.totalDays} Days</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{l.reason}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                          l.approvalStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : l.approvalStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {l.approvalStatus === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {l.approvalStatus === 'Pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                        {l.approvalStatus === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                        <span>{l.approvalStatus}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No leave requests found. Click "Apply New Leave" to submit a request to Super Admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply For Staff Leave"
        subtitle="Submit leave request for Super Admin authorization"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Employee Name</label>
              <input
                type="text"
                disabled
                value={formData.employeeName}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Employee ID</label>
              <input
                type="text"
                disabled
                value={formData.employeeId}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Leave Category</label>
              <select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Paid Leave">Paid Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Duty Leave">Duty Leave</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.totalDays}
                onChange={(e) => setFormData({ ...formData, totalDays: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                required
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                required
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Reason for Leave <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Specify cause for leave application..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
