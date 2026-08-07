export type UserRole = 
  | 'super_admin'
  | 'superadmin'
  | 'reception'
  | 'doctor'
  | 'nurse'
  | 'lab'
  | 'pharmacy'
  | 'admin'
  | 'patient'
  | 'store'
  | 'store_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  username?: string;
  avatar?: string;
  department?: string;
  shiftTiming?: string;
  shiftName?: string;
}

export interface Patient {
  id: string;
  uhid: string; // e.g. UHID-2026-1001
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age: number;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  nationality: string;
  
  // Contact Info
  mobile: string;
  altMobile?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;

  // Identity
  aadhaar: string;
  pan?: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyPhone: string;

  // Medical
  allergies?: string;
  existingDiseases?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;

  // Status
  status: 'Active' | 'Admitted' | 'Discharged';
  registrationDate: string;
}

export interface EmergencyContactItem {
  id: string;
  patientUhid: string;
  patientName: string;
  contactName: string;
  relationship: string;
  phone: string;
  priority: 'Primary' | 'Secondary';
}

export interface DoctorReview {
  id: string;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  qualification?: string;
  experienceYears?: number;
  languages?: string[];
  roomNo: string;
  consultationFee: number;
  availableDays: string[];
  slots: string[];
  status: 'Available' | 'In Surgery' | 'On Leave' | 'Busy';
  email: string;
  rating?: number;
  photoUrl?: string;
  biography?: string;
  education?: string[];
  awards?: string[];
  clinicTimings?: string;
  reviews?: DoctorReview[];
  nextAvailableDate?: string;
  nextAvailableSlot?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  iconName: string;
  doctorCount: number;
  description: string;
}

export type AppointmentStatus =
  | 'Scheduled'
  | 'Booked'
  | 'Confirmed'
  | 'Completed'
  | 'Rescheduled'
  | 'Cancelled'
  | 'In Progress'
  | 'No Show';

export interface Appointment {
  id: string;
  patientUhid: string;
  patientName: string;
  patientMobile: string;
  department: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: AppointmentStatus;
  createdDate: string;
  cancellationReason?: string;

  // Extended Patient Details
  email?: string;
  dob?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Emergency Contact
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;

  // Booking Specs
  patientType?: 'New Patient' | 'Existing Patient';
  visitType?: 'First Visit' | 'Follow Up';
  consultationType?: 'Hospital Visit' | 'Video Consultation' | 'Phone Consultation';
  symptoms?: string;
  reports?: string[];
  insurance?: boolean;
  insuranceProvider?: string;
  policyNumber?: string;

  // Fee Details
  consultationFee?: number;
  bookingFee?: number;
  gst?: number;
  totalAmount?: number;
  paymentStatus?: 'Paid' | 'Pending' | 'Refunded';
}

export interface WalkInToken {
  id: string;
  tokenNumber: string; // e.g. TK-101
  patientUhid: string;
  patientName: string;
  department: string;
  doctorName: string;
  estimatedWaitMinutes: number;
  issueTime: string;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'Skipped';
}

export interface QueueItem {
  id: string;
  tokenNumber: string;
  patientUhid: string;
  patientName: string;
  doctorName: string;
  department: string;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'On Hold' | 'Skipped';
  waitingTimeMinutes: number;
  timeIssued: string;
}

export type BedStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';
export type WardType = 'General Ward' | 'ICU' | 'Deluxe Private' | 'Semi-Private' | 'Surgical Ward';

export interface Bed {
  id: string;
  bedNumber: string; // e.g. B-101
  ward: WardType;
  roomNumber: string;
  category: 'Standard' | 'ICU' | 'Deluxe' | 'Isolation';
  status: BedStatus;
  currentPatientUhid?: string;
  currentPatientName?: string;
  admittedDate?: string;
}

export interface IPDAdmission {
  id: string;
  patientUhid: string;
  patientName: string;
  ward: WardType;
  roomNumber: string;
  bedNumber: string;
  bedId?: string; // links the admission to a specific Bed row so the backend can auto-occupy it
  admissionDate: string;
  attendingDoctor: string;
  admissionReason: string;
  emergencyContact: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  status: 'Admitted' | 'Discharged' | 'Transferred';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  module?: string;
  eventType?: string;
  senderName?: string;
  recipientRole?: string;
  relatedRecordId?: string;
  priority?: string;
  status?: string;
}

// ══════════════════════════════════════════════════════════════════════════
// LAB TYPES
// ══════════════════════════════════════════════════════════════════════════

export type TestCategory = 
  | 'Hematology'
  | 'Clinical Pathology'
  | 'Biochemistry'
  | 'Microbiology'
  | 'Serology'
  | 'Immunology'
  | 'Histopathology'
  | 'Cytology'
  | 'Molecular Diagnostics'
  | 'Endocrinology';

export type PriorityLevel = 'Normal' | 'STAT' | 'Emergency';
export type CollectionStatus = 'Pending' | 'Collected' | 'Recollect' | 'Rejected';
export type ProcessingStatus = 'Pending' | 'In Processing' | 'Completed' | 'QC Pending' | 'QC Passed';
export type ResultFlag = 'Normal' | 'High' | 'Low' | 'Critical';
export type ResultStatus = 'Pending' | 'Completed' | 'Critical' | 'Verified';
export type ReportStatus = 'Draft' | 'Generated' | 'Printed' | 'Emailed';
export type DoctorReviewStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Re-Test Requested';

export interface LabTestMaster {
  id: string;
  testCode: string;
  testName: string;
  department: string;
  category: TestCategory;
  subCategory: string;
  sampleType: string;
  containerType: string;
  method: string;
  machine: string;
  normalRange: string;
  criticalRange: string;
  unit: string;
  tatHours: number;
  price: number;
  status: 'Active' | 'Inactive';
  prepInstructions?: string;
  reportTemplate?: string;
  remarks?: string;
}

export interface SampleCollectionItem {
  id: string;
  collectionId: string;
  patientUhid: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  doctorName: string;
  department: string;
  orderedTests: string[];
  sampleType: string;
  container: string;
  barcode: string;
  collectionDate: string;
  collectionTime: string;
  collectedBy: string;
  priority: PriorityLevel;
  status: CollectionStatus;
  remarks?: string;
}

export interface SampleProcessingItem {
  id: string;
  sampleId: string;
  patientName: string;
  patientUhid: string;
  testName: string;
  analyzer: string;
  machine: string;
  assignedTechnician: string;
  processingStart: string;
  processingEnd: string;
  duration: string;
  status: ProcessingStatus;
  qcStatus: 'Passed' | 'Pending' | 'Failed';
  notes?: string;
}

export interface LabResultItem {
  id: string;
  patientName: string;
  patientUhid: string;
  testName: string;
  testCode: string;
  sampleId: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  flag: ResultFlag;
  technician: string;
  verifiedBy: string;
  entryDate: string;
  status: ResultStatus;
  notes?: string;
  imageAttachment?: string;
}

export interface LabReportItem {
  id: string;
  reportNumber: string;
  patientName: string;
  patientUhid: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  doctorName: string;
  department: string;
  tests: string[];
  testResults: LabResultItem[];
  generatedDate: string;
  generatedBy: string;
  status: ReportStatus;
  doctorReviewStatus: DoctorReviewStatus;
  doctorComments?: string;
  doctorReviewDate?: string;
}

export interface PatientLabOrder {
  id: string;
  sampleId: string;
  patientName: string;
  patientUhid: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  doctorName: string;
  department: string;
  orderDate: string;
  priority: PriorityLevel;
  status: ResultStatus;
  tests: LabResultItem[];
}

export interface LabActivity {
  id: string;
  type: 'New Test Ordered' | 'Sample Collected' | 'Sample Processing Started' | 'Report Generated' | 'Critical Result Found' | 'Doctor Reviewed Report';
  title: string;
  time: string;
  user: string;
  priority?: 'Normal' | 'Critical';
}

// ══════════════════════════════════════════════════════════════════════════
// PHARMACY TYPES
// ══════════════════════════════════════════════════════════════════════════

export interface Medicine {
  id: string;
  code: string;
  name: string;
  genericName: string;
  brand: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  storageCondition: string;
  rackLocation: string;
  status: 'Active' | 'Inactive';
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
}

export interface MedicineCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  medicineCount: number;
}

export interface Batch {
  id: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  supplierName: string;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantityReceived: number;
  availableQuantity: number;
  batchStatus: 'Available' | 'Low Stock' | 'Expiring Soon' | 'Expired' | 'Quarantined';
}

export interface PurchaseItem {
  id: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  discount: number;
  gst: number;
  totalAmount: number;
}

export interface PurchaseEntry {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  supplierGst: string;
  invoiceNumber: string;
  purchaseDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
  totalAmount: number;
  status: 'Completed' | 'Pending' | 'Draft' | 'Cancelled';
  items: PurchaseItem[];
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  dosage: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  days: number;
  instructions: string;
  price: number;
  dispensed: boolean;
}

export interface PrescriptionOrder {
  id: string;
  prescriptionNumber: string;
  patientUhid: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  doctorName: string;
  department: string;
  visitDate: string;
  status: 'Pending' | 'Verified' | 'Dispensed' | 'Partially Dispensed';
  paymentStatus?: 'Paid' | 'Due' | 'Partial' | 'Unpaid';
  totalAmount?: number;
  amountPaid?: number;
  dueAmount?: number;
  paymentMethod?: 'Cash' | 'UPI' | 'Card' | 'IPD Credit / Post Bill' | 'Bank Transfer';
  items: PrescriptionItem[];
}

export interface POSSaleItem {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
  gst: number;
  total: number;
}

export interface POSInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  date: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Split';
  subtotal: number;
  discount: number;
  gstAmount: number;
  totalAmount: number;
  items: POSSaleItem[];
}

export interface CustomerReturn {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  patientName: string;
  medicineName: string;
  quantity: number;
  reason: string;
  refundAmount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  date: string;
}

export interface SupplierReturn {
  id: string;
  returnNumber: string;
  supplierName: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  reason: 'Expired' | 'Damaged' | 'Wrong Delivery';
  creditNoteNo: string;
  amount: number;
  status: 'Completed' | 'Pending Credit' | 'In Process';
  date: string;
}
