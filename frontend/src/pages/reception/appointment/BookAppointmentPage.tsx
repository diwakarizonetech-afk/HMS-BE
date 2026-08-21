import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchBranchesApi, fetchNursesApi } from '../../../services/api';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { CalendarPlus, RotateCcw, CheckCircle2, Building2, Clock, User, ShieldCheck, XCircle, Inbox, Siren } from 'lucide-react';

export const BookAppointmentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients, departments, doctors, appointments, bookAppointment, updateAppointment, cancelAppointment, addToast, branches, notifications, markNotificationRead } = useHMS();
  const { user } = useAuth();

  const userBranch = user?.branch || 'Main Branch';
  const [selectedBranch, setSelectedBranch] = useState<string>(userBranch);
  const [branchesList, setBranchesList] = useState<string[]>([
    'Main Branch',
    'City Center Branch',
    'North Wing Branch',
    'East Wing Branch',
  ]);

  const [activeTab, setActiveTab] = useState<'book' | 'requests'>('book');
  const [bookingMode, setBookingMode] = useState<'normal' | 'emergency'>('normal');

  const [selectedUhid, setSelectedUhid] = useState(searchParams.get('uhid') || '');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [aptDate, setAptDate] = useState(searchParams.get('date') || getCurrentDateFormatted());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState(searchParams.get('reason') || (searchParams.get('date') ? 'Doctor Assigned Follow-Up Visit' : ''));
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [emergencyAge, setEmergencyAge] = useState<number | ''>('');
  const [emergencyGender, setEmergencyGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [emergencyBloodGroup, setEmergencyBloodGroup] = useState('O+');
  const [emergencyNurse, setEmergencyNurse] = useState('');
  const [nursesList, setNursesList] = useState<{ id: string; name: string }[]>([]);
  const [bookingResult, setBookingResult] = useState<{ uhid: string; token: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch branches from API or merge with defaults
  useEffect(() => {
    fetchBranchesApi()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((b: any) => b.branch_name || b.branchName).filter(Boolean);
          if (names.length > 0) {
            setBranchesList(Array.from(new Set([...names, userBranch, 'Main Branch', 'City Center Branch', 'North Wing Branch', 'East Wing Branch'])));
          }
        }
      })
      .catch(() => null);
  }, [userBranch]);

  useEffect(() => {
    if (branches && branches.length > 0) {
      const names = branches.map((b) => b.branchName).filter(Boolean);
      if (names.length > 0) {
        setBranchesList((prev) => Array.from(new Set([...names, ...prev, userBranch])));
      }
    }
  }, [branches, userBranch]);

  // Sync selectedUhid with patients list
  useEffect(() => {
    if (!selectedUhid && patients.length > 0) {
      setSelectedUhid(patients[0].uhid);
    }
  }, [patients, selectedUhid]);

  // Initialize department
  useEffect(() => {
    if (departments.length > 0 && !selectedDept) {
      setSelectedDept(departments[0].name);
    }
  }, [departments, selectedDept]);

  useEffect(() => {
    if (bookingMode !== 'emergency') return;
    fetchNursesApi(selectedBranch, selectedDept)
      .then((nurses) => {
        const list = (nurses || []).map((n: any) => ({ id: n.id, name: n.name })).filter((n: { name?: string }) => n.name);
        setNursesList(list);
        if (!list.some((n) => n.name === emergencyNurse)) setEmergencyNurse(list[0]?.name || '');
      })
      .catch(() => {
        setNursesList([]);
        setEmergencyNurse('');
      });
  }, [bookingMode, selectedBranch, selectedDept]);

  // Doctors filtered by selected branch & department with intelligent fallbacks
  const filteredDoctors = React.useMemo(() => {
    if (!doctors || doctors.length === 0) return [];

    const selBranch = (selectedBranch || '').toLowerCase().trim();
    const selDeptRaw = (selectedDept || '').toLowerCase().trim();
    // Clean parenthetical code, e.g. "Orthopedics (ORTH)" -> "orthopedics"
    const selDeptClean = selDeptRaw.replace(/\s*\([^)]*\)/g, '').trim();

    // 1. Strict match: branch + department
    let matches = doctors.filter((d) => {
      const docBranch = (d.branch || '').toLowerCase().trim();
      const matchBranch =
        !selectedBranch ||
        selectedBranch === 'All' ||
        !docBranch ||
        docBranch === 'main branch' ||
        docBranch.includes(selBranch) ||
        selBranch.includes(docBranch);

      const docDept = (d.department || '').toLowerCase().trim();
      const matchDept =
        !selectedDept ||
        selectedDept === 'All' ||
        docDept.includes(selDeptClean) ||
        selDeptClean.includes(docDept);

      return matchBranch && matchDept;
    });

    if (matches.length > 0) return matches;

    // 2. Fallback 1: Match department across all branches
    if (selectedDept && selectedDept !== 'All') {
      matches = doctors.filter((d) => {
        const docDept = (d.department || '').toLowerCase().trim();
        return docDept.includes(selDeptClean) || selDeptClean.includes(docDept);
      });
      if (matches.length > 0) return matches;
    }

    // 3. Fallback 2: Match branch across all departments
    if (selectedBranch && selectedBranch !== 'All') {
      matches = doctors.filter((d) => {
        const docBranch = (d.branch || '').toLowerCase().trim();
        return (
          !docBranch ||
          docBranch === 'main branch' ||
          docBranch.includes(selBranch) ||
          selBranch.includes(docBranch)
        );
      });
      if (matches.length > 0) return matches;
    }

    // 4. Fallback 3: Return all available doctors
    return doctors;
  }, [doctors, selectedBranch, selectedDept]);

  useEffect(() => {
    if (filteredDoctors.length > 0) {
      if (!filteredDoctors.some((d) => d.id === selectedDoctorId)) {
        setSelectedDoctorId(filteredDoctors[0].id);
        if (filteredDoctors[0].slots && filteredDoctors[0].slots.length > 0) {
          setSelectedSlot(filteredDoctors[0].slots[0]);
        }
      }
    } else {
      setSelectedDoctorId('');
      setSelectedSlot('');
    }
  }, [selectedBranch, selectedDept, filteredDoctors, selectedDoctorId]);

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId) || filteredDoctors[0];

  // Pending Online Requests for selected branch
  const pendingRequests = appointments.filter((a) => {
    const st = (a.status || '').toString().toLowerCase();
    const isPending = st === 'requested' || st === 'pending';
    if (!isPending) return false;

    const source = ((a as any).bookingSource || (a as any).source || '').toString().toLowerCase();
    if (source === 'direct' || source === 'reception') return false;

    const br = (a.branch || '').toLowerCase().trim();
    const selBr = (selectedBranch || '').toLowerCase().trim();
    const matchBranch = !selectedBranch || selectedBranch === 'All' || !br || br === 'main branch' || br.includes(selBr) || selBr.includes(br);
    return matchBranch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorObj) return;
    const patientObj = patients.find((p) => p.uhid === selectedUhid) || patients[0];
    if (bookingMode === 'normal' && !patientObj) return;
    if (bookingMode === 'emergency' && (!emergencyName.trim() || !emergencyMobile.trim() || emergencyAge === '')) return;

    const patientFullName = bookingMode === 'emergency'
      ? emergencyName.trim()
      : `${patientObj.firstName} ${patientObj.lastName}`.trim();

    const created = await bookAppointment({
      patientUhid: bookingMode === 'emergency' ? '' : patientObj.uhid,
      patientName: patientFullName,
      patientMobile: bookingMode === 'emergency' ? emergencyMobile : patientObj.mobile,
      department: selectedDoctorObj.department || selectedDept,
      doctorId: selectedDoctorObj.id,
      doctorName: selectedDoctorObj.name,
      date: aptDate,
      timeSlot: selectedSlot || '10:00 AM',
      reason,
      branch: selectedBranch || selectedDoctorObj.branch || userBranch,
      status: 'Scheduled',
      bookingSource: 'Direct',
      isEmergency: bookingMode === 'emergency',
      priority: bookingMode === 'emergency' ? 1 : 0,
      bloodGroup: bookingMode === 'emergency' ? emergencyBloodGroup : patientObj.bloodGroup,
      assignedNurse: bookingMode === 'emergency' ? emergencyNurse : undefined,
    } as any);

    // Clear matching follow-up notifications so they disappear from reception alerts upon booking confirmation
    const notifIdParam = searchParams.get('notifId');
    if (notifIdParam) {
      markNotificationRead(notifIdParam);
    }
    if (patientObj?.uhid) {
      const followUpNotifs = notifications.filter(
        (n) =>
          (n.eventType === 'follow_up_assigned' || (n.title && n.title.toLowerCase().includes('follow-up'))) &&
          (n.relatedRecordId === patientObj.uhid || n.message.includes(patientObj.uhid))
      );
      followUpNotifs.forEach((n) => markNotificationRead(n.id));
    }

    if (bookingMode === 'emergency') {
      setBookingResult({ uhid: created.patientUhid, token: created.tokenNumber || '' });
    } else {
      navigate('/reception/appointment/queue');
    }
  };

  const handleConfirmRequest = async (aptId: string) => {
    setProcessingId(aptId);
    try {
      await updateAppointment(aptId, { status: 'Scheduled' as any });
      const targetApt = appointments.find((a) => a.id === aptId);
      if (targetApt?.patientUhid) {
        const followUpNotifs = notifications.filter(
          (n) =>
            (n.eventType === 'follow_up_assigned' || (n.title && n.title.toLowerCase().includes('follow-up'))) &&
            (n.relatedRecordId === targetApt.patientUhid || n.message.includes(targetApt.patientUhid))
        );
        followUpNotifs.forEach((n) => markNotificationRead(n.id));
      }
      addToast('success', 'Appointment Confirmed', `Appointment #${aptId} confirmed & added to live queue!`);
    } catch (err: any) {
      addToast('error', 'Error', err?.message || 'Failed to confirm appointment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (aptId: string) => {
    setProcessingId(aptId);
    try {
      await cancelAppointment(aptId, 'Rejected by Reception Desk');
      addToast('info', 'Request Rejected', `Appointment request #${aptId} rejected.`);
    } catch (err: any) {
      addToast('error', 'Error', err?.message || 'Failed to reject appointment request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReset = () => {
    setSelectedBranch(userBranch);
    setSelectedDept(departments[0]?.name || '');
    setAptDate(getCurrentDateFormatted());
    setReason('');
  };

  return (
    <div className="space-y-6">
      {/* Title Header & Branch Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">OPD Appointments Portal</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Building2 className="w-3 h-3" />
              {selectedBranch}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Book appointments or process online appointment requests submitted by patients to your branch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-slate-800 outline-none font-bold cursor-pointer"
            >
              {branchesList.map((bName) => (
                <option key={bName} value={bName}>
                  {bName} {bName === userBranch ? '(Assigned Branch)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('book')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${activeTab === 'book'
              ? 'border-blue-600 text-blue-700 bg-blue-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Direct OPD Appointment Booking</span>
        </button>
        <button
          type="button"
          onClick={() => { setBookingMode('emergency'); setActiveTab('book'); }}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${bookingMode === 'emergency' ? 'border-rose-600 text-rose-700 bg-rose-50/40 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Siren className="w-4 h-4" />
          <span>Emergency OPD Booking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 ${activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Pending Online Requests</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DIRECT OPD BOOKING FORM */}
      {activeTab === 'book' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-fadeIn">
          <div className={`p-4 rounded-xl border ${bookingMode === 'emergency' ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-100'}`}>
            <p className={`text-xs font-bold ${bookingMode === 'emergency' ? 'text-rose-800' : 'text-blue-800'}`}>
              {bookingMode === 'emergency' ? 'Emergency mode: type the patient details. A new Patient record and UHID will be created.' : 'Normal OPD mode: select an existing registered patient.'}
            </p>
          </div>
          {bookingMode === 'emergency' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Name *</label>
                <input required value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5" placeholder="Type emergency patient name" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile / Contact *</label>
                <input required value={emergencyMobile} onChange={(e) => setEmergencyMobile(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5" placeholder="Contact number" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Age *</label>
                <input required type="number" min={0} max={120} value={emergencyAge} onChange={(e) => setEmergencyAge(e.target.value ? Number(e.target.value) : '')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                <select value={emergencyGender} onChange={(e) => setEmergencyGender(e.target.value as typeof emergencyGender)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Blood Group *</label>
                <select value={emergencyBloodGroup} onChange={(e) => setEmergencyBloodGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Nurse *</label>
                <select required value={emergencyNurse} onChange={(e) => setEmergencyNurse(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <option value="">Select nurse</option>
                  {nursesList.map((nurse) => <option key={nurse.id} value={nurse.name}>{nurse.name}</option>)}
                </select>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Hospital Branch Selector */}
            <div>
              <label className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Hospital Branch *</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-blue-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                {branchesList.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName} {bName === userBranch ? '(Your Assigned Branch)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {bookingMode === 'normal' && <div>
              <label className="block font-bold text-slate-700 mb-1">Select Patient (UHID) *</label>
              <select
                value={selectedUhid}
                onChange={(e) => setSelectedUhid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.uhid}>
                    {p.uhid} - {p.firstName} {p.lastName} ({p.mobile})
                  </option>
                ))}
              </select>
            </div>}

            {/* Department Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department *</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                {departments.map((d) => {
                  const deptName = d.name || (d as any).departmentName || '';
                  const deptCode = d.code || (d as any).departmentCode || '';
                  return (
                    <option key={d.id} value={deptName}>
                      {deptName}{deptCode ? ` (${deptCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Attending Doctor (Branch & Dept Scoped) */}
            <div>
              <label className="font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Attending Doctor *</span>
                <span className="text-[10px] font-semibold text-slate-400">Scoped to {selectedBranch}</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                {filteredDoctors.length === 0 ? (
                  <option value="">No doctors registered in system</option>
                ) : (
                  filteredDoctors.map((doc) => {
                    const docBranchName = doc.branch || 'Main Branch';
                    const docDeptName = doc.department || doc.specialization || 'General Medicine';
                    return (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} — {doc.specialization} ({docDeptName}, {docBranchName}) (Fee: ₹{doc.consultationFee})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Date Picker */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={aptDate}
                onChange={(e) => setAptDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Time Slot Selector */}
          {selectedDoctorObj ? (
            <div>
              <label className="block font-bold text-slate-700 mb-2">
                Available Time Slots ({selectedDoctorObj.name} - {selectedBranch}) *
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedDoctorObj.slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedSlot === slot
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              Please select a department with available doctors in {selectedBranch} to view time slots.
            </div>
          )}

          {/* Reason for Visit */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Reason for Appointment *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chest discomfort, Follow-up consultation"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={!selectedDoctorObj}
              className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs text-white transition-all ${selectedDoctorObj
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-70'
                }`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Confirm Appointment ({selectedBranch})</span>
            </button>
          </div>
        </form>
      )}

      {bookingResult && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-extrabold text-rose-900 flex items-center gap-2"><Siren className="w-5 h-5" /> Emergency OPD Patient Registered</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white rounded-xl border border-rose-100 p-3"><span className="text-slate-400 block">Generated UHID</span><strong className="text-blue-700">{bookingResult.uhid}</strong></div>
            <div className="bg-white rounded-xl border border-rose-100 p-3"><span className="text-slate-400 block">Emergency Token</span><strong className="text-rose-700">{bookingResult.token}</strong></div>
            <div className="bg-white rounded-xl border border-rose-100 p-3"><span className="text-slate-400 block">Flow</span><strong className="text-slate-800">Normal OPD Doctor Queue</strong></div>
          </div>
          <button type="button" onClick={() => navigate('/reception/appointment/queue')} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer">Open Priority Queue</button>
        </div>
      )}

      {/* TAB 2: PENDING ONLINE APPOINTMENT REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Online Patient Requests for {selectedBranch} ({pendingRequests.length})
              </h2>
              <p className="text-xs text-slate-500">
                Review appointment requests submitted by patients online. Check doctor availability and confirm or adjust booking.
              </p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
              <p className="font-bold text-slate-700 text-sm">No Pending Online Requests</p>
              <p className="text-xs">All online appointment requests for {selectedBranch} have been processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...pendingRequests]
                .sort((a, b) => (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0))
                .map((req) => (
                <div
                  key={req.id}
                  className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between transition-colors ${
                    req.isEmergency
                      ? 'border-rose-300 bg-rose-50/50 border-l-4 border-l-rose-500'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          req.isEmergency ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          Online Booking Request
                        </span>
                        {req.isEmergency && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">{req.id}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{req.patientName || 'Online Patient'}</h3>
                      <p className="text-xs text-slate-600">
                        UHID: <strong className="text-slate-800">{req.patientUhid || 'Pending'}</strong> • Mobile: {req.patientMobile || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-bold text-blue-700">{req.department || 'General Medicine'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requested Doctor:</span>
                        <span className="font-bold text-slate-800">{req.doctorName || 'Any Available Doctor'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requested Date & Slot:</span>
                        <span className="font-black text-emerald-700">{req.date} {req.timeSlot ? `@ ${req.timeSlot}` : ''}</span>
                      </div>
                      {req.reason && (
                        <div className="pt-1 text-[11px] text-slate-600 italic border-t border-slate-100">
                          "{req.reason}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-amber-100">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleConfirmRequest(req.id)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Schedule</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
