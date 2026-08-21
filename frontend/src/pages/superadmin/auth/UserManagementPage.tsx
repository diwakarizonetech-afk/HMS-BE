import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { HMSUser, RoleItem } from '../../../types/superAdmin';

const DEFAULT_SYSTEM_ROLES: RoleItem[] = [
  { id: 'role-doctor', roleName: 'Doctor', roleCode: 'DOCTOR', isSystemDefault: true, description: 'Medical Doctor / Clinical Consultant', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-nurse', roleName: 'Nurse', roleCode: 'NURSE', isSystemDefault: true, description: 'Nursing Staff / In-Patient Care', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-reception', roleName: 'Reception', roleCode: 'RECEPTION', isSystemDefault: true, description: 'Front Desk / Patient Registration', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-store', roleName: 'Store', roleCode: 'STORE', isSystemDefault: true, description: 'Inventory / Purchase Orders', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-lab', roleName: 'Lab', roleCode: 'LAB', isSystemDefault: true, description: 'Pathology & Diagnostic Labs', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-pharmacy', roleName: 'Pharmacy', roleCode: 'PHARMACY', isSystemDefault: true, description: 'Pharmacy Dispensing & Medicine Stock', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-cashier', roleName: 'Billing Management', roleCode: 'BILLING', isSystemDefault: true, description: 'Hospital Financial Transactions & Billing Management', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
  { id: 'role-superadmin', roleName: 'Super Admin', roleCode: 'SUPER_ADMIN', isSystemDefault: true, description: 'System Administrator / Global Privileges', assignedUserCount: 0, permissionsCount: 0, status: 'Active' },
];

export const UserManagementPage: React.FC = () => {
  const { users, roles, addUser, updateUser, deleteUser, toggleUserStatus, resetUserPassword, departments, branches } = useSuperAdmin();
  const { addToast } = useHMS();

  const allAvailableRoles = useMemo(() => {
    const customRoles = roles.filter(
      (r) => !DEFAULT_SYSTEM_ROLES.some((d) => d.roleName.toLowerCase() === r.roleName.toLowerCase())
    );
    return [...DEFAULT_SYSTEM_ROLES, ...customRoles];
  }, [roles]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<HMSUser | null>(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      billing: 'BIL',
      'billing management': 'BIL',
      billing_manager: 'BIL',
      finance: 'BIL',
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

  // Form State
  const initialFormState = {
    employeeId: getNextEmployeeId('doctor'),
    fullName: '',
    email: '',
    phone: '',
    role: 'doctor',
    department: 'Cardiology',
    assignedWard: 'ICU',
    branch: 'AegisCare Main Campus (BKC)',
    status: 'Active' as 'Active' | 'Inactive',
    password: '',
    confirmPassword: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormData({
      ...initialFormState,
      role: 'doctor',
      employeeId: getNextEmployeeId('doctor'),
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: HMSUser) => {
    setSelectedUser(user);
    setFormData({
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      assignedWard: user.assignedWard || 'ICU',
      branch: user.branch,
      status: user.status,
      password: '',
      confirmPassword: '',
    });
    setIsModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (user: HMSUser) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (user: HMSUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Open Reset Pass Modal
  const handleOpenResetPass = (user: HMSUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsResetPassModalOpen(true);
  };

  // Submit Save/Update
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim()) {
      addToast('error', 'Validation Error', 'Full Name and Email are required.');
      return;
    }

    if (formData.phone && formData.phone.replace(/\D/g, '').length !== 10) {
      addToast('error', 'Validation Error', 'Mobile number must be exactly 10 digits.');
      return;
    }

    if (!selectedUser) {
      if (formData.password && formData.password !== formData.confirmPassword) {
        addToast('error', 'Validation Error', 'Password and Confirm Password do not match.');
        return;
      }
    }

    const isDoctor = formData.role.toLowerCase() === 'doctor';
    const isLab = formData.role.toLowerCase() === 'lab';
    const isNurse = formData.role.toLowerCase() === 'nurse';
    // Lab passes through its free-text section value (or empty = unscoped);
    // doctor keeps the fixed department dropdown; everyone else stays 'N/A'.
    const finalDepartment = isDoctor ? formData.department : isLab ? (formData.department || '') : 'N/A';
    // undefined (not 'N/A') for non-nurses, matching HMSUser.assignedWard
    // being optional/undefined = "not applicable / don't scope".
    const finalAssignedWard = isNurse ? formData.assignedWard : undefined;

    if (selectedUser) {
      updateUser(selectedUser.id, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: finalDepartment,
        assignedWard: finalAssignedWard,
        branch: formData.branch,
        status: formData.status,
      });
    } else {
      addUser({
        employeeId: formData.employeeId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: finalDepartment,
        assignedWard: finalAssignedWard,
        branch: formData.branch,
        status: formData.status,
        password: formData.password || '1234',
      });
    }

    setIsModalOpen(false);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    }
  };

  // Confirm Reset Password
  const handleConfirmResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      addToast('error', 'Validation Error', 'Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'Validation Error', 'New passwords do not match.');
      return;
    }
    if (selectedUser) {
      resetUserPassword(selectedUser.id, newPassword);
      setIsResetPassModalOpen(false);
      setSelectedUser(null);
    }
  };

  const normalizeRole = (r: string) => {
    const clean = r.toLowerCase().trim().replace(/[\s_-]+/g, '');
    if (clean === 'receptionist' || clean === 'reception' || clean === 'cashier') return 'reception';
    if (clean === 'labtechnician' || clean === 'lab') return 'lab';
    if (clean === 'pharmacist' || clean === 'pharmacy') return 'pharmacy';
    if (clean === 'billingmanagement' || clean === 'billing' || clean === 'billingmanager' || clean === 'finance') return 'billing';
    if (clean === 'storemanager' || clean === 'store') return 'store';
    if (clean === 'superadmin' || clean === 'admin') return 'super_admin';
    return clean;
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery);

      const userRoleNorm = normalizeRole(u.role);
      const selectedRoleNorm = selectedRole === 'All' ? 'All' : normalizeRole(selectedRole);

      const matchesRole = selectedRole === 'All' || userRoleNorm === selectedRoleNorm;
      const matchesDept = selectedDept === 'All' || u.department === selectedDept;
      const matchesBranch = selectedBranch === 'All' || u.branch === selectedBranch;
      const matchesStatus = selectedStatus === 'All' || u.status === selectedStatus;

      return matchesSearch && matchesRole && matchesDept && matchesBranch && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedDept, selectedBranch, selectedStatus]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleExportCSV = () => {
    addToast('success', 'Exporting Data', 'Downloading HMS User Roster as CSV...');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Auth & User Management</span>
            <span>/</span>
            <span className="text-indigo-600">User Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            HMS User Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage all hospital personnel, provision role credentials, department assignments & access status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Roster</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Employee ID, Email, Phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="All">All Roles</option>
              {allAvailableRoles.map((r) => (
                <option key={r.id} value={r.roleName}>
                  {r.roleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="All">All Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                <th className="py-3.5 px-4">User ID & Name</th>
                <th className="py-3.5 px-4">Emp ID</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department & Branch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                          {user.fullName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.fullName}</p>
                          <p className="text-[10px] text-indigo-600 font-mono font-semibold">{user.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {user.employeeId}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{user.email}</p>
                      <p className="text-[10px] text-slate-500">{user.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 capitalize">
                        {user.role ? user.role.replace(/_/g, ' ') : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{user.department}</p>
                      <p className="text-[10px] text-slate-500">{user.branch}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${user.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                        title="Click to Toggle Status"
                      >
                        {user.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenView(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPass(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No users found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedUsers.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredUsers.length}</span> users
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

      {/* CRUD Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? `Edit User (${selectedUser.employeeId})` : 'Create HMS User Account'}
        subtitle="Specify employee credentials, department mapping & role permissions"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Employee ID</label>
                {!selectedUser && (
                  <button
                    type="button"
                    onClick={() => {
                      const match = formData.employeeId.match(/^(.*?)(\d+)$/);
                      if (match) {
                        const prefix = match[1];
                        const num = parseInt(match[2], 10) + 1;
                        setFormData({ ...formData, employeeId: `${prefix}${num}` });
                      } else {
                        setFormData({ ...formData, employeeId: getNextEmployeeId(formData.role) });
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    + Increment ID
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={!!selectedUser}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. rsharma@hms.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number (10 digits)</label>
              <input
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const selectedRole = e.target.value;
                  const isDoctor = selectedRole.toLowerCase() === 'doctor';
                  const isLab = selectedRole.toLowerCase() === 'lab';
                  setFormData({
                    ...formData,
                    role: selectedRole,
                    employeeId: selectedUser ? formData.employeeId : getNextEmployeeId(selectedRole),
                    department: isDoctor
                      ? (formData.department === 'N/A' || !formData.department ? (departments[0]?.departmentName || 'Cardiology') : formData.department)
                      : isLab
                        ? (formData.department === 'N/A' ? '' : formData.department)
                        : 'N/A',
                    assignedWard: formData.assignedWard || 'ICU',
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none capitalize"
              >
                {allAvailableRoles.map((r) => (
                  <option key={r.id} value={r.roleName}>
                    {r.roleName} {r.isSystemDefault ? '(System Role)' : '(Custom Role)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Department {formData.role.toLowerCase() !== 'doctor' && formData.role.toLowerCase() !== 'lab' && <span className="text-[10px] font-normal text-slate-400 ml-1">(Doctor/Lab Only)</span>}
              </label>
              {formData.role.toLowerCase() === 'lab' ? (
                <>
                  <input
                    type="text"
                    value={formData.department === 'N/A' ? '' : formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Pathology, Microbiology, Biochemistry"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Must exactly match a department value used in Test Master (Lab Management) for
                    this tech to see only samples/reports for that section. Leave blank to see all sections.
                  </p>
                </>
              ) : (
                <select
                  disabled={formData.role.toLowerCase() !== 'doctor'}
                  value={formData.role.toLowerCase() === 'doctor' ? formData.department : 'N/A'}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 font-semibold outline-none transition-colors ${formData.role.toLowerCase() === 'doctor'
                      ? 'bg-slate-50 border-slate-200 text-slate-900 cursor-pointer'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  {formData.role.toLowerCase() === 'doctor' ? (
                    departments.map((d) => (
                      <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                    ))
                  ) : (
                    <option value="N/A">N/A (Doctor/Lab Only)</option>
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Assigned Ward {formData.role.toLowerCase() !== 'nurse' && <span className="text-[10px] font-normal text-slate-400 ml-1">(Nurse Only)</span>}
              </label>
              <select
                disabled={formData.role.toLowerCase() !== 'nurse'}
                value={formData.role.toLowerCase() === 'nurse' ? formData.assignedWard : 'N/A'}
                onChange={(e) => setFormData({ ...formData, assignedWard: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2 font-semibold outline-none transition-colors ${formData.role.toLowerCase() === 'nurse'
                    ? 'bg-slate-50 border-slate-200 text-slate-900 cursor-pointer'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {formData.role.toLowerCase() === 'nurse' ? (
                  ['ICU', 'General Ward', 'Deluxe Suite', 'Semi-Private'].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))
                ) : (
                  <option value="N/A">N/A (Nurse Only)</option>
                )}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Scopes this nurse's IPD notes/medications/transfers to patients in this ward. Leave unset to see all wards.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch</label>
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

            {!selectedUser && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </>
            )}
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {selectedUser ? 'Update User' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View User Profile Modal */}
      {selectedUser && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`User Profile: ${selectedUser.fullName}`}
          subtitle={`Employee ID: ${selectedUser.employeeId} • System User ID: ${selectedUser.userId}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 font-medium">Email:</span>
                <p className="font-bold text-slate-900">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Phone:</span>
                <p className="font-bold text-slate-900">{selectedUser.phone}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Role:</span>
                <p className="font-bold text-indigo-600 capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <p className={`font-bold ${selectedUser.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedUser.status}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Department:</span>
                <p className="font-bold text-slate-900">{selectedUser.department}</p>
              </div>
              {selectedUser.role.toLowerCase() === 'nurse' && (
                <div>
                  <span className="text-slate-500 font-medium">Assigned Ward:</span>
                  <p className="font-bold text-slate-900">{selectedUser.assignedWard || 'Not assigned (unscoped)'}</p>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-medium">Branch:</span>
                <p className="font-bold text-slate-900">{selectedUser.branch}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Registration Date:</span>
                <p className="font-mono text-slate-800">{selectedUser.createdAt}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Last Login:</span>
                <p className="font-mono text-slate-800">{selectedUser.lastLogin || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {selectedUser && (
        <Modal
          isOpen={isResetPassModalOpen}
          onClose={() => setIsResetPassModalOpen(false)}
          title={`Reset Password for ${selectedUser.fullName}`}
          subtitle={`Employee ID: ${selectedUser.employeeId}`}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmResetPass} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetPassModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md cursor-pointer"
              >
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedUser && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm User Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete user account <span className="font-bold text-slate-900">{selectedUser.fullName}</span> ({selectedUser.employeeId})? This action cannot be undone.
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
                Yes, Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
