import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { ShieldCheck, Search, FileText, UserCheck, Clock } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { auditLogs } = useBilling();
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      !search.trim() ||
      log.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      (log.bill_number && log.bill_number.toLowerCase().includes(search.toLowerCase())) ||
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Financial Audit Trail & Governance</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable log tracking creation, modifications, discount/refund approvals, and cancellations.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by Tx ID, Bill No, User Name, Action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Total Logged Financial Actions: <span className="text-slate-900 font-extrabold">{filteredLogs.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Tx ID</th>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3 text-center">Action</th>
                <th className="px-4 py-3">Audit Details</th>
                <th className="px-4 py-3">User & Role</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.transaction_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-indigo-700">{log.transaction_id}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{log.bill_number || 'N/A'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{log.entity_type}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.action === 'Created' || log.action === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'Collected'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-sm truncate">{log.new_value}</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">
                    {log.user_name}
                    <p className="text-[10px] text-cyan-700 font-semibold">{log.user_role}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{log.reason || 'Routine Transaction'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
