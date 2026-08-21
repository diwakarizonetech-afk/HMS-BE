import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Lock,
  Users,
  CheckCircle2,
  Shield,
  Check,
  X,
  Info,
  Power,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { RoleItem, PermissionAction } from '../../../types/superAdmin';

export const RoleManagementPage: React.FC = () => {
  const {
    roles,
    users,
    addRole,
    updateRole,
    deleteRole,
    toggleRoleStatus,
    permissionMatrix,
    togglePermission,
  } = useSuperAdmin();
  const { addToast } = useHMS();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'System' | 'Custom'>('All');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
    permissionsCount: 16,
  });

  // Calculate dynamic user count per role
  const getUserCountForRole = (roleItem: RoleItem): number => {
    return users.filter(
      (u) =>
        u.role.toLowerCase() === roleItem.roleName.toLowerCase() ||
        u.role.toLowerCase() === roleItem.roleCode.toLowerCase()
    ).length;
  };

  // Open Create Custom Role Modal
  const handleOpenCreate = () => {
    setSelectedRole(null);
    setFormData({
      roleName: '',
      description: '',
      status: 'Active',
      permissionsCount: 16,
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setFormData({
      roleName: role.roleName,
      description: role.description,
      status: role.status,
      permissionsCount: role.permissionsCount,
    });
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenView = (role: RoleItem) => {
    setSelectedRole(role);
    setIsViewModalOpen(true);
  };

  // Open Permissions Configuration Modal
  const handleOpenPermissions = (role: RoleItem) => {
    setSelectedRole(role);
    setIsPermModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (role: RoleItem) => {
    if (role.isSystemDefault) {
      addToast('error', 'Restricted Action', 'Default System Roles cannot be deleted.');
      return;
    }
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  // Submit Create Custom Role
  const handleSaveCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roleName.trim()) {
      addToast('error', 'Validation Error', 'Role Name is mandatory.');
      return;
    }

    const success = await addRole({
      roleName: formData.roleName.trim(),
      description: formData.description.trim(),
      status: formData.status,
      permissionsCount: formData.permissionsCount,
    });

    if (success) {
      setIsCreateModalOpen(false);
    }
  };

  // Submit Edit Role
  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (!formData.roleName.trim()) {
      addToast('error', 'Validation Error', 'Role Name is mandatory.');
      return;
    }

    const success = await updateRole(selectedRole.id, {
      roleName: selectedRole.isSystemDefault ? selectedRole.roleName : formData.roleName.trim(),
      description: formData.description.trim(),
      status: formData.status,
    });

    if (success) {
      setIsEditModalOpen(false);
      setSelectedRole(null);
    }
  };

  // Confirm Delete Custom Role
  const handleConfirmDelete = () => {
    if (selectedRole) {
      if (selectedRole.isSystemDefault) {
        addToast('error', 'Restricted Action', 'Default System Roles cannot be deleted.');
        setIsDeleteModalOpen(false);
        return;
      }
      deleteRole(selectedRole.id);
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        r.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.roleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === 'All' ||
        (filterType === 'System' && r.isSystemDefault) ||
        (filterType === 'Custom' && !r.isSystemDefault);

      return matchesSearch && matchesType;
    });
  }, [roles, searchQuery, filterType]);

  const modulesList = [
    'Patient Management',
    'Appointment Mgmt',
    'Queue Management',
    'IPD Bed Allocation',
    'Pharmacy & Drugs',
    'Lab & Diagnostics',
    'Inventory & Store',
    'Billing & Accounts',
    'Super Admin & Setup',
    'Staff Management',
    'Clinical Documentation',
  ];

  const actionsList: PermissionAction[] = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Print', 'Manage'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Auth & User Management</span>
            <span>/</span>
            <span className="text-indigo-600">Role Management (RBAC)</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System roles are pre-created. Use Create Role for custom operational designations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            title="Create a new Custom Role"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search role by name, code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-medium text-slate-700">
            <span>Filter Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Roles ({roles.length})</option>
              <option value="System">System Roles ({roles.filter((r) => r.isSystemDefault).length})</option>
              <option value="Custom">Custom Roles ({roles.filter((r) => !r.isSystemDefault).length})</option>
            </select>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Showing: <span className="text-indigo-600 font-extrabold">{filteredRoles.length}</span>
          </span>
        </div>
      </div>

      {/* Role Management Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Role Name & Type</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-center">Total Users</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => {
                  const userCount = getUserCountForRole(role);
                  return (
                    <tr key={role.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Role Name & Type Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{role.roleName}</p>
                              {role.isSystemDefault ? (
                                <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/60 shrink-0">
                                  SYSTEM ROLE
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                                  CUSTOM ROLE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{role.roleCode}</span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 text-xs truncate" title={role.description}>
                          {role.description || 'No description provided.'}
                        </p>
                      </td>

                      {/* Total Users */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-extrabold text-xs">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{userCount}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleRoleStatus(role.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            role.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                          title="Click to toggle Status"
                        >
                          {role.status}
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                        {role.createdDate || '2024-01-01'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Role */}
                          <button
                            onClick={() => handleOpenView(role)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View Role Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Role */}
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Permissions */}
                          <button
                            onClick={() => handleOpenPermissions(role)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Configure Permissions"
                          >
                            <Lock className="w-4 h-4" />
                          </button>

                          {/* Quick Activate/Deactivate */}
                          <button
                            onClick={() => toggleRoleStatus(role.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              role.status === 'Active'
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={role.status === 'Active' ? 'Deactivate Role' : 'Activate Role'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete (Only Custom Roles) */}
                          {!role.isSystemDefault ? (
                            <button
                              onClick={() => handleOpenDelete(role)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Custom Role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-200 cursor-not-allowed" title="System roles cannot be deleted">
                              <Trash2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No roles found matching query criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Custom Security Role"
        subtitle="Define organization-specific designations and operational privileges"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCreateRole} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-start gap-2.5 text-amber-800 text-xs">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Default System Roles are pre-configured. Use this modal exclusively to create <strong>Custom Roles</strong> (e.g. Chief Nursing Officer, Quality Manager, Billing Supervisor).
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.roleName}
              onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
              placeholder="e.g. Chief Nursing Officer"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Role Description (Optional)</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Summarize access privileges, responsibilities, and department scope..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Create Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      {selectedRole && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Role: ${selectedRole.roleName}`}
          subtitle={selectedRole.isSystemDefault ? 'System Role - Permissions & Status editable' : 'Custom Role - Full editing enabled'}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEditRole} className="space-y-4 text-xs">
            {selectedRole.isSystemDefault && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200/60 flex items-center gap-2 text-indigo-800 text-xs font-medium">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Default System Role names cannot be changed. You can edit the description, status, and module permissions.</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={selectedRole.isSystemDefault}
                value={formData.roleName}
                onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2 font-semibold outline-none ${
                  selectedRole.isSystemDefault
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Role Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Update Role
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Role Details View Modal */}
      {selectedRole && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Role Details: ${selectedRole.roleName}`}
          subtitle={`System Security Classification & Permission Roster`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Attributes Grid */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500 font-medium">Role Name:</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedRole.roleName}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Classification:</span>
                <div className="mt-0.5">
                  {selectedRole.isSystemDefault ? (
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                      System Role
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Custom Role
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <p className={`font-bold mt-0.5 ${selectedRole.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedRole.status}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Total Users Assigned:</span>
                <p className="font-extrabold text-indigo-600 text-sm">{getUserCountForRole(selectedRole)} Employees</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Created Date:</span>
                <p className="font-mono font-semibold text-slate-800">{selectedRole.createdDate || '2024-01-01'}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Last Updated:</span>
                <p className="font-mono font-semibold text-slate-800">{selectedRole.updatedDate || '2026-07-29'}</p>
              </div>

              <div className="col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium block mb-1">Description:</span>
                <p className="text-slate-700 leading-relaxed font-medium">{selectedRole.description || 'No description available.'}</p>
              </div>
            </div>

            {/* Permission Summary Matrix */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Assigned Module Capabilities</span>
              </h4>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Granted Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modulesList.map((m) => {
                        const perms = permissionMatrix[selectedRole.id]?.[m] || {
                          View: true, Create: false, Edit: false, Delete: false, Export: true, Print: true, Manage: false
                        };
                        const enabledActions = actionsList.filter((act) => perms[act]);

                        return (
                          <tr key={m} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{m}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {enabledActions.length > 0 ? (
                                  enabledActions.map((act) => (
                                    <span key={act} className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      {act}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No Access</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenPermissions(selectedRole);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer"
              >
                Configure Permissions
              </button>
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

      {/* Permissions Configuration Modal */}
      {selectedRole && (
        <Modal
          isOpen={isPermModalOpen}
          onClose={() => setIsPermModalOpen(false)}
          title={`Permission Matrix: ${selectedRole.roleName}`}
          subtitle="Configure granular View, Create, Edit, Delete, Export, Print & Manage privileges"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">System Module</th>
                    {actionsList.map((act) => (
                      <th key={act} className="py-3 px-2 text-center">
                        {act}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modulesList.map((moduleName) => {
                    const modulePerms = permissionMatrix[selectedRole.id]?.[moduleName] || {
                      View: true, Create: false, Edit: false, Update: false, Delete: false, Export: true, Print: true, Manage: false, Assign: false,
                    };

                    return (
                      <tr key={moduleName} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-800">{moduleName}</td>
                        {actionsList.map((act) => {
                          const isChecked = !!modulePerms[act];
                          return (
                            <td key={act} className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(selectedRole.id, moduleName, act)}
                                className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedRole && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Custom Role Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="font-medium">
                Are you sure you want to delete custom role <strong className="text-slate-900">{selectedRole.roleName}</strong>? This action cannot be undone.
              </p>
            </div>
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
                Yes, Delete Role
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
