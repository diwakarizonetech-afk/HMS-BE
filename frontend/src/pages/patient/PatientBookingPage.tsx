import React, { useState, useMemo } from 'react';
import { useHMS } from '../../context/HMSContext';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';

import { Doctor, Appointment } from '../../types/hms';
import {
  User,
  Calendar,
  ShieldCheck,
  Search,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
  Bone,
  Brain,
  Baby,
  Sparkles,
  Ear,
  Heart,
  Activity,
  Eye,
  Wind,
  Smile,
  Clock,
  Award,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  FileText,
  Printer,
  Download,
  QrCode,
  Check,
  X,
  Building2,
  PhoneCall,
} from 'lucide-react';

// Icon mapping helper for departments
const getDeptIcon = (iconName: string) => {
  switch (iconName) {
    case 'HeartPulse': return <HeartPulse className="w-5 h-5 text-red-500" />;
    case 'Brain': return <Brain className="w-5 h-5 text-indigo-500" />;
    case 'Bone': return <Bone className="w-5 h-5 text-amber-600" />;
    case 'Baby': return <Baby className="w-5 h-5 text-pink-500" />;
    case 'Stethoscope': return <Stethoscope className="w-5 h-5 text-blue-600" />;
    case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-500" />;
    case 'Ear': return <Ear className="w-5 h-5 text-amber-500" />;
    case 'Heart': return <Heart className="w-5 h-5 text-rose-500" />;
    case 'Eye': return <Eye className="w-5 h-5 text-teal-500" />;
    case 'Wind': return <Wind className="w-5 h-5 text-cyan-500" />;
    case 'Smile': return <Smile className="w-5 h-5 text-emerald-500" />;
    default: return <Activity className="w-5 h-5 text-blue-500" />;
  }
};

export const PatientBookingPage: React.FC = () => {
  const {
    doctors,
    departments,
    bookAppointment,
    patients,
    getPatientByUhid,
    addToast,
    appointments,
    cancelAppointment,
    rescheduleAppointment
  } = useHMS();

  // Streamlined 4-step flow (Step 5 = Success)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Patient Details
  const [patientType, setPatientType] = useState<'New Patient' | 'Existing Patient'>('New Patient');
  const [searchMobile, setSearchMobile] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [existingUhid, setExistingUhid] = useState('');

  // Modals & Navigation for Managing Existing Patient Appointments
  const [cancelingApt, setCancelingApt] = useState<Appointment | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  const [isReschedulingMode, setIsReschedulingMode] = useState<boolean>(false);
  const [reschedulingAptId, setReschedulingAptId] = useState<string | null>(null);
  const [reschedulingAptObj, setReschedulingAptObj] = useState<Appointment | null>(null);

  // Toggle right panel view mode for Existing Patient: 'appointments' vs 'form'
  const [existingPatientRightView, setExistingPatientRightView] = useState<'appointments' | 'form'>('appointments');
  const [selectedPatientLoaded, setSelectedPatientLoaded] = useState<boolean>(false);
  const [selectedAptIndex, setSelectedAptIndex] = useState<number>(0);

  const [sampleAptsList, setSampleAptsList] = useState<Appointment[]>([]);

  // Step 2: Department + Doctor Selection (combined)
  const [selectedDept, setSelectedDept] = useState<string>('General Medicine');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [viewingDoctorProfile, setViewingDoctorProfile] = useState<Doctor | null>(null);

  // Step 3: Date + Time Slot (combined)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Step 4: Visit Details (reason, symptoms — lightweight)
  const [visitType, setVisitType] = useState<'First Visit' | 'Follow Up'>('First Visit');
  const [consultationType, setConsultationType] = useState<'Hospital Visit' | 'Video Consultation' | 'Phone Consultation'>('Hospital Visit');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // Success: Confirmed Appointment
  const [confirmedApt, setConfirmedApt] = useState<Appointment | null>(null);

  // Auto-calculate age details from DOB
  const ageDisplay = useMemo(() => {
    if (!dob) return 'Calculated from DOB';
    const birthDate = new Date(dob);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate > today) return 'Calculated from DOB';

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years >= 1) {
      return `${years} Year${years > 1 ? 's' : ''}`;
    } else if (months >= 1) {
      const monthText = `${months} Month${months > 1 ? 's' : ''}`;
      const dayText = days > 0 ? ` ${days} Day${days > 1 ? 's' : ''}` : '';
      return `${monthText}${dayText}`;
    } else {
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      const totalDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      return `${totalDays} Day${totalDays > 1 ? 's' : ''}`;
    }
  }, [dob]);

  // Sample pre-existing patients for instant testing
  const samplePatients = useMemo(() => [
    {
      id: 'p-101',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      mobile: '9876543210',
      email: 'ramesh.kumar@example.com',
      dob: '1992-05-14',
      gender: 'Male' as const,
      bloodGroup: 'O+',
      address: '12, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      uhid: 'UHID-2026-9876',
    },
    {
      id: 'p-102',
      firstName: 'Priya',
      lastName: 'Sundaram',
      mobile: '9876543211',
      email: 'priya.sundaram@example.com',
      dob: '1995-08-20',
      gender: 'Female' as const,
      bloodGroup: 'A+',
      address: '45, MG Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
      uhid: 'UHID-2026-9877',
    },
    {
      id: 'p-103',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      mobile: '9876543212',
      email: 'rajesh.sharma@example.com',
      dob: '1985-06-15',
      gender: 'Male' as const,
      bloodGroup: 'B+',
      address: '78, Cross Street',
      city: 'Madurai',
      state: 'Tamil Nadu',
      pincode: '625001',
      uhid: 'UHID-2026-9875',
    },
  ], []);

  // Live matching patients based on search input (strictly deduplicated so same patient appears only once)
  const matchingPatients = useMemo(() => {
    if (!searchMobile.trim() || searchMobile.trim().length <
     3) return [];
    const query = searchMobile.trim().replace(/\D/g, '');
    const all = [...patients, ...samplePatients];

    // Deduplicate by 10-digit mobile OR full name
    const unique: typeof all = [];
    all.forEach(p => {
      const pMob = p.mobile ? p.mobile.replace(/\D/g, '').slice(-10) : '';
      const pName = p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim().toLowerCase() : (p.name || '').toLowerCase();
      const exists = unique.some(u => {
        const uMob = u.mobile ? u.mobile.replace(/\D/g, '').slice(-10) : '';
        const uName = u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim().toLowerCase() : (u.name || '').toLowerCase();
        return (pMob && uMob && pMob === uMob) || (pName && uName && pName === uName);
      });
      if (!exists) {
        unique.push(p);
      }
    });

    return unique.filter(p => {
      const mob = p.mobile ? p.mobile.replace(/\D/g, '') : '';
      return mob.includes(query);
    });
  }, [searchMobile, patients, samplePatients]);

  // Select patient and auto-fill details (hides right form to show patient's exact appointment slip card)
  const selectPatientRecord = (p: any) => {
    const pName = p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (p.name || '');
    setFullName(pName);
    setMobile(p.mobile);
    setEmail(p.email || '');
    setDob(p.dob || '');
    setGender(p.gender || 'Male');
    setBloodGroup(p.bloodGroup || 'O+');
    setAddress(p.address || '');
    setCity(p.city || '');
    setState(p.state || '');
    setPincode(p.pincode || '');
    setExistingUhid(p.uhid || '');
    setSelectedPatientLoaded(true);
    setSelectedAptIndex(0);
    setExistingPatientRightView('appointments');
    addToast('success', 'Patient Selected', `Loaded record for ${pName}. Appointment slip displayed on right.`);
  };

  // Compute active & previous appointments STRICTLY for the selected patient
  const patientAppointments = useMemo(() => {
    if (!mobile.trim()) return [];
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanFullName = fullName.trim().toLowerCase();

    if (cleanMobile.length < 5 && cleanFullName.length < 2) return [];

    const isStrictMatch = (aptMobile: string, aptName: string) => {
      const aMobileDigits = aptMobile.replace(/\D/g, '').slice(-10);
      const aName = aptName.trim().toLowerCase();

      // Primary check: exact 10-digit mobile match
      if (cleanMobile.length >= 10 && aMobileDigits === cleanMobile) {
        // If full name is also present, ensure it matches or overlaps to prevent cross-patient bleed
        if (cleanFullName && aName) {
          return aName.includes(cleanFullName) || cleanFullName.includes(aName);
        }
        return true;
      }

      // Secondary check: exact full name match
      if (cleanFullName.length > 2 && aName === cleanFullName) {
        return true;
      }
      return false;
    };

    const fromContext = appointments.filter(a => isStrictMatch(a.patientMobile, a.patientName));
    const fromSample = sampleAptsList.filter(a => isStrictMatch(a.patientMobile, a.patientName));

    const combined = [...fromContext, ...fromSample];
    const deduplicated = combined.filter((apt, index, self) => index === self.findIndex(t => t.id === apt.id));

    // Sort descending by date (LATEST appointment first)
    return deduplicated.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [mobile, fullName, appointments, sampleAptsList]);

  // Confirm Cancellation Handler with direct text input
  const handleConfirmCancel = () => {
    if (!cancelingApt) return;
    if (!cancelReasonInput.trim()) {
      addToast('warning', 'Reason Required', 'Please enter a cancellation reason.');
      return;
    }

    const finalReason = cancelReasonInput.trim();
    cancelAppointment(cancelingApt.id, finalReason);
    setSampleAptsList(prev => prev.map(a => a.id === cancelingApt.id ? { ...a, status: 'Cancelled', cancellationReason: finalReason } : a));

    addToast('info', 'Appointment Cancelled', `Appointment #${cancelingApt.id} marked as Cancelled.`);
    setCancelingApt(null);
    setCancelReasonInput('');
  };

  // Reschedule Navigation Handler: Jump directly to Step 3 (Date & Time Page)
  const handleStartReschedule = (apt: Appointment) => {
    setIsReschedulingMode(true);
    setReschedulingAptId(apt.id);
    setReschedulingAptObj(apt);

    // Set department & doctor matching the appointment
    if (apt.department) {
      setSelectedDept(apt.department);
    }
    const matchedDoc = doctors.find(d => d.id === apt.doctorId || d.name === apt.doctorName) || {
      id: apt.doctorId || 'doc-1',
      name: apt.doctorName || 'Dr. Specialist',
      department: apt.department || 'General Medicine',
      specialization: `Senior Specialist`,
      qualification: 'MBBS, MD',
      experienceYears: 12,
      languages: ['English'],
      roomNo: '101',
      consultationFee: 0,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      nextAvailable: 'Today',
      rating: 4.9,
      image: '',
    };
    setSelectedDoctor(matchedDoc);

    addToast('info', 'Reschedule Mode', `Select new Date & Time slot for appointment #${apt.id}`);
    setCurrentStep(3); // Direct navigation to Date & Time page!
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Existing Patient Lookup button trigger
  const handleSearchPatient = () => {
    if (!searchMobile.trim() || searchMobile.length < 3) {
      addToast('warning', 'Mobile Number Required', 'Please enter at least 3 digits of a registered mobile number.');
      return;
    }
    if (matchingPatients.length > 0) {
      selectPatientRecord(matchingPatients[0]);
    } else {
      addToast('error', 'Patient Not Found', 'No existing record matching this Mobile Number.');
    }
  };

  // Validation before step change
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        addToast('error', 'Validation Error', 'Please enter a valid Full Name.');
        return false;
      }
      if (!mobile.trim() || mobile.length < 10) {
        addToast('error', 'Validation Error', 'A valid 10-digit mobile number is required.');
        return false;
      }
      if (!dob) {
        addToast('error', 'Validation Error', 'Date of Birth is required.');
        return false;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (dob > todayStr) {
        addToast('error', 'Validation Error', 'Date of Birth cannot be a future date.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!selectedDept) {
        addToast('error', 'Validation Error', 'Please select a department.');
        return false;
      }
      if (!selectedDoctor) {
        addToast('error', 'Validation Error', 'Please select a doctor to proceed.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!selectedDate) {
        addToast('error', 'Validation Error', 'Please select an appointment date.');
        return false;
      }
      if (!selectedSlot) {
        addToast('error', 'Validation Error', 'Please select a time slot.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (isReschedulingMode) {
      // Exit rescheduling mode completely and return directly to Step 1 Appointment Slip view
      setIsReschedulingMode(false);
      setReschedulingAptId(null);
      setReschedulingAptObj(null);
      setCurrentStep(1);
      addToast('info', 'Reschedule Cancelled', 'Returned to appointment slip view.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Confirmation Submit (Handles both New Booking & Reschedule confirmation)
  const handleFinalBooking = () => {
    if (!selectedDoctor) return;

    if (isReschedulingMode && reschedulingAptId) {
      // Complete Reschedule Action
      rescheduleAppointment(reschedulingAptId, selectedDate, selectedSlot, reason || 'Rescheduled by patient');

      const updatedObj: Appointment = reschedulingAptObj ? {
        ...reschedulingAptObj,
        date: selectedDate,
        timeSlot: selectedSlot,
        department: selectedDept,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        status: 'Rescheduled',
      } : {
        id: reschedulingAptId,
        patientUhid: existingUhid || 'UHID-2026-1001',
        patientName: fullName,
        patientMobile: mobile,
        department: selectedDept,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        date: selectedDate,
        timeSlot: selectedSlot,
        reason: reason || 'Rescheduled',
        status: 'Rescheduled',
        createdDate: new Date().toISOString().split('T')[0],
      };

      setSampleAptsList(prev => prev.map(a => a.id === reschedulingAptId ? updatedObj : a));
      setConfirmedApt(updatedObj);
      setIsReschedulingMode(false);
      setReschedulingAptId(null);
      setReschedulingAptObj(null);

      addToast('success', 'Reschedule Confirmed', `Appointment rescheduled to ${selectedDate} at ${selectedSlot}`);
      setCurrentStep(5); // Show Final Success Appointment Slip Screen!
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Normal New Booking
    const created = bookAppointment({
      patientUhid: existingUhid || `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: fullName,
      patientMobile: mobile,
      department: selectedDept,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      date: selectedDate,
      timeSlot: selectedSlot,
      reason: reason || 'General Medical Consultation',
      email,
      dob,
      age: 0,
      gender,
      bloodGroup,
      address: `${address}, ${city}, ${state} - ${pincode}`.replace(/^,\s*|,\s*-\s*$/g, '').trim() || 'Not Provided',
      city,
      state,
      pincode,
      emergencyContactName: '',
      emergencyRelationship: '',
      emergencyPhone: '',
      patientType,
      visitType,
      consultationType,
      symptoms,
      reports: [],
      insurance: false,
      insuranceProvider: '',
      policyNumber: '',
      consultationFee: 0,
      bookingFee: 0,
      gst: 0,
      totalAmount: 0,
      paymentStatus: 'Pending',
    });

    setConfirmedApt(created);
    setCurrentStep(5); // Success Page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Static fallback doctors — always available for every department
  const staticDoctors: Doctor[] = useMemo(() => [
    {
      id: 'static-doc-1',
      name: 'Dr. Priya Sharma',
      department: selectedDept,
      specialization: `Senior ${selectedDept} Specialist`,
      qualification: 'MBBS, MD',
      experienceYears: 15,
      languages: ['English', 'Hindi', 'Tamil'],
      roomNo: '201',
      consultationFee: 0,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
      status: 'Available' as const,
      email: 'priya.sharma@aegiscare.com',
      rating: 4.8,
      photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
      biography: 'Highly experienced specialist with 15+ years of clinical excellence and patient-centered care.',
      education: ['MBBS - AIIMS Delhi', 'MD - CMC Vellore'],
      awards: ['Best Doctor Award 2024', 'Healthcare Excellence Award'],
      clinicTimings: 'Mon - Sat: 09:00 AM - 05:00 PM',
    },
    {
      id: 'static-doc-2',
      name: 'Dr. Rajesh Kumar',
      department: selectedDept,
      specialization: `${selectedDept} Consultant`,
      qualification: 'MBBS, DNB',
      experienceYears: 10,
      languages: ['English', 'Tamil'],
      roomNo: '305',
      consultationFee: 0,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slots: ['10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'],
      status: 'Available' as const,
      email: 'rajesh.kumar@aegiscare.com',
      rating: 4.6,
      photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300',
      biography: 'Dedicated consultant known for comprehensive diagnosis and personalized treatment plans.',
      education: ['MBBS - Madras Medical College', 'DNB - Apollo Hospitals'],
      awards: ['Patient Choice Award 2023'],
      clinicTimings: 'Mon - Fri: 10:00 AM - 06:00 PM',
    },
    {
      id: 'static-doc-3',
      name: 'Dr. Meena Sundaram',
      department: selectedDept,
      specialization: `${selectedDept} Expert`,
      qualification: 'MBBS, MS',
      experienceYears: 8,
      languages: ['English', 'Tamil', 'Telugu'],
      roomNo: '102',
      consultationFee: 0,
      availableDays: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      slots: ['09:30 AM', '11:00 AM', '02:00 PM', '05:00 PM'],
      status: 'Available' as const,
      email: 'meena.sundaram@aegiscare.com',
      rating: 4.9,
      photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964f369?w=300',
      biography: 'Compassionate specialist with modern treatment approaches and a focus on holistic patient well-being.',
      education: ['MBBS - JIPMER', 'MS - Sri Ramachandra University'],
      awards: ['Young Achiever in Medicine 2022', 'Research Excellence Award'],
      clinicTimings: 'Mon, Wed - Sat: 09:00 AM - 05:30 PM',
    },
  ], [selectedDept]);

  // Filtered doctors: use context doctors if available, otherwise fall back to static
  const departmentDoctors = useMemo(() => {
    const contextDoctors = doctors.filter(d => d.department.toLowerCase() === selectedDept.toLowerCase() || selectedDept === 'All');
    return contextDoctors.length > 0 ? contextDoctors : staticDoctors;
  }, [doctors, selectedDept, staticDoctors]);

  // Calendar dates generation (next 14 days)
  const availableCalendarDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const isSunday = d.getDay() === 0;

      // Doctor availability check
      const docAvailable = selectedDoctor
        ? selectedDoctor.availableDays.includes(d.toLocaleDateString('en-US', { weekday: 'long' }))
        : true;

      dates.push({
        isoStr,
        dayName,
        dayNum,
        monthName,
        isToday: i === 0,
        isDisabled: isSunday || !docAvailable,
        reason: isSunday ? 'Sunday' : !docAvailable ? 'Leave' : '',
      });
    }
    return dates;
  }, [selectedDoctor]);

  // Time Slots categorized
  const timeSlotCategories = [
    { title: 'Morning', slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'] },
    { title: 'Afternoon', slots: ['01:00 PM', '01:30 PM', '02:00 PM', '03:00 PM'] },
    { title: 'Evening', slots: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'] },
  ];

  // Helper slot status (Booked / Almost Full / Available)
  const getSlotStatus = (slot: string) => {
    if (slot === '10:00 AM' || slot === '02:00 PM') return 'Booked';
    if (slot === '11:00 AM' || slot === '05:30 PM') return 'Almost Full';
    return 'Available';
  };

  // Step definitions for progress bar
  const stepDefs = [
    { step: 1, title: 'Patient Info' },
    { step: 2, title: 'Department & Doctor' },
    { step: 3, title: 'Date & Time' },
    { step: 4, title: 'Review & Confirm' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      <Navbar />

      {/* Main Banner Header - Expanded Height */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-blue-800">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-xs font-semibold shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AegisCare OPD Online Booking Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Book Doctor Appointment
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm">
              Instant appointment registration with specialist doctors. No online payment required.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs shrink-0">
            <PhoneCall className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="font-bold text-white whitespace-nowrap">Toll-Free Helpline</p>
              <p className="text-slate-300">1800-420-9900</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Row - Perfectly aligned under h-20 Navbar */}
      {currentStep <= 4 && (
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-20 z-30 shadow-sm py-3.5 transition-all">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              {stepDefs.map((item, idx) => {
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;
                // Disable clicking back to Step 1 & Step 2 during rescheduling mode
                const canClick = isPassed && !isReschedulingMode;

                return (
                  <div key={item.step} className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => canClick && setCurrentStep(item.step)}
                      disabled={!canClick}
                      className={`flex items-center gap-2.5 text-xs font-bold px-4 py-2 rounded-full transition-all w-full justify-center ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600/30'
                        : canClick
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white text-blue-600 font-extrabold' : isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {isPassed ? <Check className="w-3 h-3" /> : item.step}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </button>
                    {idx < stepDefs.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-8">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: PATIENT INFORMATION (Ultra Wide 2-Column Grid)     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="w-full space-y-4 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Patient Information</h2>
                <p className="text-xs text-slate-500">Fill in patient details to proceed.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 1 of 4
              </span>
            </div>

            {/* Horizontal Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* Left Side: Patient Category Selection (4 cols) */}
              <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Patient Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPatientType('New Patient')}
                    className={`p-5 rounded-xl border-2 font-bold text-xs text-center transition-all cursor-pointer ${patientType === 'New Patient'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-1.5 text-blue-600" />
                    New Patient
                  </button>

                  <button
                    type="button"
                    onClick={() => setPatientType('Existing Patient')}
                    className={`p-5 rounded-xl border-2 font-bold text-xs text-center transition-all cursor-pointer ${patientType === 'Existing Patient'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <ShieldCheck className="w-6 h-6 mx-auto mb-1.5 text-indigo-600" />
                    Existing Patient
                  </button>
                </div>

                {/* If Existing Patient: Mobile Search */}
                {patientType === 'Existing Patient' && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-indigo-900 block">
                      Enter Registered Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Try typing 9876543210..."
                        value={searchMobile}
                        onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="flex-1 px-3.5 py-2.5 rounded-lg border border-indigo-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleSearchPatient}
                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                      </button>
                    </div>

                    {/* Live Matching Patient Result Card */}
                    {matchingPatients.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-indigo-200/60 animate-fadeIn">
                        <p className="text-[11px] font-bold text-indigo-950 flex items-center justify-between">
                          <span>Found Registered Record</span>
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">Click to Auto-fill</span>
                        </p>
                        <div className="space-y-2">
                          {matchingPatients.map((p) => {
                            const pName = p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (p.name || '');
                            return (
                              <div
                                key={p.id || p.mobile}
                                onClick={() => selectPatientRecord(p)}
                                className="p-3 bg-white hover:bg-blue-50/90 rounded-xl border border-indigo-200 hover:border-blue-500 transition-all cursor-pointer shadow-sm group relative"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>{pName}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-600 font-medium">
                                      +91 {p.mobile} • {p.gender} • DOB: {p.dob}
                                    </p>
                                    {p.email && (
                                      <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 group-hover:bg-blue-700 text-white text-[10px] font-bold shadow-xs cursor-pointer shrink-0"
                                  >
                                    Select & Fill
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: Replaces Form with Exact Appointment Slip Card for Selected Existing Patient */}
              <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                {patientType === 'Existing Patient' && selectedPatientLoaded && existingPatientRightView === 'appointments' ? (
                  /* Exact Appointment Slip Card View */
                  <div className="space-y-3.5 animate-fadeIn text-center relative">
                    {/* Top Confirmed Icon */}
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 inline-block">
                        {patientAppointments[selectedAptIndex]?.status === 'Cancelled' ? 'APPOINTMENT CANCELLED' : 'APPOINTMENT CONFIRMED'}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                        {patientAppointments[selectedAptIndex]?.status === 'Cancelled' ? 'Booking Cancelled' : 'Booking Successful!'}
                      </h2>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Confirmation sent to <span className="font-bold text-slate-800">+91 {mobile.replace(/^\+?91\s*/, '').trim()}</span>
                      </p>
                    </div>

                    {/* Tab Switcher if patient has multiple appointments */}
                    {patientAppointments.length > 1 && (
                      <div className="flex justify-center gap-2 pt-1 border-t border-slate-100 max-w-lg mx-auto">
                        <span className="text-xs font-bold text-slate-500 self-center">Appointments ({patientAppointments.length}):</span>
                        {patientAppointments.map((apt, idx) => (
                          <button
                            key={apt.id}
                            type="button"
                            onClick={() => setSelectedAptIndex(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedAptIndex === idx
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            #{apt.id} ({apt.status})
                          </button>
                        ))}
                      </div>
                    )}

                    {patientAppointments.length > 0 ? (
                      (() => {
                        const currentApt = patientAppointments[selectedAptIndex] || patientAppointments[0];
                        return (
                          <div className="space-y-4">
                            {/* Inner Appointment Slip Card (exact styling & optimized width) */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-3 shadow-2xs w-full">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">APPOINTMENT ID</span>
                                  <span className="text-base font-black text-blue-700">{currentApt.id}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">PATIENT MOBILE</span>
                                  <span className="text-xs font-bold text-slate-800">+91 {mobile.replace(/^\+?91\s*/, '').trim()}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-600 font-semibold">Patient Name</p>
                                  <p className="font-bold text-slate-900">{currentApt.patientName}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600 font-semibold">Doctor Name</p>
                                  <p className="font-bold text-slate-900">{currentApt.doctorName}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600 font-semibold">Department</p>
                                  <p className="font-bold text-slate-800">{currentApt.department}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600 font-semibold">Date & Time</p>
                                  <p className="font-bold text-emerald-700">{currentApt.date} • {currentApt.timeSlot}</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-slate-600 font-semibold">Hospital Location</p>
                                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 text-xs">
                                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" /> AegisCare Super Specialty Hospital, Main Building
                                  </p>
                                </div>
                              </div>

                              {currentApt.status === 'Cancelled' && (
                                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                                  <p className="font-bold">Cancellation Reason:</p>
                                  <p>{currentApt.cancellationReason || 'Cancelled by patient'}</p>
                                </div>
                              )}

                              {/* Check-in QR Code */}
                              <div className="pt-2.5 border-t border-slate-200 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs shrink-0">
                                  <QrCode className="w-7 h-7 text-slate-800" />
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  <p className="font-bold text-slate-800 text-xs">Check-in QR Code</p>
                                  <p>Scan this QR at reception kiosk for instant OPD token.</p>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons Bar: All buttons available for ALL patients */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5 w-full">
                              <button
                                type="button"
                                onClick={() => window.print()}
                                className="py-2 px-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Slip</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => addToast('info', 'Download Started', 'Downloading appointment slip PDF...')}
                                className="py-2 px-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Slip</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setExistingPatientRightView('form')}
                                className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>Book Another</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartReschedule(currentApt)}
                                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Re-Schedule</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCancelingApt(currentApt);
                                  setCancelReasonInput('');
                                }}
                                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel Appointment</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No appointments found for {fullName}.</p>
                        <button
                          type="button"
                          onClick={() => setExistingPatientRightView('form')}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                        >
                          Book Appointment Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Personal Details Form */
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Personal Details
                      </h3>
                      {patientType === 'Existing Patient' && selectedPatientLoaded && (
                        <button
                          type="button"
                          onClick={() => setExistingPatientRightView('appointments')}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          View Appointments ({patientAppointments.length})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Full Name *</label>
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="Enter full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 50))}
                          className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* DOB */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Date of Birth *</label>
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={dob}
                          onChange={(e) => {
                            const val = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            if (val > today) {
                              addToast('warning', 'Invalid DOB', 'Date of Birth cannot be in the future.');
                              setDob(today);
                            } else {
                              setDob(val);
                            }
                          }}
                          className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Auto Calculated Age */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Age (Calculated)</label>
                        <input
                          type="text"
                          readOnly
                          value={ageDisplay}
                          className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 text-sm font-semibold focus:outline-none"
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Gender *</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                        <div className="flex gap-2 items-center">
                          <span className="px-3.5 py-2.5 sm:py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-600">+91</span>
                          <input
                            type="tel"
                            required
                            placeholder="98765 43210"
                            maxLength={10}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Email Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <input
                          type="email"
                          placeholder="patient@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Button (Hidden when viewing an Existing Patient appointment slip) */}
            {!(patientType === 'Existing Patient' && selectedPatientLoaded && existingPatientRightView === 'appointments') && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/25 inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Choose Department & Doctor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 2: DEPARTMENT + DOCTOR SELECTION (Wide 3-Col Layout) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="w-full space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Choose Department & Doctor</h2>
                <p className="text-xs text-slate-500">Select a specialty, then pick your preferred doctor.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 2 of 4
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Department Selection */}
              <div className="lg:col-span-3 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Select Department
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden max-h-[460px] overflow-y-auto">
                  {departments.map((dept) => {
                    const isSelected = selectedDept === dept.name;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setSelectedDept(dept.name);
                          setSelectedDoctor(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all cursor-pointer border-b border-slate-100 last:border-b-0 ${isSelected
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-100' : 'bg-slate-100'
                          }`}>
                          {getDeptIcon(dept.iconName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                            {dept.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{dept.doctorCount || 4} Doctors</p>
                        </div>
                        {isSelected && (
                          <span className="bg-blue-600 text-white rounded-full p-0.5 shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Doctor Cards Grid in 3 Columns */}
              <div className="lg:col-span-9 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Available Doctors in <span className="text-blue-600">{selectedDept}</span>
                </h3>

                {departmentDoctors.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                    <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">No Doctors Found</h3>
                    <p className="text-xs text-slate-500">Please choose another department to proceed.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {departmentDoctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-4 rounded-2xl border-2 transition-all bg-white cursor-pointer relative ${isSelected
                            ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                            : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
                            }`}
                        >
                          {isSelected && (
                            <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white rounded-full p-1 shadow-xs">
                              <Check className="w-3 h-3" />
                            </span>
                          )}

                          <div className="flex items-start gap-3">
                            <img
                              src={doc.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}
                              alt={doc.name}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                            />
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Available
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{doc.name}</h4>
                              <p className="text-[10px] font-semibold text-blue-600 truncate">{doc.specialization}</p>
                              <p className="text-[10px] text-slate-500 truncate">{doc.qualification}</p>
                            </div>
                          </div>

                          {/* Compact Stats Row */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                            <span className="text-slate-500">{doc.experienceYears || 12}+ Yrs Exp</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDoctorProfile(doc);
                              }}
                              className="text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {selectedDoctor && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/25 inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Choose Date & Time</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 3: DATE + TIME SLOT SELECTION (Ultra Wide & Compact) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && selectedDoctor && (
          <div className="w-full space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Date & Time</h2>
                <p className="text-xs text-slate-500">
                  Booking for <span className="font-bold text-blue-600">{selectedDoctor.name}</span> ({selectedDept})
                </p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 3 of 4
              </span>
            </div>

            {/* Horizontal Split or Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* Date Selection Grid (7 cols) */}
              <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Select Appointment Date
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Selected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Today
                    </span>
                  </div>
                </div>

                {/* 7 Columns Date Cards Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {availableCalendarDates.map((item) => {
                    const isSelected = selectedDate === item.isoStr;
                    return (
                      <button
                        key={item.isoStr}
                        type="button"
                        disabled={item.isDisabled}
                        onClick={() => {
                          setSelectedDate(item.isoStr);
                          setSelectedSlot('');
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${item.isDisabled
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                            : item.isToday
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:border-emerald-500'
                              : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                          }`}
                      >
                        {item.isToday && (
                          <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-emerald-600 text-white mb-0.5">
                            Today
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase">{item.dayName}</span>
                        <span className="text-lg font-black my-0">{item.dayNum}</span>
                        <span className="text-[9px] font-medium">{item.monthName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid (5 cols) */}
              <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Select Time Slot
                  </h3>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span> Booked
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {timeSlotCategories.map((category) => (
                    <div key={category.title} className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-600">{category.title}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {category.slots.map((slot) => {
                          const status = getSlotStatus(slot);
                          const isBooked = status === 'Booked';
                          const isSelected = selectedSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold text-center transition-all cursor-pointer ${isBooked
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                : isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:border-emerald-400'
                                }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevStep}
                className={`px-5 py-2.5 rounded-xl border font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  isReschedulingMode
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isReschedulingMode ? <X className="w-4 h-4 text-rose-600" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{isReschedulingMode ? 'Cancel Reschedule' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/25 inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 4: REVIEW & CONFIRM (Ultra Wide 3-Column Layout)      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 4 && selectedDoctor && (
          <div className="w-full space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Confirm</h2>
                <p className="text-xs text-slate-500">Review your appointment details before confirming.</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                Final Step
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Visit Details */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Visit Specifications
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Visit Type</label>
                    <div className="flex gap-2">
                      {(['First Visit', 'Follow Up'] as const).map((vt) => (
                        <button
                          key={vt}
                          type="button"
                          onClick={() => setVisitType(vt)}
                          className={`flex-1 py-1.5 rounded-lg border font-bold text-xs text-center transition-all cursor-pointer ${visitType === vt
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600'
                            }`}
                        >
                          {vt}
                        </button>
                      ))}
                    </div>
                  </div>



                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Reason for Visit</label>
                    <textarea
                      rows={2}
                      placeholder="Health concern details..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Patient Summary */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Patient Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-600 font-semibold">Name</p>
                    <p className="font-bold text-slate-800">{fullName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Mobile</p>
                    <p className="font-bold text-slate-800">+91 {mobile}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Age / Gender</p>
                    <p className="font-bold text-slate-800">{ageDisplay} / {gender}</p>
                  </div>
                  {email && (
                    <div>
                      <p className="text-slate-600 font-semibold">Email</p>
                      <p className="font-bold text-slate-800 truncate">{email}</p>
                    </div>
                  )}

                </div>
              </div>

              {/* Card 3: Doctor & Slot Summary */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" /> Doctor & Slot
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <img
                      src={selectedDoctor.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}
                      alt={selectedDoctor.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="text-xs space-y-0.5">
                      <h4 className="font-bold text-slate-900 text-xs">{selectedDoctor.name}</h4>
                      <p className="text-blue-600 font-semibold text-[11px]">{selectedDoctor.specialization}</p>
                      <p className="text-slate-500 text-[10px]">{selectedDept}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                    <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                      <p className="text-slate-500 text-[10px]">Date</p>
                      <p className="font-bold text-blue-900 text-xs">{selectedDate}</p>
                    </div>
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                      <p className="text-slate-500 text-[10px]">Time</p>
                      <p className="font-bold text-emerald-900 text-xs">{selectedSlot}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinalBooking}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-3"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Appointment</span>
                </button>
              </div>
            </div>

            {/* Back Button */}
            <div className="flex items-center justify-start pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUCCESS PAGE (STEP 5) — Compact View                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 5 && confirmedApt && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600"></div>

              {/* Confirmed Icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Appointment Confirmed
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                  Booking Successful!
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Confirmation sent to <span className="font-bold text-slate-800">+91 {mobile}</span>
                </p>
              </div>

              {/* Appointment Slip Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-3 max-w-lg mx-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">APPOINTMENT ID</span>
                    <span className="text-base font-black text-blue-700">{confirmedApt.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">PATIENT MOBILE</span>
                    <span className="text-xs font-bold text-slate-800">+91 {mobile}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-600 font-semibold">Patient Name</p>
                    <p className="font-bold text-slate-900">{confirmedApt.patientName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Doctor Name</p>
                    <p className="font-bold text-slate-900">{confirmedApt.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Department</p>
                    <p className="font-bold text-slate-800">{confirmedApt.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-semibold">Date & Time</p>
                    <p className="font-bold text-emerald-700">{confirmedApt.date} • {confirmedApt.timeSlot}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-600 font-semibold">Hospital Location</p>
                    <p className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" /> AegisCare Super Specialty Hospital, Main Building
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white p-1.5 rounded-xl border border-slate-300 flex items-center justify-center shadow-xs">
                    <QrCode className="w-8 h-8 text-slate-800" />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <p className="font-bold text-slate-800">Check-in QR Code</p>
                    <p>Scan this QR at reception kiosk for instant OPD token.</p>
                  </div>
                </div>
              </div>

              {/* Success Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => addToast('info', 'Download Started', 'Downloading appointment slip PDF...')}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setFullName('');
                    setMobile('');
                    setEmail('');
                    setDob('');
                    setGender('Male');
                    setBloodGroup('O+');
                    setAddress('');
                    setCity('');
                    setState('');
                    setPincode('');
                    setExistingUhid('');
                    setSearchMobile('');
                    setSelectedDept('General Medicine');
                    setSelectedDoctor(null);
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setSelectedSlot('');
                    setVisitType('First Visit');
                    setConsultationType('Hospital Visit');
                    setReason('');
                    setSymptoms('');
                    setConfirmedApt(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Book Another</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Doctor Profile Modal Popup */}
      {viewingDoctorProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setViewingDoctorProfile(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
              <img
                src={viewingDoctorProfile.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}
                alt={viewingDoctorProfile.name}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                  {viewingDoctorProfile.department}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{viewingDoctorProfile.name}</h3>
                <p className="text-xs font-semibold text-slate-700">{viewingDoctorProfile.specialization}</p>
                <p className="text-xs text-slate-500">{viewingDoctorProfile.qualification}</p>
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <span className="font-semibold text-slate-600">{viewingDoctorProfile.experienceYears || 12}+ Years Exp</span>
                </div>
              </div>
            </div>

            {/* Biography */}
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biography</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {viewingDoctorProfile.biography || 'Leading specialist with extensive clinical and research experience.'}
              </p>
            </div>

            {/* Education & Awards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Education
                </h4>
                <ul className="space-y-0.5 text-slate-600 list-disc list-inside text-[11px]">
                  {viewingDoctorProfile.education?.map((ed, i) => (
                    <li key={i}>{ed}</li>
                  )) || <li>MBBS, MD - AIIMS</li>}
                </ul>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                  <Award className="w-3.5 h-3.5 text-amber-600" /> Recognitions
                </h4>
                <ul className="space-y-0.5 text-slate-600 list-disc list-inside text-[11px]">
                  {viewingDoctorProfile.awards?.map((aw, i) => (
                    <li key={i}>{aw}</li>
                  )) || <li>Excellence in Medicine Award</li>}
                </ul>
              </div>
            </div>

            {/* Clinic Timings */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
              <p className="font-bold text-blue-900">OPD Clinic Schedule</p>
              <p className="text-blue-700 mt-0.5 text-[11px]">{viewingDoctorProfile.clinicTimings || 'Mon - Sat: 09:00 AM - 05:00 PM'}</p>
            </div>

            {/* Action */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewingDoctorProfile(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctor(viewingDoctorProfile);
                  setViewingDoctorProfile(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md cursor-pointer"
              >
                Select This Doctor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal Popup (Text Input Only) */}
      {cancelingApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <X className="w-5 h-5 text-rose-600" />
                Cancel Appointment
              </h3>
              <button onClick={() => setCancelingApt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">{cancelingApt.doctorName} ({cancelingApt.department})</p>
              <p className="text-rose-700 font-semibold">{cancelingApt.date} • {cancelingApt.timeSlot}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Reason for Cancellation *</label>
              <textarea
                rows={3}
                required
                placeholder="Enter cancellation reason (e.g. Personal emergency, schedule conflict)..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelingApt(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Submit Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
