import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Check,
  X,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { PermissionAction } from '../../../types/superAdmin';

export const PermissionManagementPage: React.FC = () => {
  const { roles, permissionMatrix, togglePermission } = useSuperAdmin();
  const { addToast } = useHMS();

  const [selectedRole, setSelectedRole] = useState(roles[0]?.id || 'role-01');
  const [activeAction, setActiveAction] = useState<PermissionAction>('View');

  const modulesList = [
    'Patient Management',
    'Appointment Mgmt',
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

  const currentRoleObj = roles.find((r) => r.id === selectedRole) || roles[0];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Auth & User Management</span>
            <span>/</span>
            <span className="text-indigo-600">Permission Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Role Permission Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Granular access control per module and action capability across system security roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => addToast('success', 'Permissions Saved', 'Global permission rules persisted to database.')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Matrix Changes</span>
          </button>
        </div>
      </div>

      {/* Role Selection & Action Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Role Selector Buttons */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Security Role to Configure
          </label>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === r.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {r.roleName}
              </button>
            ))}
          </div>
        </div>

        {/* Action Type Selector Tabs */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2">Action Scope:</span>
          {actionsList.map((action) => (
            <button
              key={action}
              onClick={() => setActiveAction(action)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeAction === action
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>{currentRoleObj?.roleName} Access Privileges</span>
            </h3>
            <p className="text-xs text-slate-500">
              Configuring feature capabilities for <strong className="text-indigo-600">{currentRoleObj?.roleName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Info className="w-4 h-4 text-blue-500" />
            <span>Changes take effect immediately for active user sessions</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">System Module</th>
                {actionsList.map((act) => (
                  <th key={act} className="py-3.5 px-3 text-center">
                    {act}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {modulesList.map((moduleName) => {
                const modulePerms = permissionMatrix[selectedRole]?.[moduleName] || {
                  View: true,
                  Create: false,
                  Edit: false,
                  Update: false,
                  Delete: false,
                  Export: true,
                  Print: true,
                  Manage: false,
                  Assign: false,
                };

                return (
                  <tr key={moduleName} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {moduleName}
                    </td>

                    {actionsList.map((act) => {
                      const isChecked = !!modulePerms[act];
                      return (
                        <td key={act} className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => togglePermission(selectedRole, moduleName, act)}
                            className={`w-6 h-6 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Toggle ${act} for ${moduleName}`}
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
      </div>
    </div>
  );
};
