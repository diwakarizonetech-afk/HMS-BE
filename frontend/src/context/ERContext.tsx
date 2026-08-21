/**
 * ERContext — Emergency / ER Management
 *
 * All state is backed by the backend API (/emergency/*).
 * localStorage and mock data have been completely removed.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useHMS } from './HMSContext';
import {
  fetchEREncountersApi,
  fetchEREncounterApi,
  createEREncounterApi,
  updateEREncounterApi,
  fetchERTimelineApi,
  recordERTriageApi,
  createERAssessmentApi,
  createERProcedureApi,
  setERDispositionApi,
  assignERObservationBedApi,
  initiateERToIPDApi,
  fetchBedsApi,
  createVitalApi,
  createNursingNoteApi,
  createMedicationApi,
  releaseBedApi,
} from '../services/api';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface ERContextType {
  erVisits: any[];
  erObservationBeds: any[];
  loading: boolean;
  error: string | null;
  refreshERVisits: () => Promise<void>;
  createERVisit: (visitData: any) => Promise<any>;
  getERVisitById: (id: string) => any | undefined;
  getERVisitByUhid: (uhid: string) => any | undefined;
  updateERTriage: (erVisitId: string, triageStatus: string, triageNotes: string, nurseName: string) => Promise<void>;
  recordERVitals: (erVisitId: string, vitals: any, nurseName: string) => Promise<void>;
  addERNursingNote: (erVisitId: string, noteText: string, nurseName: string) => Promise<void>;
  administerERMedication: (erVisitId: string, medData: any) => Promise<void>;
  recordDoctorAssessment: (erVisitId: string, assessment: string, diagnosis: string, labOrders?: any[], pharmacyOrders?: any[], procedures?: any[], doctorName?: string) => Promise<void>;
  setERDisposition: (erVisitId: string, disposition: string, dispositionNotes?: string, requiredWard?: string, doctorName?: string) => Promise<void>;
  assignObservationBed: (erVisitId: string, bedId: string) => Promise<void>;
  releaseObservationBed: (bedId: string) => Promise<void>;
  coordinateIPDAdmission: (erVisitId: string, ipdData?: any) => Promise<void>;
}

const ERContext = createContext<ERContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const ERProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast, sendNotification } = useHMS();
  const { user } = useAuth();

  const [erVisits, setErVisits] = useState<any[]>([]);
  const [erObservationBeds, setErObservationBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------
  const refreshERVisits = useCallback(async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const encounters = await fetchEREncountersApi(user?.branch);
      setErVisits(encounters);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load ER encounters';
      setError(msg);
      if (!msg.toLowerCase().includes('unauthorized') && !msg.toLowerCase().includes('401')) {
        addToast('error', 'ER Data Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.branch, addToast]);

  const refreshObservationBeds = useCallback(async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    try {
      const beds = await fetchBedsApi(user?.branch);
      let obsBeds = (beds || []).filter(
        (b: any) =>
          (b.category || '').toLowerCase().includes('observation') ||
          (b.category || '').toLowerCase().includes('er') ||
          (b.ward || '').toLowerCase().includes('observation') ||
          (b.ward || '').toLowerCase().includes('er')
      );
      if (obsBeds.length === 0 && (beds || []).length > 0) {
        obsBeds = beds;
      }
      setErObservationBeds(obsBeds);
    } catch {
      setErObservationBeds([]);
    }
  }, [user?.branch]);

  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      refreshERVisits();
      refreshObservationBeds();
    }

    const handleAuthChange = () => {
      const activeToken = localStorage.getItem('hms_token');
      if (activeToken) {
        refreshERVisits();
        refreshObservationBeds();
      } else {
        setErVisits([]);
        setErObservationBeds([]);
      }
    };

    window.addEventListener('hms_auth_change', handleAuthChange);
    const refreshTimer = token ? window.setInterval(() => {
      refreshERVisits();
    }, 15000) : undefined;

    return () => {
      window.removeEventListener('hms_auth_change', handleAuthChange);
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [refreshERVisits, refreshObservationBeds]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const getERVisitById = (id: string): any | undefined =>
    erVisits.find(
      (v) =>
        v.id?.toLowerCase() === id.toLowerCase() ||
        v.encounter_number?.toLowerCase() === id.toLowerCase() ||
        v.patient_uhid?.toLowerCase() === id.toLowerCase()
    );

  const getERVisitByUhid = (uhid: string): any | undefined =>
    erVisits.find(
      (v) =>
        v.patient_uhid?.toLowerCase() === uhid.toLowerCase() &&
        v.er_status !== 'Discharged' &&
        v.er_status !== 'Transferred'
    );

  // ---------------------------------------------------------------------------
  // Create ER Visit
  // ---------------------------------------------------------------------------
  const createERVisit = async (visitData: any): Promise<any> => {
    try {
      const payload = {
        patient_id: visitData.patientId || visitData.patient_id,
        patient_uhid: visitData.patientUhid || visitData.patient_uhid,
        patient_name: visitData.patientName || visitData.patient_name,
        patient_age: visitData.age,
        patient_gender: visitData.gender,
        patient_blood_group: visitData.bloodGroup,
        patient_phone: visitData.phone,
        patient_allergies: visitData.allergies,
        patient_existing_diseases: visitData.existingDiseases,
        patient_emergency_contact_name: visitData.emergencyContactName,
        patient_emergency_contact_phone: visitData.emergencyContactPhone,
        patient_emergency_relationship: visitData.emergencyRelationship,
        arrival_date: visitData.arrivalDate || new Date().toISOString().split('T')[0],
        arrival_time: visitData.arrivalTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrival_mode: visitData.arrivalMode || 'Walk-in',
        ambulance_number: visitData.ambulanceInfo?.ambulanceNumber,
        referral_hospital: visitData.ambulanceInfo?.referralHospital,
        paramedic_name: visitData.ambulanceInfo?.paramedicName,
        emergency_type: visitData.emergencyType || 'General Emergency',
        chief_complaint: visitData.initialComplaint || visitData.chief_complaint || '',
        accompanied_by: visitData.accompaniedBy,
        emergency_contact: visitData.emergencyContact,
        department: visitData.department,
        assigned_doctor: visitData.assignedDoctor,
        assigned_nurse: visitData.assignedNurse,
        registered_by: visitData.registeredBy || user?.name,
        branch: visitData.branch || user?.branch,
      };

      const encounter = await createEREncounterApi(payload);
      setErVisits((prev) => [encounter, ...prev]);
      addToast(
        'success',
        'Emergency Visit Registered',
        `Encounter ${encounter.encounter_number} created for ${encounter.patient_name} in ${encounter.department || 'Emergency'} Department`
      );

      try {
        if (sendNotification) {
          sendNotification({
            title: `New ER Patient - ${encounter.department || 'Emergency'}`,
            message: `Patient ${encounter.patient_name} assigned to ${encounter.department || 'Emergency'} (Doctor: ${encounter.assigned_doctor || 'Unassigned'}, Nurse: ${encounter.assigned_nurse || 'Unassigned'})`,
            module: 'Emergency',
            eventType: 'er_registered',
            recipientRole: 'doctor',
            relatedRecordId: encounter.id,
            priority: 'high',
          });
        }
      } catch (e) {
        console.warn('Failed to send frontend notification:', e);
      }

      return encounter;
    } catch (err: any) {
      const msg = err?.message || 'Failed to register ER encounter';
      addToast('error', 'Registration Failed', msg);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Triage
  // ---------------------------------------------------------------------------
  const updateERTriage = async (erVisitId: string, triageStatus: string, triageNotes: string, nurseName: string): Promise<void> => {
    try {
      const updated = await recordERTriageApi(erVisitId, {
        triage_status: triageStatus,
        triage_notes: triageNotes,
        triaged_by: nurseName,
        triage_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      addToast('info', 'Triage Updated', `Classification: ${triageStatus}`);
    } catch (err: any) {
      addToast('error', 'Triage Failed', err?.message || 'Could not save triage');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Vitals — uses the existing PatientVital API, passing er_encounter_id
  // ---------------------------------------------------------------------------
  const recordERVitals = async (erVisitId: string, vitals: any, nurseName: string): Promise<void> => {
    try {
      const encounter = getERVisitById(erVisitId);
      if (!encounter) throw new Error('Encounter not found');
      await createVitalApi({
        patient_uhid: encounter.patient_uhid,
        patient_name: encounter.patient_name,
        recorded_by: nurseName,
        er_encounter_id: erVisitId,
        ...vitals,
      });
      addToast('success', 'Vitals Saved', 'Emergency vitals recorded successfully.');
    } catch (err: any) {
      addToast('error', 'Vitals Failed', err?.message || 'Could not save vitals');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Nursing Notes — uses existing NursingNote API
  // ---------------------------------------------------------------------------
  const addERNursingNote = async (erVisitId: string, noteText: string, nurseName: string): Promise<void> => {
    try {
      const encounter = getERVisitById(erVisitId);
      if (!encounter) throw new Error('Encounter not found');
      await createNursingNoteApi({
        patient_uhid: encounter.patient_uhid,
        patient_name: encounter.patient_name,
        note: noteText,
        nurse_name: nurseName,
        ward: 'Emergency',
        er_encounter_id: erVisitId,
      });
      addToast('success', 'Note Added', 'Emergency nursing observation recorded.');
    } catch (err: any) {
      addToast('error', 'Note Failed', err?.message || 'Could not save nursing note');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Medication Admin — uses existing MedicationLog API
  // ---------------------------------------------------------------------------
  const administerERMedication = async (erVisitId: string, medData: any): Promise<void> => {
    try {
      const encounter = getERVisitById(erVisitId);
      if (!encounter) throw new Error('Encounter not found');
      await createMedicationApi({
        patient_uhid: encounter.patient_uhid,
        patient_name: encounter.patient_name,
        nurse_name: medData.givenBy || medData.nurse_name,
        medicine_name: medData.medicineName || medData.medicine_name,
        dosage: medData.dosage,
        route: medData.route || 'IV',
        scheduled_time: medData.scheduledTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ward: 'Emergency',
        er_encounter_id: erVisitId,
      });
      addToast('success', 'Medication Given', `${medData.medicineName || medData.medicine_name} recorded as administered.`);
    } catch (err: any) {
      addToast('error', 'Medication Failed', err?.message || 'Could not record medication');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Doctor Assessment
  // ---------------------------------------------------------------------------
  const recordDoctorAssessment = async (
    erVisitId: string,
    assessment: string,
    diagnosis: string,
    _labOrders?: any[],
    _pharmacyOrders?: any[],
    _procedures?: any[],
    doctorName?: string,
  ): Promise<void> => {
    try {
      await createERAssessmentApi(erVisitId, {
        assessment,
        provisional_diagnosis: diagnosis,
        doctor_name: doctorName || user?.name || 'Doctor',
        assessment_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      // Refresh the encounter to pick up updated er_status
      const updated = await fetchEREncounterApi(erVisitId);
      setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      addToast('success', 'Assessment Saved', 'Doctor assessment and diagnosis saved.');
    } catch (err: any) {
      addToast('error', 'Assessment Failed', err?.message || 'Could not save assessment');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Disposition
  // ---------------------------------------------------------------------------
  const setERDisposition = async (
    erVisitId: string,
    disposition: string,
    dispositionNotes?: string,
    requiredWard?: string,
    doctorName?: string,
  ): Promise<void> => {
    try {
      const updated = await setERDispositionApi(erVisitId, {
        disposition,
        disposition_notes: dispositionNotes,
        required_ward: requiredWard,
        doctor_name: doctorName || user?.name,
      });
      setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      addToast('info', 'Disposition Updated', `Disposition set to ${disposition}`);
    } catch (err: any) {
      addToast('error', 'Disposition Failed', err?.message || 'Could not set disposition');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Assign Observation Bed
  // ---------------------------------------------------------------------------
  const assignObservationBed = async (erVisitId: string, bedId: string): Promise<void> => {
    try {
      const updated = await assignERObservationBedApi(erVisitId, bedId);
      setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      // Refresh observation beds
      await refreshObservationBeds();
      addToast('success', 'Observation Bed Assigned', 'Patient allocated to observation bed.');
    } catch (err: any) {
      addToast('error', 'Bed Assignment Failed', err?.message || 'Could not assign bed');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Release Observation Bed — updates bed via IPD release endpoint
  // ---------------------------------------------------------------------------
  const releaseObservationBed = async (bedId: string): Promise<void> => {
    try {
      await releaseBedApi(bedId);
      await refreshObservationBeds();
      addToast('info', 'Observation Bed Released', 'Bed is now available.');
    } catch (err: any) {
      addToast('error', 'Release Failed', err?.message || 'Could not release bed');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Coordinate IPD Admission
  // ---------------------------------------------------------------------------
  const coordinateIPDAdmission = async (erVisitId: string, ipdData?: any): Promise<void> => {
    try {
      const encounter = getERVisitById(erVisitId);
      if (!encounter) throw new Error('Encounter not found');

      if (ipdData) {
        const updated = await initiateERToIPDApi(erVisitId, ipdData);
        setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      } else {
        // Just mark as transferred without full IPD data (handled by IPD Admit page)
        const updated = await updateEREncounterApi(erVisitId, {
          er_status: 'Transferred',
          er_disposition: 'IPD',
        });
        setErVisits((prev) => prev.map((v) => (v.id === erVisitId ? updated : v)));
      }
      addToast('success', 'IPD Coordination Complete', 'ER Visit marked as transferred to IPD Admission.');
    } catch (err: any) {
      addToast('error', 'IPD Coordination Failed', err?.message || 'Could not coordinate IPD');
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  return (
    <ERContext.Provider
      value={{
        erVisits,
        erObservationBeds,
        loading,
        error,
        refreshERVisits,
        createERVisit,
        getERVisitById,
        getERVisitByUhid,
        updateERTriage,
        recordERVitals,
        addERNursingNote,
        administerERMedication,
        recordDoctorAssessment,
        setERDisposition,
        assignObservationBed,
        releaseObservationBed,
        coordinateIPDAdmission,
      }}
    >
      {children}
    </ERContext.Provider>
  );
};

export const useER = () => {
  const context = useContext(ERContext);
  if (!context) {
    return {
      erVisits: [],
      erObservationBeds: [],
      loading: false,
      error: null,
      refreshERVisits: async () => {},
      createERVisit: async () => {},
      getERVisitById: () => undefined,
      getERVisitByUhid: () => undefined,
      updateERTriage: async () => {},
      recordERVitals: async () => {},
      addERNursingNote: async () => {},
      administerERMedication: async () => {},
      recordDoctorAssessment: async () => {},
      setERDisposition: async () => {},
      assignObservationBed: async () => {},
      releaseObservationBed: async () => {},
      coordinateIPDAdmission: async () => {},
    };
  }
  return context;
};
