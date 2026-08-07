import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getDefaultRouteForRole } from './context/AuthContext';
import { HMSProvider } from './context/HMSContext';
import { NurseProvider } from './context/NurseContext';
import { LabProvider } from './context/LabContext';
import { PharmacyProvider } from './context/PharmacyContext';
import { SuperAdminProvider } from './context/SuperAdminContext';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';

// Reception Module
import { ReceptionDashboardLayout } from './pages/reception/ReceptionDashboardLayout';
import { ReceptionOverview } from './pages/reception/ReceptionOverview';
import { RegisterPatientPage } from './pages/reception/patient/RegisterPatientPage';
import { SearchPatientPage } from './pages/reception/patient/SearchPatientPage';
import { UpdatePatientPage } from './pages/reception/patient/UpdatePatientPage';
import { EmergencyContactPage } from './pages/reception/patient/EmergencyContactPage';

import { BookAppointmentPage } from './pages/reception/appointment/BookAppointmentPage';
import { WalkInPage } from './pages/reception/appointment/WalkInPage';
import { DoctorAvailabilityPage } from './pages/reception/appointment/DoctorAvailabilityPage';
import { QueueManagementPage } from './pages/reception/appointment/QueueManagementPage';
import { RescheduleAppointmentPage } from './pages/reception/appointment/RescheduleAppointmentPage';
import { CancelAppointmentPage } from './pages/reception/appointment/CancelAppointmentPage';

import { AdmitPatientPage } from './pages/reception/ipd/AdmitPatientPage';
import { BedAllocationPage } from './pages/reception/ipd/BedAllocationPage';

// Store Module Components
import { StoreLayout } from './pages/store/StoreLayout';
import { StoreOverviewPage } from './pages/store/StoreOverviewPage';
import { ItemMasterPage } from './pages/store/ItemMasterPage';
import { VendorManagementPage } from './pages/store/VendorManagementPage';
import { PurchaseOrdersPage } from './pages/store/PurchaseOrdersPage';
import { GoodsReceiptPage } from './pages/store/GoodsReceiptPage';
import { StockInwardPage } from './pages/store/StockInwardPage';
import { StockOutwardPage } from './pages/store/StockOutwardPage';
import { StockTransferPage } from './pages/store/StockTransferPage';
import { StockAdjustmentPage } from './pages/store/StockAdjustmentPage';
import { ReorderManagementPage } from './pages/store/ReorderManagementPage';
import { BatchExpiryTrackingPage } from './pages/store/BatchExpiryTrackingPage';
import { InventoryReportsPage } from './pages/store/InventoryReportsPage';

// Nurse Module Components
import { NurseLayout } from './pages/nurse/NurseLayout';
import { NurseDashboard } from './pages/nurse/NurseDashboard';
import { RecordVitalsPage } from './pages/nurse/opd/RecordVitalsPage';
import { WardTransferPage } from './pages/nurse/ipd/WardTransferPage';
import { NursingNotesPage } from './pages/nurse/ipd/NursingNotesPage';
import { MedicationAdminPage } from './pages/nurse/ipd/MedicationAdminPage';

// Super Admin Module Components
import { SuperAdminLayout } from './pages/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { LoginHistoryPage } from './pages/superadmin/auth/LoginHistoryPage';
import { UserManagementPage } from './pages/superadmin/auth/UserManagementPage';
import { RoleManagementPage } from './pages/superadmin/auth/RoleManagementPage';
import { PermissionManagementPage } from './pages/superadmin/auth/PermissionManagementPage';
import { DepartmentAssignmentPage } from './pages/superadmin/auth/DepartmentAssignmentPage';

import { HospitalProfilePage } from './pages/superadmin/hospital/HospitalProfilePage';
import { BranchManagementPage } from './pages/superadmin/hospital/BranchManagementPage';
import { DepartmentManagementPage } from './pages/superadmin/hospital/DepartmentManagementPage';
import { DoctorSpecializationPage } from './pages/superadmin/hospital/DoctorSpecializationPage';
import { ConsultationChargesPage } from './pages/superadmin/hospital/ConsultationChargesPage';
import { WorkingHoursPage } from './pages/superadmin/hospital/WorkingHoursPage';
import { LeaveManagementPage } from './pages/superadmin/hospital/LeaveManagementPage';
import { ShiftRotationPage } from './pages/superadmin/hospital/ShiftRotationPage';
import { BedOccupancyDashboardPage } from './pages/superadmin/ipd/BedOccupancyDashboardPage';

// Common Components
import { StaffLeavePage } from './pages/common/StaffLeavePage';
import { StaffShiftRosterPage } from './pages/common/StaffShiftRosterPage';

// Doctor Module Components
import { DoctorDashboardLayout } from './pages/doctor/DoctorDashboardLayout';
import { DoctorOverview } from './pages/doctor/Dashboard/DoctorOverview';
import { ConsultationPage } from './pages/doctor/Consultation/ConsultationPage';
import { LeavePage } from './pages/doctor/Leave/LeavePage';
import { MedicalHistoryPage } from './pages/doctor/MedicalHistory/MedicalHistoryPage';

// Lab Module Components
import { LabDashboardLayout } from './pages/lab/LabDashboardLayout';
import { LabOverview } from './pages/lab/LabOverview';
import { TestMasterPage } from './pages/lab/TestMasterPage';
import { ResultEntryPage } from './pages/lab/ResultEntryPage';
import { ReportGenerationPage } from './pages/lab/ReportGenerationPage';
import { DoctorReviewPage } from './pages/lab/DoctorReviewPage';
import { LabReportsPage } from './pages/lab/LabReportsPage';
import { LabLeavePage } from './pages/lab/LabLeavePage';

// Pharmacy Module Components
import { PharmacyDashboardLayout } from './pages/pharmacy/PharmacyDashboardLayout';
import { PharmacyOverview } from './pages/pharmacy/PharmacyOverview';
import { BatchManagementPage } from './pages/pharmacy/batch/BatchManagementPage';
import { ExpiryTrackingPage } from './pages/pharmacy/batch/ExpiryTrackingPage';
import { MedicineListPage } from './pages/pharmacy/medicine/MedicineListPage';
import { MedicineCategoriesPage } from './pages/pharmacy/medicine/MedicineCategoriesPage';
import { DirectSalesPOSPage } from './pages/pharmacy/pos/DirectSalesPOSPage';
import { PrescriptionDispensingPage } from './pages/pharmacy/prescription/PrescriptionDispensingPage';
import { PurchaseEntryPage } from './pages/pharmacy/purchase/PurchaseEntryPage';
import { PurchaseHistoryPage } from './pages/pharmacy/purchase/PurchaseHistoryPage';
import { PharmacyReportsPage } from './pages/pharmacy/reports/PharmacyReportsPage';
import { CustomerReturnsPage } from './pages/pharmacy/returns/CustomerReturnsPage';
import { SupplierReturnsPage } from './pages/pharmacy/returns/SupplierReturnsPage';
import { StockInventoryPage } from './pages/pharmacy/stock/StockInventoryPage';
import { PharmacyLeavePage } from './pages/pharmacy/PharmacyLeavePage';

// Patient Module Components
import { PatientBookingPage } from './pages/patient/PatientBookingPage';
import { PatientAppointmentHistoryPage } from './pages/patient/PatientAppointmentHistoryPage';

// Route Guard Component with Role Access Control
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase().replace('userrole.', '');
    const isAllowed = allowedRoles.some((r) => r.toLowerCase().replace('userrole.', '') === userRole);
    if (!isAllowed) {
      const defaultPath = getDefaultRouteForRole(user.role);
      return <Navigate to={defaultPath} replace />;
    }
  }

  return <>{children}</>;
};

const CatchAllRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }
  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <HMSProvider>
        <NurseProvider>
          <LabProvider>
            <PharmacyProvider>
              <SuperAdminProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Patient Portal Routes */}
                    <Route path="/patient/book-appointment" element={<PatientBookingPage />} />
                    <Route path="/patient/history" element={<PatientAppointmentHistoryPage />} />
                    <Route path="/patient/dashboard" element={<Navigate to="/patient/history" replace />} />

                    {/* Protected Reception Routes */}
                    <Route
                      path="/reception"
                      element={
                        <ProtectedRoute allowedRoles={['reception', 'doctor', 'receptionist', 'admin', 'super_admin', 'superadmin']}>
                          <ReceptionDashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/reception/dashboard" replace />} />
                      <Route path="dashboard" element={<ReceptionOverview />} />

                      {/* Patient Management */}
                      <Route path="patient/register" element={<RegisterPatientPage />} />
                      <Route path="patient/search" element={<SearchPatientPage />} />
                      <Route path="patient/update" element={<UpdatePatientPage />} />
                      <Route path="patient/emergency" element={<EmergencyContactPage />} />

                      {/* Appointment Management */}
                      <Route path="appointment/book" element={<BookAppointmentPage />} />
                      <Route path="appointment/walkin" element={<WalkInPage />} />
                      <Route path="appointment/walk-in" element={<WalkInPage />} />
                      <Route path="appointment/availability" element={<DoctorAvailabilityPage />} />
                      <Route path="appointment/doctors" element={<DoctorAvailabilityPage />} />
                      <Route path="appointment/queue" element={<QueueManagementPage />} />
                      <Route path="appointment/reschedule" element={<RescheduleAppointmentPage />} />
                      <Route path="appointment/cancel" element={<CancelAppointmentPage />} />

                      {/* IPD Management */}
                      <Route path="ipd/admit" element={<AdmitPatientPage />} />
                      <Route path="ipd/beds" element={<BedAllocationPage />} />

                      {/* Staff Leave & Shift Roster */}
                      <Route path="leave" element={<StaffLeavePage portalRole="Receptionist" defaultEmpId="EMP-REC-001" defaultName="Reception Staff" defaultDept="Front Desk & OPD" />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="reception" />} />
                    </Route>

                    {/* Protected Doctor Routes */}
                    <Route
                      path="/doctor"
                      element={
                        <ProtectedRoute allowedRoles={['doctor', 'admin', 'super_admin', 'superadmin']}>
                          <DoctorDashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                      <Route path="dashboard" element={<DoctorOverview />} />
                      <Route path="consultation" element={<ConsultationPage />} />
                      <Route path="ipd-consultation" element={<MedicalHistoryPage />} />
                      <Route path="leave" element={<LeavePage />} />
                      <Route path="medical-history" element={<MedicalHistoryPage />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="doctor" />} />
                    </Route>

                    {/* Protected Lab Routes */}
                    <Route
                      path="/lab"
                      element={
                        <ProtectedRoute allowedRoles={['lab', 'lab_technician', 'lab technician', 'admin', 'super_admin', 'superadmin']}>
                          <LabDashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/lab/dashboard" replace />} />
                      <Route path="dashboard" element={<LabOverview />} />
                      <Route path="test-master" element={<TestMasterPage />} />
                      <Route path="result-entry" element={<ResultEntryPage />} />
                      <Route path="report-generation" element={<ReportGenerationPage />} />
                      <Route path="doctor-review" element={<DoctorReviewPage />} />
                      <Route path="reports" element={<LabReportsPage />} />
                      <Route path="leave" element={<LabLeavePage />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="lab" />} />
                    </Route>

                    {/* Protected Pharmacy Routes */}
                    <Route
                      path="/pharmacy"
                      element={
                        <ProtectedRoute allowedRoles={['pharmacy', 'pharmacist', 'admin', 'super_admin', 'superadmin']}>
                          <PharmacyDashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/pharmacy/dashboard" replace />} />
                      <Route path="dashboard" element={<PharmacyOverview />} />
                      <Route path="pos" element={<DirectSalesPOSPage />} />
                      <Route path="pos/direct-sales" element={<DirectSalesPOSPage />} />
                      <Route path="prescription" element={<PrescriptionDispensingPage />} />
                      <Route path="prescription/list" element={<PrescriptionDispensingPage />} />
                      <Route path="medicine/list" element={<MedicineListPage />} />
                      <Route path="medicine/categories" element={<MedicineCategoriesPage />} />
                      <Route path="batch/master" element={<BatchManagementPage />} />
                      <Route path="batch/management" element={<BatchManagementPage />} />
                      <Route path="batch/expiry" element={<ExpiryTrackingPage />} />
                      <Route path="stock" element={<StockInventoryPage />} />
                      <Route path="stock/inventory" element={<StockInventoryPage />} />
                      <Route path="purchase/entry" element={<PurchaseEntryPage />} />
                      <Route path="purchase/history" element={<PurchaseHistoryPage />} />
                      <Route path="returns/customer" element={<CustomerReturnsPage />} />
                      <Route path="returns/supplier" element={<SupplierReturnsPage />} />
                      <Route path="reports" element={<PharmacyReportsPage />} />
                      <Route path="leave" element={<PharmacyLeavePage />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="pharmacy" />} />
                    </Route>

                    {/* Protected Store / Purchase Officer Routes */}
                    <Route
                      path="/store"
                      element={
                        <ProtectedRoute allowedRoles={['store', 'store_manager', 'store manager', 'pharmacy', 'admin', 'super_admin', 'superadmin']}>
                          <StoreLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/store/dashboard" replace />} />
                      <Route path="dashboard" element={<StoreOverviewPage />} />
                      <Route path="item-master" element={<ItemMasterPage />} />
                      <Route path="vendors" element={<VendorManagementPage />} />
                      <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                      <Route path="grn" element={<GoodsReceiptPage />} />
                      <Route path="stock-inward" element={<StockInwardPage />} />
                      <Route path="stock-outward" element={<StockOutwardPage />} />
                      <Route path="stock-transfer" element={<StockTransferPage />} />
                      <Route path="stock-adjustment" element={<StockAdjustmentPage />} />
                      <Route path="reorder-management" element={<ReorderManagementPage />} />
                      <Route path="batch-expiry" element={<BatchExpiryTrackingPage />} />
                      <Route path="reports" element={<InventoryReportsPage />} />
                      <Route path="leave" element={<StaffLeavePage portalRole="Store Manager" defaultEmpId="EMP-STR-002" defaultName="Suresh Kumar" defaultDept="Inventory & Store" />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="store" />} />
                    </Route>

                    {/* Protected Nurse Module Routes */}
                    <Route
                      path="/nurse"
                      element={
                        <ProtectedRoute allowedRoles={['nurse', 'admin', 'super_admin', 'superadmin']}>
                          <NurseLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/nurse/dashboard" replace />} />
                      <Route path="dashboard" element={<NurseDashboard />} />
                      <Route path="opd/vitals" element={<RecordVitalsPage />} />
                      <Route path="ipd/ward-transfer" element={<WardTransferPage />} />
                      <Route path="ipd/nursing-notes" element={<NursingNotesPage />} />
                      <Route path="ipd/medication-administration" element={<MedicationAdminPage />} />
                      <Route path="leave" element={<StaffLeavePage portalRole="Nurse" defaultEmpId="EMP-NUR-005" defaultName="Nurse Anjali Rao" defaultDept="ICU & Critical Care" />} />
                      <Route path="shift-roster" element={<StaffShiftRosterPage portalRole="nurse" />} />
                    </Route>

                    {/* Protected Super Admin Portal Routes */}
                    <Route
                      path="/super-admin"
                      element={
                        <ProtectedRoute allowedRoles={['super_admin', 'superadmin', 'admin']}>
                          <SuperAdminLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
                      <Route path="dashboard" element={<SuperAdminDashboard />} />

                      {/* Authentication & User Management */}
                      <Route path="auth/login-history" element={<LoginHistoryPage />} />
                      <Route path="auth/users" element={<UserManagementPage />} />
                      <Route path="auth/roles" element={<RoleManagementPage />} />
                      <Route path="auth/permissions" element={<PermissionManagementPage />} />
                      <Route path="auth/department-assignment" element={<DepartmentAssignmentPage />} />

                      {/* Hospital Setup */}
                      <Route path="hospital/profile" element={<HospitalProfilePage />} />
                      <Route path="hospital/branches" element={<BranchManagementPage />} />
                      <Route path="hospital/departments" element={<DepartmentManagementPage />} />
                      <Route path="hospital/specializations" element={<DoctorSpecializationPage />} />
                      <Route path="hospital/consultation-charges" element={<ConsultationChargesPage />} />
                      <Route path="hospital/working-hours" element={<WorkingHoursPage />} />
                      <Route path="hospital/leave-management" element={<LeaveManagementPage />} />
                      <Route path="hospital/shift-rotation" element={<ShiftRotationPage />} />

                      {/* IPD Monitoring */}
                      <Route path="ipd/bed-occupancy" element={<BedOccupancyDashboardPage />} />
                    </Route>

                    {/* Catch All Redirect */}
                    <Route path="*" element={<CatchAllRoute />} />
                  </Routes>

                  {/* Global Notification Toast Container */}
                  <ToastContainer />
                </BrowserRouter>
              </SuperAdminProvider>
            </PharmacyProvider>
          </LabProvider>
        </NurseProvider>
      </HMSProvider>
    </AuthProvider>
  );
}
