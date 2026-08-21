import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { Patient } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import {
  Search,
  Filter,
  Eye,
  Edit,
  CalendarPlus,
  BedDouble,
  Building2,
  Calendar,
  Clock,
  Pill,
  FlaskConical,
  Activity,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';

export const SearchPatientPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients, branches, getPatientMedicalHistory } = useHMS();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');

  // Modal for view details & cross-branch history
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'history'>('profile');
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    const q = searchParams.get('query');
    if (q) setQuery(q);
  }, [searchParams]);

  // Extract branch list for dropdown
  const branchOptions = React.useMemo(() => {
    const set = new Set<string>();
    (branches || []).forEach((b) => {
      if (b.branchName) set.add(b.branchName);
    });
    (patients || []).forEach((p) => {
      if (p.branch) set.add(p.branch);
    });
    return Array.from(set);
  }, [branches, patients]);

  // Filtering logic
  const filteredPatients = patients.filter((p) => {
    const qLower = query.toLowerCase().trim();
    const matchesSearch =
      !qLower ||
      (p.uhid || '').toLowerCase().includes(qLower) ||
      (p.firstName || '').toLowerCase().includes(qLower) ||
      (p.lastName || '').toLowerCase().includes(qLower) ||
      (p.mobile || '').includes(qLower) ||
      (p.aadhaar || '').includes(qLower);

    const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesBranch =
      branchFilter === 'All' ||
      (p.branch && p.branch.toLowerCase().trim() === branchFilter.toLowerCase().trim());

    return matchesSearch && matchesGender && matchesStatus && matchesBranch;
  });

  const handleOpenPatientModal = async (patient: Patient) => {
    setSelectedPatient(patient);
    setModalTab('profile');
    setLoadingHistory(true);
    try {
      const hist = await getPatientMedicalHistory(patient.uhid);
      setPatientHistory(hist);
    } catch (e) {
      console.warn('Could not load patient history:', e);
      setPatientHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const totalHistoryCount = patientHistory
    ? (patientHistory.appointments?.length || 0) +
      (patientHistory.admissions?.length || 0) +
      (patientHistory.prescriptions?.length || 0) +
      (patientHistory.labReports?.length || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Title & Filter Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Patient Directory Search</h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                Global Network Directory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Query hospital-wide patient records and clinical history across all hospital branches.
            </p>
          </div>

          <button
            onClick={() => navigate('/reception/patient/register')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            + Register New Patient
          </button>
        </div>

        {/* Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Main Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search UHID, Name, Mobile, or Aadhaar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="sm:col-span-3">
            <div className="relative">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="All">🏥 All Branches (Universal)</option>
                {branchOptions.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Gender Filter */}
          <div className="sm:col-span-2">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active (OPD)</option>
              <option value="Admitted">Admitted (IPD)</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Matching Patients ({filteredPatients.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Registered across all hospital branches
            </span>
          </div>
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setGenderFilter('All');
                setStatusFilter('All');
                setBranchFilter('All');
              }}
              className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">UHID</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Demographics</th>
                <th className="p-4">Mobile & City</th>
                <th className="p-4">Registered Branch</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-blue-600">{p.uhid}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                      <p className="text-[10px] text-slate-500">{p.email || 'No email registered'}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      {p.age} yrs • {p.gender} • <span className="font-semibold text-rose-600">{p.bloodGroup}</span>
                    </td>
                    <td className="p-4 text-slate-600">
                      <p>{p.mobile}</p>
                      <p className="text-[10px] text-slate-400">{p.city || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Building2 className="w-3 h-3 text-indigo-500" />
                        {p.branch || 'Main Campus (BKC)'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'Admitted'
                            ? 'bg-rose-100 text-rose-800'
                            : p.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenPatientModal(p)}
                          title="View Profile & Full Medical History"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/patient/update?uhid=${p.uhid}`)}
                          title="Edit Profile"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/appointment/book?uhid=${p.uhid}`)}
                          title="Book Appointment"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/ipd/admit?uhid=${p.uhid}`)}
                          title="Admit to Ward"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <BedDouble className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No patient records found matching query "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Profile & Medical History Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={`Patient Record: ${selectedPatient.uhid}`}
          subtitle={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
          maxWidth="3xl"
        >
          <div className="space-y-5">
            {/* Header Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                  {selectedPatient.firstName[0]}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedPatient.age} yrs • {selectedPatient.gender} • Blood Group:{' '}
                    <span className="font-bold text-rose-600">{selectedPatient.bloodGroup}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                  <Building2 className="w-3 h-3 text-indigo-600" />
                  {selectedPatient.branch || 'Main Campus (BKC)'}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {selectedPatient.status}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setModalTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Profile Demographics
              </button>
              <button
                onClick={() => setModalTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Cross-Branch Medical History</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    modalTab === 'history' ? 'bg-white text-blue-900' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {totalHistoryCount} Records
                </span>
              </button>
            </div>

            {modalTab === 'profile' ? (
              <div className="space-y-4 text-xs">
                {/* Demographics Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Date of Birth</span>
                    <span className="font-bold text-slate-900">{selectedPatient.dob || 'N/A'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Marital Status</span>
                    <span className="font-bold text-slate-900">{selectedPatient.maritalStatus || 'Single'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Nationality</span>
                    <span className="font-bold text-slate-900">{selectedPatient.nationality || 'Indian'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Mobile</span>
                    <span className="font-bold text-slate-900">{selectedPatient.mobile}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Email</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedPatient.email || 'None'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Aadhaar Number</span>
                    <span className="font-bold text-slate-900">{selectedPatient.aadhaar || 'N/A'}</span>
                  </div>
                </div>

                {/* Address */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">Residential Address</span>
                  <span className="font-bold text-slate-900">
                    {selectedPatient.address ? `${selectedPatient.address}, ` : ''}{selectedPatient.city ? `${selectedPatient.city}, ` : ''}{selectedPatient.state ? `${selectedPatient.state} - ` : ''}{selectedPatient.pincode || ''}
                  </span>
                </div>

                {/* Emergency & Medical */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                    <h5 className="font-bold text-rose-900 mb-1">Emergency Contact</h5>
                    <p className="text-slate-700 font-semibold">{selectedPatient.emergencyContactName || 'None'} ({selectedPatient.emergencyRelationship || 'N/A'})</p>
                    <p className="text-slate-600 font-bold mt-0.5">{selectedPatient.emergencyPhone || 'N/A'}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <h5 className="font-bold text-indigo-900 mb-1">Insurance Policy</h5>
                    <p className="text-slate-700 font-semibold">{selectedPatient.insuranceProvider || 'None Logged'}</p>
                    <p className="text-slate-600 font-bold mt-0.5">{selectedPatient.insuranceNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {loadingHistory ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Loading cross-branch history...
                  </div>
                ) : (
                  <>
                    {/* Past Appointments & Consultations */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Past Appointments & Consultations ({patientHistory?.appointments?.length || 0})
                      </h5>
                      {patientHistory?.appointments && patientHistory.appointments.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.appointments.map((apt: any) => (
                            <div
                              key={apt.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{apt.doctorName}</span>
                                  <span className="text-[10px] text-indigo-600 font-semibold">({apt.department})</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-700 border border-slate-300">
                                    🏥 {apt.branch}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">{apt.reason || 'Routine Consultation'}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-[11px] font-bold text-slate-700 block">{apt.date} {apt.timeSlot}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {apt.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No previous appointments recorded.
                        </p>
                      )}
                    </div>

                    {/* Inpatient (IPD) Admissions */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-emerald-600" />
                        Inpatient (IPD) Admissions ({patientHistory?.admissions?.length || 0})
                      </h5>
                      {patientHistory?.admissions && patientHistory.admissions.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.admissions.map((adm: any) => (
                            <div
                              key={adm.id}
                              className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{adm.ward} - Bed {adm.bedNumber}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    🏥 {adm.branch}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">Doctor: {adm.attendingDoctor} • Reason: {adm.admissionReason}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-[11px] font-bold text-slate-700 block">Admitted: {adm.admissionDate}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  {adm.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No previous IPD admissions found.
                        </p>
                      )}
                    </div>

                    {/* Prescriptions & Medications */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-amber-600" />
                        Prescriptions & Medications ({patientHistory?.prescriptions?.length || 0})
                      </h5>
                      {patientHistory?.prescriptions && patientHistory.prescriptions.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.prescriptions.map((rx: any) => (
                            <div
                              key={rx.id}
                              className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{rx.prescriptionNumber}</span>
                                  <span className="text-[11px] text-slate-600">by {rx.doctorName}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    🏥 {rx.branch}
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500 font-semibold">{rx.date}</span>
                              </div>
                              {rx.medicines && Array.isArray(rx.medicines) && rx.medicines.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {rx.medicines.map((m: any, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] border border-amber-200">
                                      {m.name || m.medicineName} ({m.dosage || m.frequency})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No previous prescriptions recorded.
                        </p>
                      )}
                    </div>

                    {/* Lab & Diagnostic Reports */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-purple-600" />
                        Lab & Diagnostic Investigations ({patientHistory?.labReports?.length || 0})
                      </h5>
                      {patientHistory?.labReports && patientHistory.labReports.length > 0 ? (
                        <div className="space-y-2">
                          {patientHistory.labReports.map((lr: any) => (
                            <div
                              key={lr.id}
                              className="p-3 rounded-xl bg-purple-50/40 border border-purple-200 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{lr.reportNumber}</span>
                                  <span className="text-[11px] text-slate-600">by {lr.doctorName}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                    🏥 {lr.branch}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {lr.status}
                                </span>
                              </div>
                              {lr.tests && Array.isArray(lr.tests) && (
                                <p className="text-[11px] text-purple-900 font-semibold">
                                  Tests: {lr.tests.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No previous lab reports found.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/reception/appointment/book?uhid=${selectedPatient.uhid}`)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Book Appointment
                </button>
                <button
                  onClick={() => navigate(`/reception/ipd/admit?uhid=${selectedPatient.uhid}`)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BedDouble className="w-3.5 h-3.5 text-emerald-600" /> Admit to Ward
                </button>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
