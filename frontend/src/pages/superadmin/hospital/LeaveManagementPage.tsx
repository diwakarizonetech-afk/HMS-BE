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
  Eye,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { LeaveRequest } from '../../../types/superAdmin';

export const LeaveManagementPage: React.FC = () => {
  const { leaveRequests, addLeaveRequest, updateLeaveStatus, deleteLeaveRequest, users } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const initialForm = {
    employeeId: users[0]?.employeeId || 'EMP-DOC-004',
    employeeName: users[0]?.fullName || 'Dr. Vikram Malhotra',
    role: 'Doctor',
    department: 'Cardiology',
    leaveType: 'Casual Leave' as const,
    fromDate: '2026-08-01',
    toDate: '2026-08-03',
    totalDays: 3,
    reason: 'Attending medical conference.',
    approvalStatus: 'Pending' as const,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setSelectedLeave(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsDeleteModalOpen(true);
  };

  const handleEmployeeSelect = (empId: string) => {
    const matched = users.find((u) => u.employeeId === empId);
    if (matched) {
      setFormData({
        ...formData,
        employeeId: matched.employeeId,
        employeeName: matched.fullName,
        role: matched.role,
        department: matched.department,
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addLeaveRequest(formData);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedLeave) {
      deleteLeaveRequest(selectedLeave.id);
      setIsDeleteModalOpen(false);
      setSelectedLeave(null);
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      const matchesSearch =
        l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.leaveType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || l.approvalStatus === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [leaveRequests, searchQuery, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Leave Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Leave Approvals & Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review hospital staff leave requests, sick leave logs, duty leave & approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave Request</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, ID or leave type..."
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee ID & Name</th>
                <th className="py-3.5 px-4">Role & Dept</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-slate-900">{l.employeeName}</p>
                      <p className="text-[10px] font-mono font-bold text-indigo-600">{l.employeeId}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{l.role}</p>
                    <p className="text-[10px] text-slate-500">{l.department}</p>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-indigo-600">{l.leaveType}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-mono text-slate-700 text-[11px]">
                      {l.fromDate} to {l.toDate}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">{l.totalDays} Days</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{l.reason}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${l.approvalStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : l.approvalStatus === 'Pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                      >
                        {l.approvalStatus}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.approvalStatus !== 'Approved' && (
                        <button
                          onClick={() => updateLeaveStatus(l.id, 'Approved')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Approve Leave"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {l.approvalStatus !== 'Rejected' && (
                        <button
                          onClick={() => updateLeaveStatus(l.id, 'Rejected')}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Reject Leave"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenDelete(l)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply Staff Leave Request"
        subtitle="Log employee leave application & duration"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Employee</label>
              <select
                value={formData.employeeId}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.employeeId}>
                    {u.fullName} ({u.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
              <select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Paid Leave">Paid Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Duty Leave">Duty Leave</option>
              </select>
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
              <label className="block font-bold text-slate-700 mb-1">Reason for Leave</label>
              <textarea
                rows={2}
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="State cause for leave application..."
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
              Submit Leave Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedLeave && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Delete leave request for <span className="font-bold text-slate-900">{selectedLeave.employeeName}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
