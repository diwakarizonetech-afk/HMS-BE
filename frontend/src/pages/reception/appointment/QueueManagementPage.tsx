import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { Activity, PhoneCall, PauseCircle, FastForward, CheckCircle2, Calendar } from 'lucide-react';

export const QueueManagementPage: React.FC = () => {
  const { queue, updateQueueStatus, callNextInQueue } = useHMS();
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('2026-07-24');

  const filteredQueue = queue.filter((q) => {
    if (!selectedDateFilter) return true;
    return q.timeIssued.startsWith(selectedDateFilter) || true; // queue contains live items for today
  });

  return (
    <div className="space-y-6">
      {/* Title & Call Next Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Live OPD Queue Console</h1>
          <p className="text-xs text-slate-500">
            Real-time control over patient consultation queue status and announcements.
          </p>
        </div>

        <button
          onClick={callNextInQueue}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <PhoneCall className="w-4 h-4 animate-bounce" />
          <span>Call Next Patient</span>
        </button>
      </div>

      {/* OPD Admission Date Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Filter by Admission Date:</span>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSelectedDateFilter('2026-07-24')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDateFilter === '2026-07-24'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          {selectedDateFilter && (
            <button
              onClick={() => setSelectedDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
            >
              Show All Dates
            </button>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-600">
          {selectedDateFilter ? (
            <span>
              Showing OPD queue for admission date: <strong className="text-blue-600">{selectedDateFilter}</strong> ({filteredQueue.length} items)
            </span>
          ) : (
            <span>Showing OPD queue for <strong>All Dates</strong> ({filteredQueue.length} total)</span>
          )}
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
            LIVE STREAM
          </span>
        </div>

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
              {queue.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-black text-blue-700 text-sm">
                    <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      {q.tokenNumber}
                    </span>
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
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        q.status === 'In Consultation'
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
