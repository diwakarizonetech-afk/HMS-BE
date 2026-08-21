import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Patient,
  Doctor,
  Department,
  Appointment,
  WalkInToken,
  QueueItem,
  Bed,
  IPDAdmission,
  EmergencyContactItem,
  Notification,
} from '../types/hms';
import { Branch } from '../types/superAdmin';
import { ItemMaster, PurchaseOrder } from '../types/store';
import {
  lookupPatientsApi,
  fetchPatientsApi,
  createPatientApi,
  updatePatientApi,
  fetchDepartmentsApi,
  fetchDoctorsApi,
  fetchAppointmentsApi,
  createAppointmentApi,
  rescheduleAppointmentApi,
  cancelAppointmentApi,
  updateAppointmentApi,
  fetchQueueApi,
  registerWalkInApi,
  updateQueueStatusApi,
  deleteQueueItemApi,
  fetchBedsApi,
  fetchIpdAdmissionsApi,
  createIpdAdmissionApi,
  allocateBedApi,
  releaseBedApi,
  fetchNotificationsApi,
  createNotificationApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  fetchStoreItemsApi,
  createStoreItemApi,
  updateStoreItemApi,
  deleteStoreItemApi,
  fetchPurchaseOrdersApi,
  createPurchaseOrderApi,
  updatePurchaseOrderApi,
  deletePurchaseOrderApi,
  fetchBranchesApi,
  fetchPatientHistoryApi,
} from '../services/api';
import { generateUHID } from '../utils/helpers';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface HMSContextType {
  // Patients
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'uhid' | 'registrationDate' | 'status'>) => Promise<Patient>;
  updatePatient: (id: string, updated: Partial<Patient>) => void;
  getPatientByUhid: (uhid: string) => Patient | undefined;
  searchPatients: (query: string) => Promise<Patient[]>;
  getPatientMedicalHistory: (uhid: string) => Promise<any>;

  // Emergency Contacts
  emergencyContacts: EmergencyContactItem[];
  addEmergencyContact: (contact: Omit<EmergencyContactItem, 'id'>) => void;
  updateEmergencyContact: (id: string, updated: Partial<EmergencyContactItem>) => void;
  deleteEmergencyContact: (id: string) => void;

  // Doctors & Departments & Branches
  doctors: Doctor[];
  departments: Department[];
  branches: Branch[];

  // Appointments
  appointments: Appointment[];
  bookAppointment: (apt: Omit<Appointment, 'id' | 'status' | 'createdDate'> & { status?: string }) => Promise<Appointment>;
  updateAppointment: (id: string, updated: Partial<Appointment>) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: string, newTimeSlot: string, reason?: string) => Promise<void>;
  cancelAppointment: (id: string, reason: string) => Promise<void>;

  // Walk-in & Queue
  walkInTokens: WalkInToken[];
  queue: QueueItem[];
  registerWalkIn: (patientUhid: string, patientName: string, department: string, doctorName: string, branch?: string) => Promise<WalkInToken>;
  updateQueueStatus: (id: string, newStatus: QueueItem['status']) => Promise<void>;
  deleteQueueItem: (id: string) => Promise<void>;
  callNextInQueue: () => void;

  // IPD & Bed Allocation
  beds: Bed[];
  ipdAdmissions: IPDAdmission[];
  admitPatient: (admission: Omit<IPDAdmission, 'id' | 'status'>) => Promise<void>;
  allocateBed: (bedId: string, patientUhid: string, patientName: string) => Promise<void>;
  transferBed: (currentBedId: string, targetBedId: string) => Promise<void>;
  releaseBed: (bedId: string) => Promise<void>;

  // Store & Inventory
  storeItems: ItemMaster[];
  purchaseOrders: PurchaseOrder[];
  addStoreItem: (itemData: any) => Promise<any>;
  updateStoreItem: (id: string, itemData: any) => Promise<any>;
  deleteStoreItem: (id: string) => Promise<void>;
  addPurchaseOrder: (poData: any) => Promise<any>;
  updatePurchaseOrder: (id: string, poData: any) => Promise<any>;
  deletePurchaseOrder: (id: string) => Promise<void>;

  // Notifications & UI
  notifications: Notification[];
  sendNotification: (notificationData: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'success';
    module?: string;
    eventType?: string;
    senderName?: string;
    recipientRole?: string;
    relatedRecordId?: string;
    priority?: string;
    branch?: string;
    followUpDate?: string;
  }) => Promise<Notification>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Connection State
  isConnectedToBackend: boolean;
  refreshData: () => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [walkInTokens, setWalkInTokens] = useState<WalkInToken[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [ipdAdmissions, setIpdAdmissions] = useState<IPDAdmission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [storeItems, setStoreItems] = useState<ItemMaster[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConnectedToBackend, setIsConnectedToBackend] = useState<boolean>(false);

  // Toast utility
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper: get role from saved user
  const _getUserRole = (): string => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (!saved) return '';
      const u = JSON.parse(saved);
      return (u?.role || '').toString().toLowerCase().replace('userrole.', '');
    } catch {
      return '';
    }
  };

  // Helper: get branch from saved user
  const _getUserBranch = (): string | undefined => {
    try {
      const saved = localStorage.getItem('hms_user');
      if (!saved) return undefined;
      const u = JSON.parse(saved);
      return u?.branch || undefined;
    } catch {
      return undefined;
    }
  };

  // Fetch initial data from backend API — role-aware, only hits relevant endpoints
  const loadBackendData = async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      // Unauthenticated public portal (e.g. Patient Booking)
      try {
        const [depts, docs, brs] = await Promise.all([
          fetchDepartmentsApi().catch(() => null),
          fetchDoctorsApi().catch(() => null),
          fetchBranchesApi().catch(() => null),
        ]);
        if (depts !== null) setDepartments(depts);
        if (docs !== null) setDoctors(docs);
        if (brs !== null && Array.isArray(brs)) {
          setBranches(brs.map((b: any) => ({
            id: b.id,
            branchName: b.branch_name || b.branchName || 'Main Branch',
            branchCode: b.branch_code || b.branchCode || 'BR-MAIN',
            address: b.address || '',
            city: b.city || '',
            state: b.state || '',
            country: b.country || '',
            pincode: b.pincode || '',
            phone: b.phone || '',
            email: b.email || '',
            status: b.status || 'Active',
            isMainBranch: b.is_main_branch ?? b.isMainBranch ?? false,
            totalStaff: b.total_staff ?? b.totalStaff ?? 0,
          })));
        }
        if (depts !== null || docs !== null || brs !== null) setIsConnectedToBackend(true);
      } catch (err) {
        console.warn('Public API sync error:', err);
      }
      return;
    }

    const role = _getUserRole();
    const userBranch = _getUserBranch();

    // Helper function to process store items response
    const processStoreItems = (stItems: any[]) => {
      if (Array.isArray(stItems)) {
        setStoreItems(stItems.map((i: any) => ({
          id: i.id,
          itemCode: i.item_code || i.itemCode,
          itemName: i.item_name || i.itemName,
          category: i.category,
          subCategory: i.sub_category || i.subCategory || '',
          genericComposition: i.generic_composition || i.genericComposition || '',
          strength: i.strength || '',
          dosageForm: i.dosage_form || i.dosageForm || 'Tablet',
          unit: i.unit,
          packQuantity: i.pack_quantity ?? i.packQuantity ?? 1,
          issueUnit: i.issue_unit || i.issueUnit || 'Piece',
          openingStock: i.opening_stock ?? i.openingStock ?? 0,
          brand: i.brand || '',
          hsnCode: i.hsn_code || i.hsnCode || '',
          gstPercentage: i.gst_percentage ?? i.gstPercentage ?? 0,
          minStock: i.min_stock ?? i.minStock ?? 0,
          maxStock: i.max_stock ?? i.maxStock ?? 0,
          reorderLevel: i.reorder_level ?? i.reorderLevel ?? 0,
          storageLocation: i.storage_location || i.storageLocation || '',
          description: i.description || '',
          status: i.status || 'Active',
          currentStock: i.current_stock ?? i.currentStock ?? 0,
          unitPrice: i.unit_price ?? i.unitPrice ?? 0,
        })));
      }
    };

    // Helper function to process POs response
    const processPOs = (pos: any[]) => {
      if (Array.isArray(pos)) {
        setPurchaseOrders(pos.map((p: any) => ({
          id: p.id,
          poNumber: p.po_number || p.poNumber || `PO-${p.id || '000'}`,
          vendorId: p.vendor_id || p.vendorId || '',
          vendorName: p.vendor_name || p.vendorName || 'Supplier',
          purchaseDate: p.purchase_date || p.purchaseDate || '',
          expectedDelivery: p.expected_delivery || p.expectedDelivery || '',
          items: p.items || [],
          subTotal: p.sub_total ?? p.subTotal ?? 0,
          totalDiscount: p.total_discount ?? p.totalDiscount ?? 0,
          totalGst: p.total_gst ?? p.totalGst ?? 0,
          totalAmount: p.total_amount ?? p.totalAmount ?? 0,
          status: p.status || 'Pending',
          createdDate: p.created_date || p.createdDate || '',
        })));
      }
    };

    // ── Store / Pharmacy ──────────────────────────────────────────────────────
    if (
      role.includes('store') ||
      role.includes('inventory') ||
      role === 'pharmacy'
    ) {
      try {
        const [stItems, pos, depts, notifs] = await Promise.all([
          fetchStoreItemsApi(userBranch).catch(() => null),
          fetchPurchaseOrdersApi(userBranch).catch(() => null),
          fetchDepartmentsApi().catch(() => null),
          fetchNotificationsApi().catch(() => null),
        ]);

        if (depts !== null) setDepartments(depts);
        if (stItems !== null) processStoreItems(stItems);
        if (pos !== null) processPOs(pos);
        if (notifs !== null) setNotifications(notifs);

        if (stItems !== null) setIsConnectedToBackend(true);
      } catch (err) {
        console.warn('Store API sync error:', err);
        setIsConnectedToBackend(false);
      }
      return;
    }

    // ── Nurse ─────────────────────────────────────────────────────────────────
    if (role === 'nurse' || role.includes('nurse')) {
      try {
        const [pts, bds, adm, depts, docs, apts, qItems, notifs, stItems, pos] = await Promise.all([
          fetchPatientsApi().catch(() => null),
          fetchBedsApi(userBranch).catch(() => null),
          fetchIpdAdmissionsApi(userBranch).catch(() => null),
          fetchDepartmentsApi().catch(() => null),
          fetchDoctorsApi(userBranch).catch(() => null),
          fetchAppointmentsApi(userBranch).catch(() => null),
          fetchQueueApi(userBranch).catch(() => null),
          fetchNotificationsApi().catch(() => null),
          fetchStoreItemsApi(userBranch).catch(() => null),
          fetchPurchaseOrdersApi(userBranch).catch(() => null),
        ]);

        if (pts !== null) setPatients(pts);
        if (bds !== null) setBeds(bds);
        if (adm !== null) setIpdAdmissions(adm);
        if (depts !== null) setDepartments(depts);
        if (docs !== null) setDoctors(docs);
        if (apts !== null) setAppointments(apts);
        if (qItems !== null) setQueue(qItems);
        if (notifs !== null) setNotifications(notifs);
        if (stItems !== null) processStoreItems(stItems);
        if (pos !== null) processPOs(pos);

        if (pts !== null) setIsConnectedToBackend(true);
      } catch (err) {
        console.warn('Nurse API sync error:', err);
        setIsConnectedToBackend(false);
      }
      return;
    }

    // ── Super Admin / Admin ───────────────────────────────────────────────────
    if (role === 'super_admin' || role === 'superadmin' || role === 'admin') {
      try {
        const [depts, docs, pts, notifs, stItems, pos] = await Promise.all([
          fetchDepartmentsApi().catch(() => null),
          fetchDoctorsApi().catch(() => null),
          fetchPatientsApi().catch(() => null),
          fetchNotificationsApi().catch(() => null),
          fetchStoreItemsApi().catch(() => null),
          fetchPurchaseOrdersApi().catch(() => null),
        ]);

        if (depts !== null) setDepartments(depts);
        if (docs !== null) setDoctors(docs);
        if (pts !== null) setPatients(pts);
        if (notifs !== null) setNotifications(notifs);
        if (stItems !== null) processStoreItems(stItems);
        if (pos !== null) processPOs(pos);

        if (depts !== null) setIsConnectedToBackend(true);
      } catch (err) {
        console.warn('Admin API sync error:', err);
        setIsConnectedToBackend(false);
      }
      return;
    }

    // ── Reception / Doctor / Lab / Default ────────────────────────────────────
    try {
      const [pts, depts, docs, apts, qItems, bds, adm, notifs, stItems, pos, brs] = await Promise.all([
        fetchPatientsApi().catch(() => null),
        fetchDepartmentsApi().catch(() => null),
        fetchDoctorsApi(userBranch).catch(() => null),
        fetchAppointmentsApi(userBranch).catch(() => null),
        fetchQueueApi(userBranch).catch(() => null),
        fetchBedsApi(userBranch).catch(() => null),
        fetchIpdAdmissionsApi(userBranch).catch(() => null),
        fetchNotificationsApi().catch(() => null),
        fetchStoreItemsApi(userBranch).catch(() => null),
        fetchPurchaseOrdersApi(userBranch).catch(() => null),
        fetchBranchesApi().catch(() => null),
      ]);

      if (pts !== null) setPatients(pts);
      if (depts !== null) setDepartments(depts);
      if (docs !== null) setDoctors(docs);
      if (apts !== null) setAppointments(apts);
      if (qItems !== null) setQueue(qItems);
      if (bds !== null) setBeds(bds);
      if (adm !== null) setIpdAdmissions(adm);
      if (notifs !== null) setNotifications(notifs);
      if (stItems !== null) processStoreItems(stItems);
      if (pos !== null) processPOs(pos);
      if (brs !== null && Array.isArray(brs)) {
        setBranches(brs.map((b: any) => ({
          id: b.id,
          branchName: b.branch_name || b.branchName || 'Main Branch',
          branchCode: b.branch_code || b.branchCode || 'BR-MAIN',
          address: b.address || '',
          city: b.city || '',
          state: b.state || '',
          country: b.country || '',
          pincode: b.pincode || '',
          phone: b.phone || '',
          email: b.email || '',
          status: b.status || 'Active',
          isMainBranch: b.is_main_branch ?? b.isMainBranch ?? false,
          totalStaff: b.total_staff ?? b.totalStaff ?? 0,
        })));
      }

      if (pts !== null || docs !== null) setIsConnectedToBackend(true);
    } catch (err) {
      console.warn('Reception API sync error:', err);
      setIsConnectedToBackend(false);
    }
  };

  useEffect(() => {
    loadBackendData();
    const interval = setInterval(() => {
      const token = localStorage.getItem('hms_token');
      if (!token) return;
      loadBackendData();
    }, 5000);

    window.addEventListener('hms_auth_change', loadBackendData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hms_auth_change', loadBackendData);
    };
  }, []);

  // Patients Actions
  const searchPatients = async (query: string): Promise<Patient[]> => {
    try {
      const fetched = await lookupPatientsApi(query);
      if (fetched && fetched.length > 0) {
        setPatients((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPts = fetched.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPts];
        });
      }
      return fetched;
    } catch (err) {
      console.warn('Failed to lookup patients from DB:', err);
      return [];
    }
  };

  const getPatientMedicalHistory = async (uhid: string): Promise<any> => {
    try {
      return await fetchPatientHistoryApi(uhid);
    } catch (err) {
      console.warn('Failed to fetch cross-branch patient history:', err);
      const patient = patients.find((p) => p.uhid === uhid || p.id === uhid);
      const patientApts = appointments.filter((a) => a.patientUhid === uhid);
      const patientAdms = ipdAdmissions.filter((a) => a.patientUhid === uhid);
      return {
        patient: patient || null,
        appointments: patientApts,
        admissions: patientAdms,
        prescriptions: [],
        labReports: [],
        vitals: [],
        nursingNotes: [],
      };
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'uhid' | 'registrationDate' | 'status'>): Promise<Patient> => {
    try {
      const targetMob = (patientData.mobile || '').replace(/\D/g, '').slice(-10);
      const targetName = `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim().toLowerCase();

      const existingMatch = patients.find((p) => {
        const pMob = (p.mobile || '').replace(/\D/g, '').slice(-10);
        const pName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
        if (targetMob && pMob && targetMob === pMob) return true;
        if (targetName && pName && targetName === pName) return true;
        return false;
      });

      if (existingMatch) {
        addToast('info', 'Patient Matched', `Using existing patient record (UHID: ${existingMatch.uhid})`);
        return existingMatch;
      }

      const branchToSet = patientData.branch || _getUserBranch() || 'Main Branch';
      const created = await createPatientApi({ ...patientData, branch: branchToSet });
      setPatients((prev) => [created, ...prev]);
      addToast('success', 'Patient Registered', `Patient registered with UHID: ${created.uhid}`);

      if (patientData.emergencyContactName && patientData.emergencyPhone) {
        const newContact: EmergencyContactItem = {
          id: `ec-${Date.now()}`,
          patientUhid: created.uhid,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          contactName: patientData.emergencyContactName,
          relationship: patientData.emergencyRelationship,
          phone: patientData.emergencyPhone,
          priority: 'Primary',
        };
        setEmergencyContacts((prev) => [newContact, ...prev]);
      }
      return created;
    } catch (err) {
      console.error('addPatient failed:', err);
      addToast('error', 'Registration Failed', 'Could not save the patient to the server. Please try again.');
      throw err;
    }
  };

  const updatePatient = async (id: string, updated: Partial<Patient>) => {
    try {
      const apiUpdated = await updatePatientApi(id, updated);
      setPatients((prev) =>
        prev.map((p) => (p.id === id || p.uhid === id ? { ...p, ...apiUpdated } : p))
      );
      addToast('success', 'Profile Updated', 'Patient records updated in database.');
    } catch (err) {
      console.error('updatePatient failed:', err);
      addToast('error', 'Update Failed', 'Could not save patient changes to the server. Please try again.');
      throw err;
    }
  };

  const getPatientByUhid = (uhid: string) => {
    return patients.find((p) => p.uhid.toLowerCase() === uhid.toLowerCase() || p.id === uhid);
  };

  // Emergency Contacts
  const addEmergencyContact = (contact: Omit<EmergencyContactItem, 'id'>) => {
    const newContact: EmergencyContactItem = {
      ...contact,
      id: `ec-${Date.now()}`,
    };
    setEmergencyContacts((prev) => [newContact, ...prev]);
    addToast('success', 'Contact Added', 'New emergency contact saved.');
  };

  const updateEmergencyContact = (id: string, updated: Partial<EmergencyContactItem>) => {
    setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    addToast('success', 'Contact Updated', 'Emergency contact details updated.');
  };

  const deleteEmergencyContact = (id: string) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    addToast('info', 'Contact Deleted', 'Emergency contact removed.');
  };

  // Appointments
  const bookAppointment = async (aptData: Omit<Appointment, 'id' | 'status' | 'createdDate'> & { status?: string }): Promise<Appointment> => {
    try {
      const created = await createAppointmentApi({
        ...aptData,
        branch: aptData.branch || _getUserBranch(),
        status: aptData.status || 'Pending',
      });
      setAppointments((prev) => [created, ...prev]);

      if (created.status === 'Scheduled') {
        const queueItem: QueueItem = {
          id: `q-${created.id}`,
          tokenNumber: created.tokenNumber || `T-${(created.id || '').substring(0, 4).toUpperCase()}`,
          patientUhid: created.patientUhid,
          patientName: created.patientName,
          doctorName: created.doctorName,
          department: created.department,
          status: 'Waiting',
          waitingTimeMinutes: 15,
          timeIssued: created.timeSlot || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          branch: created.branch,
          isEmergency: created.isEmergency,
          priority: created.priority,
        };
        setQueue((prev) => [...prev, queueItem].sort((a, b) => (b.priority || 0) - (a.priority || 0)));
      }

      addToast('success', 'Appointment Request Sent', `Request submitted for ${created.patientName || 'patient'} with ${created.doctorName} on ${created.date}`);
      return created;
    } catch (err) {
      console.error('bookAppointment failed:', err);
      addToast('error', 'Booking Failed', 'Could not save the appointment to the server. Please try again.');
      throw err;
    }
  };

  const updateAppointment = async (id: string, updated: Partial<Appointment>): Promise<void> => {
    try {
      const result = await updateAppointmentApi(id, updated);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated, ...result } : a)));
      addToast('success', 'Appointment Updated', `Appointment #${id} updated.`);
      await loadBackendData();
    } catch (err: any) {
      console.error('updateAppointment failed:', err);
      addToast('error', 'Update Failed', err?.message || 'Failed to update appointment');
    }
  };

  const rescheduleAppointment = async (id: string, newDate: string, newTimeSlot: string, reason?: string) => {
    try {
      await rescheduleAppointmentApi(id, newDate, newTimeSlot);
    } catch (err) {
      console.error('API reschedule error:', err);
      addToast('error', 'Reschedule Failed', 'Could not save the reschedule to the server. Please try again.');
      throw err;
    }
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
            ...a,
            date: newDate,
            timeSlot: newTimeSlot,
            status: 'Rescheduled',
            reason: reason ? `${a.reason} (Rescheduled: ${reason})` : a.reason,
          }
          : a
      )
    );
    addToast('success', 'Appointment Rescheduled', `Updated to ${newDate} - ${newTimeSlot}`);
  };

  const cancelAppointment = async (id: string, reason: string) => {
    try {
      await cancelAppointmentApi(id);
    } catch (err) {
      console.error('API cancel error:', err);
      addToast('error', 'Cancellation Failed', 'Could not save the cancellation to the server. Please try again.');
      throw err;
    }
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Cancelled', reason: `Cancelled: ${reason}` } : a))
    );
    addToast('info', 'Appointment Cancelled', 'Appointment has been cancelled.');
  };

  // Walk-in & Queue
  const registerWalkIn = async (
    patientUhid: string,
    patientName: string,
    department: string,
    doctorName: string,
    branch?: string
  ): Promise<WalkInToken> => {
    try {
      const effectiveBranch = branch || _getUserBranch();
      const token = await registerWalkInApi(
        patientUhid,
        patientName,
        department,
        doctorName,
        effectiveBranch
      );

      const matchedPat = patients.find((p) => p.uhid === patientUhid);
      const isEmergencyFlag = Boolean(matchedPat?.isEmergency || (matchedPat?.status || '').toLowerCase() === 'emergency');

      const queueItem: QueueItem = {
        id: `q-${token.tokenNumber}`,
        tokenNumber: token.tokenNumber,
        patientUhid,
        patientName,
        doctorName,
        department,
        status: 'Waiting',
        waitingTimeMinutes: token.estimatedWaitMinutes || 0,
        timeIssued: token.issueTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        branch: effectiveBranch,
        isEmergency: isEmergencyFlag,
        priority: isEmergencyFlag ? 10 : 0,
      };

      setQueue((prev) => {
        const list = [...prev, queueItem];
        return list.sort((a, b) => {
          const getWeight = (st: string) => (st === 'Completed' ? 1 : st === 'Skipped' ? 2 : 0);
          const wDiff = getWeight(a.status) - getWeight(b.status);
          if (wDiff !== 0) return wDiff;
          const emDiff = (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0);
          if (emDiff !== 0) return emDiff;
          return (b.priority || 0) - (a.priority || 0);
        });
      });

      addToast('success', 'Walk-in Token Issued', `Token: ${token.tokenNumber}${isEmergencyFlag ? ' (EMERGENCY PRIORITY)' : ''}`);
      return token;
    } catch (err) {
      console.error('registerWalkIn failed:', err);
      addToast('error', 'Token Issue Failed', 'Could not save the walk-in token to the server. Please try again.');
      throw err;
    }
  };

  const updateQueueStatus = async (id: string, newStatus: QueueItem['status']) => {
    try {
      await updateQueueStatusApi(id, newStatus);
    } catch (err) {
      console.error('API updateQueueStatus error:', err);
      addToast('error', 'Update Failed', 'Could not save the queue status to the server. Please try again.');
      throw err;
    }
    setQueue((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q));
      return updated.sort((a, b) => {
        const getWeight = (st: string) => (st === 'Completed' ? 1 : st === 'Skipped' ? 2 : 0);
        const wDiff = getWeight(a.status) - getWeight(b.status);
        if (wDiff !== 0) return wDiff;
        const emDiff = (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0);
        if (emDiff !== 0) return emDiff;
        return (b.priority || 0) - (a.priority || 0);
      });
    });
    addToast('info', 'Queue Updated', `Token status changed to ${newStatus}`);
  };

  const deleteQueueItem = async (id: string) => {
    try {
      await deleteQueueItemApi(id);
    } catch (err) {
      console.error('API deleteQueueItem error:', err);
      addToast('error', 'Remove Failed', 'Could not remove the token from the server. Please try again.');
      throw err;
    }
    setQueue((prev) => prev.filter((q) => q.id !== id));
    addToast('info', 'Removed From Queue', 'Token removed from the live queue.');
  };

  const callNextInQueue = () => {
    const nextWaiting = [...queue]
      .filter((q) => q.status === 'Waiting')
      .sort((a, b) => {
        const emergencyDiff = (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0);
        if (emergencyDiff !== 0) return emergencyDiff;
        return (b.priority || 0) - (a.priority || 0);
      })[0];
    if (nextWaiting) {
      updateQueueStatus(nextWaiting.id, 'In Consultation')
        .then(() => {
          addToast('success', 'Next Patient Called', `Now calling Token ${nextWaiting.tokenNumber}: ${nextWaiting.patientName}${nextWaiting.isEmergency ? ' (EMERGENCY PRIORITY)' : ''}`);
        })
        .catch(() => {
          // Failure toast already shown by updateQueueStatus; nothing further to do here.
        });
    } else {
      addToast('info', 'Queue Empty', 'No patients currently waiting in queue.');
    }
  };

  // IPD & Bed Management
  const admitPatient = async (admission: Omit<IPDAdmission, 'id' | 'status'>) => {
    try {
      const created = await createIpdAdmissionApi(admission);
      setIpdAdmissions((prev) => [created, ...prev]);
      setPatients((prev) =>
        prev.map((p) => (p.uhid === admission.patientUhid ? { ...p, status: 'Admitted' } : p))
      );
      // Admitting against a bed_id also flips that bed to Occupied on the
      // backend (see ipd.py admit_patient) — resync beds so the UI reflects it.
      try {
        const freshBeds = await fetchBedsApi();
        setBeds(freshBeds);
      } catch {
        // Non-fatal: bed list will still refresh on next natural reload.
      }
      addToast('success', 'Patient Admitted', `${admission.patientName} admitted to ${admission.ward} - Bed ${admission.bedNumber}`);
    } catch (err) {
      console.error('admitPatient failed:', err);
      addToast('error', 'Admission Failed', 'Could not save the admission to the server. Please try again.');
      throw err;
    }
  };

  const mapBedResponse = (b: any): Bed => ({
    id: b.id,
    bedNumber: b.bed_number ?? b.bedNumber,
    ward: b.ward,
    roomNumber: b.room_number ?? b.roomNumber,
    category: b.category,
    status: b.status,
    currentPatientUhid: b.current_patient_uhid ?? b.currentPatientUhid,
    currentPatientName: b.current_patient_name ?? b.currentPatientName,
    admittedDate: b.admitted_date ?? b.admittedDate,
  });

  const allocateBed = async (bedId: string, patientUhid: string, patientName: string) => {
    const patient = patients.find((p) => p.uhid === patientUhid);
    if (!patient) {
      addToast('error', 'Bed Allocation Failed', `Could not find a patient record for UHID ${patientUhid}.`);
      return;
    }
    try {
      const updatedBed = await allocateBedApi(bedId, patient.id);
      setBeds((prev) => prev.map((b) => (b.id === bedId ? mapBedResponse(updatedBed) : b)));
      addToast('success', 'Bed Allocated', `Bed assigned to ${patientName}`);
    } catch (err) {
      console.error('allocateBed failed:', err);
      addToast('error', 'Bed Allocation Failed', 'Could not save the bed allocation to the server. Please try again.');
      throw err;
    }
  };

  const transferBed = async (currentBedId: string, targetBedId: string) => {
    const currentBed = beds.find((b) => b.id === currentBedId);
    if (!currentBed || !currentBed.currentPatientUhid) return;
    const patient = patients.find((p) => p.uhid === currentBed.currentPatientUhid);
    if (!patient) {
      addToast('error', 'Bed Transfer Failed', 'Could not find the patient currently in this bed.');
      return;
    }
    try {
      // No single atomic "transfer" endpoint exists on the backend, so this
      // is release-then-allocate. If the second call fails after the first
      // succeeds, the patient ends up unassigned rather than double-booked —
      // safer than the reverse, and beds are refetched either way so the UI
      // never shows a state the backend doesn't agree with.
      const releasedBed = await releaseBedApi(currentBedId);
      const allocatedBed = await allocateBedApi(targetBedId, patient.id);
      setBeds((prev) =>
        prev.map((b) => {
          if (b.id === currentBedId) return mapBedResponse(releasedBed);
          if (b.id === targetBedId) return mapBedResponse(allocatedBed);
          return b;
        })
      );
      addToast('success', 'Bed Transferred', `Patient transferred to new bed`);
    } catch (err) {
      console.error('transferBed failed:', err);
      try {
        const freshBeds = await fetchBedsApi();
        setBeds(freshBeds);
      } catch {
        // Ignore — surfaced error toast below is the important part.
      }
      addToast('error', 'Bed Transfer Failed', 'Could not complete the bed transfer on the server. Bed list has been refreshed — please check current status and retry.');
      throw err;
    }
  };

  const releaseBed = async (bedId: string) => {
    try {
      const updatedBed = await releaseBedApi(bedId);
      const mapped = mapBedResponse(updatedBed);
      setBeds((prev) => prev.map((b) => (b.id === bedId ? mapped : b)));
      setIpdAdmissions((prev) =>
        prev.map((adm) =>
          adm.bedNumber === mapped.bedNumber || (mapped.currentPatientUhid && adm.patientUhid === mapped.currentPatientUhid)
            ? { ...adm, status: 'Discharged' }
            : adm
        )
      );
      if (mapped.status === 'Available') {
        addToast('success', 'Bed Available', `Bed ${mapped.bedNumber} is now available.`);
      } else {
        addToast('info', 'Bed Released', `Bed ${mapped.bedNumber} set to cleaning status.`);
      }
    } catch (err) {
      console.error('releaseBed failed:', err);
      addToast('error', 'Release Failed', 'Could not save the bed status change to the server. Please try again.');
      throw err;
    }
  };

  // Store & Inventory
  const addStoreItem = async (itemData: any): Promise<any> => {
    try {
      const created = await createStoreItemApi(itemData);
      const mapped: ItemMaster = {
        id: created.id,
        itemCode: created.item_code || created.itemCode,
        itemName: created.item_name || created.itemName,
        category: created.category,
        subCategory: created.sub_category || created.subCategory || '',
        genericComposition: created.generic_composition || created.genericComposition || itemData.genericComposition || '',
        strength: created.strength || itemData.strength || '',
        dosageForm: created.dosage_form || created.dosageForm || itemData.dosageForm || 'Tablet',
        unit: created.unit,
        packQuantity: created.pack_quantity ?? created.packQuantity ?? itemData.packQuantity ?? 1,
        issueUnit: created.issue_unit || created.issueUnit || itemData.issueUnit || 'Piece',
        openingStock: created.opening_stock ?? created.openingStock ?? itemData.openingStock ?? 0,
        brand: created.brand || '',
        hsnCode: created.hsn_code || created.hsnCode || '',
        gstPercentage: created.gst_percentage ?? created.gstPercentage ?? 0,
        minStock: created.min_stock ?? created.minStock ?? 0,
        maxStock: created.max_stock ?? created.maxStock ?? 0,
        reorderLevel: created.reorder_level ?? created.reorderLevel ?? 0,
        storageLocation: created.storage_location || created.storageLocation || '',
        description: created.description || '',
        status: created.status || 'Active',
        currentStock: created.current_stock ?? created.currentStock ?? 0,
        unitPrice: created.unit_price ?? created.unitPrice ?? 0,
      };
      setStoreItems((prev) => [mapped, ...prev]);
      addToast('success', 'Store Item Created', `Created item successfully`);
      return mapped;
    } catch (err) {
      console.error('addStoreItem failed:', err);
      addToast('error', 'Create Failed', 'Could not save the item to the server. Please try again.');
      throw err;
    }
  };

  const updateStoreItem = async (id: string, itemData: any): Promise<any> => {
    try {
      const updated = await updateStoreItemApi(id, itemData);
      const mapped: ItemMaster = {
        id: updated.id,
        itemCode: updated.item_code || updated.itemCode || itemData.itemCode,
        itemName: updated.item_name || updated.itemName || itemData.itemName,
        category: updated.category || itemData.category,
        subCategory: updated.sub_category || updated.subCategory || itemData.subCategory || '',
        genericComposition: updated.generic_composition ?? updated.genericComposition ?? itemData.genericComposition ?? '',
        strength: updated.strength ?? itemData.strength ?? '',
        dosageForm: updated.dosage_form ?? updated.dosageForm ?? itemData.dosageForm ?? 'Tablet',
        unit: updated.unit || itemData.unit,
        packQuantity: updated.pack_quantity ?? updated.packQuantity ?? itemData.packQuantity ?? 1,
        issueUnit: updated.issue_unit || updated.issueUnit || itemData.issueUnit || 'Piece',
        openingStock: updated.opening_stock ?? updated.openingStock ?? itemData.openingStock ?? 0,
        brand: updated.brand || itemData.brand || '',
        hsnCode: updated.hsn_code || updated.hsnCode || itemData.hsnCode || '',
        gstPercentage: updated.gst_percentage ?? updated.gstPercentage ?? itemData.gstPercentage ?? 0,
        minStock: updated.min_stock ?? updated.minStock ?? itemData.minStock ?? 0,
        maxStock: updated.max_stock ?? updated.maxStock ?? itemData.maxStock ?? 0,
        reorderLevel: updated.reorder_level ?? updated.reorderLevel ?? itemData.reorderLevel ?? 0,
        storageLocation: updated.storage_location || updated.storageLocation || itemData.storageLocation || '',
        description: updated.description || itemData.description || '',
        status: updated.status || itemData.status || 'Active',
        currentStock: updated.current_stock ?? updated.currentStock ?? itemData.currentStock ?? 0,
        unitPrice: updated.unit_price ?? updated.unitPrice ?? itemData.unitPrice ?? 0,
      };
      setStoreItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...mapped } : i))
      );
      addToast('success', 'Item Updated', `${mapped.itemName} updated in database.`);
      return mapped;
    } catch (err) {
      console.error('updateStoreItem failed:', err);
      addToast('error', 'Update Failed', 'Could not save item changes to the server. Please try again.');
      throw err;
    }
  };

  const deleteStoreItem = async (id: string) => {
    try {
      await deleteStoreItemApi(id);
      setStoreItems((prev) => prev.filter((i) => i.id !== id));
      addToast('info', 'Item Deleted', 'Item deleted from database.');
    } catch (err) {
      console.error('deleteStoreItem failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the item on the server. Please try again.');
      throw err;
    }
  };

  const addPurchaseOrder = async (poData: any): Promise<any> => {
    try {
      const created = await createPurchaseOrderApi(poData);
      setPurchaseOrders((prev) => [created, ...prev]);
      addToast('success', 'Purchase Order Created', `Created PO successfully`);
      return created;
    } catch (err) {
      console.error('addPurchaseOrder failed:', err);
      addToast('error', 'Create Failed', 'Could not save the purchase order to the server. Please try again.');
      throw err;
    }
  };

  const updatePurchaseOrder = async (id: string, poData: any): Promise<any> => {
    try {
      const updated = await updatePurchaseOrderApi(id, poData);
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...poData, ...updated } : p))
      );
      // NOTE: this used to also bump matching storeItems' currentStock locally
      // whenever poData.status === 'Approved'. That mirrored a backend bug
      // (approving a PO used to add stock immediately) that's now fixed —
      // stock only increases once, at GRN receipt (see goods_receipts.py).
      // Duplicating that logic here would just reintroduce the same
      // double-counting bug on the frontend, so it's been removed; store
      // items refresh from the backend's own numbers via the normal poll.
      addToast('success', 'PO Updated', `Purchase Order updated in database.`);
      return updated;
    } catch (err) {
      console.error('updatePurchaseOrder failed:', err);
      addToast('error', 'Update Failed', 'Could not save the purchase order changes to the server. Please try again.');
      throw err;
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    try {
      await deletePurchaseOrderApi(id);
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
      addToast('info', 'PO Deleted', 'Purchase Order deleted from database.');
    } catch (err) {
      console.error('deletePurchaseOrder failed:', err);
      addToast('error', 'Delete Failed', 'Could not delete the purchase order on the server. Please try again.');
      throw err;
    }
  };

  // Notifications
  const sendNotification = async (notificationData: any): Promise<Notification> => {
    try {
      const created = await createNotificationApi(notificationData);
      setNotifications((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('sendNotification failed:', err);
      const localNotif: Notification = {
        id: `notif-${Date.now()}`,
        title: notificationData.title,
        message: notificationData.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: notificationData.type || 'info',
        read: false,
        module: notificationData.module,
        eventType: notificationData.eventType,
        senderName: notificationData.senderName,
        recipientRole: notificationData.recipientRole,
        relatedRecordId: notificationData.relatedRecordId,
        priority: notificationData.priority,
        branch: notificationData.branch,
        followUpDate: notificationData.followUpDate,
      };
      setNotifications((prev) => [localNotif, ...prev]);
      return localNotif;
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('markNotificationRead failed:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('markAllNotificationsRead failed:', err);
    }
  };

  return (
    <HMSContext.Provider
      value={{
        patients,
        addPatient,
        updatePatient,
        getPatientByUhid,
        searchPatients,
        getPatientMedicalHistory,
        emergencyContacts,
        addEmergencyContact,
        updateEmergencyContact,
        deleteEmergencyContact,
        doctors,
        departments,
        branches,
        appointments,
        bookAppointment,
        updateAppointment,
        rescheduleAppointment,
        cancelAppointment,
        walkInTokens,
        queue,
        registerWalkIn,
        updateQueueStatus,
        deleteQueueItem,
        callNextInQueue,
        beds,
        ipdAdmissions,
        admitPatient,
        allocateBed,
        transferBed,
        releaseBed,
        storeItems,
        addStoreItem,
        updateStoreItem,
        deleteStoreItem,
        purchaseOrders,
        addPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        notifications,
        sendNotification,
        markNotificationRead,
        markAllNotificationsRead,
        toasts,
        addToast,
        removeToast,
        isConnectedToBackend,
        refreshData: loadBackendData,
      }}
    >
      {children}
    </HMSContext.Provider>
  );
};

export const useHMS = () => {
  const context = useContext(HMSContext);
  if (!context) {
    throw new Error('useHMS must be used within an HMSProvider');
  }
  return context;
};
