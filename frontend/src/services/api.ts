import {
  Patient,
  Doctor,
  Department,
  Appointment,
  WalkInToken,
  QueueItem,
  Bed,
  IPDAdmission,
  Notification,
  User,
} from '../types/hms';

const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const API_BASE = `${rawApiUrl}/api/v1`;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('hms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      window.dispatchEvent(new Event('hms_auth_change'));
    }
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = `Request failed with status ${response.status}`;
    if (typeof errorData.detail === 'string') {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ');
    } else if (errorData.detail && typeof errorData.detail === 'object') {
      errorMessage = JSON.stringify(errorData.detail);
    } else if (errorData.message && typeof errorData.message === 'string') {
      errorMessage = errorData.message;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Auth API ---
export async function loginApi(email: string, pass: string): Promise<{ access_token: string; token_type: string; user: User }> {
  const data = await apiRequest<{ access_token: string; token_type: string; user: any }>('/auth/login-json', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });
  const u = data.user || {};
  return {
    access_token: data.access_token,
    token_type: data.token_type,
    user: {
      id: u.id,
      name: u.name || u.fullName || (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : ''),
      email: u.email,
      role: u.role,
      username: u.username || u.userId,
      avatar: u.avatar,
      department: u.department,
      branch: u.branch,
      assignedWard: u.assignedWard || u.assigned_ward,
      employeeId: u.employeeId || u.employee_id,
      phone: u.phone,
    },
  };
}

export async function fetchCurrentUser(): Promise<User> {
  const u = await apiRequest<any>('/auth/me');
  return {
    id: u.id,
    name: u.name || u.fullName || (u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : ''),
    email: u.email,
    role: u.role,
    username: u.username || u.userId,
    avatar: u.avatar,
    department: u.department,
    branch: u.branch,
    assignedWard: u.assignedWard || u.assigned_ward,
    employeeId: u.employeeId || u.employee_id,
    phone: u.phone,
  };
}

export async function fetchLoginCredentialsApi(): Promise<any[]> {
  return apiRequest<any[]>('/auth/credentials').catch(() => []);
}

// --- Patients API ---
export async function fetchPatientsApi(branch?: string): Promise<Patient[]> {
  const url = branch && branch.toLowerCase() !== 'all' ? `/patients?branch=${encodeURIComponent(branch)}` : '/patients';
  const list = await apiRequest<any[]>(url);
  return list.map((p) => ({
    id: p.id,
    uhid: p.uhid,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dob: p.dob,
    age: p.age,
    bloodGroup: p.blood_group,
    maritalStatus: p.marital_status,
    nationality: p.nationality,
    mobile: p.mobile,
    altMobile: p.alt_mobile,
    email: p.email,
    address: p.address,
    city: p.city,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    aadhaar: p.aadhaar,
    pan: p.pan,
    emergencyContactName: p.emergency_contact_name,
    emergencyRelationship: p.emergency_relationship,
    emergencyPhone: p.emergency_phone,
    allergies: p.allergies,
    existingDiseases: p.existing_diseases,
    insuranceProvider: p.insurance_provider,
    insuranceNumber: p.insurance_number,
    status: p.status,
    registrationDate: p.registration_date,
    branch: p.branch,
    isEmergency: Boolean(p.is_emergency ?? p.isEmergency),
    category: p.category,
  }));
}

export async function lookupPatientsApi(query: string): Promise<Patient[]> {
  const list = await apiRequest<any[]>(`/patients/lookup?q=${encodeURIComponent(query)}`);
  return list.map((p) => ({
    id: p.id,
    uhid: p.uhid,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dob: p.dob,
    age: p.age,
    bloodGroup: p.blood_group,
    maritalStatus: p.marital_status,
    nationality: p.nationality,
    mobile: p.mobile,
    altMobile: p.alt_mobile,
    email: p.email,
    address: p.address,
    city: p.city,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    aadhaar: p.aadhaar,
    pan: p.pan,
    emergencyContactName: p.emergency_contact_name,
    emergencyRelationship: p.emergency_relationship,
    emergencyPhone: p.emergency_phone,
    allergies: p.allergies,
    existingDiseases: p.existing_diseases,
    insuranceProvider: p.insurance_provider,
    insuranceNumber: p.insurance_number,
    status: p.status,
    registrationDate: p.registration_date,
    branch: p.branch,
    isEmergency: Boolean(p.is_emergency ?? p.isEmergency),
    category: p.category,
  }));
}

export async function createPatientApi(patient: Omit<Patient, 'id' | 'uhid' | 'registrationDate' | 'status'>): Promise<Patient> {
  const payload: any = {
    first_name: patient.firstName,
    last_name: patient.lastName,
    gender: patient.gender,
    dob: patient.dob,
    age: patient.age,
    blood_group: patient.bloodGroup,
    marital_status: patient.maritalStatus,
    nationality: patient.nationality,
    mobile: patient.mobile,
    alt_mobile: patient.altMobile,
    email: patient.email,
    address: patient.address,
    city: patient.city,
    state: patient.state,
    country: patient.country,
    pincode: patient.pincode,
    aadhaar: patient.aadhaar,
    pan: patient.pan,
    emergency_contact_name: patient.emergencyContactName,
    emergency_relationship: patient.emergencyRelationship,
    emergency_phone: patient.emergencyPhone,
    allergies: patient.allergies,
    existing_diseases: patient.existingDiseases,
    insurance_provider: patient.insuranceProvider,
    insurance_number: patient.insuranceNumber,
    branch: patient.branch,
    is_emergency: patient.isEmergency ?? false,
    category: patient.category,
  };

  const p = await apiRequest<any>('/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    id: p.id,
    uhid: p.uhid,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dob: p.dob,
    age: p.age,
    bloodGroup: p.blood_group,
    maritalStatus: p.marital_status,
    nationality: p.nationality,
    mobile: p.mobile,
    altMobile: p.alt_mobile,
    email: p.email,
    address: p.address,
    city: p.city,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    aadhaar: p.aadhaar,
    pan: p.pan,
    emergencyContactName: p.emergency_contact_name,
    emergencyRelationship: p.emergency_relationship,
    emergencyPhone: p.emergency_phone,
    allergies: p.allergies,
    existingDiseases: p.existing_diseases,
    insuranceProvider: p.insurance_provider,
    insuranceNumber: p.insurance_number,
    status: p.status,
    registrationDate: p.registration_date,
    branch: p.branch,
    isEmergency: Boolean(p.is_emergency ?? p.isEmergency),
    category: p.category,
  };
}

export async function updatePatientApi(id: string, updated: Partial<Patient>): Promise<Patient> {
  const payload: any = {};
  if (updated.firstName !== undefined) payload.first_name = updated.firstName;
  if (updated.lastName !== undefined) payload.last_name = updated.lastName;
  if (updated.gender !== undefined) payload.gender = updated.gender;
  if (updated.dob !== undefined) payload.dob = updated.dob;
  if (updated.age !== undefined) payload.age = updated.age;
  if (updated.bloodGroup !== undefined) payload.blood_group = updated.bloodGroup;
  if (updated.maritalStatus !== undefined) payload.marital_status = updated.maritalStatus;
  if (updated.nationality !== undefined) payload.nationality = updated.nationality;
  if (updated.mobile !== undefined) payload.mobile = updated.mobile;
  if (updated.altMobile !== undefined) payload.alt_mobile = updated.altMobile;
  if (updated.email !== undefined) payload.email = updated.email;
  if (updated.address !== undefined) payload.address = updated.address;
  if (updated.city !== undefined) payload.city = updated.city;
  if (updated.state !== undefined) payload.state = updated.state;
  if (updated.country !== undefined) payload.country = updated.country;
  if (updated.pincode !== undefined) payload.pincode = updated.pincode;
  if (updated.aadhaar !== undefined) payload.aadhaar = updated.aadhaar;
  if (updated.pan !== undefined) payload.pan = updated.pan;
  if (updated.emergencyContactName !== undefined) payload.emergency_contact_name = updated.emergencyContactName;
  if (updated.emergencyRelationship !== undefined) payload.emergency_relationship = updated.emergencyRelationship;
  if (updated.emergencyPhone !== undefined) payload.emergency_phone = updated.emergencyPhone;
  if (updated.allergies !== undefined) payload.allergies = updated.allergies;
  if (updated.existingDiseases !== undefined) payload.existing_diseases = updated.existingDiseases;
  if (updated.insuranceProvider !== undefined) payload.insurance_provider = updated.insuranceProvider;
  if (updated.insuranceNumber !== undefined) payload.insurance_number = updated.insuranceNumber;
  if (updated.status !== undefined) payload.status = updated.status;
  if (updated.branch !== undefined) payload.branch = updated.branch;
  if (updated.isEmergency !== undefined) payload.is_emergency = updated.isEmergency;
  if (updated.category !== undefined) payload.category = updated.category;

  const p = await apiRequest<any>(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return {
    id: p.id,
    uhid: p.uhid,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dob: p.dob,
    age: p.age,
    bloodGroup: p.blood_group,
    maritalStatus: p.marital_status,
    nationality: p.nationality,
    mobile: p.mobile,
    altMobile: p.alt_mobile,
    email: p.email,
    address: p.address,
    city: p.city,
    state: p.state,
    country: p.country,
    pincode: p.pincode,
    aadhaar: p.aadhaar,
    pan: p.pan,
    emergencyContactName: p.emergency_contact_name,
    emergencyRelationship: p.emergency_relationship,
    emergencyPhone: p.emergency_phone,
    allergies: p.allergies,
    existingDiseases: p.existing_diseases,
    insuranceProvider: p.insurance_provider,
    insuranceNumber: p.insurance_number,
    status: p.status,
    registrationDate: p.registration_date,
    branch: p.branch,
    isEmergency: Boolean(p.is_emergency ?? p.isEmergency),
    category: p.category,
  };
}

export async function fetchPatientHistoryApi(uhid: string): Promise<any> {
  return apiRequest<any>(`/patients/${encodeURIComponent(uhid)}/history`);
}

// --- Doctors & Departments API ---
export async function fetchDepartmentsApi(): Promise<any[]> {
  const list = await apiRequest<any[]>('/departments');
  return list.map((d) => {
    const deptName = d.name || d.department_name || d.departmentName || '';
    const deptCode = d.code || d.department_code || d.departmentCode || '';
    return {
      ...d,
      id: d.id,
      name: deptName,
      departmentName: deptName,
      code: deptCode,
      departmentCode: deptCode,
      iconName: d.icon_name || d.iconName || 'Building2',
      doctorCount: d.doctor_count ?? d.doctorCount ?? 0,
      description: d.description || '',
      headOfDepartment: d.head_of_department || d.headOfDepartment || d.head_name || d.headName || 'Not Assigned',
      email: d.email || '',
      phone: d.phone || '',
      floorLocation: d.floor_location || d.floorLocation || d.floor_number || d.floorNumber || '1st Floor',
      bedCount: d.bed_count ?? d.bedCount ?? 0,
      status: d.status || 'Active',
    };
  });
}

export async function fetchDoctorsApi(branch?: string, department?: string): Promise<Doctor[]> {
  const params = new URLSearchParams();
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  if (department && department.toLowerCase() !== 'all') params.set('department', department);
  const query = params.toString();
  const url = query ? `/doctors?${query}` : '/doctors';
  const list = await apiRequest<any[]>(url);
  return (list || []).map((d) => ({
    id: d.id,
    name: d.name,
    department: d.department,
    specialization: d.specialization,
    roomNo: d.room_no,
    consultationFee: d.consultation_fee,
    availableDays: d.available_days || [],
    slots: d.slots || [],
    status: d.status,
    email: d.email,
    branch: d.branch,
  }));
}

export async function createDoctorApi(doc: any): Promise<Doctor> {
  const payload = {
    name: doc.name,
    email: doc.email,
    department: doc.department || 'General Medicine',
    specialization: doc.specialization || 'General Physician',
    room_no: doc.roomNo || doc.room_no || 'OPD-101',
    consultation_fee: doc.consultationFee ?? doc.consultation_fee ?? 500,
    available_days: doc.availableDays || doc.available_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    slots: doc.slots || ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'],
    status: doc.status || 'Available',
  };
  const d = await apiRequest<any>('/doctors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    id: d.id,
    name: d.name,
    department: d.department,
    specialization: d.specialization,
    roomNo: d.room_no,
    consultationFee: d.consultation_fee,
    availableDays: d.available_days || [],
    slots: d.slots || [],
    status: d.status,
    email: d.email,
  };
}

export async function updateDoctorApi(id: string, doc: Partial<Doctor>): Promise<Doctor> {
  const payload: any = {};
  if (doc.name !== undefined) payload.name = doc.name;
  if (doc.email !== undefined) payload.email = doc.email;
  if (doc.department !== undefined) payload.department = doc.department;
  if (doc.specialization !== undefined) payload.specialization = doc.specialization;
  if (doc.roomNo !== undefined) payload.room_no = doc.roomNo;
  if (doc.consultationFee !== undefined) payload.consultation_fee = doc.consultationFee;
  if (doc.availableDays !== undefined) payload.available_days = doc.availableDays;
  if (doc.slots !== undefined) payload.slots = doc.slots;
  if (doc.status !== undefined) payload.status = doc.status;

  const d = await apiRequest<any>(`/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return {
    id: d.id,
    name: d.name,
    department: d.department,
    specialization: d.specialization,
    roomNo: d.room_no,
    consultationFee: d.consultation_fee,
    availableDays: d.available_days || [],
    slots: d.slots || [],
    status: d.status,
    email: d.email,
  };
}

export async function deleteDoctorApi(id: string): Promise<void> {
  await apiRequest(`/doctors/${id}`, { method: 'DELETE' });
}


// --- Appointments API ---
export async function fetchAppointmentsApi(branch?: string, patientUhid?: string): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (branch) params.set('branch', branch);
  if (patientUhid) params.set('patient_uhid', patientUhid);
  const query = params.toString();
  const url = query ? `/appointments?${query}` : '/appointments';
  const list = await apiRequest<any[]>(url);
  return list.map((a) => ({
    id: a.id,
    patientUhid: a.patient_uhid || a.patientUhid || '',
    patientName: a.patient_name || a.patientName || '',
    patientMobile: a.patient_mobile || a.patientMobile || '',
    bloodGroup: a.blood_group || a.bloodGroup || '',
    department: a.department || '',
    doctorId: a.doctor_id || a.doctorId || '',
    doctorName: a.doctor_name || a.doctorName || '',
    date: a.date || '',
    timeSlot: a.time_slot || a.timeSlot || '',
    reason: a.reason || '',
    status: a.status || '',
    createdDate: a.created_date || a.createdDate || '',
    isEmergency: Boolean(a.is_emergency ?? a.isEmergency),
    priority: a.priority ?? 0,
    bookingSource: a.booking_source || a.bookingSource || '',
    tokenNumber: a.token_number || a.tokenNumber || '',
    assignedNurse: a.assigned_nurse || a.assignedNurse || '',
    branch: a.branch || '',
  }));
}

export async function createAppointmentApi(apt: Omit<Appointment, 'id' | 'status' | 'createdDate'> & { status?: string }): Promise<Appointment> {
  const payload = {
    patient_uhid: apt.patientUhid,
    patient_name: apt.patientName,
    patient_mobile: apt.patientMobile,
    blood_group: apt.bloodGroup,
    department: apt.department,
    doctor_id: apt.doctorId,
    doctor_name: apt.doctorName,
    date: apt.date,
    time_slot: apt.timeSlot,
    reason: apt.reason,
    branch: apt.branch,
    status: apt.status || 'Pending',
    is_emergency: apt.isEmergency || false,
    priority: apt.priority || 0,
    booking_source: apt.bookingSource || 'Reception',
    token_number: apt.tokenNumber,
    assigned_nurse: apt.assignedNurse,
  };

  const a = await apiRequest<any>('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    id: a.id,
    patientUhid: a.patient_uhid || a.patientUhid || apt.patientUhid || '',
    patientName: a.patient_name || a.patientName || apt.patientName || '',
    patientMobile: a.patient_mobile || a.patientMobile || apt.patientMobile || '',
    bloodGroup: a.blood_group || a.bloodGroup || apt.bloodGroup || '',
    department: a.department || apt.department || '',
    doctorId: a.doctor_id || a.doctorId || apt.doctorId || '',
    doctorName: a.doctor_name || a.doctorName || apt.doctorName || '',
    date: a.date || apt.date || '',
    timeSlot: a.time_slot || a.timeSlot || apt.timeSlot || '',
    reason: a.reason || apt.reason || '',
    status: a.status || apt.status || 'Pending',
    createdDate: a.created_date || a.createdDate || new Date().toISOString().split('T')[0],
    isEmergency: Boolean(a.is_emergency ?? a.isEmergency ?? apt.isEmergency),
    priority: a.priority ?? apt.priority ?? 0,
    bookingSource: a.booking_source || a.bookingSource || apt.bookingSource || '',
    tokenNumber: a.token_number || a.tokenNumber || apt.tokenNumber || '',
    assignedNurse: a.assigned_nurse || a.assignedNurse || apt.assignedNurse || '',
    branch: a.branch || apt.branch || '',
  };
}

export async function rescheduleAppointmentApi(id: string, date: string, timeSlot: string): Promise<void> {
  await apiRequest(`/appointments/${id}/reschedule?date=${encodeURIComponent(date)}&time_slot=${encodeURIComponent(timeSlot)}`, {
    method: 'POST',
  });
}

export async function cancelAppointmentApi(id: string): Promise<void> {
  await apiRequest(`/appointments/${id}/cancel`, {
    method: 'POST',
  });
}

export async function updateAppointmentApi(id: string, updated: Partial<Appointment>): Promise<Appointment> {
  const payload: any = {};
  if (updated.patientUhid !== undefined) payload.patient_uhid = updated.patientUhid;
  if (updated.patientName !== undefined) payload.patient_name = updated.patientName;
  if (updated.patientMobile !== undefined) payload.patient_mobile = updated.patientMobile;
  if (updated.bloodGroup !== undefined) payload.blood_group = updated.bloodGroup;
  if (updated.department !== undefined) payload.department = updated.department;
  if (updated.doctorId !== undefined) payload.doctor_id = updated.doctorId;
  if (updated.doctorName !== undefined) payload.doctor_name = updated.doctorName;
  if (updated.date !== undefined) payload.date = updated.date;
  if (updated.timeSlot !== undefined) payload.time_slot = updated.timeSlot;
  if (updated.reason !== undefined) payload.reason = updated.reason;
  if (updated.status !== undefined) payload.status = updated.status;
  if (updated.branch !== undefined) payload.branch = updated.branch;
  if (updated.isEmergency !== undefined) payload.is_emergency = updated.isEmergency;
  if (updated.priority !== undefined) payload.priority = updated.priority;
  if (updated.bookingSource !== undefined) payload.booking_source = updated.bookingSource;
  if (updated.tokenNumber !== undefined) payload.token_number = updated.tokenNumber;
  if (updated.assignedNurse !== undefined) payload.assigned_nurse = updated.assignedNurse;

  const a = await apiRequest<any>(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return {
    id: a.id,
    patientUhid: a.patient_uhid || a.patientUhid || updated.patientUhid || '',
    patientName: a.patient_name || a.patientName || updated.patientName || '',
    patientMobile: a.patient_mobile || a.patientMobile || updated.patientMobile || '',
    department: a.department || updated.department || '',
    doctorId: a.doctor_id || a.doctorId || updated.doctorId || '',
    doctorName: a.doctor_name || a.doctorName || updated.doctorName || '',
    date: a.date || updated.date || '',
    timeSlot: a.time_slot || a.timeSlot || updated.timeSlot || '',
    reason: a.reason || updated.reason || '',
    status: a.status || updated.status || '',
    createdDate: a.created_date || a.createdDate || '',
    isEmergency: Boolean(a.is_emergency ?? a.isEmergency ?? updated.isEmergency),
    priority: a.priority ?? updated.priority ?? 0,
    bookingSource: a.booking_source || a.bookingSource || updated.bookingSource || '',
    tokenNumber: a.token_number || a.tokenNumber || updated.tokenNumber || '',
    branch: a.branch || updated.branch || '',
  };
}

// --- Queue & Walk-In API ---
export async function fetchQueueApi(branch?: string): Promise<QueueItem[]> {
  const url = branch ? `/queue?branch=${encodeURIComponent(branch)}` : '/queue';
  const list = await apiRequest<any[]>(url);
  return list.map((q) => ({
    id: q.id,
    tokenNumber: q.token_number || q.tokenNumber || '',
    patientUhid: q.patient_uhid || q.patientUhid || '',
    patientName: q.patient_name || q.patientName || '',
    bloodGroup: q.blood_group || q.bloodGroup || '',
    doctorName: q.doctor_name || q.doctorName || '',
    department: q.department || '',
    status: q.status || '',
    waitingTimeMinutes: q.waiting_time_minutes ?? q.waitingTimeMinutes ?? 0,
    timeIssued: q.time_issued || q.timeIssued || '',
    isEmergency: Boolean(q.is_emergency ?? q.isEmergency),
    priority: q.priority ?? 0,
    assignedNurse: q.assigned_nurse || q.assignedNurse || '',
    branch: q.branch || '',
  }));
}

export async function registerWalkInApi(patientUhid: string, patientName: string, department: string, doctorName: string, branch?: string): Promise<WalkInToken> {
  const payload = {
    patient_uhid: patientUhid,
    patient_name: patientName,
    department: department,
    doctor_name: doctorName,
    branch: branch,
  };
  const item = await apiRequest<any>('/queue/walk-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    id: item.id,
    tokenNumber: item.token_number,
    patientUhid: item.patient_uhid,
    patientName: item.patient_name,
    department: item.department,
    doctorName: item.doctor_name,
    estimatedWaitMinutes: item.waiting_time_minutes || 15,
    issueTime: item.time_issued,
    status: item.status,
    branch: item.branch,
  };
}

export async function updateQueueStatusApi(id: string, status: string): Promise<void> {
  await apiRequest(`/queue/${id}/status?status=${encodeURIComponent(status)}`, {
    method: 'PUT',
  });
}

export async function deleteQueueItemApi(id: string): Promise<void> {
  await apiRequest(`/queue/${id}`, {
    method: 'DELETE',
  });
}

// --- IPD Beds API ---
export async function fetchBedsApi(branch?: string): Promise<Bed[]> {
  const url = branch ? `/beds?branch=${encodeURIComponent(branch)}` : '/beds';
  const list = await apiRequest<any[]>(url);
  return list.map((b) => ({
    id: b.id,
    bedNumber: b.bed_number,
    ward: b.ward,
    roomNumber: b.room_number,
    category: b.category,
    status: b.status,
    currentPatientUhid: b.current_patient_uhid,
    currentPatientName: b.current_patient_name,
    admittedDate: b.admitted_date,
    branch: b.branch,
  }));
}

export async function fetchIpdAdmissionsApi(branch?: string, patientUhid?: string): Promise<IPDAdmission[]> {
  const params = new URLSearchParams();
  if (branch) params.set('branch', branch);
  if (patientUhid) params.set('patient_uhid', patientUhid);
  const q = params.toString();
  const url = q ? `/ipd-admissions?${q}` : '/ipd-admissions';
  const list = await apiRequest<any[]>(url);
  return list.map((a) => ({
    id: a.id,
    patientUhid: a.patient_uhid,
    patientName: a.patient_name,
    ward: a.ward,
    roomNumber: a.room_number,
    bedNumber: a.bed_number,
    admissionDate: a.admission_date,
    attendingDoctor: a.attending_doctor,
    attendingNurse: a.attending_nurse || a.attendingNurse || '',
    admissionReason: a.admission_reason,
    emergencyContact: a.emergency_contact,
    insuranceProvider: a.insurance_provider,
    insuranceNumber: a.insurance_number,
    status: a.status,
    branch: a.branch,
  }));
}

export async function createIpdAdmissionApi(admission: any): Promise<IPDAdmission> {
  const payload = {
    patient_id: admission.patientId || admission.patient_id,
    patient_uhid: admission.patientUhid || admission.patient_uhid,
    patient_name: admission.patientName || admission.patient_name,
    ward: admission.ward,
    room_number: admission.roomNumber || admission.room_number,
    bed_number: admission.bedNumber || admission.bed_number,
    bed_id: admission.bedId || admission.bed_id,
    admission_date: admission.admissionDate || admission.admission_date,
    attending_doctor: admission.attendingDoctor || admission.attending_doctor,
    attending_nurse: admission.attendingNurse || admission.attending_nurse,
    admission_reason: admission.admissionReason || admission.admission_reason,
    emergency_contact: admission.emergencyContact || admission.emergency_contact,
    insurance_provider: admission.insuranceProvider || admission.insurance_provider,
    insurance_number: admission.insuranceNumber || admission.insurance_number,
  };
  const a = await apiRequest<any>('/ipd-admissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    id: a.id,
    patientUhid: a.patient_uhid,
    patientName: a.patient_name,
    ward: a.ward,
    roomNumber: a.room_number,
    bedNumber: a.bed_number,
    admissionDate: a.admission_date,
    attendingDoctor: a.attending_doctor,
    attendingNurse: a.attending_nurse || a.attendingNurse || admission.attendingNurse || '',
    admissionReason: a.admission_reason,
    emergencyContact: a.emergency_contact,
    insuranceProvider: a.insurance_provider,
    insuranceNumber: a.insurance_number,
    status: a.status,
  };
}

export async function allocateBedApi(bedId: string, patientId: string): Promise<any> {
  return apiRequest(`/beds/${bedId}/allocate`, {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId }),
  });
}

export async function releaseBedApi(bedId: string): Promise<any> {
  return apiRequest(`/beds/${bedId}/release`, {
    method: 'POST',
  });
}

export async function createBedApi(bedData: {
  bedNo: string;
  wardType: string;
  branch: string;
  dailyRate: number;
  status: string;
}): Promise<any> {
  const payload = {
    bed_number: bedData.bedNo,
    ward: bedData.wardType,
    room_number: '',
    category: 'Standard',
    branch: bedData.branch,
    daily_rate: bedData.dailyRate,
    status: bedData.status,
  };
  return apiRequest('/beds', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBedApi(bedId: string, updates: Partial<{
  status: string;
  doctorAssigned: string;
  nurseInCharge: string;
  patientName: string;
  admittedDate: string;
  dailyRate: number;
  branch: string;
}>): Promise<any> {
  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.doctorAssigned !== undefined) payload.doctor_assigned = updates.doctorAssigned;
  if (updates.nurseInCharge !== undefined) payload.nurse_in_charge = updates.nurseInCharge;
  if (updates.patientName !== undefined) payload.current_patient_name = updates.patientName;
  if (updates.admittedDate !== undefined) payload.admitted_date = updates.admittedDate;
  if (updates.dailyRate !== undefined) payload.daily_rate = updates.dailyRate;
  if (updates.branch !== undefined) payload.branch = updates.branch;
  return apiRequest(`/beds/${bedId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBedApi(bedId: string): Promise<void> {
  return apiRequest(`/beds/${bedId}`, { method: 'DELETE' });
}

export async function fetchBedsDashboardApi(): Promise<any[]> {
  const list = await apiRequest<any[]>('/beds');
  return list.map((b: any) => ({
    id: b.id,
    bedNo: b.bed_number || b.bedNumber || '',
    wardType: b.ward || '',
    branch: b.branch || '',
    dailyRate: b.daily_rate ?? b.dailyRate ?? 0,
    status: b.status || 'Available',
    patientName: b.current_patient_name || b.patientName,
    admissionDate: b.admitted_date || b.admissionDate,
    doctorAssigned: b.doctor_assigned || b.doctorAssigned,
    nurseInCharge: b.nurse_in_charge || b.nurseInCharge,
  }));
}

// --- Notifications API ---
export async function fetchNotificationsApi(): Promise<Notification[]> {
  const list = await apiRequest<any[]>('/notifications');
  return list.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    time: n.time,
    type: n.type,
    read: n.read,
    module: n.module,
    eventType: n.event_type || n.eventType,
    senderName: n.sender_name || n.senderName,
    recipientRole: n.recipient_role || n.recipientRole,
    relatedRecordId: n.related_record_id || n.relatedRecordId,
    priority: n.priority,
    status: n.status,
    branch: n.branch,
    followUpDate: n.follow_up_date || n.followUpDate,
  }));
}

export async function createNotificationApi(payload: {
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
}): Promise<Notification> {
  const body = {
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    module: payload.module || 'Consultation',
    event_type: payload.eventType || 'follow_up_assigned',
    sender_name: payload.senderName,
    recipient_role: payload.recipientRole || 'reception',
    related_record_id: payload.relatedRecordId,
    priority: payload.priority || 'high',
    branch: payload.branch,
    follow_up_date: payload.followUpDate,
  };
  const item = await apiRequest<any>('/notifications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    time: item.time,
    type: item.type,
    read: item.read,
    module: item.module,
    eventType: item.event_type || item.eventType,
    senderName: item.sender_name || item.senderName,
    recipientRole: item.recipient_role || item.recipientRole,
    relatedRecordId: item.related_record_id || item.relatedRecordId,
    priority: item.priority,
    status: item.status,
    branch: item.branch,
    followUpDate: item.follow_up_date || item.followUpDate,
  };
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await apiRequest('/notifications/mark-all-read', {
    method: 'PUT',
  });
}

// --- Store & Inventory API ---
export async function fetchStoreItemsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/items?branch=${encodeURIComponent(branch)}` : '/store/items';
  return apiRequest<any[]>(url);
}

export async function createStoreItemApi(item: any): Promise<any> {
  const payload = {
    item_code: item.itemCode || item.item_code,
    item_name: item.itemName || item.item_name,
    category: item.category,
    sub_category: item.subCategory || item.sub_category,
    generic_composition: item.genericComposition || item.generic_composition || '',
    strength: item.strength || '',
    dosage_form: item.dosageForm || item.dosage_form || 'Tablet',
    unit: item.unit,
    pack_quantity: item.packQuantity ?? item.pack_quantity ?? 1,
    issue_unit: item.issueUnit || item.issue_unit || 'Piece',
    opening_stock: item.openingStock ?? item.opening_stock ?? 0,
    brand: item.brand,
    hsn_code: item.hsnCode || item.hsn_code,
    gst_percentage: item.gstPercentage ?? item.gst_percentage ?? 0,
    min_stock: item.minStock ?? item.min_stock ?? 0,
    max_stock: item.maxStock ?? item.max_stock ?? 0,
    reorder_level: item.reorderLevel ?? item.reorder_level ?? 0,
    storage_location: item.storageLocation || item.storage_location,
    description: item.description,
    status: item.status || 'Active',
    current_stock: item.currentStock ?? item.current_stock ?? 0,
    unit_price: item.unitPrice ?? item.unit_price ?? 0,
  };
  return apiRequest('/store/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStoreItemApi(id: string, item: any): Promise<any> {
  const payload = {
    item_name: item.itemName || item.item_name,
    category: item.category,
    sub_category: item.subCategory || item.sub_category,
    generic_composition: item.genericComposition ?? item.generic_composition,
    strength: item.strength,
    dosage_form: item.dosageForm ?? item.dosage_form,
    unit: item.unit,
    pack_quantity: item.packQuantity ?? item.pack_quantity,
    issue_unit: item.issueUnit || item.issue_unit,
    opening_stock: item.openingStock ?? item.opening_stock,
    brand: item.brand,
    hsn_code: item.hsnCode || item.hsn_code,
    gst_percentage: item.gstPercentage ?? item.gst_percentage,
    min_stock: item.minStock ?? item.min_stock,
    max_stock: item.maxStock ?? item.max_stock,
    reorder_level: item.reorderLevel ?? item.reorder_level,
    storage_location: item.storageLocation || item.storage_location,
    description: item.description,
    status: item.status,
    current_stock: item.currentStock ?? item.current_stock,
    unit_price: item.unitPrice ?? item.unit_price,
  };
  return apiRequest(`/store/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchPurchaseOrdersApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/purchase-orders?branch=${encodeURIComponent(branch)}` : '/store/purchase-orders';
  return apiRequest<any[]>(url);
}

export async function createPurchaseOrderApi(po: any): Promise<any> {
  const payload = {
    po_number: po.poNumber || po.po_number,
    vendor_id: po.vendorId || po.vendor_id,
    vendor_name: po.vendorName || po.vendor_name,
    purchase_date: po.purchaseDate || po.purchase_date,
    expected_delivery: po.expectedDelivery || po.expected_delivery,
    status: po.status,
    items: (po.items || []).map((i: any) => ({
      item_id: i.itemId || i.item_id,
      item_code: i.itemCode || i.item_code,
      item_name: i.itemName || i.item_name,
      quantity: i.quantity,
      unit_price: i.unitPrice || i.unit_price,
      discount: i.discount || 0,
      gst: i.gst || 0,
    })),
  };
  return apiRequest('/store/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePurchaseOrderApi(id: string, po: any): Promise<any> {
  const payload: any = {};
  if (po.vendorId || po.vendor_id) payload.vendor_id = po.vendorId || po.vendor_id;
  if (po.vendorName || po.vendor_name) payload.vendor_name = po.vendorName || po.vendor_name;
  if (po.purchaseDate || po.purchase_date) payload.purchase_date = po.purchaseDate || po.purchase_date;
  if (po.expectedDelivery || po.expected_delivery) payload.expected_delivery = po.expectedDelivery || po.expected_delivery;
  if (po.status) payload.status = po.status;
  if (po.items) {
    payload.items = po.items.map((i: any) => ({
      item_id: i.itemId || i.item_id,
      item_code: i.itemCode || i.item_code,
      item_name: i.itemName || i.item_name,
      quantity: i.quantity,
      unit_price: i.unitPrice || i.unit_price,
      discount: i.discount || 0,
      gst: i.gst || 0,
    }));
  }
  return apiRequest(`/store/purchase-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function approvePurchaseOrderApi(id: string): Promise<any> {
  return apiRequest(`/store/purchase-orders/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectPurchaseOrderApi(id: string): Promise<any> {
  return apiRequest(`/store/purchase-orders/${id}/reject`, {
    method: 'POST',
  });
}

export async function deleteStoreItemApi(id: string): Promise<void> {
  return apiRequest(`/store/items/${id}`, { method: 'DELETE' });
}

export async function deletePurchaseOrderApi(id: string): Promise<void> {
  return apiRequest(`/store/purchase-orders/${id}`, { method: 'DELETE' });
}

export async function fetchVendorsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/vendors?branch=${encodeURIComponent(branch)}` : '/store/vendors';
  return apiRequest<any[]>(url);
}

export async function createVendorApi(vendor: any): Promise<any> {
  const payload = {
    vendor_code: vendor.vendorCode || vendor.vendor_code,
    vendor_name: vendor.vendorName || vendor.vendor_name,
    category: vendor.category || 'Pharmaceuticals',
    contact_person: vendor.contactPerson || vendor.contact_person,
    email: vendor.email,
    mobile: vendor.mobile || vendor.phone,
    phone: vendor.phone || vendor.mobile,
    address: vendor.address,
    city: vendor.city || 'Bengaluru',
    state: vendor.state || 'Karnataka',
    country: vendor.country || 'India',
    gst_number: vendor.gstNumber || vendor.gst_number || vendor.gstin,
    gstin: vendor.gstin || vendor.gstNumber || vendor.gst_number,
    pan: vendor.pan,
    payment_terms: vendor.paymentTerms || vendor.payment_terms || 'Net 30',
    rating: vendor.rating || 5,
    status: vendor.status || 'Active',
  };
  return apiRequest('/store/vendors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVendorApi(id: string, vendor: any): Promise<any> {
  const payload = {
    vendor_name: vendor.vendorName || vendor.vendor_name,
    category: vendor.category,
    contact_person: vendor.contactPerson || vendor.contact_person,
    email: vendor.email,
    mobile: vendor.mobile || vendor.phone,
    phone: vendor.phone || vendor.mobile,
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    country: vendor.country,
    gst_number: vendor.gstNumber || vendor.gst_number || vendor.gstin,
    gstin: vendor.gstin || vendor.gstNumber || vendor.gst_number,
    pan: vendor.pan,
    payment_terms: vendor.paymentTerms || vendor.payment_terms,
    rating: vendor.rating,
    status: vendor.status,
  };
  return apiRequest(`/store/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteVendorApi(id: string): Promise<void> {
  return apiRequest(`/store/vendors/${id}`, { method: 'DELETE' });
}

export async function fetchGoodsReceiptsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/goods-receipts?branch=${encodeURIComponent(branch)}` : '/store/goods-receipts';
  return apiRequest<any[]>(url);
}

export async function createGoodsReceiptApi(grn: any): Promise<any> {
  return apiRequest('/store/goods-receipts', {
    method: 'POST',
    body: JSON.stringify(grn),
  });
}

export async function fetchStockInwardApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/stock-inward?branch=${encodeURIComponent(branch)}` : '/store/stock-inward';
  return apiRequest<any[]>(url);
}

export async function createStockInwardApi(inward: any): Promise<any> {
  const payload = {
    item_id: inward.itemId || inward.item_id,
    item_code: inward.itemCode || inward.item_code || 'MED-001',
    item_name: inward.itemName || inward.item_name || 'Item',
    quantity: Number(inward.quantity || 1),
    batch_number: inward.batchNumber || inward.batch_number,
    expiry_date: inward.expiryDate || inward.expiry_date,
    supplier: inward.supplier || inward.supplier_name,
    warehouse: inward.warehouse || 'Central Store Bay 1',
    received_by: inward.receivedBy || inward.received_by || 'Store Officer',
    date: inward.date || new Date().toISOString().split('T')[0],
  };
  return apiRequest('/store/stock-inward', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStockInwardApi(id: string, inward: any): Promise<any> {
  const payload: Record<string, any> = {};
  if (inward.poNumber !== undefined || inward.po_number !== undefined) payload.po_number = inward.poNumber ?? inward.po_number;
  if (inward.itemId !== undefined || inward.item_id !== undefined) payload.item_id = inward.itemId ?? inward.item_id;
  if (inward.itemCode !== undefined || inward.item_code !== undefined) payload.item_code = inward.itemCode ?? inward.item_code;
  if (inward.itemName !== undefined || inward.item_name !== undefined) payload.item_name = inward.itemName ?? inward.item_name;
  if (inward.quantity !== undefined) payload.quantity = Number(inward.quantity);
  if (inward.unitPrice !== undefined || inward.unit_price !== undefined) payload.unit_price = Number(inward.unitPrice ?? inward.unit_price);
  if (inward.batchNumber !== undefined || inward.batch_number !== undefined) payload.batch_number = inward.batchNumber ?? inward.batch_number;
  if (inward.expiryDate !== undefined || inward.expiry_date !== undefined) payload.expiry_date = inward.expiryDate ?? inward.expiry_date;
  if (inward.supplier !== undefined || inward.supplier_name !== undefined) payload.supplier = inward.supplier ?? inward.supplier_name;
  if (inward.warehouse !== undefined) payload.warehouse = inward.warehouse;
  if (inward.receivedBy !== undefined || inward.received_by !== undefined) payload.received_by = inward.receivedBy ?? inward.received_by;
  if (inward.date !== undefined) payload.date = inward.date;

  return apiRequest(`/store/stock-inward/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteStockInwardApi(id: string): Promise<void> {
  return apiRequest(`/store/stock-inward/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchStockOutwardApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/stock-outward?branch=${encodeURIComponent(branch)}` : '/store/stock-outward';
  return apiRequest<any[]>(url);
}

export async function createStockOutwardApi(outward: any): Promise<any> {
  const dept = outward.department || outward.issued_to_department || outward.issuedToDepartment || 'Pharmacy';
  const payload = {
    department: dept,
    issued_to_department: dept,
    issued_to_person: outward.receivedBy || outward.issued_to_person || outward.issuedToPerson || 'Store Recipient',
    ward: outward.ward,
    lab: outward.lab,
    pharmacy: outward.pharmacy,
    operation_theatre: outward.operationTheatre || outward.operation_theatre,
    doctor: outward.doctor,
    reason: outward.reason || 'Department Request',
    item_id: outward.itemId || outward.item_id,
    item_code: outward.itemCode || outward.item_code || 'MED-001',
    item_name: outward.itemName || outward.item_name || 'Item',
    quantity: Number(outward.quantity || 1),
    issued_by: outward.receivedBy || outward.issuedBy || outward.issued_by || 'Store Officer',
    date: outward.date || new Date().toISOString().split('T')[0],
  };
  return apiRequest('/store/stock-outward', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchStockTransferApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/stock-transfer?branch=${encodeURIComponent(branch)}` : '/store/stock-transfer';
  return apiRequest<any[]>(url);
}

export async function createStockTransferApi(transfer: any): Promise<any> {
  const payload = {
    transfer_number: transfer.transferNumber || transfer.transfer_number || `TR-${Date.now()}`,
    source: transfer.source || transfer.from_location || 'Central Store Bay 1',
    destination: transfer.destination || transfer.to_location || 'Pharmacy Store',
    item_id: transfer.itemId || transfer.item_id,
    item_code: transfer.itemCode || transfer.item_code || 'MED-001',
    item_name: transfer.itemName || transfer.item_name || 'Item',
    quantity: Number(transfer.quantity || 1),
    transfer_date: transfer.date || transfer.transfer_date || new Date().toISOString().split('T')[0],
    status: transfer.status || 'Completed',
  };
  return apiRequest('/store/stock-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStockTransferApi(id: string, transfer: any): Promise<any> {
  const payload: Record<string, any> = {};
  if (transfer.source !== undefined) payload.source = transfer.source;
  if (transfer.destination !== undefined) payload.destination = transfer.destination;
  if (transfer.itemId !== undefined || transfer.item_id !== undefined) payload.item_id = transfer.itemId ?? transfer.item_id;
  if (transfer.itemCode !== undefined || transfer.item_code !== undefined) payload.item_code = transfer.itemCode ?? transfer.item_code;
  if (transfer.itemName !== undefined || transfer.item_name !== undefined) payload.item_name = transfer.itemName ?? transfer.item_name;
  if (transfer.quantity !== undefined) payload.quantity = Number(transfer.quantity);
  if (transfer.date !== undefined || transfer.transfer_date !== undefined) payload.transfer_date = transfer.date ?? transfer.transfer_date;
  if (transfer.status !== undefined) payload.status = transfer.status;
  return apiRequest(`/store/stock-transfer/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteStockTransferApi(id: string): Promise<void> {
  return apiRequest(`/store/stock-transfer/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchStockAdjustmentApi(branch?: string): Promise<any[]> {
  const url = branch ? `/store/stock-adjustment?branch=${encodeURIComponent(branch)}` : '/store/stock-adjustment';
  return apiRequest<any[]>(url);
}

export async function createStockAdjustmentApi(adj: any): Promise<any> {
  const payload = {
    adjustment_number: adj.adjustmentNumber || adj.adjustment_number || `ADJ-${Date.now()}`,
    type: adj.type || 'Damage',
    item_id: adj.itemId || adj.item_id,
    item_code: adj.itemCode || adj.item_code || 'MED-001',
    item_name: adj.itemName || adj.item_name || 'Item',
    current_quantity: Number(adj.systemQuantity ?? adj.currentQuantity ?? adj.current_quantity ?? 0),
    adjusted_quantity: Number(adj.physicalQuantity ?? adj.adjustedQuantity ?? adj.adjusted_quantity ?? 0),
    reason: adj.reason || 'Audit Adjustment',
    approved_by: adj.adjustedBy || adj.approved_by || 'Store Officer',
    date: adj.date || new Date().toISOString().split('T')[0],
  };
  return apiRequest('/store/stock-adjustment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStockAdjustmentApi(id: string, adj: any): Promise<any> {
  const payload: Record<string, any> = {};
  if (adj.adjustmentNumber !== undefined || adj.adjustment_number !== undefined) payload.adjustment_number = adj.adjustmentNumber ?? adj.adjustment_number;
  if (adj.type !== undefined) payload.type = adj.type;
  if (adj.itemId !== undefined || adj.item_id !== undefined) payload.item_id = adj.itemId ?? adj.item_id;
  if (adj.itemCode !== undefined || adj.item_code !== undefined) payload.item_code = adj.itemCode ?? adj.item_code;
  if (adj.itemName !== undefined || adj.item_name !== undefined) payload.item_name = adj.itemName ?? adj.item_name;
  if (adj.systemQuantity !== undefined || adj.currentQuantity !== undefined || adj.current_quantity !== undefined) payload.current_quantity = Number(adj.systemQuantity ?? adj.currentQuantity ?? adj.current_quantity);
  if (adj.physicalQuantity !== undefined || adj.adjustedQuantity !== undefined || adj.adjusted_quantity !== undefined) payload.adjusted_quantity = Number(adj.physicalQuantity ?? adj.adjustedQuantity ?? adj.adjusted_quantity);
  if (adj.reason !== undefined) payload.reason = adj.reason;
  if (adj.approvedBy !== undefined || adj.approved_by !== undefined || adj.adjustedBy !== undefined) payload.approved_by = adj.approvedBy ?? adj.approved_by ?? adj.adjustedBy;
  if (adj.date !== undefined) payload.date = adj.date;

  return apiRequest(`/store/stock-adjustment/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteStockAdjustmentApi(id: string): Promise<void> {
  return apiRequest(`/store/stock-adjustment/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchReorderManagementApi(): Promise<any[]> {
  return apiRequest<any[]>('/store/reorder-management');
}

export async function fetchBatchesApi(): Promise<any[]> {
  return apiRequest<any[]>('/store/batches');
}

export async function createBatchApi(batch: any): Promise<any> {
  const payload = {
    batch_number: batch.batchNumber || batch.batch_number,
    item_id: batch.itemId || batch.item_id,
    item_code: batch.itemCode || batch.item_code,
    item_name: batch.itemName || batch.item_name,
    manufacturing_date: batch.mfgDate || batch.manufacturing_date,
    expiry_date: batch.expiryDate || batch.expiry_date,
    quantity: batch.quantity,
    supplier_name: batch.supplier || batch.supplier_name,
    location: batch.location,
  };
  return apiRequest('/store/batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteBatchApi(id: string): Promise<void> {
  return apiRequest(`/store/batches/${id}`, {
    method: 'DELETE',
  });
}

// NOTE: fetchStockMovementsApi/createStockMovementApi (generic "/store/stock-movements"
// alias) were removed here. They were unused anywhere in the app and the backend
// endpoint they called never updated ItemMaster.current_stock, so it was dead code
// that could have silently corrupted stock if it were ever wired up. Use the
// dedicated fetchStockInwardApi/createStockInwardApi (and outward/transfer/adjustment
// equivalents) above instead — those correctly keep current_stock in sync.

export async function fetchReorderBatchesApi(): Promise<any[]> {
  return apiRequest<any[]>('/store/reorder-batches');
}

export async function generateReorderBatchApi(): Promise<any> {
  return apiRequest('/store/reorder-batches/generate', {
    method: 'POST',
  });
}

// --- Super Admin Hospital Profile API ---
export async function fetchHospitalProfileApi(): Promise<any> {
  return apiRequest('/hospital-profile').catch(() => null);
}

export async function saveHospitalProfileApi(profile: any): Promise<any> {
  const payload = {
    hospital_name: profile.hospitalName || profile.hospital_name || 'Hospital Group',
    hospital_code: profile.hospitalCode || profile.hospital_code || 'HOSP-001',
    tagline: profile.tagline || '',
    logo: profile.logo || profile.hospitalLogoUrl || profile.hospital_logo_url || '',
    hospital_logo_url: profile.hospitalLogoUrl || profile.logo || profile.hospital_logo_url || '',
    registration_number: profile.registrationNumber || profile.registration_number || '',
    license_number: profile.licenseNumber || profile.license_number || '',
    tax_id: profile.taxId || profile.tax_id || '',
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    address: profile.address || '',
    city: profile.city || '',
    state: profile.state || '',
    country: profile.country || 'India',
    pincode: profile.pincode || '',
    timezone: profile.timezone || 'Asia/Kolkata (GMT+5:30)',
    currency: profile.currency || 'INR (₹)',
    establishment_year: profile.establishedYear || profile.establishmentYear || profile.establishment_year || profile.established_year || '',
    established_year: profile.establishedYear || profile.establishmentYear || profile.establishment_year || profile.established_year || '',
    accreditation: profile.accreditation || '',
    total_bed_capacity: profile.totalBedCapacity ?? profile.total_bed_capacity ?? 0,
    emergency_contact_number: profile.emergencyContactNumber || profile.emergency_contact_number || '',
  };
  return apiRequest('/hospital-profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Branches API ---
export async function fetchBranchesApi(): Promise<any[]> {
  return apiRequest<any[]>('/branches').catch(() => []);
}

export async function createBranchApi(branch: any): Promise<any> {
  const payload = {
    branch_name: branch.branchName || branch.branch_name || 'Main Branch',
    branch_code: branch.branchCode || branch.branch_code || `BR-${(branch.city || 'MUM').substring(0, 3).toUpperCase()}-01`,
    address: branch.address || 'Main Campus Address',
    city: branch.city || 'Metro City',
    state: branch.state || 'State',
    country: branch.country || 'India',
    pincode: branch.pincode || '400001',
    phone: branch.phone || '+91 00000 00000',
    email: branch.email || 'branch@hospital.com',
    status: branch.status || 'Active',
    is_main_branch: branch.isMainBranch ?? branch.is_main_branch ?? false,
    bed_capacity: branch.bedCapacity ?? branch.bed_capacity ?? branch.bedCount ?? 0,
    total_staff: branch.totalStaff ?? branch.total_staff ?? 0,
  };
  return apiRequest('/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBranchApi(id: string, branch: any): Promise<any> {
  const payload = {
    branch_name: branch.branchName || branch.branch_name,
    branch_code: branch.branchCode || branch.branch_code,
    address: branch.address,
    city: branch.city,
    state: branch.state,
    country: branch.country,
    pincode: branch.pincode,
    phone: branch.phone,
    email: branch.email,
    status: branch.status,
    is_main_branch: branch.isMainBranch ?? branch.is_main_branch,
    bed_capacity: branch.bedCapacity ?? branch.bed_capacity ?? branch.bedCount,
    total_staff: branch.totalStaff ?? branch.total_staff,
  };
  Object.keys(payload).forEach((key) => (payload as any)[key] === undefined && delete (payload as any)[key]);
  return apiRequest(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBranchApi(id: string): Promise<void> {
  await apiRequest(`/branches/${id}`, { method: 'DELETE' });
}

// --- Specializations API ---
export async function fetchSpecializationsApi(): Promise<any[]> {
  return apiRequest('/specializations').catch(() => []);
}

export async function createSpecializationApi(spec: any): Promise<any> {
  const payload = {
    specialization_name: spec.specializationName || spec.specialization_name,
    code: spec.code || `SPC-${(spec.specializationName || 'GEN').substring(0, 4).toUpperCase()}`,
    department_name: spec.associatedDepartment || spec.departmentName || spec.department_name || spec.department || 'General',
    description: spec.description || '',
    status: spec.status || 'Active',
  };
  return apiRequest('/specializations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSpecializationApi(id: string, spec: any): Promise<any> {
  return apiRequest(`/specializations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(spec),
  });
}

export async function deleteSpecializationApi(id: string): Promise<void> {
  await apiRequest(`/specializations/${id}`, { method: 'DELETE' });
}

// --- Consultation Charges API ---
export async function fetchConsultationChargesApi(): Promise<any[]> {
  return apiRequest('/consultation-charges').catch(() => []);
}

export async function createConsultationChargeApi(charge: any): Promise<any> {
  const payload = {
    doctor_id: charge.doctorId || charge.doctor_id,
    doctor_name: charge.doctorName || charge.doctor_name,
    department: charge.department,
    consultation_fee: charge.consultationFee ?? charge.consultation_fee,
    follow_up_fee: charge.followUpFee ?? charge.follow_up_fee ?? 0,
    emergency_fee: charge.emergencyFee ?? charge.emergency_fee ?? 0,
    validity_days: charge.validityDays ?? charge.validity_days ?? 7,
    status: charge.status || 'Active',
  };
  return apiRequest('/consultation-charges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateConsultationChargeApi(id: string, charge: any): Promise<any> {
  return apiRequest(`/consultation-charges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(charge),
  });
}

export async function deleteConsultationChargeApi(id: string): Promise<void> {
  await apiRequest(`/consultation-charges/${id}`, { method: 'DELETE' });
}

// --- Working Hours API ---
export async function fetchWorkingHoursApi(): Promise<any[]> {
  return apiRequest('/working-hours').catch(() => []);
}

const resolveDayOfWeek = (wh: any): string => {
  if (wh.dayOfWeek) return wh.dayOfWeek;
  if (wh.day_of_week) return wh.day_of_week;
  if (Array.isArray(wh.workingDays) && wh.workingDays.length > 0) {
    return wh.workingDays.join(', ');
  }
  if (typeof wh.workingDays === 'string' && wh.workingDays) {
    return wh.workingDays;
  }
  return 'Mon, Tue, Wed, Thu, Fri, Sat';
};

export async function createWorkingHoursApi(wh: any): Promise<any> {
  const payload = {
    department: wh.department || 'General',
    day_of_week: resolveDayOfWeek(wh),
    start_time: wh.startTime || wh.start_time || '08:00 AM',
    end_time: wh.endTime || wh.end_time || '08:00 PM',
    slot_duration_minutes: Number(wh.slotDurationMinutes ?? wh.slot_duration_minutes ?? 15),
    max_patients_per_slot: Number(wh.maxPatientsPerSlot ?? wh.max_patients_per_slot ?? 1),
    is_working_day: wh.isWorkingDay ?? wh.is_working_day ?? true,
  };
  return apiRequest('/working-hours', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWorkingHoursApi(id: string, wh: any): Promise<any> {
  const payload: Record<string, any> = {};
  if (wh.department) payload.department = wh.department;
  const dayStr = resolveDayOfWeek(wh);
  if (dayStr) payload.day_of_week = dayStr;
  if (wh.startTime || wh.start_time) payload.start_time = wh.startTime || wh.start_time;
  if (wh.endTime || wh.end_time) payload.end_time = wh.endTime || wh.end_time;
  if (wh.slotDurationMinutes !== undefined || wh.slot_duration_minutes !== undefined) {
    payload.slot_duration_minutes = Number(wh.slotDurationMinutes ?? wh.slot_duration_minutes);
  }
  if (wh.maxPatientsPerSlot !== undefined || wh.max_patients_per_slot !== undefined) {
    payload.max_patients_per_slot = Number(wh.maxPatientsPerSlot ?? wh.max_patients_per_slot);
  }
  if (wh.isWorkingDay !== undefined || wh.is_working_day !== undefined) {
    payload.is_working_day = wh.isWorkingDay ?? wh.is_working_day;
  }
  return apiRequest(`/working-hours/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkingHoursApi(id: string): Promise<void> {
  await apiRequest(`/working-hours/${id}`, { method: 'DELETE' });
}

// --- Leave Requests API ---
export async function fetchLeavesApi(): Promise<any[]> {
  return apiRequest('/leaves').catch(() => []);
}

export async function createLeaveApi(leave: any): Promise<any> {
  const payload = {
    employee_id: leave.employeeId || leave.employee_id,
    employee_name: leave.employeeName || leave.employee_name,
    role: leave.role || null,
    department: leave.department,
    leave_type: leave.leaveType || leave.leave_type,
    start_date: leave.fromDate || leave.startDate || leave.start_date,
    end_date: leave.toDate || leave.endDate || leave.end_date,
    total_days: leave.totalDays ?? leave.total_days ?? 1,
    reason: leave.reason,
    approval_status: leave.approvalStatus || leave.approval_status || 'Pending',
    applied_date: leave.appliedDate || leave.applied_date || new Date().toISOString().split('T')[0],
  };
  return apiRequest('/leaves', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveApi(id: string, leave: any): Promise<any> {
  return apiRequest(`/leaves/${id}`, {
    method: 'PUT',
    body: JSON.stringify(leave),
  });
}

export async function deleteLeaveApi(id: string): Promise<void> {
  await apiRequest(`/leaves/${id}`, { method: 'DELETE' });
}

// --- Shift Rotation API ---
export async function fetchShiftsApi(): Promise<any[]> {
  const list = await apiRequest<any[]>('/shifts').catch(() => []);
  if (!Array.isArray(list)) return [];
  return list.map((s) => ({
    id: s.id,
    employeeId: s.employee_id || s.employeeId,
    employeeName: s.employee_name || s.employeeName,
    department: s.department || 'N/A',
    branch: s.branch || '',
    morningShift: s.morning_shift || s.morningShift || '07:00 AM - 03:00 PM',
    eveningShift: s.evening_shift || s.eveningShift || '03:00 PM - 11:00 PM',
    nightShift: s.night_shift || s.nightShift || '11:00 PM - 07:00 AM',
    assignedShift: s.assigned_shift || s.assignedShift || 'Morning',
    effectiveDate: s.effective_date || s.effectiveDate || s.start_date || new Date().toISOString().split('T')[0],
    startDate: s.start_date || s.startDate || s.effective_date || new Date().toISOString().split('T')[0],
    endDate: s.end_date || s.endDate || s.effective_date || new Date().toISOString().split('T')[0],
    status: s.status || 'Active',
    notes: s.notes,
  }));
}

export async function createShiftApi(shift: any): Promise<any> {
  const payload = {
    employee_id: shift.employeeId || shift.employee_id,
    employee_name: shift.employeeName || shift.employee_name,
    department: shift.department || 'N/A',
    branch: shift.branch || null,
    morning_shift: shift.morningShift || shift.morning_shift || '07:00 AM - 03:00 PM',
    evening_shift: shift.eveningShift || shift.evening_shift || '03:00 PM - 11:00 PM',
    night_shift: shift.nightShift || shift.night_shift || '11:00 PM - 07:00 AM',
    assigned_shift: shift.assignedShift || shift.assigned_shift || 'Morning',
    effective_date: shift.effectiveDate || shift.effective_date || new Date().toISOString().split('T')[0],
    start_date: shift.startDate || shift.start_date || shift.effectiveDate || new Date().toISOString().split('T')[0],
    end_date: shift.endDate || shift.end_date || shift.effectiveDate || new Date().toISOString().split('T')[0],
    status: shift.status || 'Active',
    notes: shift.notes || null,
  };
  const res = await apiRequest('/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    id: res.id,
    employeeId: res.employee_id || payload.employee_id,
    employeeName: res.employee_name || payload.employee_name,
    department: res.department || payload.department,
    branch: res.branch || payload.branch,
    morningShift: res.morning_shift || payload.morning_shift,
    eveningShift: res.evening_shift || payload.evening_shift,
    nightShift: res.night_shift || payload.night_shift,
    assignedShift: res.assigned_shift || payload.assigned_shift,
    effectiveDate: res.effective_date || payload.effective_date,
    startDate: res.start_date || payload.start_date,
    endDate: res.end_date || payload.end_date,
    status: res.status || payload.status,
    notes: res.notes || payload.notes,
  };
}

export async function updateShiftApi(id: string, shift: any): Promise<any> {
  const payload: any = {};
  if (shift.employeeId || shift.employee_id) payload.employee_id = shift.employeeId || shift.employee_id;
  if (shift.employeeName || shift.employee_name) payload.employee_name = shift.employeeName || shift.employee_name;
  if (shift.department !== undefined) payload.department = shift.department;
  if (shift.branch !== undefined) payload.branch = shift.branch;
  if (shift.morningShift || shift.morning_shift) payload.morning_shift = shift.morningShift || shift.morning_shift;
  if (shift.eveningShift || shift.evening_shift) payload.evening_shift = shift.eveningShift || shift.evening_shift;
  if (shift.nightShift || shift.night_shift) payload.night_shift = shift.nightShift || shift.night_shift;
  if (shift.assignedShift || shift.assigned_shift) payload.assigned_shift = shift.assignedShift || shift.assigned_shift;
  if (shift.effectiveDate || shift.effective_date) payload.effective_date = shift.effectiveDate || shift.effective_date;
  if (shift.startDate || shift.start_date) payload.start_date = shift.startDate || shift.start_date;
  if (shift.endDate || shift.end_date) payload.end_date = shift.endDate || shift.end_date;
  if (shift.status !== undefined) payload.status = shift.status;
  if (shift.notes !== undefined) payload.notes = shift.notes;

  const res = await apiRequest(`/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return {
    id: res.id || id,
    employeeId: res.employee_id || payload.employee_id,
    employeeName: res.employee_name || payload.employee_name,
    department: res.department || payload.department,
    branch: res.branch || payload.branch,
    morningShift: res.morning_shift || payload.morning_shift,
    eveningShift: res.evening_shift || payload.evening_shift,
    nightShift: res.night_shift || payload.night_shift,
    assignedShift: res.assigned_shift || payload.assigned_shift,
    effectiveDate: res.effective_date || payload.effective_date,
    startDate: res.start_date || payload.start_date,
    endDate: res.end_date || payload.end_date,
    status: res.status || payload.status,
    notes: res.notes || payload.notes,
  };
}

export async function deleteShiftApi(id: string): Promise<void> {
  await apiRequest(`/shifts/${id}`, { method: 'DELETE' });
}

// --- Roles & Permissions API ---
export async function fetchRolesApi(): Promise<any[]> {
  return apiRequest('/roles').catch(() => []);
}

export async function createRoleApi(role: any): Promise<any> {
  const payload = {
    role_name: role.roleName || role.role_name,
    role_code: role.roleCode || role.role_code,
    description: role.description,
    is_system_default: role.isSystemDefault ?? role.is_system_default ?? false,
    assigned_user_count: role.assignedUserCount ?? role.assigned_user_count ?? 0,
  };
  return apiRequest('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRoleApi(id: string, role: any): Promise<any> {
  return apiRequest(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(role),
  });
}

export async function deleteRoleApi(id: string): Promise<void> {
  await apiRequest(`/roles/${id}`, { method: 'DELETE' });
}

// --- Permissions API ---
export async function fetchPermissionsApi(): Promise<any[]> {
  return apiRequest('/permissions');
}

export async function setPermissionApi(roleId: string, moduleName: string, action: string, isGranted: boolean): Promise<any> {
  return apiRequest('/permissions', {
    method: 'POST',
    body: JSON.stringify({ role_id: roleId, module_name: moduleName, action, is_granted: isGranted }),
  });
}

// --- Users Management API ---
export async function fetchUsersApi(): Promise<any[]> {
  return apiRequest('/users').catch(() => []);
}

function normalizeRoleForApi(role: any): string {
  const clean = (role || 'doctor').toString().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('billing') || clean.includes('finance') || clean.includes('cashier') || clean.includes('accounts')) return 'billing';
  if (clean.includes('pharmacy') || clean.includes('pharmacist')) return 'pharmacy';
  if (clean.includes('reception')) return 'reception';
  if (clean.includes('lab')) return 'lab';
  if (clean.includes('store')) return 'store';
  if (clean.includes('nurse')) return 'nurse';
  if (clean.includes('super') || clean === 'admin') return 'super_admin';
  if (clean.includes('doctor')) return 'doctor';
  if (clean.includes('patient')) return 'patient';
  return clean;
}

export async function createUserApi(user: any): Promise<any> {
  const roleStr = normalizeRoleForApi(user.role);
  const payload = {
    name: user.fullName || user.name || 'User Name',
    username: user.username || user.userId || `usr_${Date.now()}`,
    email: user.email,
    password: user.password || 'ChangeMe@123',
    role: roleStr,
    department: user.department || 'N/A',
    assignedWard: user.assignedWard || null,
    branch: user.branch || null,
    employee_id: user.employeeId || user.employee_id || `EMP-${Date.now()}`,
    phone: user.phone || '',
    status: user.status || 'Active',
  };
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUserApi(id: string, user: any): Promise<any> {
  const payload = { ...user };
  if (payload.role) {
    payload.role = normalizeRoleForApi(payload.role);
  }
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUserApi(id: string): Promise<void> {
  await apiRequest(`/users/${id}`, { method: 'DELETE' });
}

export async function resetUserPasswordApi(id: string, newPass: string): Promise<any> {
  return apiRequest(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPass }),
  });
}

export async function toggleUserStatusApi(id: string): Promise<any> {
  return apiRequest(`/users/${id}/toggle-status`, { method: 'PUT' });
}

// --- Department Assignments API ---
export async function fetchDepartmentAssignmentsApi(): Promise<any[]> {
  return apiRequest('/department-assignments').catch(() => []);
}

export async function createDepartmentAssignmentApi(assignment: any): Promise<any> {
  const payload = {
    employee_id: assignment.employeeId || assignment.employee_id,
    employee_name: assignment.employeeName || assignment.employee_name,
    role: assignment.role,
    primary_department: assignment.primaryDepartment || assignment.primary_department,
    secondary_department: assignment.secondaryDepartment || assignment.secondary_department,
    shift_type: assignment.shiftType || assignment.shift_type || 'General',
    assigned_date: assignment.assignedDate || assignment.assigned_date || new Date().toISOString().split('T')[0],
  };
  return apiRequest('/department-assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartmentAssignmentApi(id: string, assignment: any): Promise<any> {
  return apiRequest(`/department-assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assignment),
  });
}

export async function deleteDepartmentAssignmentApi(id: string): Promise<void> {
  await apiRequest(`/department-assignments/${id}`, { method: 'DELETE' });
}

// --- Department CRUD API ---
export async function createDepartmentApi(dept: any): Promise<any> {
  const payload = {
    name: dept.departmentName || dept.name,
    code: dept.departmentCode || dept.code,
    icon_name: dept.iconName || dept.icon_name || 'Building2',
    doctor_count: dept.doctorCount ?? dept.doctor_count ?? 0,
    description: dept.description || '',
  };
  return apiRequest('/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartmentApi(id: string, dept: any): Promise<any> {
  return apiRequest(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dept),
  });
}

export async function deleteDepartmentApi(id: string): Promise<void> {
  await apiRequest(`/departments/${id}`, { method: 'DELETE' });
}

// --- Login History API ---
export async function fetchLoginHistoryApi(): Promise<any[]> {
  return apiRequest('/login-history').catch(() => []);
}

// --- Clinical Vitals & Notes API ---
export async function fetchVitalsApi(patientUhid?: string, branch?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (patientUhid) params.set('patient_uhid', patientUhid);
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/clinical/vitals${query}`).catch(() => []);
}

export async function createVitalApi(vital: any): Promise<any> {
  return apiRequest('/clinical/vitals', {
    method: 'POST',
    body: JSON.stringify(vital),
  });
}

export async function updateVitalApi(id: string, vital: any): Promise<any> {
  return apiRequest(`/clinical/vitals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vital),
  });
}

export async function deleteVitalApi(id: string): Promise<void> {
  return apiRequest(`/clinical/vitals/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchNursingNotesApi(patientUhid?: string, branch?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (patientUhid) params.set('patient_uhid', patientUhid);
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/clinical/nursing-notes${query}`).catch(() => []);
}

export async function createNursingNoteApi(note: any): Promise<any> {
  return apiRequest('/clinical/nursing-notes', {
    method: 'POST',
    body: JSON.stringify(note),
  });
}

export async function updateNursingNoteApi(id: string, note: any): Promise<any> {
  return apiRequest(`/clinical/nursing-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(note),
  });
}

export async function deleteNursingNoteApi(id: string): Promise<void> {
  return apiRequest(`/clinical/nursing-notes/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchMedicationsApi(patientUhid?: string, branch?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (patientUhid) params.set('patient_uhid', patientUhid);
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/clinical/medications${query}`).catch(() => []);
}

export async function createMedicationApi(med: any): Promise<any> {
  return apiRequest('/clinical/medications', {
    method: 'POST',
    body: JSON.stringify(med),
  });
}

export async function updateMedicationApi(id: string, med: any): Promise<any> {
  return apiRequest(`/clinical/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(med),
  });
}

export async function deleteMedicationApi(id: string): Promise<void> {
  return apiRequest(`/clinical/medications/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchWardTransfersApi(patientUhid?: string, branch?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (patientUhid) params.set('patient_uhid', patientUhid);
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/clinical/ward-transfers${query}`).catch(() => []);
}

export async function createWardTransferApi(transfer: any): Promise<any> {
  return apiRequest('/clinical/ward-transfers', {
    method: 'POST',
    body: JSON.stringify(transfer),
  });
}

export async function updateWardTransferApi(id: string, transfer: any): Promise<any> {
  return apiRequest(`/clinical/ward-transfers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transfer),
  });
}

export async function deleteWardTransferApi(id: string): Promise<void> {
  return apiRequest(`/clinical/ward-transfers/${id}`, {
    method: 'DELETE',
  });
}

// --- Doctor OPD Consultations ---
// Persists the doctor's OPD consultation (vitals, diagnosis, prescription,
// lab/radiology orders, follow-up) keyed by appointment. Backed by
// backend/app/routers/staff.py's /doctors/consultations endpoints, which
// store the form as a flexible JSON `record` blob per appointment.

export async function fetchConsultationsApi(doctorId?: string): Promise<any[]> {
  const query = doctorId ? `?doctor_id=${encodeURIComponent(doctorId)}` : '';
  return apiRequest<any[]>(`/doctors/consultations${query}`);
}

export async function saveConsultationApi(
  appointmentId: string,
  payload: {
    record: any;
    status?: string;
    doctorId?: string;
    patientUhid?: string;
    patientName?: string;
  }
): Promise<any> {
  return apiRequest(`/doctors/consultations/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// --- Appointment status update ---
// Generic status transition (Scheduled -> In Progress -> Completed, etc.)
// via the same PUT /appointments/{id} endpoint used for other appointment edits.

export async function updateAppointmentStatusApi(id: string, status: string): Promise<any> {
  return apiRequest(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// --- Pharmacy POS Invoices ---
// See backend/app/routers/pharmacy.py: creating an invoice deducts real
// batch stock (FEFO) for every line item, and deleting one restocks it.

export async function fetchInvoicesApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/invoices?branch=${encodeURIComponent(branch)}` : '/pharmacy/invoices';
  return apiRequest<any[]>(url);
}

export async function createInvoiceApi(invoice: any): Promise<any> {
  return apiRequest('/pharmacy/invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  });
}

export async function fetchPrescriptionsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/prescriptions?branch=${encodeURIComponent(branch)}` : '/pharmacy/prescriptions';
  return apiRequest<any[]>(url);
}

export async function createPrescriptionApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/prescriptions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePrescriptionApi(id: string, payload: any): Promise<any> {
  return apiRequest(`/pharmacy/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// --- OPD -> Lab order ---
// Places a real, pending Sample Collection order (not a fabricated result)
// when a doctor requests tests during an OPD consultation. See
// backend/app/routers/lab.py's create_opd_order.
export async function createOpdLabOrderApi(payload: {
  patientName: string;
  patientUhid: string;
  age: number;
  gender: string;
  doctorName: string;
  department: string;
  tests: string[];
  branch?: string;
  erEncounterId?: string;
  isEmergency?: boolean;
}): Promise<any> {
  return apiRequest('/lab/opd-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

const buildLabQuery = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export async function fetchLabSampleCollectionsApi(branch?: string): Promise<any[]> {
  return apiRequest<any[]>(`/lab/sample-collections${buildLabQuery({ branch })}`);
}

export async function fetchLabResultsApi(patientUhid?: string, branch?: string): Promise<any[]> {
  return apiRequest<any[]>(`/lab/results${buildLabQuery({ patient_uhid: patientUhid, branch })}`);
}

export async function fetchLabReportsApi(patientUhid?: string, branch?: string): Promise<any[]> {
  return apiRequest<any[]>(`/lab/reports${buildLabQuery({ patient_uhid: patientUhid, branch })}`);
}
// --- Pharmacy Categories ---
export async function fetchCategoriesApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/categories?branch=${encodeURIComponent(branch)}` : '/pharmacy/categories';
  return apiRequest<any[]>(url);
}

export async function createCategoryApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Pharmacy Reports & Analytics ---
export async function fetchPharmacyReportsApi(branch?: string): Promise<any> {
  const url = branch ? `/pharmacy/reports?branch=${encodeURIComponent(branch)}` : '/pharmacy/reports';
  return apiRequest<any>(url);
}

// --- Store -> Pharmacy Transfers ---
export async function fetchPharmacyTransfersApi(branch?: string): Promise<any> {
  const url = branch ? `/store/pharmacy-transfers?branch=${encodeURIComponent(branch)}` : '/store/pharmacy-transfers';
  return apiRequest<any>(url);
}

export async function approvePharmacyTransferApi(transferId: string): Promise<any> {
  return apiRequest(`/store/pharmacy-transfers/${transferId}/approve`, {
    method: 'POST',
  });
}

// --- Pharmacy Medicines ---
export async function fetchMedicinesApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/medicines?branch=${encodeURIComponent(branch)}` : '/pharmacy/medicines';
  return apiRequest<any[]>(url);
}

export async function createMedicineApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/medicines', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMedicineApi(id: string, payload: any): Promise<any> {
  return apiRequest(`/pharmacy/medicines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteMedicineApi(id: string): Promise<void> {
  return apiRequest<void>(`/pharmacy/medicines/${id}`, {
    method: 'DELETE',
  });
}

// --- Pharmacy Batches ---
export async function fetchPharmacyBatchesApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/batches?branch=${encodeURIComponent(branch)}` : '/pharmacy/batches';
  return apiRequest<any[]>(url);
}

export async function createPharmacyBatchApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePharmacyBatchApi(id: string, payload: any): Promise<any> {
  return apiRequest(`/pharmacy/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// --- Pharmacy Purchases ---
export async function fetchPurchasesApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/purchases?branch=${encodeURIComponent(branch)}` : '/pharmacy/purchases';
  return apiRequest<any[]>(url);
}

export async function createPurchaseApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/purchases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Pharmacy Returns ---
export async function fetchCustomerReturnsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/customer-returns?branch=${encodeURIComponent(branch)}` : '/pharmacy/customer-returns';
  return apiRequest<any[]>(url);
}

export async function createCustomerReturnApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/customer-returns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSupplierReturnsApi(branch?: string): Promise<any[]> {
  const url = branch ? `/pharmacy/supplier-returns?branch=${encodeURIComponent(branch)}` : '/pharmacy/supplier-returns';
  return apiRequest<any[]>(url);
}

export async function createSupplierReturnApi(payload: any): Promise<any> {
  return apiRequest('/pharmacy/supplier-returns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Staff & Nurses ---
export async function fetchNursesApi(branch?: string, department?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  if (department && department.toLowerCase() !== 'all') params.set('department', department);
  const query = params.toString();
  return apiRequest<any[]>(query ? `/staff/nurses?${query}` : '/staff/nurses');
}

// ==========================================
// Billing & Revenue Management API Services
// ==========================================

export async function fetchBillingKPIsApi(branch?: string): Promise<any> {
  const query = branch && branch.toLowerCase() !== 'all' ? `?branch=${encodeURIComponent(branch)}` : '';
  return apiRequest(`/billing/kpis${query}`);
}

export async function fetchBillsApi(filters?: { bill_type?: string; payment_status?: string; search?: string; branch?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.bill_type) queryParams.append('bill_type', filters.bill_type);
  if (filters?.payment_status) queryParams.append('payment_status', filters.payment_status);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);

  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/bills?${queryStr}` : '/billing/bills';
  return apiRequest<any[]>(url);
}

export async function fetchBillByNumberApi(billNumber: string): Promise<any> {
  return apiRequest(`/billing/bills/${encodeURIComponent(billNumber)}`);
}

export async function createBillApi(payload: any): Promise<any> {
  return apiRequest('/billing/bills', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPaymentCollectionsApi(filters?: { branch?: string; search?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  if (filters?.search) queryParams.append('search', filters.search);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/payments?${queryStr}` : '/billing/payments';
  return apiRequest<any[]>(url);
}

export async function recordPaymentCollectionApi(payload: any): Promise<any> {
  return apiRequest('/billing/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createRazorpayQrPaymentApi(payload: {
  bill_number: string;
  amount: number;
  payment_mode?: string;
  collected_by?: string;
  branch?: string;
  notes?: string;
}): Promise<any> {
  return apiRequest('/billing/payments/razorpay-qr', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPaymentTransactionApi(transactionId: string): Promise<any> {
  return apiRequest(`/billing/payments/transactions/${encodeURIComponent(transactionId)}`);
}

export async function confirmRazorpayTestPaymentApi(transactionId: string, payload?: {
  provider_payment_id?: string;
  collected_by?: string;
  notes?: string;
}): Promise<any> {
  return apiRequest(`/billing/payments/transactions/${encodeURIComponent(transactionId)}/confirm-test`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function syncRazorpayPaymentApi(transactionId: string): Promise<any> {
  return apiRequest(`/billing/payments/transactions/${encodeURIComponent(transactionId)}/sync-razorpay`, {
    method: 'POST',
  });
}

export async function createRazorpayCheckoutOrderApi(payload: {
  bill_number: string;
  amount: number;
  payment_mode?: string;
  collected_by?: string;
  branch?: string;
  notes?: string;
}): Promise<any> {
  return apiRequest('/billing/payments/razorpay-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyRazorpayCheckoutPaymentApi(payload: {
  transaction_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  collected_by?: string;
  notes?: string;
}): Promise<any> {
  return apiRequest('/billing/payments/razorpay-order/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDiscountRequestsApi(filters?: { status?: string; branch?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/discounts?${queryStr}` : '/billing/discounts';
  return apiRequest<any[]>(url);
}

export async function createDiscountRequestApi(payload: any): Promise<any> {
  return apiRequest('/billing/discounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDiscountStatusApi(id: string, payload: { status: string; approved_by?: string; reason?: string }): Promise<any> {
  return apiRequest(`/billing/discounts/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchRefundRequestsApi(filters?: { status?: string; branch?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/refunds?${queryStr}` : '/billing/refunds';
  return apiRequest<any[]>(url);
}

export async function createRefundRequestApi(payload: any): Promise<any> {
  return apiRequest('/billing/refunds', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRefundStatusApi(id: string, payload: { status: string; approved_by?: string; reason?: string }): Promise<any> {
  return apiRequest(`/billing/refunds/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchBillCancellationsApi(filters?: { status?: string; branch?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/cancellations?${queryStr}` : '/billing/cancellations';
  return apiRequest<any[]>(url);
}

export async function createBillCancellationApi(payload: any): Promise<any> {
  return apiRequest('/billing/cancellations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSupplierPayablesApi(filters?: { status?: string; module_source?: string; branch?: string }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.module_source) queryParams.append('module_source', filters.module_source);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/supplier-payables?${queryStr}` : '/billing/supplier-payables';
  return apiRequest<any[]>(url);
}

export async function fetchSupplierPayablesAnalyticsApi(filters?: { period?: string; date?: string; branch?: string }): Promise<any> {
  const queryParams = new URLSearchParams();
  if (filters?.period) queryParams.append('period', filters.period);
  if (filters?.date) queryParams.append('date', filters.date);
  if (filters?.branch && filters.branch.toLowerCase() !== 'all') queryParams.append('branch', filters.branch);
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/supplier-payables/analytics?${queryStr}` : '/billing/supplier-payables/analytics';
  return apiRequest<any>(url);
}
export async function createSupplierPayableApi(payload: any): Promise<any> {
  return apiRequest('/billing/supplier-payables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function paySupplierApi(invoiceNumber: string, payload: any): Promise<any> {
  return apiRequest(`/billing/supplier-payables/${encodeURIComponent(invoiceNumber)}/pay`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchBillingAuditLogsApi(filters?: { entity_type?: string; action?: string; limit?: number }): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.limit) queryParams.append('limit', String(filters.limit));
  const queryStr = queryParams.toString();
  const url = queryStr ? `/billing/audit-logs?${queryStr}` : '/billing/audit-logs';
  return apiRequest<any[]>(url);
}

// --- Emergency / ER API ---

export async function createEREncounterApi(data: {
  patient_id?: string;
  patient_uhid: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_phone?: string;
  patient_allergies?: string;
  patient_existing_diseases?: string;
  patient_emergency_contact_name?: string;
  patient_emergency_contact_phone?: string;
  patient_emergency_relationship?: string;
  arrival_date: string;
  arrival_time: string;
  arrival_mode: string;
  ambulance_number?: string;
  referral_hospital?: string;
  paramedic_name?: string;
  emergency_type: string;
  chief_complaint: string;
  accompanied_by?: string;
  emergency_contact?: string;
  assigned_doctor?: string;
  assigned_nurse?: string;
  registered_by?: string;
  branch?: string;
}): Promise<any> {
  return apiRequest<any>('/emergency', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchEREncountersApi(branch?: string, erStatus?: string, department?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (branch && branch.toLowerCase() !== 'all') params.set('branch', branch);
  if (erStatus) params.set('er_status', erStatus);
  if (department && department.toLowerCase() !== 'all') params.set('department', department);
  const query = params.toString();
  return apiRequest<any[]>(query ? `/emergency?${query}` : '/emergency');
}

export async function fetchEREncounterApi(id: string): Promise<any> {
  return apiRequest<any>(`/emergency/${id}`);
}

export async function updateEREncounterApi(id: string, data: Record<string, any>): Promise<any> {
  return apiRequest<any>(`/emergency/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchERTimelineApi(id: string): Promise<any[]> {
  return apiRequest<any[]>(`/emergency/${id}/timeline`);
}

export async function recordERTriageApi(id: string, data: {
  triage_status: string;
  triage_notes?: string;
  triaged_by?: string;
  triage_time?: string;
  current_location?: string;
}): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/triage`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createERAssessmentApi(id: string, data: {
  assessment: string;
  doctor_name: string;
  presenting_complaint?: string;
  history?: string;
  clinical_examination?: string;
  severity?: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  diagnosis_notes?: string;
  doctor_id?: string;
  assessment_time?: string;
}): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/assessment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateERAssessmentApi(id: string, data: Record<string, any>): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/assessment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function createERProcedureApi(id: string, data: {
  procedure_name: string;
  performed_by: string;
  indication?: string;
  notes?: string;
  outcome?: string;
  procedure_time?: string;
}): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/procedures`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchERProceduresApi(id: string): Promise<any[]> {
  return apiRequest<any[]>(`/emergency/${id}/procedures`);
}

export async function setERDispositionApi(id: string, data: {
  disposition: string;
  disposition_notes?: string;
  required_ward?: string;
  doctor_name?: string;
}): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/disposition`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function assignERObservationBedApi(id: string, bedId: string, currentLocation?: string): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/assign-bed`, {
    method: 'POST',
    body: JSON.stringify({ bed_id: bedId, current_location: currentLocation }),
  });
}

export async function initiateERToIPDApi(id: string, data: {
  ward: string;
  bed_number: string;
  attending_doctor: string;
  room_number?: string;
  bed_id?: string;
  attending_nurse?: string;
  admission_reason?: string;
  emergency_contact?: string;
  insurance_provider?: string;
  insurance_number?: string;
}): Promise<any> {
  return apiRequest<any>(`/emergency/${id}/to-ipd`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

