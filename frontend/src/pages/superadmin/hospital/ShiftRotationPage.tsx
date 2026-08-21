import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { ShiftRotation } from '../../../types/superAdmin';

export const ShiftRotationPage: React.FC = () => {
  const { shiftRotations, addShiftRotation, updateShiftRotation, deleteShiftRotation, users, departments, branches } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShiftFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRotation, setSelectedRotation] = useState<ShiftRotation | null>(null);

  // Modal Form Filtering States
  const [modalRoleFilter, setModalRoleFilter] = useState('All');
  const [modalEmpSearch, setModalEmpSearch] = useState('');

  const initialForm = {
    employeeId: users[0]?.employeeId || 'EMP-NUR-005',
    employeeName: users[0]?.fullName || 'Nurse Anjali Rao',
    department: 'ICU & Critical Care',
    branch: 'AegisCare Main Campus (BKC)',
    morningShift: '07:00 AM - 03:00 PM',
    eveningShift: '03:00 PM - 11:00 PM',
    nightShift: '11:00 PM - 07:00 AM',
    assignedShift: 'Morning' as 'Morning' | 'Evening' | 'Night',
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  // Filtered employees for the Modal selector
  const filteredFormUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        modalRoleFilter === 'All' || u.role.toLowerCase() === modalRoleFilter.toLowerCase();

      const matchesSearch =
        u.fullName.toLowerCase().includes(modalEmpSearch.toLowerCase()) ||
        u.employeeId.toLowerCase().includes(modalEmpSearch.toLowerCase()) ||
        u.department.toLowerCase().includes(modalEmpSearch.toLowerCase());

      return matchesRole && matchesSearch;
    });
  }, [users, modalRoleFilter, modalEmpSearch]);

  const handleOpenCreate = () => {
    setSelectedRotation(null);
    setModalRoleFilter('All');
    setModalEmpSearch('');
    const firstMatch = users[0];
    if (firstMatch) {
      const empId = firstMatch.employeeId || firstMatch.id || firstMatch.username || 'EMP-001';
      const empName = firstMatch.fullName || firstMatch.name || firstMatch.username || 'Staff Member';
      const dept = firstMatch.department || 'General';
      const branchName = firstMatch.branch || '';
      setFormData({
        ...initialForm,
        employeeId: empId,
        employeeName: empName,
        department: dept,
        branch: branchName,
      });
    } else {
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: ShiftRotation) => {
    setSelectedRotation(shift);
    const existingUser = users.find((u) => u.employeeId === shift.employeeId);
    setModalRoleFilter(existingUser?.role || 'All');
    setModalEmpSearch('');
    setFormData({
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      department: shift.department,
      branch: shift.branch,
      morningShift: shift.morningShift,
      eveningShift: shift.eveningShift,
      nightShift: shift.nightShift,
      assignedShift: shift.assignedShift,
      effectiveDate: shift.effectiveDate,
      status: shift.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (shift: ShiftRotation) => {
    setSelectedRotation(shift);
    setIsDeleteModalOpen(true);
  };

  const handleEmployeeSelect = (empId: string) => {
    const matched = users.find((u) => u.employeeId === empId || u.id === empId || u.username === empId);
    if (matched) {
      const empName = matched.fullName || matched.name || matched.username || 'Staff User';
      const dept = matched.department || 'N/A';
      const branchName = matched.branch || '';
      setFormData((prev) => ({
        ...prev,
        employeeId: matched.employeeId || matched.id || empId,
        employeeName: empName,
        department: dept,
        branch: branchName,
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRotation) {
      updateShiftRotation(selectedRotation.id, formData);
    } else {
      addShiftRotation(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedRotation) {
      deleteShiftRotation(selectedRotation.id);
      setIsDeleteModalOpen(false);
      setSelectedRotation(null);
    }
  };

  const filteredRotations = useMemo(() => {
    return shiftRotations.filter((s) => {
      const matchesSearch =
        s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesShift = selectedShift === 'All' || s.assignedShift === selectedShift;

      return matchesSearch && matchesShift;
    });
  }, [shiftRotations, searchQuery, selectedShift]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Shift Rotation</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Shift Roster & Rotations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Morning, Evening & Night shift schedules for nursing and clinical staff.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Shift Roster</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, ID or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Shift:</span>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShiftFilter(e.target.value)}
            className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
          >
            <option value="All">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Emp ID</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Active Shift</th>
                <th className="py-3.5 px-4">Shift Timings</th>
                <th className="py-3.5 px-4">Effective Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRotations.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{s.employeeName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{s.employeeId}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{s.department}</td>
                  <td className="py-3.5 px-4 text-slate-600">{s.branch}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.assignedShift === 'Morning'
                          ? 'bg-amber-100 text-amber-700'
                          : s.assignedShift === 'Evening'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                    >
                      {s.assignedShift} Shift
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                    {s.assignedShift === 'Morning'
                      ? s.morningShift
                      : s.assignedShift === 'Evening'
                        ? s.eveningShift
                        : s.nightShift}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{s.effectiveDate}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Shift"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Shift"
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
        title={selectedRotation ? `Edit Shift Rotation` : 'Assign Shift Roster'}
        subtitle="Specify shift assignment & rotation timings"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Filter Staff by Role</label>
              <select
                value={modalRoleFilter}
                onChange={(e) => {
                  const role = e.target.value;
                  setModalRoleFilter(role);
                  // Auto-select first matching user if available
                  const firstMatch = users.find(
                    (u) => role === 'All' || u.role.toLowerCase() === role.toLowerCase()
                  );
                  if (firstMatch) {
                    handleEmployeeSelect(firstMatch.employeeId);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-indigo-600 outline-none cursor-pointer"
              >
                <option value="All">All Staff Roles</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="reception">Receptionist</option>
                <option value="store">Store Manager</option>
                <option value="lab">Lab Technician</option>
                <option value="pharmacy">Pharmacist</option>
                <option value="billing">Billing Staff</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Search Employee Name / ID</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type to search name or ID..."
                  value={modalEmpSearch}
                  onChange={(e) => setModalEmpSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Select Staff Member <span className="text-rose-500">*</span> ({filteredFormUsers.length} matching)
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {filteredFormUsers.length > 0 ? (
                  filteredFormUsers.map((u) => {
                    const optValue = u.employeeId || u.id || u.username;
                    const optName = u.fullName || u.name || u.username || 'Staff User';
                    const optRole = (u.role || 'Staff').toUpperCase();
                    const optDept = u.department || 'General';
                    return (
                      <option key={u.id} value={optValue}>
                        {optName} ({optValue}) — Role: [{optRole}] — Dept: {optDept}
                      </option>
                    );
                  })
                ) : (
                  <option value="" disabled>
                    No staff members match the role filter "{modalRoleFilter}" & search criteria.
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Shift Slot</label>
              <select
                value={formData.assignedShift}
                onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Morning Shift Window</label>
              <input
                type="text"
                value={formData.morningShift}
                onChange={(e) => setFormData({ ...formData, morningShift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Evening Shift Window</label>
              <input
                type="text"
                value={formData.eveningShift}
                onChange={(e) => setFormData({ ...formData, eveningShift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Night Shift Window</label>
              <input
                type="text"
                value={formData.nightShift}
                onChange={(e) => setFormData({ ...formData, nightShift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                required
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
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
              {selectedRotation ? 'Update Shift' : 'Save Shift Roster'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedRotation && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Delete shift rotation for <span className="font-bold text-slate-900">{selectedRotation.employeeName}</span>?
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
