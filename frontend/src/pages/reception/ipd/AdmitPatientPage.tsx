import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { useER } from '../../../context/ERContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchNursesApi, fetchBedsApi } from '../../../services/api';
import { Bed, WardType, Patient } from '../../../types/hms';
import { getCurrentDateFormatted } from '../../../utils/helpers';
import { BedDouble, Save, UserPlus2, ShieldCheck, HeartPulse } from 'lucide-react';

export const AdmitPatientPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients, beds, doctors, admitPatient, refreshData } = useHMS();
  const { erVisits } = useER();
  const { user } = useAuth();

  const [apiBeds, setApiBeds] = useState<Bed[]>([]);
  const [selectedUhid, setSelectedUhid] = useState(searchParams.get('uhid') || '');
  const [selectedWard, setSelectedWard] = useState<WardType>('ICU');
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState(getCurrentDateFormatted());
  const [attendingDoctor, setAttendingDoctor] = useState(doctors[0]?.name || 'Dr. Vikram Malhotra');
  const [attendingNurse, setAttendingNurse] = useState('Nurse Anjali Rao');
  const [admissionReason, setAdmissionReason] = useState('Acute hypertensive observation');

  const [nursesList, setNursesList] = useState<{ id: string; name: string; assignedWard?: string }[]>([]);

  // Consolidate patients from Patient Master, ER Visits, and URL parameter
  const allSelectablePatients = useMemo(() => {
    const map = new Map<string, { uhid: string; name: string; info: string }>();

    patients.forEach((p) => {
      if (p && p.uhid) {
        map.set(p.uhid, {
          uhid: p.uhid,
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Patient',
          info: `${p.gender || 'Unknown'}, ${p.age ?? 'N/A'}y`,
        });
      }
    });

    erVisits.forEach((v) => {
      const uhid = v.patientUhid || (v as any).uhid;
      if (uhid && !map.has(uhid)) {
        const rawName = v.patientName || (v as any).patient_name || 'Emergency Patient';
        map.set(uhid, {
          uhid: uhid,
          name: rawName,
          info: `${v.gender || 'Unknown'}, ${v.age ?? 'N/A'}y (ER Visit: ${v.id || ''})`,
        });
      }
    });

    const paramUhid = searchParams.get('uhid');
    if (paramUhid && !map.has(paramUhid)) {
      map.set(paramUhid, {
        uhid: paramUhid,
        name: 'Emergency Patient',
        info: 'ER Referral',
      });
    }

    return Array.from(map.values());
  }, [patients, erVisits, searchParams]);

  // Set default selected UHID if searchParam exists or default to first patient
  useEffect(() => {
    const paramUhid = searchParams.get('uhid');
    if (paramUhid) {
      setSelectedUhid(paramUhid);
    } else if (allSelectablePatients.length > 0 && !selectedUhid) {
      setSelectedUhid(allSelectablePatients[0].uhid);
    }
  }, [searchParams, allSelectablePatients]);

  // Pre-fill ER referral details (ward, doctor, complaint) when an ER patient is selected
  useEffect(() => {
    if (!selectedUhid) return;
    const erMatch = erVisits.find((v) => (v.patient_uhid || v.patientUhid || (v as any).uhid) === selectedUhid);
    if (erMatch) {
      if (erMatch.required_ward) {
        const w = erMatch.required_ward;
        const normW = w.toLowerCase().includes('icu')
          ? 'ICU'
          : w.toLowerCase().includes('general')
          ? 'General Ward'
          : w.toLowerCase().includes('suite')
          ? 'Deluxe Suite'
          : w.toLowerCase().includes('private') || w.toLowerCase().includes('deluxe')
          ? 'Deluxe Private'
          : w.toLowerCase().includes('semi')
          ? 'Semi-Private'
          : w.toLowerCase().includes('surgical')
          ? 'Surgical Ward'
          : 'ICU';
        setSelectedWard(normW as WardType);
      }
      if (erMatch.chief_complaint || erMatch.disposition_notes) {
        setAdmissionReason(erMatch.chief_complaint || erMatch.disposition_notes || 'ER Inpatient Admission');
      }
      if (erMatch.assigned_doctor || (erMatch as any).assignedDoctor) {
        const doc = erMatch.assigned_doctor || (erMatch as any).assignedDoctor;
        if (doc) setAttendingDoctor(doc);
      }
    }
  }, [selectedUhid, erVisits]);

  const selectedPatientObj = useMemo(() => {
    const found = patients.find((p) => p.uhid === selectedUhid);
    if (found) return found;

    const erFound = erVisits.find((v) => (v.patientUhid || (v as any).uhid) === selectedUhid);
    if (erFound) {
      const rawName = erFound.patientName || (erFound as any).patient_name || 'Emergency Patient';
      const nameParts = typeof rawName === 'string' ? rawName.split(' ') : ['Emergency', 'Patient'];
      return {
        id: erFound.id,
        uhid: erFound.patientUhid || (erFound as any).uhid || selectedUhid,
        firstName: nameParts[0] || 'Emergency',
        lastName: nameParts.slice(1).join(' ') || 'Patient',
        gender: erFound.gender || 'Unknown',
        age: erFound.age || 0,
        bloodGroup: erFound.bloodGroup || 'O+',
        mobile: erFound.phone || (erFound as any).mobile || '',
        emergencyContactName: erFound.emergencyContactName || 'N/A',
        emergencyPhone: erFound.emergencyContactPhone || (erFound as any).emergencyPhone || 'N/A',
        emergencyRelationship: erFound.emergencyRelationship || 'N/A',
        allergies: erFound.allergies || [],
        existingDiseases: erFound.existingDiseases || [],
        branch: erFound.branch || user?.branch || 'Main Hospital',
      } as any;
    }

    return {
      id: 'temp-id',
      uhid: selectedUhid || 'UHID-2026-1001',
      firstName: 'Emergency',
      lastName: 'Patient',
      gender: 'Male',
      age: 30,
      bloodGroup: 'O+',
      mobile: '+91 98765 43210',
      branch: user?.branch || 'Main Hospital',
    } as any;
  }, [selectedUhid, patients, erVisits, user]);

  const activeBranch = user?.branch || selectedPatientObj?.branch;

  // Fetch real Admin allocated beds directly from DB API on mount
  useEffect(() => {
    let isMounted = true;
    fetchBedsApi(activeBranch || user?.branch)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setApiBeds(data);
        }
      })
      .catch((err) => console.warn('Error fetching Admin beds:', err));
    refreshData();
    return () => {
      isMounted = false;
    };
  }, [activeBranch, user]);

  useEffect(() => {
    let isMounted = true;
    fetchNursesApi(activeBranch)
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setNursesList(data);
          if (!attendingNurse || !data.some((n: any) => n.name === attendingNurse)) {
            setAttendingNurse(data[0].name);
          }
        }
      })
      .catch((err) => console.warn('Error fetching nurses from DB:', err));
    return () => {
      isMounted = false;
    };
  }, [activeBranch]);

  // Merge and deduplicate beds created by Admin
  const allAdminBeds = useMemo(() => {
    const combined = [...apiBeds, ...beds];
    const map = new Map<string, Bed>();
    combined.forEach((b) => {
      const bNum = (b.bedNumber || (b as any).bedNo || '').trim();
      if (!bNum) return;
      const key = bNum.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: b.id || `bed-${bNum}`,
          bedNumber: bNum,
          ward: b.ward || (b as any).wardType || 'General Ward',
          roomNumber: b.roomNumber || 'R-101',
          category: b.category || 'Standard',
          status: b.status || 'Available',
          currentPatientUhid: b.currentPatientUhid,
          currentPatientName: b.currentPatientName,
          admittedDate: b.admittedDate,
          branch: b.branch,
        });
      }
    });
    return Array.from(map.values());
  }, [apiBeds, beds]);

  // Helper function for flexible ward matching
  const matchWard = (bedWard: string = '', targetWard: string = ''): boolean => {
    const b = (bedWard || '').toLowerCase().trim();
    const t = (targetWard || '').toLowerCase().trim();
    if (!b || !t) return true;
    if (b === t) return true;
    if (b.includes(t) || t.includes(b)) return true;
    if (t.includes('icu') && b.includes('icu')) return true;
    if ((t.includes('deluxe') || t.includes('suite') || t.includes('private')) && (b.includes('deluxe') || b.includes('suite') || b.includes('private'))) return true;
    if (t.includes('general') && b.includes('general')) return true;
    if (t.includes('semi') && b.includes('semi')) return true;
    if (t.includes('surgical') && b.includes('surgical')) return true;
    return false;
  };

  // Helper for normalized branch matching
  const matchBranch = (bedBranch?: string, targetBranch?: string): boolean => {
    if (!targetBranch || targetBranch.toLowerCase() === 'all') return true;
    if (!bedBranch) return true;
    const b = bedBranch.toLowerCase().trim();
    const t = targetBranch.toLowerCase().trim();
    if (b === t || b.includes(t) || t.includes(b)) return true;
    const bClean = b.replace(/[\s\-_]+/g, '');
    const tClean = t.replace(/[\s\-_]+/g, '');
    if (bClean.includes(tClean) || tClean.includes(bClean)) return true;
    const bWords = b.split(/[\s\-_]+/).filter((w) => w && !['branch', 'hospital', 'cauvery', 'care', 'hms'].includes(w));
    const tWords = t.split(/[\s\-_]+/).filter((w) => w && !['branch', 'hospital', 'cauvery', 'care', 'hms'].includes(w));
    return bWords.some((bw) => tWords.some((tw) => bw.includes(tw) || tw.includes(bw)));
  };

  const isAvailable = (status: string = ''): boolean => {
    const s = (status || '').toLowerCase().trim();
    return s === 'available' || s === 'vacant' || s === 'free' || s === 'unoccupied' || s === '';
  };

  // Filter available beds for chosen ward & active branch with deduplication & dynamic fallback
  const availableBedsList = useMemo(() => {
    const seenKeys = new Set<string>();
    const list: Bed[] = [];
    const currentBranch = activeBranch || user?.branch;

    // 1. Primary: Match selected ward & matching branch & status Available
    allAdminBeds.forEach((b) => {
      const key = b.bedNumber.toLowerCase();
      const isAvail = isAvailable(b.status);
      const isWardMatch = matchWard(b.ward, selectedWard);
      const isBranchMatch = matchBranch(b.branch, currentBranch);
      if (isAvail && isWardMatch && isBranchMatch && !seenKeys.has(key)) {
        seenKeys.add(key);
        list.push(b);
      }
    });

    // 2. Secondary: If no bed in specific ward, include other available beds matching branch
    if (list.length === 0) {
      allAdminBeds.forEach((b) => {
        const key = b.bedNumber.toLowerCase();
        const isAvail = isAvailable(b.status);
        const isBranchMatch = matchBranch(b.branch, currentBranch);
        if (isAvail && isBranchMatch && !seenKeys.has(key)) {
          seenKeys.add(key);
          list.push(b);
        }
      });
    }

    // 3. Dynamic Fallback: Generate available beds for selected ward if no bed configured in DB
    if (list.length === 0) {
      const prefix = selectedWard === 'ICU' ? 'ICU' : selectedWard.split(' ').map((w) => w[0]).join('').toUpperCase();
      for (let i = 1; i <= 5; i++) {
        const bNum = `${prefix}-BED-0${i}`;
        list.push({
          id: `fallback-${bNum.toLowerCase()}`,
          bedNumber: bNum,
          ward: selectedWard,
          roomNumber: `R-${100 + i}`,
          category: 'Standard',
          status: 'Available',
        });
      }
    }

    return list;
  }, [allAdminBeds, selectedWard, activeBranch, user]);

  useEffect(() => {
    if (availableBedsList.length > 0) {
      setSelectedBedNumber(availableBedsList[0].bedNumber);
    } else {
      setSelectedBedNumber('');
    }
  }, [selectedWard, availableBedsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientObj) return;

    const chosenBed = allAdminBeds.find(
      (b) => (b.bedNumber || '').trim().toLowerCase() === (selectedBedNumber || '').trim().toLowerCase()
    );

    const emergencyContactStr =
      selectedPatientObj.emergencyContactName && selectedPatientObj.emergencyContactName !== 'N/A'
        ? `${selectedPatientObj.emergencyContactName} (${selectedPatientObj.emergencyPhone || 'N/A'})`
        : 'N/A';

    const normalizedWard = selectedWard || (chosenBed?.ward?.toLowerCase().includes('icu') ? 'ICU' : chosenBed?.ward) || 'ICU';

    try {
      await admitPatient({
        patientUhid: selectedPatientObj.uhid,
        patientName: `${selectedPatientObj.firstName} ${selectedPatientObj.lastName}`,
        ward: normalizedWard,
        roomNumber: chosenBed?.roomNumber || 'R-101',
        bedNumber: selectedBedNumber || chosenBed?.bedNumber || 'B-101',
        bedId: chosenBed?.id,
        admissionDate: admissionDate || new Date().toISOString().split('T')[0],
        attendingDoctor: attendingDoctor || 'Dr. Medical Specialist',
        attendingNurse: attendingNurse || 'Staff Nurse',
        admissionReason: admissionReason || 'Observation & Care',
        emergencyContact: emergencyContactStr,
        insuranceProvider: selectedPatientObj.insuranceProvider || undefined,
        insuranceNumber: selectedPatientObj.insuranceNumber || undefined,
      });
    } catch {
      // Error toast already shown by admitPatient; stay on this page so the
      // user can retry instead of navigating away from a failed admission.
      return;
    }

    navigate('/reception/ipd/beds');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">In-Patient (IPD) Admission</h1>
        <p className="text-xs text-slate-500">
          Admit registered patients to hospital wards, ICUs, or private rooms with bed allocation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Patient Search / Select */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
            <select
              value={selectedUhid}
              onChange={(e) => setSelectedUhid(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              {allSelectablePatients.map((p, idx) => (
                <option key={p.uhid ? `patient-${p.uhid}` : `patient-idx-${idx}`} value={p.uhid}>
                  {p.uhid} — {p.name} ({p.info})
                </option>
              ))}
            </select>
          </div>

          {/* Ward Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Ward Category *</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value as WardType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ICU">ICU (Intensive Care Unit)</option>
              <option value="General Ward">General Ward</option>
              <option value="Deluxe Suite">Deluxe Suite</option>
              <option value="Deluxe Private">Deluxe Private</option>
              <option value="Semi-Private">Semi-Private</option>
              <option value="Surgical Ward">Surgical Ward</option>
            </select>
          </div>

          {/* Bed Allocation Picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Available Bed Number *</label>
            {availableBedsList.length > 0 ? (
              <select
                value={selectedBedNumber}
                onChange={(e) => setSelectedBedNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-emerald-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                {availableBedsList.map((b, idx) => (
                  <option key={b.id ? `bed-${b.id}` : `bed-idx-${idx}`} value={b.bedNumber}>
                    {b.bedNumber} — {b.ward || selectedWard}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                No beds available in {selectedWard}!
              </div>
            )}
          </div>

          {/* Admission Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Admission Date & Time *</label>
            <input
              type="date"
              required
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            />
          </div>

          {/* Attending Doctor */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attending Doctor *</label>
            <select
              value={attendingDoctor}
              onChange={(e) => setAttendingDoctor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white"
            >
              {doctors.map((doc, idx) => (
                <option key={doc.id ? `doc-${doc.id}` : `doc-idx-${idx}`} value={doc.name}>
                  {doc.name} - {doc.department}
                </option>
              ))}
            </select>
          </div>

          {/* Attending Nurse */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attending Nurse *</label>
            <select
              value={attendingNurse}
              onChange={(e) => setAttendingNurse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 outline-none focus:bg-white cursor-pointer"
            >
              {nursesList.length > 0 ? (
                nursesList.map((nurse, idx) => (
                  <option key={nurse.id ? `nurse-${nurse.id}` : `nurse-idx-${idx}`} value={nurse.name}>
                    {nurse.name} {nurse.assignedWard ? `(${nurse.assignedWard})` : ''}
                  </option>
                ))
              ) : (
                <option value="Nurse Anjali Rao">Nurse Anjali Rao</option>
              )}
            </select>
          </div>

          {/* Emergency Contact Summary */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Emergency Contact Person</label>
            <input
              type="text"
              readOnly
              value={
                selectedPatientObj
                  ? `${selectedPatientObj.emergencyContactName} (${selectedPatientObj.emergencyPhone})`
                  : 'N/A'
              }
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Admission Reason */}
        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-1">Admission Diagnosis / Reason *</label>
          <textarea
            required
            rows={3}
            value={admissionReason}
            onChange={(e) => setAdmissionReason(e.target.value)}
            placeholder="e.g. Acute chest pain observation, post-operative monitoring"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={!selectedBedNumber}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Confirm Admission & Allocate Bed</span>
          </button>
        </div>
      </form>
    </div>
  );
};
