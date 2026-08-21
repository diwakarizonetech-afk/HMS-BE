import React, { useEffect } from 'react';
import { Building2, Shield, MapPin, Lock } from 'lucide-react';
import { useHMS } from '../../context/HMSContext';
import { useNurse } from '../../context/NurseContext';
import { useAuth } from '../../context/AuthContext';

export const NurseBranchSelector: React.FC = () => {
  const { branches } = useHMS();
  const { selectedBranch, setSelectedBranch } = useNurse();
  const { user } = useAuth();

  const userRole = (user?.role || '').toString().toLowerCase().replace('userrole.', '');
  const isSuperAdminOrAdmin = userRole.includes('admin') || userRole.includes('super');
  const isNurse = userRole.includes('nurse');
  const hasFixedBranch = isNurse && !!user?.branch && user.branch !== 'All' && !isSuperAdminOrAdmin;

  useEffect(() => {
    if (hasFixedBranch && user?.branch && selectedBranch !== user.branch) {
      setSelectedBranch(user.branch);
    }
  }, [hasFixedBranch, user?.branch, selectedBranch, setSelectedBranch]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Nurse Portal Branch View</h3>
            {user?.branch && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3 text-emerald-600" />
                Assigned: {user.branch}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {hasFixedBranch
              ? `Currently viewing isolated patient records, vitals, and medications for ${user?.branch}`
              : 'Filter nursing patient records, vitals, medications, and ward transfers by hospital branch location'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Current Branch:</span>
        {hasFixedBranch ? (
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{user?.branch}</span>
          </div>
        ) : (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-all"
          >
            <option value="All">All Hospital Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.branchName}>
                {b.branchName} ({b.branchCode})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

