import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../context/HMSContext';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Appointment, AppointmentStatus } from '../../types/hms';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Printer,
  Download,
  Edit,
  XCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building2,
  QrCode,
  X,
  Phone,
  RefreshCw,
  Plus,
} from 'lucide-react';

export const PatientAppointmentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, rescheduleAppointment, cancelAppointment, addToast, departments, doctors } = useHMS();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // Modals state
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);

  // Reschedule Form State
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState('');

  // Filtered Appointments list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Query search matching Mobile, UHID, Apt ID, Doctor Name, Patient Name
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        apt.id.toLowerCase().includes(q) ||
        apt.patientUhid.toLowerCase().includes(q) ||
        apt.patientMobile.includes(q) ||
        apt.doctorName.toLowerCase().includes(q) ||
        apt.patientName.toLowerCase().includes(q);

      // Dept Filter
      const matchesDept = selectedDeptFilter === 'All' || apt.department === selectedDeptFilter;

      // Status Filter
      const matchesStatus = selectedStatusFilter === 'All' || apt.status === selectedStatusFilter;

      // Date Filter
      const matchesDate = !selectedDateFilter || apt.date === selectedDateFilter;

      return matchesSearch && matchesDept && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, selectedDeptFilter, selectedStatusFilter, selectedDateFilter]);

  // Submit Reschedule
  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppointment) return;
    if (!newDate) {
      addToast('error', 'Date Required', 'Please select a new appointment date.');
      return;
    }
    if (!newSlot) {
      addToast('error', 'Time Slot Required', 'Please select a new time slot.');
      return;
    }

    rescheduleAppointment(reschedulingAppointment.id, newDate, newSlot, rescheduleReason);
    setReschedulingAppointment(null);
    setNewDate('');
    setNewSlot('');
    setRescheduleReason('');
  };

  // Submit Cancel
  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingAppointment) return;
    if (!cancelReason.trim()) {
      addToast('error', 'Reason Required', 'Please enter a cancellation reason.');
      return;
    }

    cancelAppointment(cancellingAppointment.id, cancelReason);
    setCancellingAppointment(null);
    setCancelReason('');
  };

  // Helper status color badge
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Confirmed':
      case 'Booked':
      case 'Scheduled':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rescheduled':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'No Show':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Patient Portal
            </span>
            <h1 className="text-3xl font-extrabold mt-2">My Appointment History</h1>
            <p className="text-slate-300 text-xs mt-1">
              Search, view slip, reschedule or cancel your doctor bookings anytime.
            </p>
          </div>

          <button
            onClick={() => navigate('/patient/book-appointment')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Search & Filter Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Mobile Number, UHID, Appointment ID, or Doctor Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Department Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Department</label>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Confirmed">Confirmed / Booked</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter Date</label>
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Appointments Table / Cards View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Appointment Records ({filteredAppointments.length})
            </h3>
            {(searchQuery || selectedDeptFilter !== 'All' || selectedStatusFilter !== 'All' || selectedDateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDeptFilter('All');
                  setSelectedStatusFilter('All');
                  setSelectedDateFilter('');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="text-center py-16 p-6 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Appointments Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No appointment history matches your search or filters. Try searching with registered mobile number or UHID.
              </p>
              <button
                onClick={() => navigate('/patient/book-appointment')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md inline-flex items-center gap-2"
              >
                <span>Book Appointment Now</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Appointment ID</th>
                    <th className="py-3.5 px-4">Patient Info</th>
                    <th className="py-3.5 px-4">Doctor & Department</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Visit Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-bold text-blue-700">
                        {apt.id}
                        <span className="block text-[10px] text-slate-400 font-normal">{apt.patientUhid}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{apt.patientName}</span>
                        <span className="text-[11px] text-slate-500">{apt.patientMobile}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{apt.doctorName}</span>
                        <span className="text-[11px] text-blue-600 font-semibold">{apt.department}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 block">{apt.date}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> {apt.timeSlot}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                          {apt.visitType || 'First Visit'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wide inline-block ${getStatusBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingAppointment(apt)}
                          title="View Details & Slip"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer inline-flex items-center"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>

                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReschedulingAppointment(apt);
                                setNewDate(apt.date);
                                setNewSlot(apt.timeSlot);
                              }}
                              title="Reschedule Appointment"
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer inline-flex items-center"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancellingAppointment(apt)}
                              title="Cancel Appointment"
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer inline-flex items-center"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* VIEW DETAILS MODAL */}
      {viewingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingAppointment(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-md">
                Official Appointment Slip
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Appointment Details</h3>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <p className="text-slate-400 font-medium">APPOINTMENT ID</p>
                  <p className="text-base font-extrabold text-blue-700">{viewingAppointment.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-medium">STATUS</p>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(viewingAppointment.status)}`}>
                    {viewingAppointment.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400">Patient Name</p>
                  <p className="font-bold text-slate-800">{viewingAppointment.patientName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Mobile</p>
                  <p className="font-bold text-slate-800">{viewingAppointment.patientMobile}</p>
                </div>
                <div>
                  <p className="text-slate-400">Doctor</p>
                  <p className="font-bold text-slate-800">{viewingAppointment.doctorName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Department</p>
                  <p className="font-bold text-slate-800">{viewingAppointment.department}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date</p>
                  <p className="font-bold text-emerald-700">{viewingAppointment.date}</p>
                </div>
                <div>
                  <p className="text-slate-400">Time Slot</p>
                  <p className="font-bold text-emerald-700">{viewingAppointment.timeSlot}</p>
                </div>
              </div>

              {viewingAppointment.reason && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-400">Reason / Symptoms</p>
                  <p className="font-medium text-slate-700 mt-0.5">{viewingAppointment.reason}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-10 h-10 text-slate-700 p-1 bg-white border border-slate-300 rounded-lg" />
                  <span className="text-[10px] text-slate-500">Scan at Kiosk for Token</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                  Fee Paid: ₹{viewingAppointment.totalAmount || 500}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => addToast('info', 'Slip Downloaded', 'Appointment slip saved to your downloads.')}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReschedule} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setReschedulingAppointment(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded-md">
                Reschedule Booking
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Select New Schedule</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Appointment ID: <span className="font-bold text-slate-800">{reschedulingAppointment.id}</span>
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select New Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select New Time Slot *</label>
                <select
                  required
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Choose Time Slot</option>
                  <optgroup label="Morning (9 AM - 1 PM)">
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="12:30 PM">12:30 PM</option>
                    <option value="01:00 PM">01:00 PM</option>
                  </optgroup>
                  <optgroup label="Afternoon (2 PM - 5 PM)">
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </optgroup>
                  <optgroup label="Evening (6 PM - 9 PM)">
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="06:30 PM">06:30 PM</option>
                    <option value="07:00 PM">07:00 PM</option>
                    <option value="07:30 PM">07:30 PM</option>
                    <option value="08:00 PM">08:00 PM</option>
                    <option value="08:30 PM">08:30 PM</option>
                    <option value="09:00 PM">09:00 PM</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Work conflict, travel plan changed"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReschedulingAppointment(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Update Appointment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmCancel} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setCancellingAppointment(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-50 px-2.5 py-0.5 rounded-md">
                Cancel Booking
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Confirm Cancellation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Are you sure you want to cancel appointment <span className="font-bold text-slate-800">{cancellingAppointment.id}</span>?
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Cancellation Policy
                </p>
                <p className="text-[11px] mt-1">
                  Full refund of consultation fees will be processed to your source account within 2-3 business days.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Cancellation Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Please state why you are cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingAppointment(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
};
