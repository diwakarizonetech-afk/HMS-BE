import { UserRole } from './hms';

export interface HospitalProfile {
  id?: string;
  hospitalName: string;
  hospitalCode: string;
  tagline?: string;
  hospitalLogoUrl?: string;
  logo?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  timezone?: string;
  currency?: string;
  establishedYear?: string;
  establishmentYear?: string;
  accreditation?: string;
  totalBedCapacity?: number;
  emergencyContactNumber?: string;
}

export interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  managerName?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  status: 'Active' | 'Inactive';
  totalStaff: number;
  bedCount?: number;
  bedCapacity?: number;
  isMainBranch?: boolean;
}

export interface HMSUser {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  name?: string;
  username?: string;
  email: string;
  phone: string;
  role: UserRole | string;
  department: string;
  // Nurse ward-scoping key (see CHANGELOG.md Phase 13) — only meaningful for
  // role === 'nurse'. Optional/undefined means "not yet assigned, don't scope".
  assignedWard?: string;
  branch: string;
  status: 'Active' | 'Inactive';
  password?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface RoleItem {
  id: string;
  roleName: string;
  roleCode: string;
  description: string;
  isSystemDefault: boolean;
  assignedUserCount: number;
  permissionsCount: number;
  status: 'Active' | 'Inactive';
  createdDate?: string;
  updatedDate?: string;
}

export type PermissionAction = 'View' | 'Create' | 'Edit' | 'Update' | 'Delete' | 'Export' | 'Print' | 'Manage' | 'Assign';

export interface ModulePermission {
  moduleName: string;
  permissions: Record<PermissionAction, boolean>;
}

export interface RolePermissionMatrix {
  roleId: string;
  roleName: string;
  modulePermissions: Record<string, Record<PermissionAction, boolean>>;
}

export interface DepartmentAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  branch: string;
  designation: string;
  effectiveDate: string;
  status: 'Active' | 'Inactive';
}

export interface DepartmentItem {
  id: string;
  departmentCode: string;
  departmentName: string;
  headOfDepartment: string;
  email: string;
  phone: string;
  floorLocation: string;
  doctorCount: number;
  bedCount: number;
  status: 'Active' | 'Inactive';
  name?: string;
  code?: string;
}

export interface DoctorSpecialization {
  id: string;
  code: string;
  specializationName: string;
  category: string;
  associatedDepartment: string;
  description: string;
  doctorCount: number;
  status: 'Active' | 'Inactive';
}

export interface ConsultationCharge {
  id: string;
  department: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  consultationFee: number;
  emergencyFee: number;
  followUpFee: number;
  validityDays?: number;
  status: 'Active' | 'Inactive';
}

export interface WorkingHours {
  id: string;
  department: string;
  startTime: string;
  endTime: string;
  breakTime: string;
  workingDays: string[];
  status: 'Active' | 'Inactive';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  leaveType: 'Sick Leave' | 'Casual Leave' | 'Paid Leave' | 'Maternity Leave' | 'Duty Leave';
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  approvalStatus: 'Approved' | 'Pending' | 'Rejected';
  appliedDate: string;
}

export interface ShiftRotation {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  morningShift: string; // e.g. "08:00 AM - 04:00 PM"
  eveningShift: string; // e.g. "04:00 PM - 12:00 AM"
  nightShift: string; // e.g. "12:00 AM - 08:00 AM"
  assignedShift: 'Morning' | 'Evening' | 'Night';
  effectiveDate: string;
  status: 'Active' | 'Inactive';
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  role: string;
  ipAddress: string;
  deviceInfo: string;
  loginTime: string;
  logoutTime?: string;
  status: 'Success' | 'Failed';
  location: string;
}

export interface ActivityLog {
  id: string;
  type: 'User Created' | 'Role Updated' | 'Hospital Updated' | 'Branch Added' | 'Department Added' | 'Security';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  iconName?: string;
}

export interface SuperAdminDashboardStats {
  totalHospitals: number;
  totalBranches: number;
  totalDepartments: number;
  totalDoctors: number;
  totalUsers: number;
  activeUsers: number;
  todaysLogins: number;
  bedOccupancyPercent: number;
}
