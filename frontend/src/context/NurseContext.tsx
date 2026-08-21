import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { VitalSign, WardTransfer, NursingNote, MedicationAdmin, NurseActivity } from '../types/nurse';
import {
  fetchVitalsApi,
  createVitalApi,
  updateVitalApi,
  deleteVitalApi,
  fetchNursingNotesApi,
  createNursingNoteApi,
  updateNursingNoteApi,
  deleteNursingNoteApi,
  fetchMedicationsApi,
  createMedicationApi,
  updateMedicationApi,
  deleteMedicationApi,
  fetchWardTransfersApi,
  createWardTransferApi,
  updateWardTransferApi,
  deleteWardTransferApi,
} from '../services/api';
import { useHMS } from './HMSContext';

interface NurseContextType {
  // Vitals
  vitals: VitalSign[];
  addVitalSign: (data: Omit<VitalSign, 'id'>) => Promise<void>;
  updateVitalSign: (id: string, updated: Partial<VitalSign>) => Promise<void>;
  deleteVitalSign: (id: string) => Promise<void>;

  // Ward Transfers
  transfers: WardTransfer[];
  addWardTransfer: (data: Omit<WardTransfer, 'id' | 'transferId'>) => Promise<void>;
  updateWardTransfer: (id: string, updated: Partial<WardTransfer>) => Promise<void>;
  deleteWardTransfer: (id: string) => Promise<void>;
  completeWardTransfer: (id: string) => Promise<void>;

  // Nursing Notes
  notes: NursingNote[];
  addNursingNote: (data: Omit<NursingNote, 'id'>) => Promise<void>;
  updateNursingNote: (id: string, updated: Partial<NursingNote>) => Promise<void>;
  deleteNursingNote: (id: string) => Promise<void>;
  getPatientNotesTimeline: (patientUhid: string) => NursingNote[];

  // Medication Administration
  medications: MedicationAdmin[];
  addMedicationAdmin: (data: Omit<MedicationAdmin, 'id'>) => Promise<void>;
  updateMedicationAdmin: (id: string, updated: Partial<MedicationAdmin>) => Promise<void>;
  deleteMedicationAdmin: (id: string) => Promise<void>;
  administerMedication: (id: string, givenTime?: string, remarks?: string) => Promise<void>;

  // Branch Separation
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;

  // Activities & Audits
  activities: NurseActivity[];
  logActivity: (
    activityType: NurseActivity['activityType'],
    patientName: string,
    patientUhid: string,
    details: string,
    nurseName?: string,
    status?: NurseActivity['status'],
    branch?: string
  ) => void;
  clearActivities: () => void;
}

const NurseContext = createContext<NurseContextType | undefined>(undefined);

export const NurseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { patients, beds, ipdAdmissions, appointments, addToast } = useHMS();

  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.branch) return u.branch;
      }
    } catch { /* proceed */ }
    return 'All';
  });

  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [transfers, setTransfers] = useState<WardTransfer[]>([]);
  const [notes, setNotes] = useState<NursingNote[]>([]);
  const [medications, setMedications] = useState<MedicationAdmin[]>([]);
  const [activities, setActivities] = useState<NurseActivity[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.branch && u.branch !== 'All' && selectedBranch === 'All') {
          setSelectedBranch(u.branch);
        }
      }
    } catch { /* proceed */ }
  }, []);

  const hmsRef = useRef({ patients, ipdAdmissions, beds, appointments });
  useEffect(() => {
    hmsRef.current = { patients, ipdAdmissions, beds, appointments };
  }, [patients, ipdAdmissions, beds, appointments]);

  const loadData = async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    // Only load clinical data for roles that need it
    try {
      const saved = localStorage.getItem('hms_user');
      if (saved) {
        const u = JSON.parse(saved);
        const role = (u?.role || '').toString().toLowerCase().replace('userrole.', '');
        const clinicalRoles = ['nurse', 'admin', 'super_admin', 'superadmin', 'doctor', 'staff'];
        const isClinicalRole = clinicalRoles.some((cr) => role.includes(cr));
        if (!isClinicalRole) return;
      }
    } catch { /* proceed */ }

    const getPatientBranch = (uhid: string) => {
      if (!uhid) return '';
      const norm = uhid.toLowerCase().trim();
      const { patients: curPatients, ipdAdmissions: curAdmissions, beds: curBeds, appointments: curAppointments } = hmsRef.current;
      const p = (curPatients || []).find((pat) => (pat.uhid || '').toLowerCase().trim() === norm);
      if (p?.branch) return p.branch;
      const adm = (curAdmissions || []).find((a) => (a.patientUhid || '').toLowerCase().trim() === norm);
      if (adm?.branch) return adm.branch;
      const b = (curBeds || []).find((bed) => ((bed.currentPatientUhid || (bed as any).current_patient_uhid) || '').toLowerCase().trim() === norm);
      if (b?.branch) return b.branch;
      const apt = (curAppointments || []).find((a) => (a.patientUhid || '').toLowerCase().trim() === norm);
      if (apt?.branch) return apt.branch;
      return '';
    };

    try {
      const branchParam = selectedBranch !== 'All' ? selectedBranch : undefined;
      const [apiVitals, apiNotes, apiMeds, apiTransfers] = await Promise.all([
        fetchVitalsApi(undefined, branchParam).catch(() => null),
        fetchNursingNotesApi(undefined, branchParam).catch(() => null),
        fetchMedicationsApi(undefined, branchParam).catch(() => null),
        fetchWardTransfersApi(undefined, branchParam).catch(() => null),
      ]);

      if (apiVitals && Array.isArray(apiVitals)) {
        const seenV = new Set<string>();
        const mappedVitals: VitalSign[] = [];
        apiVitals.forEach((v: any) => {
          const rawId = v.id || `vital-${Math.random()}`;
          const uhid = v.patient_uhid || v.patientUhid || '';
          if (!seenV.has(rawId)) {
            seenV.add(rawId);
            mappedVitals.push({
              id: rawId,
              patientUhid: uhid,
              patientName: v.patient_name || v.patientName || '',
              age: v.age ?? 0,
              gender: v.gender || 'Male',
              doctorId: v.doctor_id || v.doctorId || '',
              doctorName: v.doctor_name || v.doctorName || '',
              department: v.department || '',
              height: v.height ?? 170,
              weight: v.weight ?? 70,
              temperature: v.temperature ?? 98.6,
              bloodPressure: v.blood_pressure || v.bloodPressure || `${v.bp_sys || 120}/${v.bp_dia || 80}`,
              pulseRate: v.pulse_rate || v.pulseRate || v.pulse || 72,
              respiratoryRate: v.respiratory_rate || v.respiratoryRate || v.resp_rate || 16,
              spO2: v.spo2 || v.spO2 || 98,
              bloodSugar: v.blood_sugar || v.bloodSugar || 110,
              painScale: v.pain_scale || v.painScale || 1,
              remarks: v.remarks || '',
              recordedBy: v.recorded_by || v.recordedBy || 'Nurse',
              date: v.date || v.recorded_at?.split('T')[0] || v.recordedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              time: v.time || v.recorded_at?.split('T')[1]?.substring(0, 5) || v.recordedAt?.split('T')[1]?.substring(0, 5) || '08:00',
              branch: v.branch || v.branch_name || getPatientBranch(uhid) || '',
            });
          }
        });
        setVitals(mappedVitals);
      }

      if (apiNotes && Array.isArray(apiNotes)) {
        const seenN = new Set<string>();
        const mappedNotes: NursingNote[] = [];
        apiNotes.forEach((n: any) => {
          const rawId = n.id || `note-${Math.random()}`;
          const uhid = n.patient_uhid || n.patientUhid || '';
          if (!seenN.has(rawId)) {
            seenN.add(rawId);
            mappedNotes.push({
              id: rawId,
              patientUhid: uhid,
              patientName: n.patient_name || n.patientName || '',
              ward: n.ward || 'General Ward',
              diagnosis: n.diagnosis || '',
              observation: n.observation || n.note || n.notes || '',
              symptoms: n.symptoms || '',
              treatmentResponse: n.treatment_response || n.treatmentResponse || '',
              doctorInstructions: n.doctor_instructions || n.doctorInstructions || '',
              fluidIntake: n.fluid_intake ?? n.fluidIntake ?? 1500,
              fluidOutput: n.fluid_output ?? n.fluidOutput ?? 1400,
              patientCondition: n.patient_condition || n.patientCondition || n.category || 'Stable',
              notes: n.notes || n.note || n.observation || '',
              recordedBy: n.nurse_name || n.nurseName || n.recorded_by || n.recordedBy || 'Nurse',
              date: n.date || n.created_at_time?.split('T')[0] || n.createdAtTime?.split('T')[0] || new Date().toISOString().split('T')[0],
              time: n.time || n.created_at_time?.split('T')[1]?.substring(0, 5) || n.createdAtTime?.split('T')[1]?.substring(0, 5) || '08:00',
              branch: n.branch || n.branch_name || getPatientBranch(uhid) || '',
            });
          }
        });
        setNotes(mappedNotes);
      }

      if (apiMeds && Array.isArray(apiMeds)) {
        const seenM = new Set<string>();
        const mappedMeds: MedicationAdmin[] = [];
        apiMeds.forEach((m: any) => {
          const rawId = m.id || `med-${Math.random()}`;
          const uhid = m.patient_uhid || m.patientUhid || '';
          if (!seenM.has(rawId)) {
            seenM.add(rawId);
            mappedMeds.push({
              id: rawId,
              patientUhid: uhid,
              patientName: m.patient_name || m.patientName || '',
              ward: m.ward || 'General Ward',
              doctorName: m.doctor_name || m.doctorName || 'Dr. Vikram Malhotra',
              medicineName: m.medicine_name || m.medicineName || '',
              dosage: m.dosage || '1 Tablet',
              route: (m.route as any) || 'Oral',
              frequency: m.frequency || 'Once Daily (OD)',
              scheduledTime: m.scheduled_time || m.scheduledTime || '08:00 AM',
              givenTime: m.given_time || m.givenTime || m.administered_at || m.administeredAt || '',
              status: (m.status as any) || 'Scheduled',
              nurseName: m.nurse_name || m.nurseName || 'Nurse',
              remarks: m.remarks || '',
              branch: m.branch || m.branch_name || getPatientBranch(uhid) || '',
            });
          }
        });
        setMedications(mappedMeds);
      }

      if (apiTransfers && Array.isArray(apiTransfers)) {
        setTransfers(
          apiTransfers.map((t: any): WardTransfer => {
            const uhid = t.patient_uhid || t.patientUhid || '';
            return {
              id: t.id,
              transferId: t.transfer_id || t.transferId || `WT-${t.id?.slice(0, 6)}`,
              patientUhid: uhid,
              patientName: t.patient_name || t.patientName || '',
              doctorName: t.doctor_name || t.doctorName || 'Dr. Vikram Malhotra',
              currentWard: t.current_ward || t.currentWard || 'General Ward',
              currentBed: t.current_bed || t.currentBed || '',
              newWard: t.new_ward || t.newWard || 'ICU Ward',
              newBed: t.new_bed || t.newBed || '',
              transferReason: t.transfer_reason || t.transferReason || t.reason || '',
              transferDate: t.transfer_date || t.transferDate || t.requested_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              transferTime: t.transfer_time || t.transferTime || t.requested_at?.split('T')[1]?.substring(0, 5) || '08:00',
              doctorApproval: t.doctor_approval || t.doctorApproval || 'Approved',
              remarks: t.remarks || '',
              transferredBy: t.transferred_by || t.transferredBy || t.requested_by || 'Nurse',
              status: (t.status as any) || 'Approved',
              branch: t.branch || t.branch_name || getPatientBranch(uhid) || '',
            };
          })
        );
      }
    } catch (err) {
      console.warn('NurseContext backend sync unavailable:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadData();
      }
    }, 30000);
    window.addEventListener('hms_auth_change', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hms_auth_change', loadData);
    };
  }, [selectedBranch]);

  // Activity Helper
  const logActivity = (
    activityType: NurseActivity['activityType'],
    patientName: string,
    patientUhid: string,
    details: string,
    nurseName: string = 'Nurse',
    status: NurseActivity['status'] = 'Completed',
    branch?: string
  ) => {
    const newAct: NurseActivity = {
      id: `act-${Date.now()}`,
      activityType,
      patientName,
      patientUhid,
      details,
      timeAgo: 'Just now',
      nurseName,
      status,
      branch: branch || (selectedBranch !== 'All' ? selectedBranch : undefined),
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  const clearActivities = () => {
    setActivities([]);
  };

  // 1. Vital Signs CRUD
  const addVitalSign = async (data: Omit<VitalSign, 'id'>) => {
    const [bpSys, bpDia] = (data.bloodPressure || '120/80').split('/').map(Number);
    const branchToSet = data.branch || (selectedBranch !== 'All' ? selectedBranch : undefined);
    const payload = {
      patientUhid: data.patientUhid,
      patientName: data.patientName,
      age: data.age,
      gender: data.gender,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      department: data.department,
      height: data.height,
      weight: data.weight,
      temperature: data.temperature,
      bloodPressure: data.bloodPressure,
      bpSys: bpSys || 120,
      bpDia: bpDia || 80,
      pulseRate: data.pulseRate,
      respiratoryRate: data.respiratoryRate,
      spO2: data.spO2,
      bloodSugar: data.bloodSugar,
      painScale: data.painScale,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
      recordedAt: `${data.date}T${data.time || '00:00'}`,
      date: data.date,
      time: data.time,
      branch: branchToSet,
    };
    try {
      const created = await createVitalApi(payload);
      const newVital: VitalSign = { ...data, id: created.id, branch: branchToSet || data.branch };
      setVitals((prev) => [newVital, ...prev]);
      logActivity('Vitals Recorded', data.patientName, data.patientUhid, `BP: ${data.bloodPressure}, SpO2: ${data.spO2}%`, data.recordedBy);
      addToast('success', 'Vitals Recorded', `Vital signs for ${data.patientName} saved successfully.`);
    } catch (err) {
      console.error('addVitalSign failed:', err);
      addToast('error', 'Save Failed', 'Could not save vitals to the server. Please try again.');
      throw err;
    }
  };

  const updateVitalSign = async (id: string, updated: Partial<VitalSign>) => {
    const bpStr = updated.bloodPressure || '120/80';
    const [bpSys, bpDia] = bpStr.split('/').map(Number);
    const payload = {
      ...updated,
      bpSys: bpSys || 120,
      bpDia: bpDia || 80,
    };
    try {
      let savedRecord: any = null;
      try {
        savedRecord = await updateVitalApi(id, payload);
      } catch (err: any) {
        if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
          savedRecord = await createVitalApi(payload);
        } else {
          throw err;
        }
      }
      const finalId = savedRecord?.id || id;
      setVitals((prev) => {
        const exists = prev.some((v) => v.id === id || v.id === finalId);
        if (exists) {
          return prev.map((v) => (v.id === id || v.id === finalId ? { ...v, ...updated, id: finalId } : v));
        } else {
          return [{ ...(updated as any), id: finalId }, ...prev];
        }
      });
      addToast('success', 'Vitals Updated', 'Vital record modified successfully.');
    } catch (err) {
      console.error('updateVitalSign failed:', err);
      addToast('error', 'Update Failed', 'Could not save vitals changes to the server. Please try again.');
      throw err;
    }
  };

  const deleteVitalSign = async (id: string) => {
    const target = vitals.find((v) => v.id === id);
    try {
      await deleteVitalApi(id);
      setVitals((prev) => prev.filter((v) => v.id !== id));
      addToast('info', 'Record Deleted', `Vital record for ${target?.patientName || 'Patient'} removed.`);
    } catch (err) {
      console.error('deleteVitalSign failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the vital record on the server. Please try again.');
      throw err;
    }
  };

  // 2. Ward Transfer CRUD
  const addWardTransfer = async (data: Omit<WardTransfer, 'id' | 'transferId'>) => {
    const transferId = `TRF-2026-${100 + transfers.length + 1}`;
    const branchToSet = data.branch || (selectedBranch !== 'All' ? selectedBranch : undefined);
    const payload = {
      transferId,
      patientUhid: data.patientUhid,
      patientName: data.patientName,
      currentWard: data.currentWard,
      currentBed: data.currentBed,
      newWard: data.newWard,
      newBed: data.newBed,
      transferReason: data.transferReason,
      transferDate: data.transferDate,
      transferTime: data.transferTime,
      doctorApproval: data.doctorApproval,
      doctorName: data.doctorName,
      remarks: data.remarks,
      transferredBy: data.transferredBy,
      status: data.status || 'Pending',
      branch: branchToSet,
    };
    try {
      const created = await createWardTransferApi(payload);
      const newTransfer: WardTransfer = { ...data, id: created.id, transferId: created.transferId || transferId, branch: branchToSet || data.branch };
      setTransfers((prev) => [newTransfer, ...prev]);
      logActivity('Ward Transfer', data.patientName, data.patientUhid, `Transfer requested from ${data.currentWard} (${data.currentBed}) to ${data.newWard} (${data.newBed})`, data.transferredBy, 'Pending');
      addToast('success', 'Transfer Requested', `Transfer ${transferId} initiated for ${data.patientName}.`);
    } catch (err) {
      console.error('addWardTransfer failed:', err);
      addToast('error', 'Transfer Failed', 'Could not save the ward transfer to the server. Please try again.');
      throw err;
    }
  };

  const updateWardTransfer = async (id: string, updated: Partial<WardTransfer>) => {
    try {
      await updateWardTransferApi(id, updated);
      setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      addToast('success', 'Transfer Updated', 'Ward transfer details updated.');
    } catch (err) {
      console.error('updateWardTransfer failed:', err);
      addToast('error', 'Update Failed', 'Could not save the transfer changes to the server. Please try again.');
      throw err;
    }
  };

  const deleteWardTransfer = async (id: string) => {
    try {
      await deleteWardTransferApi(id);
      setTransfers((prev) => prev.filter((t) => t.id !== id));
      addToast('info', 'Transfer Cancelled', 'Ward transfer record removed.');
    } catch (err) {
      console.error('deleteWardTransfer failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the transfer on the server. Please try again.');
      throw err;
    }
  };

  const completeWardTransfer = async (id: string) => {
    try {
      await updateWardTransferApi(id, { status: 'Completed' });
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Completed' } : t))
      );
      const trf = transfers.find((t) => t.id === id);
      if (trf) {
        logActivity('Ward Transfer', trf.patientName, trf.patientUhid, `Completed transfer to ${trf.newWard} Bed ${trf.newBed}`, trf.transferredBy, 'Completed');
      }
      addToast('success', 'Transfer Completed', 'Patient location successfully updated in system.');
    } catch (err) {
      console.error('completeWardTransfer failed:', err);
      addToast('error', 'Update Failed', 'Could not mark the transfer complete on the server. Please try again.');
      throw err;
    }
  };

  // 3. Nursing Notes CRUD
  const addNursingNote = async (data: Omit<NursingNote, 'id'>) => {
    const branchToSet = data.branch || (selectedBranch !== 'All' ? selectedBranch : undefined);
    const payload = {
      patientUhid: data.patientUhid,
      patientName: data.patientName,
      ward: data.ward || 'General Ward',
      diagnosis: data.diagnosis || '',
      observation: data.observation || data.notes || '',
      symptoms: data.symptoms || '',
      treatmentResponse: data.treatmentResponse || '',
      doctorInstructions: data.doctorInstructions || '',
      fluidIntake: data.fluidIntake,
      fluidOutput: data.fluidOutput,
      patientCondition: data.patientCondition || 'Stable',
      category: data.patientCondition || 'General Note',
      notes: data.notes || data.observation || '',
      nurseName: data.recordedBy,
      recordedBy: data.recordedBy,
      createdAtTime: `${data.date}T${data.time || '00:00'}`,
      date: data.date,
      time: data.time,
      branch: branchToSet,
    };
    try {
      const created = await createNursingNoteApi(payload);
      const newNote: NursingNote = { ...data, id: created.id, branch: branchToSet || data.branch };
      setNotes((prev) => [newNote, ...prev]);
      logActivity('Nursing Note Added', data.patientName, data.patientUhid, `Observation: ${data.patientCondition} - ${(data.observation || '').slice(0, 40)}...`, data.recordedBy);
      addToast('success', 'Note Recorded', `Nursing note added for ${data.patientName}.`);
    } catch (err) {
      console.error('addNursingNote failed:', err);
      addToast('error', 'Save Failed', 'Could not save the nursing note to the server. Please try again.');
      throw err;
    }
  };

  const updateNursingNote = async (id: string, updated: Partial<NursingNote>) => {
    try {
      await updateNursingNoteApi(id, updated);
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
      addToast('success', 'Note Updated', 'Nursing observation updated.');
    } catch (err) {
      console.error('updateNursingNote failed:', err);
      addToast('error', 'Update Failed', 'Could not save the note changes to the server. Please try again.');
      throw err;
    }
  };

  const deleteNursingNote = async (id: string) => {
    try {
      await deleteNursingNoteApi(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      addToast('info', 'Note Removed', 'Nursing note deleted.');
    } catch (err) {
      console.error('deleteNursingNote failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the note on the server. Please try again.');
      throw err;
    }
  };

  const getPatientNotesTimeline = (patientUhid: string) => {
    return notes
      .filter((n) => n.patientUhid.toLowerCase() === patientUhid.toLowerCase() || n.patientName.toLowerCase().includes(patientUhid.toLowerCase()))
      .sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime());
  };

  // 4. Medication Admin CRUD
  const addMedicationAdmin = async (data: Omit<MedicationAdmin, 'id'>) => {
    const branchToSet = data.branch || (selectedBranch !== 'All' ? selectedBranch : undefined);
    const payload = {
      patientUhid: data.patientUhid,
      patientName: data.patientName,
      ward: data.ward || 'General Ward',
      doctorName: data.doctorName || 'Dr. Vikram Malhotra',
      medicineName: data.medicineName,
      dosage: data.dosage,
      route: data.route,
      frequency: data.frequency || 'Once Daily (OD)',
      scheduledTime: data.scheduledTime,
      administeredAt: data.givenTime || data.scheduledTime,
      givenTime: data.givenTime,
      status: data.status || 'Scheduled',
      nurseName: data.nurseName,
      remarks: data.remarks,
      branch: branchToSet,
    };
    try {
      const created = await createMedicationApi(payload);
      setMedications((prev) => [{ ...data, id: created.id, branch: branchToSet || data.branch }, ...prev]);
      addToast('success', 'Medication Scheduled', `${data.medicineName} scheduled for ${data.patientName}.`);
    } catch (err) {
      console.error('addMedicationAdmin failed:', err);
      addToast('error', 'Save Failed', 'Could not save the medication schedule to the server. Please try again.');
      throw err;
    }
  };

  const updateMedicationAdmin = async (id: string, updated: Partial<MedicationAdmin>) => {
    try {
      await updateMedicationApi(id, updated);
      setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      addToast('success', 'Schedule Updated', 'Medication record updated.');
    } catch (err) {
      console.error('updateMedicationAdmin failed:', err);
      addToast('error', 'Update Failed', 'Could not save the medication changes to the server. Please try again.');
      throw err;
    }
  };

  const deleteMedicationAdmin = async (id: string) => {
    try {
      await deleteMedicationApi(id);
      setMedications((prev) => prev.filter((m) => m.id !== id));
      addToast('info', 'Schedule Removed', 'Medication schedule entry deleted.');
    } catch (err) {
      console.error('deleteMedicationAdmin failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the medication schedule on the server. Please try again.');
      throw err;
    }
  };

  const administerMedication = async (id: string, givenTime?: string, remarks?: string) => {
    const currentTime = givenTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      await updateMedicationApi(id, { status: 'Given', given_time: currentTime, remarks });
    } catch (err) {
      console.error('administerMedication failed:', err);
      addToast('error', 'Update Failed', 'Could not save the medication administration to the server. Please try again.');
      throw err;
    }
    setMedications((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: 'Given',
              givenTime: currentTime,
              remarks: remarks || m.remarks || 'Administered per doctor dosage instructions.',
            }
          : m
      )
    );
    try {
      await updateMedicationApi(id, { status: 'Given', administered_at: currentTime });
    } catch {}
    const med = medications.find((m) => m.id === id);
    if (med) {
      logActivity('Medication Given', med.patientName, med.patientUhid, `${med.medicineName} (${med.dosage}) given via ${med.route}`, med.nurseName);
    }
    addToast('success', 'Medication Administered', `Marked ${med?.medicineName || 'medicine'} as GIVEN at ${currentTime}.`);
  };

  return (
    <NurseContext.Provider
      value={{
        vitals,
        addVitalSign,
        updateVitalSign,
        deleteVitalSign,
        transfers,
        addWardTransfer,
        updateWardTransfer,
        deleteWardTransfer,
        completeWardTransfer,
        notes,
        addNursingNote,
        updateNursingNote,
        deleteNursingNote,
        getPatientNotesTimeline,
        medications,
        addMedicationAdmin,
        updateMedicationAdmin,
        deleteMedicationAdmin,
        administerMedication,
        activities,
        logActivity,
        clearActivities,
        selectedBranch,
        setSelectedBranch,
      }}
    >
      {children}
    </NurseContext.Provider>
  );
};

export const useNurse = () => {
  const context = useContext(NurseContext);
  if (!context) {
    throw new Error('useNurse must be used within a NurseProvider');
  }
  return context;
};
