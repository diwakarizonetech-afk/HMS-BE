import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Eye,
  Trash2,
  History,
  Save,
  Droplet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NursingNote } from '../../../types/nurse';
import { Patient } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { useHMS } from '../../../context/HMSContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { Modal } from '../../../components/common/Modal';
import { NurseBranchSelector } from '../../../components/nurse/NurseBranchSelector';

export const NursingNotesPage: React.FC = () => {
  const { notes, addNursingNote, deleteNursingNote, getPatientNotesTimeline, selectedBranch } = useNurse();
  const { patients, addToast } = useHMS();

  // Active Selected Patient from HMS Database
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);

  // Editable Nursing Notes Form for active patient
  const [notesForm, setNotesForm] = useState({
    observation: '',
    symptoms: '',
    patientCondition: 'Stable' as 'Stable' | 'Critical' | 'Improving' | 'Guarded' | 'Under Observation',
    fluidIntake: 1500,
    fluidOutput: 1400,
    doctorInstructions: '',
    notes: '',
  });

  // Table & Modal states
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedNoteRecord, setSelectedNoteRecord] = useState<NursingNote | null>(null);

  // Handle Patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    addToast('info', 'Patient Loaded', `Loaded read-only profile for ${patient.firstName} ${patient.lastName}`);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  // Submit Nursing Notes Form
  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      addToast('error', 'No Patient Selected', 'Please search and select a patient first.');
      return;
    }

    if (!notesForm.observation.trim()) {
      addToast('error', 'Validation Error', 'Nurse Observation notes are required.');
      return;
    }

    addNursingNote({
      patientUhid: selectedPatient.uhid,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      ward: selectedPatient.status === 'Admitted' ? 'ICU Ward' : 'OPD Daycare',
      diagnosis: selectedPatient.existingDiseases || 'Clinical Evaluation',
      observation: notesForm.observation,
      symptoms: notesForm.symptoms,
      treatmentResponse: 'Patient responding well to shift medication.',
      doctorInstructions: notesForm.doctorInstructions,
      fluidIntake: notesForm.fluidIntake,
      fluidOutput: notesForm.fluidOutput,
      patientCondition: notesForm.patientCondition,
      notes: notesForm.notes,
      recordedBy: 'Nurse Anjali Rao',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Reset editable fields
    setNotesForm({
      observation: '',
      symptoms: '',
      patientCondition: 'Stable',
      fluidIntake: 1500,
      fluidOutput: 1400,
      doctorInstructions: '',
      notes: '',
    });
  };

  // Filtered Notes Table
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        n.patientName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        n.patientUhid.toLowerCase().includes(tableSearch.toLowerCase()) ||
        n.observation.toLowerCase().includes(tableSearch.toLowerCase()) ||
        n.recordedBy.toLowerCase().includes(tableSearch.toLowerCase());
      const matchesBranch = selectedBranch === 'All' || !n.branch || n.branch === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [notes, tableSearch, selectedBranch]);

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage) || 1;
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotes.slice(start, start + itemsPerPage);
  }, [filteredNotes, currentPage]);

  const timelineNotesList = useMemo(() => {
    if (!selectedPatient) return [];
    return getPatientNotesTimeline(selectedPatient.uhid);
  }, [selectedPatient, notes]);

  const handleConfirmDelete = () => {
    if (selectedNoteRecord) {
      deleteNursingNote(selectedNoteRecord.id);
      setIsDeleteModalOpen(false);
      setSelectedNoteRecord(null);
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
            <span className="text-blue-600">Nursing Notes</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daily Nursing Observations & Notes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search patient from HMS database, view read-only profile, and write nurse observations & fluid balance notes.
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

      {/* STEP 3: NURSING NOTES FORM (EDITABLE FIELDS ONLY) */}
      {selectedPatient && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>Write Nursing Note for {selectedPatient.firstName} {selectedPatient.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
              Nurse Observation Entry
            </span>
          </div>

          <form onSubmit={handleSaveNotes} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patient Condition
                </label>
                <select
                  value={notesForm.patientCondition}
                  onChange={(e) => setNotesForm({ ...notesForm, patientCondition: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="Stable">Stable</option>
                  <option value="Critical">Critical</option>
                  <option value="Improving">Improving</option>
                  <option value="Guarded">Guarded</option>
                  <option value="Under Observation">Under Observation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Symptoms Reported
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mild headache, joint discomfort..."
                  value={notesForm.symptoms}
                  onChange={(e) => setNotesForm({ ...notesForm, symptoms: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Instructions
                </label>
                <input
                  type="text"
                  placeholder="Physician orders e.g. Monitor BP q2h..."
                  value={notesForm.doctorInstructions}
                  onChange={(e) => setNotesForm({ ...notesForm, doctorInstructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nurse Observation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write detailed nurse shift observations..."
                  value={notesForm.observation}
                  onChange={(e) => setNotesForm({ ...notesForm, observation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Fluid Balance Intake vs Output */}
              <div className="md:col-span-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-amber-600" />
                  <span>Fluid Intake & Output Balance</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fluid Intake (mL)</label>
                    <input
                      type="number"
                      value={notesForm.fluidIntake}
                      onChange={(e) => setNotesForm({ ...notesForm, fluidIntake: Number(e.target.value) })}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fluid Output (mL)</label>
                    <input
                      type="number"
                      value={notesForm.fluidOutput}
                      onChange={(e) => setNotesForm({ ...notesForm, fluidOutput: Number(e.target.value) })}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional nurse notes..."
                  value={notesForm.notes}
                  onChange={(e) => setNotesForm({ ...notesForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setIsTimelineModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>View Patient Observation Timeline</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Nursing Note</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORICAL NOTES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>Nursing Notes Observation Log</span>
            </h3>
            <p className="text-xs text-slate-500">History of daily patient observations</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes..."
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
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Nurse Observation</th>
                <th className="py-3.5 px-4">Intake / Output</th>
                <th className="py-3.5 px-4">Recorded By</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedNotes.length > 0 ? (
                paginatedNotes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{n.patientName}</p>
                      <p className="text-[10px] text-blue-600 font-mono font-semibold">{n.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-blue-600">{n.patientCondition}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">{n.observation}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono">{n.fluidIntake}ml / {n.fluidOutput}ml</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{n.recordedBy}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{n.date} ({n.time})</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedNoteRecord(n);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNoteRecord(n);
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
                    No nursing notes recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Modal */}
      {selectedPatient && (
        <Modal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          title={`Observation Timeline - ${selectedPatient.firstName} ${selectedPatient.lastName}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs p-2">
            {timelineNotesList.length > 0 ? (
              <div className="space-y-3">
                {timelineNotesList.map((tn) => (
                  <div key={tn.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{tn.date} at {tn.time}</span>
                      <span className="text-blue-600">{tn.patientCondition}</span>
                    </div>
                    <p className="mt-1 text-slate-700 font-medium">{tn.observation}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Recorded by: {tn.recordedBy}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">No notes history found for this patient.</p>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setIsTimelineModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Close Timeline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {selectedNoteRecord && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Nursing Note Details`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs p-2">
            <p><span className="font-bold text-slate-700">Patient:</span> {selectedNoteRecord.patientName} ({selectedNoteRecord.patientUhid})</p>
            <p><span className="font-bold text-slate-700">Condition:</span> {selectedNoteRecord.patientCondition}</p>
            <p><span className="font-bold text-slate-700">Observation:</span> {selectedNoteRecord.observation}</p>
            <p><span className="font-bold text-slate-700">Doctor Instructions:</span> {selectedNoteRecord.doctorInstructions || 'None'}</p>
            <p><span className="font-bold text-slate-700">Intake / Output:</span> {selectedNoteRecord.fluidIntake} mL / {selectedNoteRecord.fluidOutput} mL</p>
            <div className="flex justify-end pt-3">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedNoteRecord && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Nursing Note"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p>Are you sure you want to delete this observation note?</p>
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
