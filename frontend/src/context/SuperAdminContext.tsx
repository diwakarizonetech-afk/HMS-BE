import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  HospitalProfile,
  Branch,
  HMSUser,
  RoleItem,
  DepartmentAssignment,
  DepartmentItem,
  DoctorSpecialization,
  ConsultationCharge,
  WorkingHours,
  LeaveRequest,
  ShiftRotation,
  LoginHistoryItem,
  ActivityLog,
  PermissionAction,
  SuperAdminDashboardStats,
} from '../types/superAdmin';

import {
  fetchHospitalProfileApi,
  saveHospitalProfileApi,
  fetchBranchesApi,
  createBranchApi,
  updateBranchApi,
  deleteBranchApi,
  fetchSpecializationsApi,
  createSpecializationApi,
  updateSpecializationApi,
  deleteSpecializationApi,
  fetchConsultationChargesApi,
  createConsultationChargeApi,
  updateConsultationChargeApi,
  deleteConsultationChargeApi,
  fetchWorkingHoursApi,
  createWorkingHoursApi,
  updateWorkingHoursApi,
  deleteWorkingHoursApi,
  fetchLeavesApi,
  createLeaveApi,
  updateLeaveApi,
  deleteLeaveApi,
  fetchShiftsApi,
  createShiftApi,
  updateShiftApi,
  deleteShiftApi,
  fetchRolesApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
  fetchUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  resetUserPasswordApi,
  toggleUserStatusApi,
  createDoctorApi,
  fetchDepartmentAssignmentsApi,
  createDepartmentAssignmentApi,
  updateDepartmentAssignmentApi,
  deleteDepartmentAssignmentApi,
  fetchLoginHistoryApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  fetchDepartmentsApi,
  fetchPermissionsApi,
  setPermissionApi,
} from '../services/api';
import { useHMS } from './HMSContext';

interface SuperAdminContextType {
  // Hospital Profile
  hospitalProfile: HospitalProfile;
  updateHospitalProfile: (updated: Partial<HospitalProfile>) => void;

  // Branch Management
  branches: Branch[];
  addBranch: (branch: Omit<Branch, 'id' | 'branchCode'>) => void;
  updateBranch: (id: string, updated: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  // User Management
  users: HMSUser[];
  addUser: (userData: Omit<HMSUser, 'id' | 'userId' | 'createdAt'>) => void;
  updateUser: (id: string, updated: Partial<HMSUser>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPass: string) => void;

  // Role & Permissions Management
  roles: RoleItem[];
  addRole: (roleData: Omit<RoleItem, 'id' | 'roleCode' | 'isSystemDefault' | 'assignedUserCount'>) => Promise<boolean>;
  updateRole: (id: string, updated: Partial<RoleItem>) => Promise<boolean>;
  deleteRole: (id: string) => void;
  toggleRoleStatus: (id: string) => void;
  permissionMatrix: Record<string, Record<string, Record<PermissionAction, boolean>>>;
  togglePermission: (roleId: string, moduleName: string, action: PermissionAction) => Promise<void>;

  // Department Management
  departments: DepartmentItem[];
  addDepartment: (dept: Omit<DepartmentItem, 'id' | 'departmentCode'>) => void;
  updateDepartment: (id: string, updated: Partial<DepartmentItem>) => void;
  deleteDepartment: (id: string) => void;

  // Department Assignments
  departmentAssignments: DepartmentAssignment[];
  assignUserDepartment: (assignment: Omit<DepartmentAssignment, 'id'>) => void;
  updateDepartmentAssignment: (id: string, updated: Partial<DepartmentAssignment>) => void;
  deleteDepartmentAssignment: (id: string) => void;

  // Specializations
  specializations: DoctorSpecialization[];
  addSpecialization: (spec: Omit<DoctorSpecialization, 'id' | 'code'>) => void;
  updateSpecialization: (id: string, updated: Partial<DoctorSpecialization>) => void;
  deleteSpecialization: (id: string) => void;

  // Consultation Charges
  consultationCharges: ConsultationCharge[];
  addConsultationCharge: (charge: Omit<ConsultationCharge, 'id'>) => void;
  updateConsultationCharge: (id: string, updated: Partial<ConsultationCharge>) => void;
  deleteConsultationCharge: (id: string) => void;

  // Working Hours
  workingHours: WorkingHours[];
  addWorkingHours: (wh: Omit<WorkingHours, 'id'>) => void;
  updateWorkingHours: (id: string, updated: Partial<WorkingHours>) => void;
  deleteWorkingHours: (id: string) => void;

  // Leave Management
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (leave: Omit<LeaveRequest, 'id' | 'appliedDate'>) => void;
  updateLeaveStatus: (id: string, approvalStatus: LeaveRequest['approvalStatus']) => void;
  deleteLeaveRequest: (id: string) => void;

  // Shift Rotation
  shiftRotations: ShiftRotation[];
  addShiftRotation: (shift: Omit<ShiftRotation, 'id'>) => void;
  updateShiftRotation: (id: string, updated: Partial<ShiftRotation>) => void;
  deleteShiftRotation: (id: string) => void;

  // Login History & Activities
  loginHistory: LoginHistoryItem[];
  activities: ActivityLog[];
  stats: SuperAdminDashboardStats;
}

const EMPTY_PROFILE: HospitalProfile = {
  hospitalName: '',
  hospitalCode: '',
  tagline: '',
  registrationNumber: '',
  taxId: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  logo: '',
  establishmentYear: '',
  totalBedCapacity: 0,
  emergencyContactNumber: '',
};

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast, beds: hmsBeds } = useHMS();

  // Empty State initialization for zero-data start
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile>(EMPTY_PROFILE);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<HMSUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [specializations, setSpecializations] = useState<DoctorSpecialization[]>([]);
  const [consultationCharges, setConsultationCharges] = useState<ConsultationCharge[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shiftRotations, setShiftRotations] = useState<ShiftRotation[]>([]);
  const [departmentAssignments, setDepartmentAssignments] = useState<DepartmentAssignment[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Initial Permission Matrix setup
  const initialModules = [
    'Patient Management',
    'Appointment Mgmt',
    'IPD Bed Allocation',
    'Pharmacy & Drugs',
    'Lab & Diagnostics',
    'Inventory & Store',
    'Billing & Accounts',
    'Super Admin & Setup',
  ];

  const [permissionMatrix, setPermissionMatrix] = useState<
    Record<string, Record<string, Record<PermissionAction, boolean>>>
  >({});

  // Fetch initial data from backend API
  const loadSuperAdminData = async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) return;

    const saved = localStorage.getItem('hms_user');
    if (!saved) return;
    try {
      const u = JSON.parse(saved);
      const role = (u?.role || '').toString().toLowerCase().replace('userrole.', '');
      const adminRoles = ['super_admin', 'superadmin', 'admin'];
      if (!adminRoles.includes(role)) return;
    } catch {
      return;
    }

    try {

      const [
        hp, brs, specs, charges, whs, lvs, sfts, usrs, rls, das, lh, depts, perms
      ] = await Promise.all([
        fetchHospitalProfileApi(),
        fetchBranchesApi(),
        fetchSpecializationsApi(),
        fetchConsultationChargesApi(),
        fetchWorkingHoursApi(),
        fetchLeavesApi(),
        fetchShiftsApi(),
        fetchUsersApi(),
        fetchRolesApi(),
        fetchDepartmentAssignmentsApi(),
        fetchLoginHistoryApi(),
        fetchDepartmentsApi(),
        fetchPermissionsApi(),
      ]);

      if (hp) {
        setHospitalProfile({
          id: hp.id || '',
          hospitalName: hp.hospital_name || hp.hospitalName || '',
          hospitalCode: hp.hospital_code || hp.hospitalCode || '',
          tagline: hp.tagline || '',
          logo: hp.logo || hp.hospital_logo_url || hp.hospitalLogoUrl || '',
          hospitalLogoUrl: hp.hospital_logo_url || hp.hospitalLogoUrl || hp.logo || '',
          registrationNumber: hp.registration_number || hp.registrationNumber || '',
          licenseNumber: hp.license_number || hp.licenseNumber || '',
          taxId: hp.tax_id || hp.taxId || '',
          phone: hp.phone || '',
          email: hp.email || '',
          website: hp.website || '',
          address: hp.address || '',
          city: hp.city || '',
          state: hp.state || '',
          country: hp.country || 'India',
          pincode: hp.pincode || '',
          timezone: hp.timezone || 'Asia/Kolkata (GMT+5:30)',
          currency: hp.currency || 'INR (₹)',
          establishedYear: hp.established_year || hp.establishedYear || hp.establishment_year || hp.establishmentYear || '',
          establishmentYear: hp.establishment_year || hp.establishmentYear || hp.established_year || hp.establishedYear || '',
          accreditation: hp.accreditation || '',
          totalBedCapacity: hp.total_bed_capacity ?? hp.totalBedCapacity ?? 0,
          emergencyContactNumber: hp.emergency_contact_number || hp.emergencyContactNumber || '',
        });
      }

      if (brs && brs.length > 0) {
        setBranches(brs.map((b: any) => ({
          id: b.id,
          branchName: b.branch_name || b.branchName,
          branchCode: b.branch_code || b.branchCode,
          managerName: b.manager_name || b.managerName || '',
          address: b.address,
          city: b.city,
          state: b.state,
          country: b.country || 'India',
          pincode: b.pincode,
          phone: b.phone,
          email: b.email,
          status: b.status || 'Active',
          isMainBranch: b.is_main_branch ?? b.isMainBranch ?? false,
          bedCapacity: b.bed_capacity ?? b.bedCapacity ?? b.bedCount ?? 0,
          bedCount: b.bed_count ?? b.bedCount ?? b.bed_capacity ?? b.bedCapacity ?? 0,
          totalStaff: b.total_staff ?? b.totalStaff ?? 0,
        })));
      }

      if (specs && specs.length > 0) {
        setSpecializations(specs.map((s: any) => ({
          id: s.id,
          specializationName: s.specialization_name || s.specializationName || '',
          code: s.code || '',
          category: s.category || 'General',
          associatedDepartment: s.associated_department || s.associatedDepartment || s.department_name || s.departmentName || '',
          description: s.description || '',
          doctorCount: s.doctor_count ?? s.doctorCount ?? 0,
          status: s.status || 'Active',
        })));
      }

      if (charges && charges.length > 0) {
        setConsultationCharges(charges.map((c: any) => ({
          id: c.id,
          doctorId: c.doctor_id || c.doctorId,
          doctorName: c.doctor_name || c.doctorName,
          specialization: c.specialization || '',
          department: c.department,
          consultationFee: c.consultation_fee ?? c.consultationFee ?? 0,
          followUpFee: c.follow_up_fee ?? c.followUpFee ?? 0,
          emergencyFee: c.emergency_fee ?? c.emergencyFee ?? 0,
          validityDays: c.validity_days ?? c.validityDays ?? 7,
          status: c.status || 'Active',
        })));
      }

      if (whs && whs.length > 0) {
        setWorkingHours(whs.map((w: any) => ({
          id: w.id,
          department: w.department || '',
          startTime: w.start_time || w.startTime || '08:00 AM',
          endTime: w.end_time || w.endTime || '08:00 PM',
          breakTime: w.break_time || w.breakTime || '01:00 PM - 02:00 PM',
          workingDays: w.working_days || w.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          status: w.status || 'Active',
        })));
      }

      if (lvs) {
        setLeaveRequests(lvs.map((l: any) => ({
          id: l.id,
          employeeId: l.employee_id || l.employeeId || '',
          employeeName: l.employee_name || l.employeeName || '',
          role: l.role || '',
          department: l.department || '',
          leaveType: l.leave_type || l.leaveType || 'Casual Leave',
          fromDate: l.start_date || l.startDate || l.fromDate || '',
          toDate: l.end_date || l.endDate || l.toDate || '',
          totalDays: l.total_days ?? l.totalDays ?? 1,
          reason: l.reason || '',
          approvalStatus: l.approval_status || l.approvalStatus || 'Pending',
          appliedDate: l.applied_date || l.appliedDate || new Date().toISOString().split('T')[0],
        })));
      }

      if (sfts && sfts.length > 0) {
        setShiftRotations(sfts.map((s: any) => ({
          id: s.id,
          employeeId: s.employee_id || s.employeeId || '',
          employeeName: s.employee_name || s.employeeName || '',
          department: s.department || '',
          branch: s.branch || '',
          morningShift: s.morning_shift || s.morningShift || '07:00 AM - 03:00 PM',
          eveningShift: s.evening_shift || s.eveningShift || '03:00 PM - 11:00 PM',
          nightShift: s.night_shift || s.nightShift || '11:00 PM - 07:00 AM',
          assignedShift: s.assigned_shift || s.assignedShift || 'Morning',
          effectiveDate: s.effective_date || s.effectiveDate || s.start_date || '',
          status: s.status || 'Active',
        })));
      }

      if (usrs && usrs.length > 0) {
        setUsers(usrs.map((u: any) => ({
          id: u.id,
          userId: u.employee_id || u.username || u.id,
          employeeId: u.employee_id || u.employeeId || u.username || u.id || '',
          fullName: u.name || u.fullName || u.username || 'Staff User',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role || '',
          department: u.department || 'General',
          assignedWard: u.assigned_ward || u.assignedWard || undefined,
          branch: u.branch || '',
          status: u.status || (u.is_active ? 'Active' : 'Inactive'),
          createdAt: u.created_at || u.createdAt || new Date().toISOString().split('T')[0],
        })));
      }

      if (rls && rls.length > 0) {
        setRoles(rls.map((r: any) => ({
          id: r.id,
          roleName: r.role_name || r.roleName || '',
          roleCode: r.role_code || r.roleCode || '',
          description: r.description || '',
          isSystemDefault: r.is_system_default ?? r.isSystemDefault ?? false,
          assignedUserCount: r.assigned_user_count ?? r.assignedUserCount ?? 0,
          permissionsCount: r.permissions_count ?? r.permissionsCount ?? 0,
          status: r.status || 'Active',
        })));
      }

      if (das && das.length > 0) {
        setDepartmentAssignments(das.map((d: any) => ({
          id: d.id,
          employeeId: d.employee_id || d.employeeId || '',
          employeeName: d.employee_name || d.employeeName || '',
          role: d.role || '',
          department: d.department || d.primary_department || d.primaryDepartment || '',
          branch: d.branch || '',
          designation: d.designation || '',
          effectiveDate: d.effective_date || d.effectiveDate || d.assigned_date || d.assignedDate || '',
          status: d.status || 'Active',
        })));
      }

      if (lh && lh.length > 0) {
        setLoginHistory(lh.map((l: any) => ({
          id: l.id,
          userId: l.user_id || l.userId || l.id,
          employeeId: l.employee_id || l.employeeId || '',
          fullName: l.full_name || l.fullName || l.user_name || l.userName || '',
          role: l.role || '',
          ipAddress: l.ip_address || l.ipAddress || '',
          deviceInfo: l.device_info || l.deviceInfo || l.browser || '',
          loginTime: l.login_time || l.loginTime || '',
          status: l.status || 'Success',
          location: l.location || '',
        })));
      }

      if (depts && depts.length > 0) {
        setDepartments(depts.map((d: any) => ({
          id: d.id,
          departmentName: d.name || d.department_name || d.departmentName || '',
          departmentCode: d.code || d.department_code || d.departmentCode || '',
          headOfDepartment: d.head_of_department || d.headOfDepartment || d.head_name || d.headName || 'Not Assigned',
          email: d.email || '',
          phone: d.phone || '',
          floorLocation: d.floor_location || d.floorLocation || d.floor_number || d.floorNumber || '1st Floor',
          doctorCount: d.doctor_count ?? d.doctorCount ?? 0,
          bedCount: d.bed_count ?? d.bedCount ?? 0,
          status: d.status || 'Active',
        })));
      }

      if (perms && perms.length > 0) {
        setPermissionMatrix((prev) => {
          const next = { ...prev };
          for (const p of perms) {
            const roleId = p.role_id || p.roleId;
            const moduleName = p.module_name || p.moduleName;
            const action = p.action as PermissionAction;
            if (!roleId || !moduleName || !action) continue;
            if (!next[roleId]) next[roleId] = {};
            if (!next[roleId][moduleName]) {
              next[roleId][moduleName] = {
                View: false, Create: false, Edit: false, Update: false, Delete: false,
                Export: false, Print: false, Manage: false, Assign: false,
              };
            }
            next[roleId][moduleName][action] = p.is_granted ?? p.isGranted ?? false;
          }
          return next;
        });
      }

    } catch (err) {
      console.warn('Backend API sync unavailable for Super Admin:', err);
    }
  };

  useEffect(() => {
    loadSuperAdminData();
    window.addEventListener('hms_auth_change', loadSuperAdminData);
    return () => {
      window.removeEventListener('hms_auth_change', loadSuperAdminData);
    };
  }, []);

  // Log activity helper
  const logActivity = (type: ActivityLog['type'], title: string, description: string) => {
    const newAct: ActivityLog = {
      id: `act-${Date.now()}`,
      type,
      title,
      description,
      timestamp: 'Just now',
      actor: 'Super Admin',
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Hospital Profile
  const updateHospitalProfile = async (updated: Partial<HospitalProfile>) => {
    const merged = { ...hospitalProfile, ...updated };
    try {
      await saveHospitalProfileApi(merged);
      setHospitalProfile(merged);
      addToast('success', 'Profile Updated', 'Hospital profile details updated successfully.');
      logActivity('Hospital Updated', 'Hospital Profile Modified', `Updated hospital profile information.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save hospital profile. Please try again.');
      throw err;
    }
  };

  // Branch Handlers
  const addBranch = async (branchData: Omit<Branch, 'id' | 'branchCode'>) => {
    const cityPrefix = (branchData.city || 'MUM').substring(0, 3).toUpperCase();
    const newCode = `BR-${cityPrefix}-0${branches.length + 1}`;
    try {
      const created = await createBranchApi({ ...branchData, branchCode: newCode });
      const newBranch: Branch = {
        id: created.id,
        branchName: created.branch_name || branchData.branchName,
        branchCode: created.branch_code || newCode,
        managerName: created.manager_name || branchData.managerName || '',
        address: created.address || branchData.address,
        city: created.city || branchData.city,
        state: created.state || branchData.state,
        country: created.country || branchData.country,
        pincode: created.pincode || branchData.pincode,
        phone: created.phone || branchData.phone,
        email: created.email || branchData.email,
        status: created.status || branchData.status || 'Active',
        isMainBranch: created.is_main_branch ?? branchData.isMainBranch ?? false,
        bedCapacity: created.bed_capacity ?? branchData.bedCapacity ?? branchData.bedCount ?? 0,
        bedCount: created.bed_count ?? branchData.bedCount ?? created.bed_capacity ?? branchData.bedCapacity ?? 0,
        totalStaff: created.total_staff ?? branchData.totalStaff ?? 0,
      };
      setBranches((prev) => [newBranch, ...prev]);
      addToast('success', 'Branch Added', `Branch ${branchData.branchName} created.`);
      logActivity('Branch Added', 'New Branch Initialized', `Added branch ${branchData.branchName} in ${branchData.city}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not create branch. Please try again.');
      throw err;
    }
  };

  const updateBranch = async (id: string, updated: Partial<Branch>) => {
    try {
      await updateBranchApi(id, updated);
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      addToast('success', 'Branch Updated', 'Branch details saved successfully.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update branch. Please try again.');
      throw err;
    }
  };

  const deleteBranch = async (id: string) => {
    const br = branches.find((b) => b.id === id);
    try {
      await deleteBranchApi(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      addToast('info', 'Branch Removed', `Branch ${br?.branchName || ''} deleted.`);
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete branch. Please try again.');
      throw err;
    }
  };

  // User Management
  const addUser = async (userData: Omit<HMSUser, 'id' | 'userId' | 'createdAt'>) => {
    const newUserId = `USR-${userData.role.substring(0, 3).toUpperCase()}-${100 + users.length + 1}`;
    try {
      const created = await createUserApi({ ...userData, username: newUserId });
      const newUser: HMSUser = {
        id: created.id,
        userId: created.employee_id || created.username || newUserId,
        fullName: created.name || userData.fullName,
        email: created.email || userData.email,
        role: created.role || userData.role,
        department: created.department || userData.department,
        employeeId: created.employee_id || userData.employeeId,
        phone: created.phone || userData.phone,
        branch: created.branch || userData.branch || 'Main Branch',
        status: created.status || userData.status || 'Active',
        createdAt: created.created_at || new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      if (userData.role.toLowerCase() === 'doctor') {
        try {
          await createDoctorApi({
            name: userData.fullName.startsWith('Dr.') ? userData.fullName : `Dr. ${userData.fullName}`,
            email: userData.email,
            department: userData.department || 'General Medicine',
            specialization: 'General Physician',
          });
        } catch (e) { }
      }
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not create user. Please try again.');
      throw err;
    }
    addToast('success', 'User Created', `User ${userData.fullName} (${userData.employeeId}) created.`);
    logActivity('User Created', 'New HMS User Registered', `Created account for ${userData.fullName} with role ${userData.role}.`);
  };

  const updateUser = async (id: string, updated: Partial<HMSUser>) => {
    try {
      await updateUserApi(id, updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      addToast('success', 'User Profile Updated', 'User account updated successfully.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update user. Please try again.');
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    const u = users.find((item) => item.id === id);
    try {
      await deleteUserApi(id);
      setUsers((prev) => prev.filter((item) => item.id !== id));
      addToast('info', 'User Deleted', `Account ${u?.fullName || ''} deleted.`);
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete user. Please try again.');
      throw err;
    }
  };

  const toggleUserStatus = async (id: string) => {
    try {
      await toggleUserStatusApi(id);
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === id) {
            const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
            addToast('info', 'User Status Toggled', `${u.fullName} marked as ${newStatus}.`);
            return { ...u, status: newStatus };
          }
          return u;
        })
      );
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not change user status. Please try again.');
      throw err;
    }
  };

  const resetUserPassword = async (id: string, newPass: string) => {
    try {
      await resetUserPasswordApi(id, newPass);
      addToast('success', 'Password Reset', `Password reset successfully.`);
    } catch (err) {
      addToast('error', 'Reset Failed', 'Could not reset password. Please try again.');
      throw err;
    }
  };

  // Role Management
  const addRole = async (roleData: Omit<RoleItem, 'id' | 'roleCode' | 'isSystemDefault' | 'assignedUserCount'>): Promise<boolean> => {
    const trimmedName = roleData.roleName.trim();
    if (!trimmedName) {
      addToast('error', 'Validation Error', 'Role Name is required.');
      return false;
    }

    const isDuplicate = roles.some(
      (r) => r.roleName.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      addToast('error', 'Validation Error', `Role with name "${trimmedName}" already exists.`);
      return false;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newCode = trimmedName.toUpperCase().replace(/\s+/g, '_');
    try {
      const created = await createRoleApi({ ...roleData, roleName: trimmedName, roleCode: newCode });
      const newRole: RoleItem = {
        ...roleData,
        id: created.id,
        roleName: created.role_name || trimmedName,
        roleCode: created.role_code || newCode,
        description: created.description || roleData.description,
        isSystemDefault: created.is_system_default ?? false,
        assignedUserCount: created.assigned_user_count ?? 0,
        permissionsCount: created.permissions_count ?? roleData.permissionsCount ?? 0,
        status: created.status || roleData.status || 'Active',
        createdDate: todayStr,
        updatedDate: todayStr,
      };
      setRoles((prev) => [...prev, newRole]);
      addToast('success', 'Role Created', `Custom role "${trimmedName}" created successfully.`);
      logActivity('Role Updated', 'New Custom Role Added', `Created role ${trimmedName}.`);
      return true;
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not create role. Please try again.');
      return false;
    }
  };

  const updateRole = async (id: string, updated: Partial<RoleItem>): Promise<boolean> => {
    const existing = roles.find((r) => r.id === id);
    if (!existing) return false;

    if (updated.roleName) {
      const trimmedName = updated.roleName.trim();
      if (!trimmedName) {
        addToast('error', 'Validation Error', 'Role Name cannot be empty.');
        return false;
      }

      if (existing.isSystemDefault && trimmedName !== existing.roleName) {
        addToast('error', 'Action Restricted', 'Default System Role names cannot be changed.');
        return false;
      }

      const isDuplicate = roles.some(
        (r) => r.id !== id && r.roleName.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        addToast('error', 'Validation Error', `Role with name "${trimmedName}" already exists.`);
        return false;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await updateRoleApi(id, updated);
      setRoles((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              ...updated,
              roleName: existing.isSystemDefault ? existing.roleName : (updated.roleName?.trim() || r.roleName),
              updatedDate: todayStr,
            }
            : r
        )
      );
      addToast('success', 'Role Updated', `Role specifications updated successfully.`);
      return true;
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update role. Please try again.');
      return false;
    }
  };

  const toggleRoleStatus = async (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const r = roles.find((item) => item.id === id);
    if (!r) return;
    const nextStatus = r.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateRoleApi(id, { status: nextStatus });
      setRoles((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus, updatedDate: todayStr } : item))
      );
      addToast('info', 'Role Status Changed', `Role "${r.roleName}" is now ${nextStatus}.`);
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not change role status. Please try again.');
      throw err;
    }
  };

  const deleteRole = async (id: string) => {
    const r = roles.find((item) => item.id === id);
    if (!r) return;
    if (r.isSystemDefault) {
      addToast('error', 'Action Restricted', 'System default roles cannot be deleted.');
      return;
    }
    try {
      await deleteRoleApi(id);
      setRoles((prev) => prev.filter((item) => item.id !== id));
      addToast('info', 'Role Deleted', `Custom role "${r.roleName}" deleted.`);
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete role. Please try again.');
      throw err;
    }
  };

  const togglePermission = async (roleId: string, moduleName: string, action: PermissionAction) => {
    const currentModulePerms = permissionMatrix[roleId]?.[moduleName] || {
      View: false, Create: false, Edit: false, Update: false, Delete: false,
      Export: false, Print: false, Manage: false, Assign: false,
    };
    const nextValue = !currentModulePerms[action];
    try {
      await setPermissionApi(roleId, moduleName, action, nextValue);
      setPermissionMatrix((prev) => {
        const copy = { ...prev };
        if (!copy[roleId]) copy[roleId] = {};
        copy[roleId][moduleName] = { ...currentModulePerms, [action]: nextValue };
        return copy;
      });
      addToast('success', 'Permissions Saved', `Updated ${action} permission for ${moduleName}.`);
    } catch (err) {
      addToast('error', 'Save Failed', `Could not save the ${action} permission for ${moduleName}.`);
      throw err;
    }
  };

  // Department Management
  const addDepartment = async (deptData: Omit<DepartmentItem, 'id' | 'departmentCode'>) => {
    const newCode = `DEP-${deptData.departmentName.substring(0, 4).toUpperCase()}`;
    try {
      const created = await createDepartmentApi({ ...deptData, departmentCode: newCode });
      const newDept: DepartmentItem = {
        id: created.id,
        departmentName: created.name || deptData.departmentName,
        departmentCode: created.code || newCode,
        headOfDepartment: created.head_of_department || deptData.headOfDepartment || 'Not Assigned',
        email: created.email || deptData.email || '',
        phone: created.phone || deptData.phone || '',
        floorLocation: created.floor_location || deptData.floorLocation || '1st Floor',
        doctorCount: created.doctor_count ?? deptData.doctorCount ?? 0,
        bedCount: created.bed_count ?? deptData.bedCount ?? 0,
        status: created.status || deptData.status || 'Active',
      };
      setDepartments((prev) => [newDept, ...prev]);
      addToast('success', 'Department Created', `Department ${deptData.departmentName} (${newCode}) created.`);
      logActivity('Department Added', 'Department Created', `Added ${deptData.departmentName} department.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not create department. Please try again.');
      throw err;
    }
  };

  const updateDepartment = async (id: string, updated: Partial<DepartmentItem>) => {
    try {
      await updateDepartmentApi(id, updated);
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      addToast('success', 'Department Updated', 'Department records saved.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update department. Please try again.');
      throw err;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await deleteDepartmentApi(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      addToast('info', 'Department Deleted', 'Department removed.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete department. Please try again.');
      throw err;
    }
  };

  // Department Assignments
  const assignUserDepartment = async (assignment: Omit<DepartmentAssignment, 'id'>) => {
    try {
      const created = await createDepartmentAssignmentApi(assignment);
      setDepartmentAssignments((prev) => [{ ...assignment, id: created.id }, ...prev]);
      addToast('success', 'Department Assigned', `${assignment.employeeName} assigned to ${assignment.department}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save department assignment. Please try again.');
      throw err;
    }
  };

  const updateDepartmentAssignment = async (id: string, updated: Partial<DepartmentAssignment>) => {
    try {
      await updateDepartmentAssignmentApi(id, updated);
      setDepartmentAssignments((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      addToast('success', 'Assignment Updated', 'Employee assignment updated.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update assignment. Please try again.');
      throw err;
    }
  };

  const deleteDepartmentAssignment = async (id: string) => {
    try {
      await deleteDepartmentAssignmentApi(id);
      setDepartmentAssignments((prev) => prev.filter((item) => item.id !== id));
      addToast('info', 'Assignment Removed', 'Department mapping deleted.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete assignment. Please try again.');
      throw err;
    }
  };

  // Specializations
  const addSpecialization = async (specData: Omit<DoctorSpecialization, 'id' | 'code'>) => {
    const newCode = `SPC-${specData.specializationName.substring(0, 4).toUpperCase()}`;
    try {
      const created = await createSpecializationApi({ ...specData, code: newCode });
      const newSpec: DoctorSpecialization = {
        id: created.id,
        specializationName: created.specialization_name || specData.specializationName,
        code: created.code || newCode,
        category: created.category || specData.category || 'General',
        associatedDepartment: created.associated_department || created.associatedDepartment || specData.associatedDepartment || '',
        description: created.description || specData.description || '',
        doctorCount: created.doctor_count ?? created.doctorCount ?? specData.doctorCount ?? 0,
        status: created.status || 'Active',
      };
      setSpecializations((prev) => [newSpec, ...prev]);
      addToast('success', 'Specialization Added', `Specialization ${specData.specializationName} saved.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save specialization. Please try again.');
      throw err;
    }
  };

  const updateSpecialization = async (id: string, updated: Partial<DoctorSpecialization>) => {
    try {
      await updateSpecializationApi(id, updated);
      setSpecializations((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      addToast('success', 'Specialization Updated', 'Specialization updated successfully.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update specialization. Please try again.');
      throw err;
    }
  };

  const deleteSpecialization = async (id: string) => {
    try {
      await deleteSpecializationApi(id);
      setSpecializations((prev) => prev.filter((s) => s.id !== id));
      addToast('info', 'Specialization Removed', 'Specialization deleted.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete specialization. Please try again.');
      throw err;
    }
  };

  // Consultation Charges
  const addConsultationCharge = async (charge: Omit<ConsultationCharge, 'id'>) => {
    try {
      const created = await createConsultationChargeApi(charge);
      setConsultationCharges((prev) => [{ ...charge, id: created.id }, ...prev]);
      addToast('success', 'Fee Structure Created', `Fees configured for ${charge.doctorName}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save consultation charge. Please try again.');
      throw err;
    }
  };

  const updateConsultationCharge = async (id: string, updated: Partial<ConsultationCharge>) => {
    try {
      await updateConsultationChargeApi(id, updated);
      setConsultationCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      addToast('success', 'Fee Structure Updated', 'Consultation charges updated.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update consultation charge. Please try again.');
      throw err;
    }
  };

  const deleteConsultationCharge = async (id: string) => {
    try {
      await deleteConsultationChargeApi(id);
      setConsultationCharges((prev) => prev.filter((c) => c.id !== id));
      addToast('info', 'Fee Structure Deleted', 'Consultation charge record deleted.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete consultation charge. Please try again.');
      throw err;
    }
  };

  // Working Hours
  const addWorkingHours = async (wh: Omit<WorkingHours, 'id'>) => {
    try {
      const created = await createWorkingHoursApi(wh);
      setWorkingHours((prev) => [{ ...wh, id: created.id }, ...prev]);
      addToast('success', 'Working Schedule Added', `Schedule saved for ${wh.department}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not save working hours. Please try again.');
      throw err;
    }
  };

  const updateWorkingHours = async (id: string, updated: Partial<WorkingHours>) => {
    try {
      await updateWorkingHoursApi(id, updated);
      setWorkingHours((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      addToast('success', 'Working Schedule Updated', 'Schedule timing updated.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update working hours. Please try again.');
      throw err;
    }
  };

  const deleteWorkingHours = async (id: string) => {
    try {
      await deleteWorkingHoursApi(id);
      setWorkingHours((prev) => prev.filter((item) => item.id !== id));
      addToast('info', 'Schedule Removed', 'Working hours record removed.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete working hours. Please try again.');
      throw err;
    }
  };

  // Leave Management
  const addLeaveRequest = async (leave: Omit<LeaveRequest, 'id' | 'appliedDate'>) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const created = await createLeaveApi({ ...leave, appliedDate: today });
      setLeaveRequests((prev) => [{ ...leave, id: created.id, appliedDate: today }, ...prev]);
      addToast('success', 'Leave Applied', `Leave request logged for ${leave.employeeName}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not submit leave request. Please try again.');
      throw err;
    }
  };

  const updateLeaveStatus = async (id: string, approvalStatus: LeaveRequest['approvalStatus']) => {
    try {
      await updateLeaveApi(id, { approval_status: approvalStatus });
      setLeaveRequests((prev) => prev.map((l) => (l.id === id ? { ...l, approvalStatus } : l)));
      addToast('success', 'Leave Status Updated', `Leave request marked as ${approvalStatus}.`);
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update leave status. Please try again.');
      throw err;
    }
  };

  const deleteLeaveRequest = async (id: string) => {
    try {
      await deleteLeaveApi(id);
      setLeaveRequests((prev) => prev.filter((l) => l.id !== id));
      addToast('info', 'Leave Record Deleted', 'Leave entry deleted.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete leave record. Please try again.');
      throw err;
    }
  };

  // Shift Rotation
  const addShiftRotation = async (shift: Omit<ShiftRotation, 'id'>) => {
    try {
      const created = await createShiftApi(shift);
      setShiftRotations((prev) => [{ ...shift, id: created.id }, ...prev]);
      addToast('success', 'Shift Assigned', `Shift ${shift.assignedShift} assigned to ${shift.employeeName}.`);
    } catch (err) {
      addToast('error', 'Save Failed', 'Could not assign shift. Please try again.');
      throw err;
    }
  };

  const updateShiftRotation = async (id: string, updated: Partial<ShiftRotation>) => {
    try {
      await updateShiftApi(id, updated);
      setShiftRotations((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      addToast('success', 'Shift Updated', 'Shift rotation details saved.');
    } catch (err) {
      addToast('error', 'Update Failed', 'Could not update shift rotation. Please try again.');
      throw err;
    }
  };

  const deleteShiftRotation = async (id: string) => {
    try {
      await deleteShiftApi(id);
      setShiftRotations((prev) => prev.filter((s) => s.id !== id));
      addToast('info', 'Shift Record Removed', 'Shift rotation assignment deleted.');
    } catch (err) {
      addToast('error', 'Delete Failed', 'Could not delete shift rotation. Please try again.');
      throw err;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const totalBeds = hmsBeds?.length ?? 0;
  const occupiedBeds = hmsBeds?.filter((b: any) => b.status === 'Occupied').length ?? 0;
  const dynamicStats: SuperAdminDashboardStats = {
    totalHospitals: hospitalProfile.hospitalName ? 1 : 0,
    totalBranches: branches.length,
    totalDepartments: departments.length,
    totalDoctors: users.filter((u) => u.role === 'doctor').length,
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === 'Active').length,
    todaysLogins: loginHistory.filter((l) => l.loginTime && l.loginTime.includes(todayStr)).length,
    bedOccupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100 * 10) / 10 : 0,
  };

  return (
    <SuperAdminContext.Provider
      value={{
        hospitalProfile,
        updateHospitalProfile,
        branches,
        addBranch,
        updateBranch,
        deleteBranch,
        users,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        roles,
        addRole,
        updateRole,
        deleteRole,
        toggleRoleStatus,
        permissionMatrix,
        togglePermission,
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        departmentAssignments,
        assignUserDepartment,
        updateDepartmentAssignment,
        deleteDepartmentAssignment,
        specializations,
        addSpecialization,
        updateSpecialization,
        deleteSpecialization,
        consultationCharges,
        addConsultationCharge,
        updateConsultationCharge,
        deleteConsultationCharge,
        workingHours,
        addWorkingHours,
        updateWorkingHours,
        deleteWorkingHours,
        leaveRequests,
        addLeaveRequest,
        updateLeaveStatus,
        deleteLeaveRequest,
        shiftRotations,
        addShiftRotation,
        updateShiftRotation,
        deleteShiftRotation,
        loginHistory,
        activities,
        stats: dynamicStats,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
