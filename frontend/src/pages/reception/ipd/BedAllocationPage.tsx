import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { Bed, BedStatus, WardType } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import { BedDouble, RefreshCw, LogOut, ShieldCheck, Filter, UserCheck2 } from 'lucide-react';

export const BedAllocationPage: React.FC = () => {
  const { beds, patients, allocateBed, transferBed, releaseBed } = useHMS();

  const [wardFilter, setWardFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal states for Transfer or Allocate
  const [selectedBedForTransfer, setSelectedBedForTransfer] = useState<Bed | null>(null);
  const [targetBedId, setTargetBedId] = useState('');

  const [selectedBedForAllocate, setSelectedBedForAllocate] = useState<Bed | null>(null);
  const [allocatedPatientUhid, setAllocatedPatientUhid] = useState(patients[0]?.uhid || '');

  // Filtered beds
  const filteredBeds = beds.filter((b) => {
    const matchesWard = wardFilter === 'All' || b.ward === wardFilter;
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesWard && matchesStatus;
  });

  // Bed stats counts
  const totalCount = beds.length;
  const availableCount = beds.filter((b) => b.status === 'Available').length;
  const occupiedCount = beds.filter((b) => b.status === 'Occupied').length;
  const reservedCount = beds.filter((b) => b.status === 'Reserved').length;
  const cleaningCount = beds.filter((b) => b.status === 'Cleaning').length;

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBedForTransfer && targetBedId) {
      transferBed(selectedBedForTransfer.id, targetBedId);
      setSelectedBedForTransfer(null);
    }
  };

  const handleConfirmAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBedForAllocate && allocatedPatientUhid) {
      const p = patients.find((pat) => pat.uhid === allocatedPatientUhid);
      if (p) {
        allocateBed(selectedBedForAllocate.id, p.uhid, `${p.firstName} ${p.lastName}`);
        setSelectedBedForAllocate(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Live Counters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">IPD Bed Allocation Grid</h1>
            <p className="text-xs text-slate-500">
              Live floorplan and ward occupancy matrix for inpatient bed management.
            </p>
          </div>

          {/* Color Legend Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              🟢 Available ({availableCount})
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              🔴 Occupied ({occupiedCount})
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              🟡 Reserved ({reservedCount})
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              🔵 Cleaning ({cleaningCount})
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Filter Ward
            </label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
            >
              <option value="All">All Wards</option>
              <option value="ICU">ICU</option>
              <option value="General Ward">General Ward</option>
              <option value="Deluxe Private">Deluxe Private</option>
              <option value="Surgical Ward">Surgical Ward</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Cleaning">Cleaning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredBeds.map((bed) => (
          <div
            key={bed.id}
            className={`p-5 rounded-2xl border shadow-2xs space-y-3 transition-all duration-200 flex flex-col justify-between ${
              bed.status === 'Available'
                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                : bed.status === 'Occupied'
                ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
                : bed.status === 'Reserved'
                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                : 'bg-blue-50/50 border-blue-200 hover:border-blue-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-lg text-slate-900">{bed.bedNumber}</span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    bed.status === 'Available'
                      ? 'bg-emerald-600 text-white'
                      : bed.status === 'Occupied'
                      ? 'bg-rose-600 text-white'
                      : bed.status === 'Reserved'
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {bed.status}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p>
                  Ward: <span className="font-bold text-slate-900">{bed.ward}</span>
                </p>
                <p>
                  Room: <span className="font-bold text-slate-900">{bed.roomNumber}</span> ({bed.category})
                </p>
              </div>

              {bed.currentPatientName && (
                <div className="mt-3 p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-xs">
                  <p className="font-bold text-slate-900">{bed.currentPatientName}</p>
                  <p className="text-[10px] text-blue-600 font-semibold">{bed.currentPatientUhid}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Admitted: {bed.admittedDate}</p>
                </div>
              )}
            </div>

            {/* Bed Actions Bar */}
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              {bed.status === 'Available' && (
                <button
                  onClick={() => {
                    setSelectedBedForAllocate(bed);
                    setAllocatedPatientUhid(patients[0]?.uhid || '');
                  }}
                  className="w-full py-1.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs text-center cursor-pointer"
                >
                  Allocate
                </button>
              )}

              {bed.status === 'Occupied' && (
                <div className="flex items-center justify-between gap-2 w-full">
                  <button
                    onClick={() => {
                      setSelectedBedForTransfer(bed);
                      const otherAvail = beds.find((b) => b.id !== bed.id && b.status === 'Available');
                      setTargetBedId(otherAvail?.id || '');
                    }}
                    className="flex-1 py-1.5 rounded-lg font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-600 hover:text-white transition-colors text-center cursor-pointer"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => releaseBed(bed.id)}
                    className="flex-1 py-1.5 rounded-lg font-bold text-rose-700 bg-rose-100 hover:bg-rose-600 hover:text-white transition-colors text-center cursor-pointer"
                  >
                    Release
                  </button>
                </div>
              )}

              {bed.status === 'Cleaning' && (
                <button
                  onClick={() => releaseBed(bed.id)} // Resets status
                  className="w-full py-1.5 rounded-lg font-bold text-blue-700 bg-blue-100 hover:bg-blue-600 hover:text-white transition-colors text-center cursor-pointer"
                >
                  Mark Available
                </button>
              )}

              {bed.status === 'Reserved' && (
                <button
                  onClick={() => {
                    setSelectedBedForAllocate(bed);
                  }}
                  className="w-full py-1.5 rounded-lg font-bold text-amber-800 bg-amber-100 hover:bg-amber-600 hover:text-white transition-colors text-center cursor-pointer"
                >
                  Confirm Allocation
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Allocate Modal */}
      {selectedBedForAllocate && (
        <Modal
          isOpen={!!selectedBedForAllocate}
          onClose={() => setSelectedBedForAllocate(null)}
          title={`Allocate Bed ${selectedBedForAllocate.bedNumber}`}
          subtitle={`${selectedBedForAllocate.ward} (${selectedBedForAllocate.roomNumber})`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmAllocate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
              <select
                value={allocatedPatientUhid}
                onChange={(e) => setAllocatedPatientUhid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.uhid}>
                    {p.uhid} - {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBedForAllocate(null)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                Allocate Bed
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {selectedBedForTransfer && (
        <Modal
          isOpen={!!selectedBedForTransfer}
          onClose={() => setSelectedBedForTransfer(null)}
          title={`Transfer Patient from Bed ${selectedBedForTransfer.bedNumber}`}
          subtitle={`Current Patient: ${selectedBedForTransfer.currentPatientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Target Available Bed *</label>
              <select
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none"
              >
                {beds
                  .filter((b) => b.id !== selectedBedForTransfer.id && b.status === 'Available')
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bedNumber} - {b.ward} ({b.roomNumber})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBedForTransfer(null)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Confirm Bed Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
