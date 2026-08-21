import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Building,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { DepartmentAssignment } from '../../../types/superAdmin';

export const DepartmentAssignmentPage: React.FC = () => {
  const { departmentAssignments, assignUserDepartment, updateDepartmentAssignment, deleteDepartmentAssignment, departments, branches, users } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DepartmentAssignment | null>(null);

  const initialForm = {
    employeeId: users[0]?.employeeId || 'EMP-DOC-004',
    employeeName: users[0]?.fullName || 'Dr. Vikram Malhotra',
    role: 'Doctor',
    department: 'Cardiology',
    branch: 'AegisCare Main Campus (BKC)',
    designation: 'Head of Department',
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenAssign = () => {
    setSelectedAssignment(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assignment: DepartmentAssignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      employeeId: assignment.employeeId,
      employeeName: assignment.employeeName,
      role: assignment.role,
      department: assignment.department,
      branch: assignment.branch,
      designation: assignment.designation,
      effectiveDate: assignment.effectiveDate,
      status: assignment.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (assignment: DepartmentAssignment) => {
    setSelectedAssignment(assignment);
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
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssignment) {
      updateDepartmentAssignment(selectedAssignment.id, formData);
    } else {
      assignUserDepartment(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedAssignment) {
      deleteDepartmentAssignment(selectedAssignment.id);
      setIsDeleteModalOpen(false);
      setSelectedAssignment(null);
    }
  };

  const filteredAssignments = useMemo(() => {
    return departmentAssignments.filter((da) => {
      const matchesSearch =
        da.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        da.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        da.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'All' || da.department === selectedDept;
      const matchesBranch = selectedBranch === 'All' || da.branch === selectedBranch;

      return matchesSearch && matchesDept && matchesBranch;
    });
  }, [departmentAssignments, searchQuery, selectedDept, selectedBranch]);

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Auth & User Management</span>
            <span>/</span>
            <span className="text-indigo-600">Department Assignment</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Department & Branch Assignment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign staff members to specific hospital branches, clinical departments, and organizational designations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAssign}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Staff Member</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, ID or designation..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.branchName}>{b.branchName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee ID & Name</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Assigned Department</th>
                <th className="py-3.5 px-4">Hospital Branch</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Effective Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedAssignments.length > 0 ? (
                paginatedAssignments.map((da) => (
                  <tr key={da.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{da.employeeName}</p>
                        <p className="text-[10px] font-mono text-indigo-600 font-bold">{da.employeeId}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{da.role}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{da.department}</td>
                    <td className="py-3.5 px-4 text-slate-600">{da.branch}</td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">{da.designation}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{da.effectiveDate}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${da.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {da.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(da)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Mapping"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(da)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No department assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedAssignments.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredAssignments.length}</span> mappings
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAssignment ? `Edit Department Assignment` : 'Assign Staff Member to Department'}
        subtitle="Map employee to clinical department and branch"
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
              <label className="block font-bold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Senior ICU Specialist"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hospital Branch</label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.branchName}>{b.branchName}</option>
                ))}
              </select>
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
              {selectedAssignment ? 'Update Assignment' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Assignment Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to remove department mapping for <span className="font-bold text-slate-900">{selectedAssignment.employeeName}</span> ({selectedAssignment.department})?
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
                Yes, Delete Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
