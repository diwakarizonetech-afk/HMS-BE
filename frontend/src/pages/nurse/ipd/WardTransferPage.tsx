import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Save,
} from 'lucide-react';
import { WardTransfer } from '../../../types/nurse';
import { Patient } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { useHMS } from '../../../context/HMSContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { Modal } from '../../../components/common/Modal';

export const WardTransferPage: React.FC = () => {
  const { transfers, addWardTransfer, deleteWardTransfer, completeWardTransfer } = useNurse();
  const { patients, beds, addToast } = useHMS();

  // Active Selected Patient from HMS Database
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);

  // Derive current ward and bed from beds database
  const occupiedBed = useMemo(() => {
    if (!selectedPatient) return null;
    return beds.find((b) => b.currentPatientUhid === selectedPatient.uhid);
  }, [selectedPatient, beds]);

  const currentWard = occupiedBed?.ward || (selectedPatient?.status === 'Admitted' ? 'ICU Ward' : 'General Ward');
  const currentBed = occupiedBed?.bedNumber || 'B-101';

  // Editable Ward Transfer Form fields
  const [transferForm, setTransferForm] = useState({
    newWard: 'Deluxe Private',
    newBed: 'B-301',
    transferReason: '',
    remarks: '',
  });

  // Table & Modal states
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransferRecord, setSelectedTransferRecord] = useState<WardTransfer | null>(null);

  // Handle Patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    addToast('info', 'Patient Loaded', `Loaded read-only profile for ${patient.firstName} ${patient.lastName}`);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  // Submit Ward Transfer Form
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      addToast('error', 'No Patient Selected', 'Please search and select a patient first.');
      return;
    }

    if (!transferForm.newWard.trim() || !transferForm.newBed.trim()) {
      addToast('error', 'Validation Error', 'New Ward and Bed selection are required.');
      return;
    }

    addWardTransfer({
      patientUhid: selectedPatient.uhid,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      currentWard: currentWard,
      currentBed: currentBed,
      newWard: transferForm.newWard,
      newBed: transferForm.newBed,
      transferReason: transferForm.transferReason || 'Clinical step-down transfer',
      transferDate: new Date().toISOString().split('T')[0],
      transferTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorApproval: 'Approved',
      doctorName: 'Dr. Vikram Malhotra',
      remarks: transferForm.remarks,
      transferredBy: 'Nurse Anjali Rao',
      status: 'Pending',
    });

    // Reset editable fields
    setTransferForm({
      newWard: 'Deluxe Private',
      newBed: 'B-301',
      transferReason: '',
      remarks: '',
    });
  };

  // Filtered Transfers Table
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const term = tableSearch.toLowerCase();
      return (
        t.patientName.toLowerCase().includes(term) ||
        t.patientUhid.toLowerCase().includes(term) ||
        t.currentWard.toLowerCase().includes(term) ||
        t.newWard.toLowerCase().includes(term)
      );
    });
  }, [transfers, tableSearch]);

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage) || 1;
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(start, start + itemsPerPage);
  }, [filteredTransfers, currentPage]);

  const handleConfirmDelete = () => {
    if (selectedTransferRecord) {
      deleteWardTransfer(selectedTransferRecord.id);
      setIsDeleteModalOpen(false);
      setSelectedTransferRecord(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Nurse Module</span>
            <span>/</span>
            <span className="text-blue-600">Ward Transfer</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Patient Ward & Bed Transfer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search patient from HMS database, view read-only profile, and execute ward/bed reallocation.
          </p>
        </div>
      </div>

      {/* STEP 1: PATIENT SEARCH */}
      <PatientSearch
        onSelectPatient={handleSelectPatient}
        selectedPatient={selectedPatient}
        onClearPatient={handleClearPatient}
      />

      {/* STEP 2: READ-ONLY PATIENT INFORMATION CARD */}
      <PatientInfoCard patient={selectedPatient} />

      {/* STEP 3: WARD TRANSFER FORM (EDITABLE FIELDS ONLY) */}
      {selectedPatient && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
              <span>Transfer Ward for {selectedPatient.firstName} {selectedPatient.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Ward Reallocation Form
            </span>
          </div>

          <form onSubmit={handleSaveTransfer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* READ-ONLY CURRENT LOCATION */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Current Ward (Read-Only)
                </label>
                <p className="font-bold text-slate-900 text-xs">{currentWard}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Current Bed (Read-Only)
                </label>
                <p className="font-bold text-slate-900 text-xs">{currentBed}</p>
              </div>

              {/* EDITABLE TARGET NEW LOCATION */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select New Ward <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferForm.newWard}
                  onChange={(e) => setTransferForm({ ...transferForm, newWard: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="ICU Ward">ICU (Intensive Care)</option>
                  <option value="General Ward">General Ward</option>
                  <option value="Deluxe Private">Deluxe Private</option>
                  <option value="Surgical Ward">Surgical Ward</option>
                  <option value="Semi-Private">Semi-Private Room</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select New Bed <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-301"
                  value={transferForm.newBed}
                  onChange={(e) => setTransferForm({ ...transferForm, newBed: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for ward transfer e.g. Patient stabilized post-crisis..."
                  value={transferForm.transferReason}
                  onChange={(e) => setTransferForm({ ...transferForm, transferReason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Remarks
                </label>
                <input
                  type="text"
                  placeholder="Additional transfer remarks..."
                  value={transferForm.remarks}
                  onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Transfer Patient</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORICAL TRANSFERS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
              <span>Ward Transfer Log</span>
            </h3>
            <p className="text-xs text-slate-500">History of patient bed transfers</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transfer ID</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">From Ward</th>
                <th className="py-3.5 px-4">To Ward</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedTransfers.length > 0 ? (
                paginatedTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{t.transferId}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{t.patientName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{t.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{t.currentWard} ({t.currentBed})</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">{t.newWard} ({t.newBed})</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{t.transferDate} ({t.transferTime})</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-600">{t.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status !== 'Completed' && (
                          <button
                            onClick={() => completeWardTransfer(t.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTransferRecord(t);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTransferRecord(t);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No transfers logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedTransferRecord && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Transfer Details - ${selectedTransferRecord.transferId}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs p-2">
            <p><span className="font-bold text-slate-700">Patient:</span> {selectedTransferRecord.patientName} ({selectedTransferRecord.patientUhid})</p>
            <p><span className="font-bold text-slate-700">From:</span> {selectedTransferRecord.currentWard} (Bed {selectedTransferRecord.currentBed})</p>
            <p><span className="font-bold text-slate-700">To:</span> {selectedTransferRecord.newWard} (Bed {selectedTransferRecord.newBed})</p>
            <p><span className="font-bold text-slate-700">Reason:</span> {selectedTransferRecord.transferReason}</p>
            <p><span className="font-bold text-slate-700">Status:</span> {selectedTransferRecord.status}</p>
            <div className="flex justify-end pt-3">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedTransferRecord && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Ward Transfer"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p>Are you sure you want to delete this transfer log?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
