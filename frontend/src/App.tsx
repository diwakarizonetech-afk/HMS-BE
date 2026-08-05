import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HMSProvider } from './context/HMSContext';
import { LabProvider } from './context/LabContext';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { PatientBookingPage } from './pages/patient/PatientBookingPage';
import { PatientAppointmentHistoryPage } from './pages/patient/PatientAppointmentHistoryPage';

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

// Doctor Module
import { DoctorDashboardLayout } from './pages/doctor/DoctorDashboardLayout';
import { DoctorOverview } from './pages/doctor/Dashboard/DoctorOverview';
import { ConsultationPage } from './pages/doctor/Consultation/ConsultationPage';
import { MedicalHistoryPage } from './pages/doctor/MedicalHistory/MedicalHistoryPage';
import { LeavePage } from './pages/doctor/Leave/LeavePage';
// Pharmacy Module
import { PharmacyDashboardLayout } from './pages/pharmacy/PharmacyDashboardLayout';
import { PharmacyOverview } from './pages/pharmacy/PharmacyOverview';
import { MedicineListPage } from './pages/pharmacy/medicine/MedicineListPage';
import { MedicineCategoriesPage } from './pages/pharmacy/medicine/MedicineCategoriesPage';
import { BatchManagementPage } from './pages/pharmacy/batch/BatchManagementPage';
import { ExpiryTrackingPage } from './pages/pharmacy/batch/ExpiryTrackingPage';
import { StockInventoryPage } from './pages/pharmacy/stock/StockInventoryPage';
import { PurchaseEntryPage } from './pages/pharmacy/purchase/PurchaseEntryPage';
import { PurchaseHistoryPage } from './pages/pharmacy/purchase/PurchaseHistoryPage';
import { PrescriptionDispensingPage } from './pages/pharmacy/prescription/PrescriptionDispensingPage';
import { DirectSalesPOSPage } from './pages/pharmacy/pos/DirectSalesPOSPage';
import { CustomerReturnsPage } from './pages/pharmacy/returns/CustomerReturnsPage';
import { SupplierReturnsPage } from './pages/pharmacy/returns/SupplierReturnsPage';
import { PharmacyReportsPage } from './pages/pharmacy/reports/PharmacyReportsPage';
import { PharmacyLeavePage } from './pages/pharmacy/PharmacyLeavePage';

// Lab Technician Module
import { LabDashboardLayout } from './pages/lab/LabDashboardLayout';
import { LabOverview } from './pages/lab/LabOverview';
import { TestMasterPage } from './pages/lab/TestMasterPage';
import { ResultEntryPage } from './pages/lab/ResultEntryPage';
import { ReportGenerationPage } from './pages/lab/ReportGenerationPage';
import { DoctorReviewPage } from './pages/lab/DoctorReviewPage';
import { LabReportsPage } from './pages/lab/LabReportsPage';
import { LabLeavePage } from './pages/lab/LabLeavePage';

// Other Role Dashboards
import { DoctorDashboardPage } from './pages/dashboards/DoctorDashboardPage';
import { NurseDashboardPage } from './pages/dashboards/NurseDashboardPage';
import { AdminDashboardPage } from './pages/dashboards/AdminDashboardPage';
import { PatientDashboardPage } from './pages/dashboards/PatientDashboardPage';

// Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <HMSProvider>
        <LabProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/patient/book-appointment" element={<PatientBookingPage />} />
              <Route path="/patient/appointment-history" element={<PatientAppointmentHistoryPage />} />

              {/* Protected Reception Routes */}
              <Route
                path="/reception"
                element={
                  <ProtectedRoute>
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
                <Route path="appointment/availability" element={<DoctorAvailabilityPage />} />
                <Route path="appointment/queue" element={<QueueManagementPage />} />
                <Route path="appointment/reschedule" element={<RescheduleAppointmentPage />} />
                <Route path="appointment/cancel" element={<CancelAppointmentPage />} />

                {/* IPD Management */}
                <Route path="ipd/admit" element={<AdmitPatientPage />} />
                <Route path="ipd/beds" element={<BedAllocationPage />} />
              </Route>

              {/* Protected Doctor Routes */}
              <Route
                path="/doctor"
                element={
                  <ProtectedRoute>
                    <DoctorDashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                <Route path="dashboard" element={<DoctorOverview />} />
                <Route path="consultation" element={<ConsultationPage />} />
                <Route path="ipd-consultation" element={<MedicalHistoryPage />} />
                <Route path="medical-history" element={<Navigate to="/doctor/ipd-consultation" replace />} />
                <Route path="leave" element={<LeavePage />} />
              </Route>

              {/* Protected Pharmacy Module Routes */}
              <Route
                path="/pharmacy"
                element={
                  <ProtectedRoute>
                    <PharmacyDashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/pharmacy/dashboard" replace />} />
                <Route path="dashboard" element={<PharmacyOverview />} />
                <Route path="medicine/list" element={<MedicineListPage />} />
                <Route path="medicine/categories" element={<MedicineCategoriesPage />} />
                <Route path="batch/management" element={<BatchManagementPage />} />
                <Route path="batch/expiry" element={<ExpiryTrackingPage />} />
                <Route path="stock/inventory" element={<StockInventoryPage />} />
                <Route path="purchase/entry" element={<PurchaseEntryPage />} />
                <Route path="purchase/history" element={<PurchaseHistoryPage />} />
                <Route path="prescription/list" element={<PrescriptionDispensingPage />} />
                <Route path="pos/direct-sales" element={<DirectSalesPOSPage />} />
                <Route path="returns/customer" element={<CustomerReturnsPage />} />
                <Route path="returns/supplier" element={<SupplierReturnsPage />} />
                <Route path="reports" element={<PharmacyReportsPage />} />
                <Route path="leave" element={<PharmacyLeavePage />} />
              </Route>

              {/* Protected Lab Technician Module Routes */}
              <Route
                path="/lab"
                element={
                  <ProtectedRoute>
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
              </Route>
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute>
                    <PatientDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch All Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Notification Toast Container */}
            <ToastContainer />
          </BrowserRouter>
        </LabProvider>
      </HMSProvider>
    </AuthProvider>
  );
}
