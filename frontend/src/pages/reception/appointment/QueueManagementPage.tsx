import React, { useMemo } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { Activity, PhoneCall, PauseCircle, FastForward, CheckCircle2, X, Users } from 'lucide-react';

export const QueueManagementPage: React.FC = () => {
  const { queue, departments, updateQueueStatus, deleteQueueItem, callNextInQueue } = useHMS();
  const { user } = useAuth();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const [selectedDepartment, setSelectedDepartment] = React.useState<string>('All');

  const handleRemove = (id: string, label: string) => {
    if (removingId === id) {
      deleteQueueItem(id);
      setRemovingId(null);
    } else {
      setRemovingId(id);
      // Auto-reset the confirm state after a few seconds so a stray click later doesn't delete silently
      setTimeout(() => setRemovingId((cur) => (cur === id ? null : cur)), 4000);
    }
  };

  const deptOptions = React.useMemo(() => {
    const set = new Set<string>();
    (departments || []).forEach((d) => {
      if (d.name) set.add(d.name);
    });
    (queue || []).forEach((q) => {
      if (q.department) set.add(q.department);
    });
    return Array.from(set);
  }, [departments, queue]);

  const filteredQueue = useMemo(() => {
    const matched = queue.filter((q) => {
      if (!selectedDepartment || selectedDepartment === 'All') return true;
      const qDeptClean = (q.department || '').replace(/\s*\([^)]*\)/g, '').toLowerCase().trim();
      const selDeptClean = selectedDepartment.replace(/\s*\([^)]*\)/g, '').toLowerCase().trim();
      return qDeptClean.includes(selDeptClean) || selDeptClean.includes(qDeptClean);
    });

    return matched.sort((a, b) => {
      const getWeight = (st: string) => (st === 'Completed' ? 1 : st === 'Skipped' ? 2 : 0);
      const wDiff = getWeight(a.status) - getWeight(b.status);
      if (wDiff !== 0) return wDiff; // Completed/Skipped at the very bottom
      const emDiff = (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0);
      if (emDiff !== 0) return emDiff; // Emergency at the very top
      return (b.priority || 0) - (a.priority || 0);
    });
  }, [queue, selectedDepartment]);

  return (
    <div className="space-y-6">
      {/* Title & Call Next Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Live OPD Queue Console</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Activity className="w-3 h-3" />
              {selectedDepartment === 'All' ? 'All Departments' : selectedDepartment}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time control over patient consultation queue status and announcements per department.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Activity className="w-4 h-4 text-blue-600" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent text-slate-800 outline-none font-bold cursor-pointer"
            >
              <option value="All">All Departments</option>
              {deptOptions.map((dName) => (
                <option key={dName} value={dName}>
                  {dName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={callNextInQueue}
            disabled={filteredQueue.length === 0}
            className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs text-white transition-all ${filteredQueue.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed opacity-70'
              }`}
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Call Next Patient</span>
          </button>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Queue Items ({filteredQueue.length})
          </span>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE STREAM ({selectedDepartment === 'All' ? 'All' : selectedDepartment})
          </span>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Patients in OPD Queue</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no patients waiting in the queue for <span className="font-semibold text-slate-700">{selectedDepartment === 'All' ? 'any department' : selectedDepartment}</span>.
              New appointment bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Token #</th>
                  <th className="p-4">Patient Name & UHID</th>
                  <th className="p-4">Assigned Doctor & Dept</th>
                  <th className="p-4">Time Issued</th>
                  <th className="p-4">Est. Wait Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Queue Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((q) => (
                  <tr
                    key={q.id}
                    className={`transition-colors ${
                      q.isEmergency
                        ? 'bg-rose-50/40 border-l-4 border-l-rose-500 hover:bg-rose-50/70'
                        : q.status === 'Completed' || q.status === 'Skipped'
                        ? 'hover:bg-slate-50/50 opacity-80'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-4 font-black text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`${q.isEmergency ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-blue-50 text-blue-700 border-blue-100'} px-2.5 py-1 rounded-lg border font-mono font-bold`}>
                          {q.tokenNumber}
                        </span>
                        {q.isEmergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white shadow-2xs animate-pulse tracking-wide uppercase">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{q.patientName}</p>
                      <p className="text-[10px] text-slate-500">{q.patientUhid}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{q.doctorName}</p>
                      <p className="text-[10px] text-slate-500">{q.department}</p>
                    </td>
                    <td className="p-4 text-slate-600">{q.timeIssued}</td>
                    <td className="p-4 font-semibold text-slate-700">{q.waitingTimeMinutes} mins</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${q.status === 'In Consultation'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'Waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : q.status === 'On Hold'
                                ? 'bg-purple-100 text-purple-800'
                                : q.status === 'Skipped'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => updateQueueStatus(q.id, 'In Consultation')}
                          title="Call for Consultation"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Call
                        </button>

                        <button
                          onClick={() => updateQueueStatus(q.id, 'On Hold')}
                          title="Put on Hold"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Hold
                        </button>

                        <button
                          onClick={() => updateQueueStatus(q.id, 'Skipped')}
                          title="Skip Patient"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Skip
                        </button>

                        <button
                          onClick={() => updateQueueStatus(q.id, 'Completed')}
                          title="Mark Completed"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Complete
                        </button>

                        <button
                          onClick={() => handleRemove(q.id, q.patientName)}
                          title={removingId === q.id ? 'Click again to confirm removal' : 'Remove from queue'}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${removingId === q.id
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                          <X className="w-3 h-3" />
                          {removingId === q.id ? 'Confirm?' : ''}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
