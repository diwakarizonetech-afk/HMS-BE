import React, { useState, useMemo } from 'react';
import {
  Pill,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Save,
  AlertCircle,
} from 'lucide-react';
import { MedicationAdmin } from '../../../types/nurse';
import { Patient } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { usePharmacy } from '../../../context/PharmacyContext';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { NurseBranchSelector } from '../../../components/nurse/NurseBranchSelector';
import { isPatientAllocatedToBranch, matchBranch } from '../../../utils/helpers';

export const MedicationAdminPage: React.FC = () => {
  const { medications, vitals, notes, addMedicationAdmin, updateMedicationAdmin, deleteMedicationAdmin, administerMedication, selectedBranch } = useNurse();
  const { prescriptions: pharmacyPrescriptions } = usePharmacy();
  const { patients, doctors, appointments, ipdAdmissions, beds, addToast } = useHMS();
  const { user } = useAuth();

  const userRole = (user?.role || '').toString().toLowerCase().replace('userrole.', '');
  const isNurse = userRole.includes('nurse');
  const isSuperAdminOrAdmin = userRole.includes('admin') || userRole.includes('super');
  const activeBranch = (isNurse && !!user?.branch && user.branch !== 'All' && !isSuperAdminOrAdmin)
    ? user.branch
    : (selectedBranch && selectedBranch !== 'All' ? selectedBranch : (user?.branch || 'All'));

  // Branch-Filtered Patients based on branch allocation
  const branchPatients = useMemo(() => {
    return patients.filter((p) =>
      isPatientAllocatedToBranch(p, activeBranch, {
        appointments,
        admissions: ipdAdmissions,
        beds,
        vitals,
        notes,
        medications,
      })
    );
  }, [patients, activeBranch, appointments, ipdAdmissions, beds, vitals, notes, medications]);

  // Active Selected Patient from HMS Database (branch-scoped)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Initial load: select first branch patient if none is selected
  React.useEffect(() => {
    if (branchPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(branchPatients[0]);
    }
  }, [branchPatients.length]);

  // Derived prescribed medicines list for selected patient fetched directly from DB
  const patientPrescriptions = useMemo(() => {
    if (!selectedPatient) return [];
    const normUhid = selectedPatient.uhid.toLowerCase().trim();

    // 1. Fetch medication administration records stored for patient in DB
    const nurseMeds = medications.filter(
      (m) => m.patientUhid && m.patientUhid.toLowerCase().trim() === normUhid
    );

    // 2. Fetch doctor prescription records stored in DB (Pharmacy Context)
    const doctorPrescriptionMeds: MedicationAdmin[] = [];
    if (pharmacyPrescriptions && Array.isArray(pharmacyPrescriptions)) {
      const patientRxList = pharmacyPrescriptions.filter(
        (rx) => rx.patientUhid && rx.patientUhid.toLowerCase().trim() === normUhid
      );

      patientRxList.forEach((rx) => {
        (rx.items || []).forEach((item, itemIdx) => {
          const medName = item.medicineName || 'Prescribed Medicine';
          const exists = nurseMeds.some(
            (nm) => nm.medicineName.toLowerCase().trim() === medName.toLowerCase().trim()
          );
          if (!exists) {
            doctorPrescriptionMeds.push({
              id: `rx-${rx.id}-${item.id || itemIdx}`,
              patientUhid: selectedPatient.uhid,
              patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
              ward: selectedPatient.status === 'Admitted' ? 'ICU Ward' : 'OPD Daycare',
              doctorName: rx.doctorName || doctors[0]?.name || 'Dr. Attending',
              medicineName: medName,
              dosage: item.dosage || '1 Tablet',
              route: ((item as any).route as any) || 'Oral',
              frequency: ((item as any).frequency as any) || 'Once Daily (OD)',
              scheduledTime: '08:00 AM',
              status: 'Scheduled',
              nurseName: 'Staff Nurse',
              branch: selectedPatient.branch || activeBranch,
            });
          }
        });
      });
    }

    return [...nurseMeds, ...doctorPrescriptionMeds];
  }, [selectedPatient, medications, pharmacyPrescriptions, doctors, activeBranch]);

  // Selected Medicine to update status
  const [selectedMedToUpdate, setSelectedMedToUpdate] = useState<MedicationAdmin | null>(null);
  const [updateForm, setUpdateForm] = useState({
    givenTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'Given' as 'Given' | 'Missed' | 'Delayed' | 'Scheduled',
    remarks: '',
    administeredBy: user?.name || user?.username || 'Staff Nurse',
  });

  // Table & Modal states
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMedRecord, setSelectedMedRecord] = useState<MedicationAdmin | null>(null);

  // Handle Patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    addToast('info', 'Patient Loaded', `Loaded read-only profile for ${patient.firstName} ${patient.lastName}`);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  // Open Update Modal for a Prescribed Medicine
  const handleOpenUpdateModal = (med: MedicationAdmin) => {
    setSelectedMedToUpdate(med);
    setUpdateForm({
      givenTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Given',
      remarks: med.remarks || '',
      administeredBy: user?.name || user?.username || med.nurseName || 'Staff Nurse',
    });
    setIsUpdateModalOpen(true);
  };

  // Submit Status Update
  const handleSaveMedStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMedToUpdate) return;

    const assignedNurseName = updateForm.administeredBy || user?.name || user?.username || 'Staff Nurse';
    const currentBranch = (activeBranch !== 'All' ? activeBranch : selectedPatient?.branch) || user?.branch || 'Main Branch';

    if (selectedMedToUpdate.id.startsWith('presc-') || selectedMedToUpdate.id.startsWith('rx-')) {
      await addMedicationAdmin({
        ...selectedMedToUpdate,
        givenTime: updateForm.givenTime,
        status: updateForm.status,
        remarks: updateForm.remarks,
        nurseName: assignedNurseName,
        branch: currentBranch,
      });
    } else {
      await updateMedicationAdmin(selectedMedToUpdate.id, {
        givenTime: updateForm.givenTime,
        status: updateForm.status,
        remarks: updateForm.remarks,
        nurseName: assignedNurseName,
        branch: currentBranch,
      });
    }

    setIsUpdateModalOpen(false);
  };

  // Filtered Medications Table with Priority Sorting
  const filteredMedications = useMemo(() => {
    const matched = medications.filter((m) => {
      const matchesSearch =
        m.patientName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.patientUhid.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.medicineName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.doctorName.toLowerCase().includes(tableSearch.toLowerCase());
      const matchesBranch = matchBranch(m.branch, activeBranch);
      return matchesSearch && matchesBranch;
    });

    return matched.sort((a, b) => {
      const isAGiven = a.status === 'Administered' || a.status === 'Completed';
      const isBGiven = b.status === 'Administered' || b.status === 'Completed';
      if (isAGiven !== isBGiven) {
        return isAGiven ? 1 : -1; // completed/administered last
      }
      const patA = patients?.find((p) => p.uhid.toLowerCase().trim() === (a.patientUhid || '').toLowerCase().trim());
      const patB = patients?.find((p) => p.uhid.toLowerCase().trim() === (b.patientUhid || '').toLowerCase().trim());
      const isAEmergency = Boolean(patA?.isEmergency || (patA?.status || '').toLowerCase() === 'emergency' || (a as any).isEmergency);
      const isBEmergency = Boolean(patB?.isEmergency || (patB?.status || '').toLowerCase() === 'emergency' || (b as any).isEmergency);
      if (isAEmergency !== isBEmergency) {
        return isAEmergency ? -1 : 1; // emergency first
      }
      return 0;
    });
  }, [medications, tableSearch, activeBranch, patients]);

  const totalPages = Math.ceil(filteredMedications.length / itemsPerPage) || 1;
  const paginatedMedications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMedications.slice(start, start + itemsPerPage);
  }, [filteredMedications, currentPage]);

  const handleConfirmDelete = () => {
    if (selectedMedRecord) {
      deleteMedicationAdmin(selectedMedRecord.id);
      setIsDeleteModalOpen(false);
      setSelectedMedRecord(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Branch Selection Bar */}
      <NurseBranchSelector />

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Nurse Module</span>
            <span>/</span>
            <span className="text-blue-600">Medication Administration</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Medication Administration Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search patient from HMS database, view read-only profile & doctor prescriptions, and log administration status.
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

      {/* STEP 3: PRESCRIBED MEDICINES (READ-ONLY DETAILS + EDITABLE STATUS UPDATE) */}
      {selectedPatient && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-600" />
              <span>Prescribed Medicines for {selectedPatient.firstName} {selectedPatient.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg">
              Doctor Prescriptions
            </span>
          </div>

          {patientPrescriptions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientPrescriptions.map((med, idx) => (
                <div
                  key={`${med.id}-${idx}`}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative flex flex-col justify-between"
                >
                  {/* READ-ONLY PRESCRIBED MEDICINE DETAILS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{med.medicineName}</span>
                      <span className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md">
                        {med.route}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p><span className="font-semibold text-slate-500">Dosage:</span> <span className="font-bold text-slate-800">{med.dosage}</span></p>
                      <p><span className="font-semibold text-slate-500">Frequency:</span> <span className="font-bold text-slate-800">{med.frequency}</span></p>
                      <p><span className="font-semibold text-slate-500">Sched Time:</span> <span className="font-bold text-blue-600">{med.scheduledTime}</span></p>
                      <p><span className="font-semibold text-slate-500">Prescribing Doctor:</span> <span className="font-bold text-slate-800">{med.doctorName}</span></p>
                    </div>
                  </div>

                  {/* UPDATE MEDICATION STATUS ACTION BUTTON */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        med.status === 'Given'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {med.status === 'Given' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{med.status}</span>
                    </span>

                    <button
                      onClick={() => handleOpenUpdateModal(med)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Status</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50/80 border border-dashed border-slate-200 rounded-xl space-y-1">
              <Pill className="w-7 h-7 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-600">No Prescribed Medicines Found in DB</p>
              <p className="text-[11px] text-slate-400">
                No active doctor prescriptions or nurse medication orders were found for {selectedPatient.firstName} {selectedPatient.lastName} (UHID: {selectedPatient.uhid}).
              </p>
            </div>
          )}
        </div>
      )}

      {/* HISTORICAL MEDICATION LOG TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-cyan-600" />
              <span>Medication Administration Log</span>
            </h3>
            <p className="text-xs text-slate-500">History of administered doses</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medications..."
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
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Medicine & Dose</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4">Sched / Given Time</th>
                <th className="py-3.5 px-4">Administered By</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedMedications.length > 0 ? (
                paginatedMedications.map((m, idx) => {
                  const patMatch = patients?.find((p) => p.uhid.toLowerCase().trim() === (m.patientUhid || '').toLowerCase().trim());
                  const isEmergencyMed = Boolean(
                    patMatch?.isEmergency ||
                    (patMatch?.status || '').toLowerCase() === 'emergency' ||
                    (patMatch?.category || '').toLowerCase() === 'emergency' ||
                    (m as any).isEmergency
                  );

                  return (
                  <tr
                    key={`${m.id}-${idx}`}
                    className={`transition-colors ${
                      isEmergencyMed
                        ? 'bg-rose-50/40 border-l-4 border-l-rose-500 hover:bg-rose-50/70'
                        : m.status === 'Administered' || m.status === 'Completed'
                        ? 'hover:bg-slate-50/50 opacity-90'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900">{m.patientName}</p>
                        {isEmergencyMed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white shadow-2xs animate-pulse tracking-wide uppercase">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-blue-600 font-mono font-semibold">{m.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{m.medicineName} ({m.dosage})</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{m.route}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono">{m.scheduledTime} / {m.givenTime || '-'}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{m.nurseName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${isEmergencyMed ? 'text-rose-700' : 'text-emerald-600'}`}>{m.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMedRecord(m);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMedRecord(m);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No medication administration logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDITABLE STATUS UPDATE MODAL */}
      {selectedMedToUpdate && (
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title={`Update Medication Status - ${selectedMedToUpdate.medicineName}`}
          subtitle={`Patient: ${selectedMedToUpdate.patientName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMedStatus} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Administration Status</label>
              <select
                value={updateForm.status}
                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              >
                <option value="Given">Given / Administered</option>
                <option value="Missed">Missed Dose</option>
                <option value="Delayed">Delayed</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Given Time</label>
              <input
                type="text"
                value={updateForm.givenTime}
                onChange={(e) => setUpdateForm({ ...updateForm, givenTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Administered By</label>
              <input
                type="text"
                value={updateForm.administeredBy}
                onChange={(e) => setUpdateForm({ ...updateForm, administeredBy: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nurse Remarks</label>
              <textarea
                rows={2}
                value={updateForm.remarks}
                onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                placeholder="Administration notes..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Save Administration Log
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {selectedMedRecord && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Medication Details`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs p-2">
            <p><span className="font-bold text-slate-700">Patient:</span> {selectedMedRecord.patientName} ({selectedMedRecord.patientUhid})</p>
            <p><span className="font-bold text-slate-700">Medicine:</span> {selectedMedRecord.medicineName} ({selectedMedRecord.dosage})</p>
            <p><span className="font-bold text-slate-700">Route:</span> {selectedMedRecord.route}</p>
            <p><span className="font-bold text-slate-700">Status:</span> {selectedMedRecord.status}</p>
            <div className="flex justify-end pt-3">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedMedRecord && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Medication Log"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p>Are you sure you want to delete this medication log?</p>
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
