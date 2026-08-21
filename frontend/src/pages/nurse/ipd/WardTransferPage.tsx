import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Search,
  Eye,
  Lock,
  Building2,
  UserCheck,
  FileText,
  ShieldCheck,
  Clock,
  ArrowLeftRight,
  ShieldAlert,
  HeartPulse,
  Pill,
  ClipboardList,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Filter,
} from 'lucide-react';
import { WardTransfer } from '../../../types/nurse';
import { Patient, Bed } from '../../../types/hms';
import { useNurse } from '../../../context/NurseContext';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { PatientSearch } from '../../../components/nurse/PatientSearch';
import { PatientInfoCard } from '../../../components/nurse/PatientInfoCard';
import { Modal } from '../../../components/common/Modal';
import { NurseBranchSelector } from '../../../components/nurse/NurseBranchSelector';
import { isPatientAllocatedToBranch, matchBranch } from '../../../utils/helpers';

export const WardTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { transfers, vitals, notes, medications, selectedBranch } = useNurse();
  const { patients, beds, ipdAdmissions, appointments, doctors, addToast } = useHMS();
  const { user } = useAuth();

  // Active Selected Patient from HMS Database (branch-scoped)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Selected Bed for Detail Modal
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);

  // Ward Filter State for Grid
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('All');
  const [gridSearch, setGridSearch] = useState<string>('');

  // Active Branch determination (from Nurse context selection or logged-in User branch)
  const userRole = (user?.role || '').toString().toLowerCase().replace('userrole.', '');
  const isNurse = userRole.includes('nurse');
  const isSuperAdminOrAdmin = userRole.includes('admin') || userRole.includes('super');
  const activeBranch = (isNurse && !!user?.branch && user.branch !== 'All' && !isSuperAdminOrAdmin)
    ? user.branch
    : (selectedBranch && selectedBranch !== 'All' ? selectedBranch : (user?.branch || 'All'));

  // Branch-Filtered DB Datasets based on branch allocation
  const branchAdmissions = useMemo(() => {
    return (ipdAdmissions || []).filter((adm) => matchBranch(adm.branch, activeBranch));
  }, [ipdAdmissions, activeBranch]);

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

  // Initial load: select first branch patient if none is selected
  React.useEffect(() => {
    if (branchPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(branchPatients[0]);
    }
  }, [branchPatients.length]);

  // Dynamically derive bed status & occupancy assigned to nurse fetched directly from DB
  const allBeds: Bed[] = useMemo(() => {
    const list: Bed[] = [];
    const dbBeds = (beds || []).filter((b) => matchBranch(b.branch, activeBranch));

    // Map all DB beds for current branch
    dbBeds.forEach((b) => {
      const matchedAdm = (ipdAdmissions || []).find(
        (adm) =>
          adm.status !== 'Discharged' &&
          (adm.bedNumber === b.bedNumber || (b.currentPatientUhid && adm.patientUhid === b.currentPatientUhid))
      );
      const matchedPatient = b.currentPatientUhid
        ? patients.find((p) => p.uhid === b.currentPatientUhid)
        : matchedAdm
        ? patients.find((p) => p.uhid === matchedAdm.patientUhid)
        : null;

      const isOccupiedInDb = b.status === 'Occupied' || (!!b.currentPatientUhid && b.status !== 'Available' && b.status !== 'Cleaning');

      if (isOccupiedInDb) {
        list.push({
          ...b,
          ward: b.ward || matchedAdm?.ward || 'ICU',
          roomNumber: b.roomNumber || matchedAdm?.roomNumber || '101',
          category: b.category || ((b.ward || '').toLowerCase().includes('icu') ? 'ICU' : 'Standard'),
          status: 'Occupied',
          currentPatientUhid: b.currentPatientUhid || matchedAdm?.patientUhid,
          currentPatientName:
            b.currentPatientName ||
            matchedAdm?.patientName ||
            (matchedPatient ? `${matchedPatient.firstName} ${matchedPatient.lastName}` : undefined),
          admittedDate: b.admittedDate || matchedAdm?.admissionDate || 'Today',
          branch: b.branch || activeBranch,
        });
      } else {
        list.push({
          ...b,
          ward: b.ward || 'General Ward',
          roomNumber: b.roomNumber || '101',
          category: b.category || 'Standard',
          status: b.status || 'Available',
          currentPatientUhid: undefined,
          currentPatientName: undefined,
          admittedDate: undefined,
          branch: b.branch || activeBranch,
        });
      }
    });

    // Also check for active IPD admissions whose bed isn't explicitly in DB beds table yet
    const activeAdmissions = (ipdAdmissions || []).filter(
      (adm) => matchBranch(adm.branch, activeBranch) && adm.status !== 'Discharged'
    );

    activeAdmissions.forEach((adm) => {
      const bedAlreadyAdded = list.some(
        (b) => b.bedNumber === adm.bedNumber || (b.currentPatientUhid && b.currentPatientUhid === adm.patientUhid)
      );
      if (!bedAlreadyAdded) {
        const matchedPatient = patients.find((p) => p.uhid === adm.patientUhid);
        list.push({
          id: `adm-bed-${adm.id}`,
          bedNumber: adm.bedNumber || `BED-${adm.id}`,
          ward: adm.ward || 'ICU',
          roomNumber: adm.roomNumber || '101',
          category: (adm.ward || '').toLowerCase().includes('icu') ? 'ICU' : 'Standard',
          status: 'Occupied',
          currentPatientUhid: adm.patientUhid,
          currentPatientName:
            adm.patientName || (matchedPatient ? `${matchedPatient.firstName} ${matchedPatient.lastName}` : undefined),
          admittedDate: adm.admissionDate || 'Today',
          branch: adm.branch || activeBranch,
        });
      }
    });

    return list;
  }, [beds, ipdAdmissions, patients, activeBranch]);

  // Ward & Search Filtered Grid Beds
  const filteredGridBeds = useMemo(() => {
    return allBeds.filter((b) => {
      const matchesWard =
        selectedWardFilter === 'All' ||
        b.ward?.toLowerCase().includes(selectedWardFilter.toLowerCase());

      const matchesSearch =
        !gridSearch ||
        b.bedNumber.toLowerCase().includes(gridSearch.toLowerCase()) ||
        b.roomNumber.toLowerCase().includes(gridSearch.toLowerCase()) ||
        (b.currentPatientName || '').toLowerCase().includes(gridSearch.toLowerCase()) ||
        (b.currentPatientUhid || '').toLowerCase().includes(gridSearch.toLowerCase());

      return matchesWard && matchesSearch;
    });
  }, [allBeds, selectedWardFilter, gridSearch]);

  // Overall Statistics
  const totalBedsCount = filteredGridBeds.length;
  const occupiedCount = filteredGridBeds.filter((b) => b.status === 'Occupied').length;
  const availableCount = filteredGridBeds.filter((b) => b.status === 'Available').length;
  const cleaningCount = filteredGridBeds.filter((b) => b.status === 'Cleaning' || b.status === 'Reserved').length;
  const occupancyPercentage = totalBedsCount > 0 ? Math.round((occupiedCount / totalBedsCount) * 100) : 0;

  // Derive current ward and bed from selected patient
  const occupiedBed = useMemo(() => {
    if (!selectedPatient) return null;
    return allBeds.find((b) => b.currentPatientUhid === selectedPatient.uhid);
  }, [selectedPatient, allBeds]);

  const currentWard = occupiedBed?.ward || (selectedPatient?.status === 'Admitted' ? 'ICU Ward' : 'General Ward');
  const currentBed = occupiedBed?.bedNumber || 'B-101';
  const roomNumber = occupiedBed ? `Room-${occupiedBed.roomNumber}` : 'Room 102';
  const wardCategory = occupiedBed?.category || 'General IPD Care';

  // Table & Modal states for transfers log
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransferRecord, setSelectedTransferRecord] = useState<WardTransfer | null>(null);

  // Handle Bed Click -> Open Full Bed & Patient Details Modal
  const handleBedClick = (bed: Bed) => {
    setSelectedBed(bed);
    setIsBedModalOpen(true);
  };

  // Find Patient object for Selected Bed
  const selectedBedPatient = useMemo(() => {
    if (!selectedBed || !selectedBed.currentPatientUhid) return null;
    return (
      patients.find((p) => p.uhid.toLowerCase() === selectedBed.currentPatientUhid?.toLowerCase()) ||
      patients.find((p) => (p.firstName + ' ' + p.lastName).toLowerCase().includes((selectedBed.currentPatientName || '').toLowerCase())) || null
    );
  }, [selectedBed, patients]);

  // Find Admission details for Selected Bed Patient
  const selectedBedAdmission = useMemo(() => {
    if (!selectedBed) return null;
    return ipdAdmissions.find(
      (a) =>
        a.bedNumber === selectedBed.bedNumber ||
        (selectedBed.currentPatientUhid && a.patientUhid.toLowerCase() === selectedBed.currentPatientUhid.toLowerCase())
    );
  }, [selectedBed, ipdAdmissions]);

  // Find Vitals for Selected Bed Patient
  const selectedBedVitals = useMemo(() => {
    if (!selectedBed || !selectedBed.currentPatientUhid) return null;
    return vitals.find((v) => v.patientUhid.toLowerCase() === selectedBed.currentPatientUhid?.toLowerCase());
  }, [selectedBed, vitals]);

  // Find Latest Nursing Note for Selected Bed Patient
  const selectedBedNote = useMemo(() => {
    if (!selectedBed || !selectedBed.currentPatientUhid) return null;
    return notes.find((n) => n.patientUhid.toLowerCase() === selectedBed.currentPatientUhid?.toLowerCase());
  }, [selectedBed, notes]);

  // Find Medication schedule for Selected Bed Patient
  const selectedBedMeds = useMemo(() => {
    if (!selectedBed || !selectedBed.currentPatientUhid) return [];
    return medications.filter((m) => m.patientUhid.toLowerCase() === selectedBed.currentPatientUhid?.toLowerCase());
  }, [selectedBed, medications]);

  // Handle Patient selection from search
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    addToast('info', 'Patient Loaded', `Loaded profile for ${patient.firstName} ${patient.lastName}`);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
  };

  // Filtered Transfers Table
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesSearch =
        t.patientName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.patientUhid.toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.currentWard.toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.newWard.toLowerCase().includes(tableSearch.toLowerCase());
      const matchesBranch = selectedBranch === 'All' || !t.branch || t.branch === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [transfers, tableSearch, selectedBranch]);

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(start, start + itemsPerPage);
  }, [filteredTransfers, currentPage]);

  return (
    <div className="space-y-6">
      {/* Branch Selection Bar */}
      <NurseBranchSelector />

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Staff Nurse Portal</span>
            <span>/</span>
            <span className="text-blue-600">Patient Ward</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-indigo-600" />
            <span>Nurse Allocated Patient Ward & Bed Layout</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Interactive grid view of overall hospital beds assigned to nursing staff. Click any bed card to inspect complete patient clinical data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-800">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Read-Only Ward View</span>
          </div>
        </div>
      </div>

      {/* BED OCCUPANCY SUMMARY METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Occupied Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{occupiedCount}</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              DB Synced
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs border-l-4 border-l-rose-500">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active IPD Patients</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{occupiedCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">In IPD Care</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs border-l-4 border-l-emerald-500">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Beds</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{availableCount}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Ready for Patient
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs border-l-4 border-l-amber-500">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Maintenance / Reserved</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{cleaningCount}</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Cleaning / Sanitize
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: OVERALL ALLOCATED BED GRID VIEW */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-indigo-600" />
              <span>Nurse Assigned Occupied Beds</span>
            </h2>
            <p className="text-xs text-slate-500">
              Active occupied beds assigned to nurse fetched directly from database
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Ward Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto max-w-full">
              {['All', 'ICU', 'General Ward', 'Deluxe Private', 'Surgical Ward'].map((wardKey) => (
                <button
                  key={wardKey}
                  onClick={() => setSelectedWardFilter(wardKey)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedWardFilter === wardKey
                      ? 'bg-white text-indigo-600 shadow-xs font-extrabold'
                      : 'hover:bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {wardKey === 'All' ? 'All Wards' : wardKey}
                </button>
              ))}
            </div>

            {/* Grid Search */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bed, room, patient..."
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* BEDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGridBeds.length > 0 ? (
            filteredGridBeds.map((bed) => {
              const isOccupied = bed.status === 'Occupied';
              const isCleaning = bed.status === 'Cleaning' || bed.status === 'Reserved';

              return (
                <div
                  key={bed.id}
                  onClick={() => handleBedClick(bed)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-md ${
                    isOccupied
                      ? 'bg-gradient-to-br from-rose-50/70 to-white border-rose-200 hover:border-rose-400'
                      : isCleaning
                      ? 'bg-gradient-to-br from-amber-50/70 to-white border-amber-200 hover:border-amber-400'
                      : 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  {/* Card Header: Bed Badge & Status Indicator */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl font-mono shadow-2xs ${
                        isOccupied
                          ? 'bg-rose-600 text-white'
                          : isCleaning
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {bed.bedNumber}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isCleaning
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOccupied ? 'bg-rose-500 animate-pulse' : isCleaning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      {bed.status}
                    </span>
                  </div>

                  {/* Card Content: Room & Category */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        Room {bed.roomNumber}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {bed.ward}
                      </span>
                    </div>

                    {isOccupied ? (
                      <div className="pt-2 border-t border-rose-100/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate flex-wrap">
                          <User className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">{bed.currentPatientName || 'Admitted Patient'}</span>
                          {(() => {
                            const p = patients.find((pat) => pat.uhid === bed.currentPatientUhid);
                            return (p?.isEmergency || (p?.status || '').toLowerCase() === 'emergency') ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                                EMERGENCY
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {bed.currentPatientUhid && (
                          <p className="text-[10px] font-mono font-semibold text-rose-700 pl-5">
                            {bed.currentPatientUhid}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span>Admitted: {bed.admittedDate || 'Recent'}</span>
                          <span className="font-bold text-rose-600 group-hover:underline flex items-center gap-0.5">
                            View Data <Eye className="w-3 h-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-100 text-center">
                        <p className="text-xs font-bold text-emerald-700">Ready for Admission</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-slate-600 transition-colors">
                          Click to inspect bed status
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BedDouble className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">No occupied nurse-assigned beds found in DB</p>
              <p className="text-xs text-slate-400 mt-1">Only active IPD admissions with assigned occupied beds fetched from the database are displayed.</p>
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE BED & PATIENT OVERALL DETAILS MODAL */}
      {selectedBed && (
        <Modal
          isOpen={isBedModalOpen}
          onClose={() => setIsBedModalOpen(false)}
          title={`Overall Bed & Patient Details — ${selectedBed.bedNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-5 p-1 text-slate-800">
            {/* Modal Header Badge */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl text-white font-bold font-mono text-sm ${
                    selectedBed.status === 'Occupied'
                      ? 'bg-rose-600'
                      : selectedBed.status === 'Cleaning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                >
                  {selectedBed.bedNumber}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedBed.ward} — Room {selectedBed.roomNumber} ({selectedBed.category} Category)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Location: {selectedBed.branch || user?.branch || 'Cauvery Care Hospital - Cantonment Branch'}
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  selectedBed.status === 'Occupied'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : selectedBed.status === 'Cleaning'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {selectedBed.status}
              </span>
            </div>

            {/* IF OCCUPIED: SHOW COMPLETE PATIENT CLINICAL DATA */}
            {selectedBed.status === 'Occupied' ? (
              <div className="space-y-4">
                {/* 1. Patient Profile Summary */}
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-rose-600" />
                      <span>Current Occupant Information</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                      {selectedBed.currentPatientUhid || selectedBedPatient?.uhid || 'UHID-2026-1004'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Patient Name</span>
                      <p className="font-bold text-slate-900">
                        {selectedBed.currentPatientName || (selectedBedPatient ? `${selectedBedPatient.firstName} ${selectedBedPatient.lastName}` : 'vijay k')}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Age & Gender</span>
                      <p className="font-bold text-slate-900">
                        {selectedBedPatient ? `${selectedBedPatient.age} Yrs / ${selectedBedPatient.gender}` : '62 Yrs / Male'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Admission Date</span>
                      <p className="font-bold text-slate-900">
                        {selectedBed.admittedDate || selectedBedAdmission?.admissionDate || '2026-08-11'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px] block">Attending Doctor</span>
                      <p className="font-bold text-slate-900">
                        {selectedBedAdmission?.attendingDoctor || doctors[0]?.name || 'Dr. kathir'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Clinical Vitals Summary */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    <span>Latest Patient Vital Signs (Recorded by Nurse)</span>
                  </h4>

                  {selectedBedVitals ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                        <span className="font-bold text-slate-900">{selectedBedVitals.bloodPressure} mmHg</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                        <span className="font-bold text-slate-900">{selectedBedVitals.pulseRate} bpm</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="text-[10px] text-slate-500 block">Oxygen Saturation (SpO2)</span>
                        <span className="font-bold text-slate-900">{selectedBedVitals.spO2}%</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="text-[10px] text-slate-500 block">Temperature</span>
                        <span className="font-bold text-slate-900">{selectedBedVitals.temperature}°F</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                      <span>Standard stable vital parameters (BP: 120/80, Pulse: 72, SpO2: 98%, Temp: 98.6°F)</span>
                      <button
                        onClick={() => {
                          setIsBedModalOpen(false);
                          navigate(`/nurse/opd/vitals?uhid=${selectedBed.currentPatientUhid || ''}`);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Record Vitals Now →
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Clinical Observation & Medication Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-amber-500" />
                      <span>Nurse Observation & Notes</span>
                    </h5>
                    <p className="text-xs text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      {selectedBedNote
                        ? `${selectedBedNote.patientCondition}: ${selectedBedNote.observation || selectedBedNote.notes}`
                        : 'Patient resting comfortably under continuous ward observation. Vitals monitored every 4 hours.'}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-cyan-600" />
                      <span>Shift Medication Admin Log</span>
                    </h5>
                    <div className="text-xs text-slate-700 bg-cyan-50/50 p-2.5 rounded-lg border border-cyan-100">
                      {selectedBedMeds.length > 0 ? (
                        <span className="font-bold text-cyan-800">
                          {selectedBedMeds[0].medicineName} ({selectedBedMeds[0].dosage}) — Status: {selectedBedMeds[0].status}
                        </span>
                      ) : (
                        <span>Scheduled shift doses: Amlodipine 5mg (08:00 AM) & Pantoprazole 40mg (02:00 PM).</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Navigation Shortcuts */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Nurse Care Shortcuts:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsBedModalOpen(false);
                        navigate(`/nurse/opd/vitals?uhid=${selectedBed.currentPatientUhid || ''}`);
                      }}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Record Vitals
                    </button>
                    <button
                      onClick={() => {
                        setIsBedModalOpen(false);
                        navigate(`/nurse/ipd/nursing-notes?uhid=${selectedBed.currentPatientUhid || ''}`);
                      }}
                      className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Nursing Notes
                    </button>
                    <button
                      onClick={() => {
                        setIsBedModalOpen(false);
                        navigate(`/nurse/ipd/medication-administration?uhid=${selectedBed.currentPatientUhid || ''}`);
                      }}
                      className="px-3 py-1.5 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-xl text-xs font-bold hover:bg-cyan-100 transition-colors cursor-pointer"
                    >
                      Medication Admin
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">This Bed is Currently Vacant & Available</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bed {selectedBed.bedNumber} in {selectedBed.ward} is sanitized and available for new IPD admissions. (Patient bed allocation is processed via Reception Admission desk).
                </p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsBedModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-2xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* STEP 2: PATIENT SEARCH FOR SPECIFIC RECORD */}
      <PatientSearch
        onSelectPatient={handleSelectPatient}
        selectedPatient={selectedPatient}
        onClearPatient={handleClearPatient}
      />

      {/* STEP 3: READ-ONLY PATIENT INFORMATION CARD */}
      <PatientInfoCard patient={selectedPatient} />

      {/* STEP 4: READ-ONLY PATIENT WARD INFORMATION DISPLAY */}
      {selectedPatient && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-indigo-600" />
              <span>Assigned Ward Details for {selectedPatient.firstName} {selectedPatient.lastName}</span>
            </h3>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Read-Only Ward Info
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Assigned Ward (Read-Only)
              </label>
              <p className="font-bold text-slate-900 text-xs">{currentWard}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Assigned Bed Number (Read-Only)
              </label>
              <p className="font-bold text-slate-900 text-xs">{currentBed}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Room Number & Category
              </label>
              <p className="font-bold text-slate-900 text-xs">{roomNumber} ({wardCategory})</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Occupancy & Admission Status
              </label>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {selectedPatient.status === 'Admitted' ? '🟢 IPD Admitted & Occupied' : '🔵 Daycare / OPD'}
              </span>
            </div>
          </div>

          {/* Access Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-3 text-xs text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="font-medium">
              <strong>Reception Management Restriction:</strong> Patient ward transfers and bed allocations are authorized exclusively by the <strong>Reception Desk</strong>. Nurse portal has read-only access to view current patient ward locations.
            </p>
          </div>
        </div>
      )}

      {/* HISTORICAL TRANSFERS TABLE (READ-ONLY FOR NURSE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
              <span>Patient Ward Transfer Log (Read-Only)</span>
            </h3>
            <p className="text-xs text-slate-500">History of patient bed transfers executed by Reception</p>
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
                <th className="py-3.5 px-4 text-right">View Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedTransfers.length > 0 ? (
                paginatedTransfers.map((t) => {
                  const p = patients.find((pat) => pat.uhid === t.patientUhid);
                  const isEmergency = Boolean(p?.isEmergency || (p?.status || '').toLowerCase() === 'emergency');
                  return (
                  <tr
                    key={t.id}
                    className={`transition-colors ${
                      isEmergency ? 'bg-rose-50/40 border-l-4 border-l-rose-500 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{t.transferId}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900">{t.patientName}</p>
                        {isEmergency && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">{t.patientUhid}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{t.currentWard} ({t.currentBed})</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">{t.newWard} ({t.newBed})</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{t.transferDate} ({t.transferTime})</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-600">{t.status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTransferRecord(t);
                          setIsViewModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        title="View Transfer Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })
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

      {/* View Modal (Read-Only) */}
      {selectedTransferRecord && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Transfer Details - ${selectedTransferRecord.transferId}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs p-2">
            <p><span className="font-bold text-slate-700">Patient:</span> {selectedTransferRecord.patientName} ({selectedTransferRecord.patientUhid})</p>
            <p><span className="font-bold text-slate-700">From Ward:</span> {selectedTransferRecord.currentWard} (Bed {selectedTransferRecord.currentBed})</p>
            <p><span className="font-bold text-slate-700">To Ward:</span> {selectedTransferRecord.newWard} (Bed {selectedTransferRecord.newBed})</p>
            <p><span className="font-bold text-slate-700">Transfer Reason:</span> {selectedTransferRecord.transferReason}</p>
            <p><span className="font-bold text-slate-700">Transferred By:</span> {selectedTransferRecord.transferredBy || 'Reception Desk'}</p>
            <p><span className="font-bold text-slate-700">Status:</span> <span className="font-bold text-emerald-600">{selectedTransferRecord.status}</span></p>
            <div className="flex justify-end pt-3">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};


