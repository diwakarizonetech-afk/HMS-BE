import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useNurse } from '../../../context/NurseContext';
import { WardTransfer } from '../../../types/nurse';
import { Bed, BedStatus, WardType } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import { BedDouble, RefreshCw, LogOut, ShieldCheck, Filter, UserCheck2, ArrowLeftRight, CheckCircle2, X } from 'lucide-react';

export const BedAllocationPage: React.FC = () => {
  const { beds, patients, allocateBed, transferBed, releaseBed, addToast } = useHMS();
  const { transfers, completeWardTransfer, updateWardTransfer } = useNurse();

  const [wardFilter, setWardFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal states for Transfer or Allocate
  const [selectedBedForTransfer, setSelectedBedForTransfer] = useState<Bed | null>(null);
  const [targetBedId, setTargetBedId] = useState('');

  const [selectedBedForAllocate, setSelectedBedForAllocate] = useState<Bed | null>(null);
  const [allocatedPatientUhid, setAllocatedPatientUhid] = useState(patients[0]?.uhid || '');

  // Nurse Ward Transfer Allocation Modal state
  const [selectedNurseTransferReq, setSelectedNurseTransferReq] = useState<WardTransfer | null>(null);
  const [nurseTransferTargetBedId, setNurseTransferTargetBedId] = useState('');

  // Pending Ward Transfer Requests sent by Nurses
  const pendingNurseTransfers = transfers.filter((t) => t.status === 'Pending' || t.status === 'In Progress');

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

  const handleOpenNurseTransferModal = (req: WardTransfer) => {
    setSelectedNurseTransferReq(req);
    // Find pre-selected matching bed or first available bed in target requested ward
    const targetAvail = beds.find(
      (b) =>
        b.ward.toLowerCase().includes(req.newWard.toLowerCase()) &&
        (b.bedNumber.toLowerCase() === req.newBed.toLowerCase() || b.status === 'Available')
    );
    setNurseTransferTargetBedId(targetAvail?.id || beds.find((b) => b.status === 'Available')?.id || '');
  };

  const handleExecuteNurseTransferAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNurseTransferReq || !nurseTransferTargetBedId) {
      addToast('error', 'Selection Error', 'Please select a target available bed to allocate.');
      return;
    }

    const targetBed = beds.find((b) => b.id === nurseTransferTargetBedId);
    const currentBed = beds.find(
      (b) =>
        b.currentPatientUhid === selectedNurseTransferReq.patientUhid ||
        b.bedNumber.toLowerCase() === selectedNurseTransferReq.currentBed.toLowerCase()
    );

    try {
      if (currentBed && targetBed) {
        await transferBed(currentBed.id, targetBed.id);
      } else if (targetBed) {
        await allocateBed(targetBed.id, selectedNurseTransferReq.patientUhid, selectedNurseTransferReq.patientName);
      }

      await completeWardTransfer(selectedNurseTransferReq.id);
      addToast(
        'success',
        'Bed Allocated & Transfer Completed 🎉',
        `Patient ${selectedNurseTransferReq.patientName} successfully transferred to ${targetBed?.ward || selectedNurseTransferReq.newWard} - Bed ${targetBed?.bedNumber || selectedNurseTransferReq.newBed}.`
      );
      setSelectedNurseTransferReq(null);
    } catch (err) {
      console.error('Nurse transfer allocation error:', err);
    }
  };

  const handleCancelNurseTransferReq = (reqId: string) => {
    updateWardTransfer(reqId, { status: 'Cancelled' });
    addToast('info', 'Request Cancelled', 'Nurse ward transfer request marked as cancelled.');
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

      {/* Nurse Ward Transfer Requests Panel */}
      <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Nurse Ward Transfer Requests</h2>
              <p className="text-[11px] text-slate-500">
                Pending patient ward/bed relocation requests submitted by nursing staff for reception bed allocation
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
            {pendingNurseTransfers.length} Pending Request{pendingNurseTransfers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {pendingNurseTransfers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingNurseTransfers.map((req) => (
              <div key={req.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono">
                      {req.transferId}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{req.patientName}</h4>
                    <p className="text-[11px] text-slate-500">
                      UHID: <span className="font-semibold text-blue-600">{req.patientUhid}</span>
                      {req.branch && <span className="ml-2 text-slate-400">• {req.branch}</span>}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Ward / Bed</span>
                    <p className="font-bold text-slate-800 mt-0.5">{req.currentWard} • Bed {req.currentBed}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">Requested Ward / Bed</span>
                    <p className="font-bold text-indigo-700 mt-0.5">{req.newWard} • Bed {req.newBed}</p>
                  </div>
                </div>

                {req.transferReason && (
                  <p className="text-xs text-slate-600 italic">
                    Reason: "{req.transferReason}" (Requested by {req.transferredBy})
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenNurseTransferModal(req)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Allocate Bed & Transfer
                  </button>
                  <button
                    onClick={() => handleCancelNurseTransferReq(req.id)}
                    className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 font-medium">
            No pending ward transfer requests from nursing staff. When nurses request ward transfers in the Nurse Portal, they appear here for reception bed allocation.
          </div>
        )}
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
                      {b.bedNumber} — {b.ward} ({b.roomNumber})
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
      {/* Nurse Transfer Request Allocation Modal */}
      {selectedNurseTransferReq && (
        <Modal
          isOpen={!!selectedNurseTransferReq}
          onClose={() => setSelectedNurseTransferReq(null)}
          title={`Allocate Bed for ${selectedNurseTransferReq.patientName}`}
          subtitle={`Requested Ward: ${selectedNurseTransferReq.newWard} (Requested Bed: ${selectedNurseTransferReq.newBed})`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteNurseTransferAllocation} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">
                {selectedNurseTransferReq.patientName} ({selectedNurseTransferReq.patientUhid})
              </p>
              <p className="text-slate-600">
                Current Location: <span className="font-semibold text-slate-900">{selectedNurseTransferReq.currentWard} • Bed {selectedNurseTransferReq.currentBed}</span>
              </p>
              <p className="text-indigo-700">
                Requested Ward: <span className="font-bold">{selectedNurseTransferReq.newWard}</span> (Preferred Bed: {selectedNurseTransferReq.newBed})
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Available Target Bed to Allocate *</label>
              <select
                value={nurseTransferTargetBedId}
                onChange={(e) => setNurseTransferTargetBedId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none cursor-pointer"
              >
                {beds.map((b) => {
                  const isAvailable = b.status === 'Available';
                  const matchesWard = b.ward.toLowerCase().includes(selectedNurseTransferReq.newWard.toLowerCase());
                  return (
                    <option key={b.id} value={b.id} disabled={!isAvailable}>
                      {b.bedNumber} — {b.ward} ({b.roomNumber}) {isAvailable ? '🟢 Available' : `🔴 Occupied (${b.currentPatientName || 'Occupied'})`} {matchesWard ? '⭐ (Requested Ward)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNurseTransferReq(null)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
              >
                Confirm Allocation & Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
