import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Laptop,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { LoginHistoryItem } from '../../../types/superAdmin';

export const LoginHistoryPage: React.FC = () => {
  const { loginHistory } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedLog, setSelectedLog] = useState<LoginHistoryItem | null>(null);

  const filteredLogs = useMemo(() => {
    return loginHistory.filter((log) => {
      const matchesSearch =
        log.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress.includes(searchQuery) ||
        log.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === 'All' || log.role.toLowerCase() === selectedRole.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || log.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [loginHistory, searchQuery, selectedRole, selectedStatus]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExport = () => {
    addToast('success', 'Export Started', 'Exporting login audit logs as CSV...');
  };

  const handlePrint = () => {
    addToast('info', 'Printing Audit Log', 'Opening printer dialog for login history...');
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Auth & User Management</span>
            <span>/</span>
            <span className="text-indigo-600">Login History</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Security & Login History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit system access, login timestamps, device metadata, IP addresses, and failed authentication attempts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Log</span>
          </button>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Employee ID, IP Address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Doctor">Doctor</option>
              <option value="Nurse">Nurse</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Store Manager">Store Manager</option>
              <option value="Unknown">Unknown/Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
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
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
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
                <th className="py-3.5 px-4">User & Employee ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Device & Browser</th>
                <th className="py-3.5 px-4">Login Timestamp</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{log.fullName}</p>
                        <p className="text-[10px] font-mono text-indigo-600 font-semibold">{log.employeeId}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{log.role}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.deviceInfo}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                      {log.loginTime}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {log.location}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {log.status === 'Success' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No login history records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedLogs.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredLogs.length}</span> entries
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

      {/* View Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Login Log Details: ${selectedLog.employeeId}`}
          subtitle={`Session ID: ${selectedLog.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">User Name:</span>
                <span className="font-bold text-slate-900">{selectedLog.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-semibold text-indigo-600">{selectedLog.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">IP Address:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Device & Browser:</span>
                <span className="font-semibold text-slate-700">{selectedLog.deviceInfo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Login Timestamp:</span>
                <span className="font-mono text-slate-800">{selectedLog.loginTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Location:</span>
                <span className="font-semibold text-slate-800">{selectedLog.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Authentication Status:</span>
                <span
                  className={`font-bold ${
                    selectedLog.status === 'Success' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedLog.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
