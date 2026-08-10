import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const NurseContext = createContext<NurseContextType | undefined>(undefined);

export const NurseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useHMS();

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

  const loadData = async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    // Only load clinical data for roles that need it
    try {
      const saved = localStorage.getItem('hms_user');
      if (saved) {
        const u = JSON.parse(saved);
        const role = (u?.role || '').toString().toLowerCase().replace('userrole.', '');
        const clinicalRoles = ['nurse', 'admin', 'super_admin', 'superadmin', 'doctor'];
        if (!clinicalRoles.includes(role)) return;
      }
    } catch { /* proceed */ }

    try {

      const [apiVitals, apiNotes, apiMeds, apiTransfers] = await Promise.all([
        fetchVitalsApi().catch(() => null),
        fetchNursingNotesApi().catch(() => null),
        fetchMedicationsApi().catch(() => null),
        fetchWardTransfersApi().catch(() => null),
      ]);

      if (apiVitals && Array.isArray(apiVitals)) {
        setVitals(
          apiVitals.map((v: any): VitalSign => ({
            id: v.id,
            patientUhid: v.patient_uhid,
            patientName: v.patient_name || '',
            age: 0,
            gender: 'Male',
            doctorId: '',
            doctorName: '',
            department: '',
            height: 0,
            weight: 0,
            temperature: v.temperature,
            bloodPressure: `${v.bp_sys}/${v.bp_dia}`,
            pulseRate: v.pulse,
            respiratoryRate: v.resp_rate,
            spO2: v.spo2,
            bloodSugar: 0,
            painScale: 0,
            remarks: '',
            recordedBy: v.recorded_by,
            date: v.recorded_at?.split('T')[0] || v.recorded_at || '',
            time: v.recorded_at?.split('T')[1]?.substring(0, 5) || '',
          }))
        );
      }

      if (apiNotes && Array.isArray(apiNotes)) {
        setNotes(
          apiNotes.map((n: any): NursingNote => ({
            id: n.id,
            patientUhid: n.patient_uhid,
            patientName: n.patient_name || '',
            ward: '',
            diagnosis: '',
            observation: n.note,
            symptoms: '',
            treatmentResponse: '',
            doctorInstructions: '',
            fluidIntake: 0,
            fluidOutput: 0,
            patientCondition: (n.category as any) || 'Stable',
            notes: n.note,
            recordedBy: n.nurse_name,
            date: n.created_at_time?.split('T')[0] || '',
            time: n.created_at_time?.split('T')[1]?.substring(0, 5) || '',
          }))
        );
      }

      if (apiMeds && Array.isArray(apiMeds)) {
        setMedications(
          apiMeds.map((m: any): MedicationAdmin => ({
            id: m.id,
            patientUhid: m.patient_uhid,
            patientName: m.patient_name || '',
            ward: '',
            doctorName: '',
            medicineName: m.medicine_name,
            dosage: m.dosage,
            route: (m.route as any) || 'Oral',
            frequency: 'Once Daily (OD)',
            scheduledTime: m.scheduled_time,
            givenTime: m.administered_at,
            status: (m.status as any) || 'Scheduled',
            nurseName: m.nurse_name,
          }))
        );
      }

      if (apiTransfers && Array.isArray(apiTransfers)) {
        setTransfers(
          apiTransfers.map((t: any): WardTransfer => ({
            id: t.id,
            transferId: `WT-${t.id?.slice(0, 6)}`,
            patientUhid: t.patient_uhid,
            patientName: t.patient_name || '',
            age: 0,
            gender: 'Male',
            doctorName: '',
            currentWard: t.current_ward || '',
            currentBedNo: t.current_bed || '',
            targetWard: t.new_ward || '',
            targetBedNo: t.new_bed || '',
            reason: t.reason || '',
            priority: (t.priority as any) || 'Routine',
            requestDate: t.requested_at?.split('T')[0] || t.requested_at || '',
            requestTime: t.requested_at?.split('T')[1]?.substring(0, 5) || '',
            status: (t.status as any) || 'Approved',
            requestedBy: t.requested_by || 'Nurse',
            approvedBy: t.approved_by || 'Physician',
          }))
        );
      }
    } catch (err) {
      console.warn('NurseContext backend sync unavailable:', err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('hms_auth_change', loadData);
    return () => {
      window.removeEventListener('hms_auth_change', loadData);
    };
  }, []);

  // Activity Helper
  const logActivity = (
    activityType: NurseActivity['activityType'],
    patientName: string,
    patientUhid: string,
    details: string,
    nurseName: string = 'Nurse',
    status: NurseActivity['status'] = 'Completed'
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
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // 1. Vital Signs CRUD
  const addVitalSign = async (data: Omit<VitalSign, 'id'>) => {
    const [bpSys, bpDia] = (data.bloodPressure || '120/80').split('/').map(Number);
    const payload = {
      patient_uhid: data.patientUhid,
      patient_name: data.patientName,
      temperature: data.temperature,
      pulse: data.pulseRate,
      bp_sys: bpSys || 120,
      bp_dia: bpDia || 80,
      resp_rate: data.respiratoryRate,
      spo2: data.spO2,
      recorded_by: data.recordedBy,
      recorded_at: `${data.date}T${data.time || '00:00'}`,
    };
    try {
      const created = await createVitalApi(payload);
      const newVital: VitalSign = { ...data, id: created.id };
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
    try {
      await updateVitalApi(id, updated);
      setVitals((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
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
    };
    try {
      const created = await createWardTransferApi(payload);
      const newTransfer: WardTransfer = { ...data, id: created.id, transferId: created.transferId || transferId };
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
    const payload = {
      patient_uhid: data.patientUhid,
      patient_name: data.patientName,
      category: data.patientCondition || 'General Note',
      note: data.observation || data.notes,
      nurse_name: data.recordedBy,
      created_at_time: `${data.date}T${data.time || '00:00'}`,
    };
    try {
      const created = await createNursingNoteApi(payload);
      const newNote: NursingNote = { ...data, id: created.id };
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
    const payload = {
      patient_uhid: data.patientUhid,
      patient_name: data.patientName,
      medicine_name: data.medicineName,
      dosage: data.dosage,
      route: data.route,
      scheduled_time: data.scheduledTime,
      status: data.status || 'Scheduled',
      nurse_name: data.nurseName,
    };
    try {
      const created = await createMedicationApi(payload);
      setMedications((prev) => [{ ...data, id: created.id }, ...prev]);
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
