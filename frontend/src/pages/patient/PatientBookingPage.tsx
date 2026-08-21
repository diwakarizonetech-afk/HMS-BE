import React, { useState, useEffect, useMemo } from 'react';
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
    branches,
    bookAppointment,
    patients,
    addPatient,
    getPatientByUhid,
    searchPatients,
    addToast,
    appointments,
    cancelAppointment,
    rescheduleAppointment
  } = useHMS();

  const [isSearching, setIsSearching] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('Main Branch');

  useEffect(() => {
    if (branches && branches.length > 0 && (selectedBranch === 'Main Branch' || !selectedBranch)) {
      const mainB = branches.find(b => b.isMainBranch) || branches[0];
      if (mainB?.branchName) {
        setSelectedBranch(mainB.branchName);
      }
    }
  }, [branches]);

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

  // Step 2: Department + Doctor Selection (combined)
  const [selectedDept, setSelectedDept] = useState<string>('General Medicine');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [viewingDoctorProfile, setViewingDoctorProfile] = useState<Doctor | null>(null);

  // Step 3: Date + Time Slot (combined)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('Morning (9 AM - 1 PM)');

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

  // Live matching patients based on search input (strictly deduplicated so same patient appears only once)
  const matchingPatients = useMemo(() => {
    const cleanSearch = (searchMobile || '').trim();
    if (!cleanSearch || cleanSearch.length < 3) return [];
    const query = cleanSearch.replace(/\D/g, '');

    // Deduplicate by 10-digit mobile OR full name
    const unique: typeof patients = [];
    const safePatients = Array.isArray(patients) ? patients : [];
    safePatients.forEach(p => {
      const pMob = p?.mobile ? p.mobile.replace(/\D/g, '').slice(-10) : '';
      const pName = p?.firstName ? `${p.firstName} ${p.lastName || ''}`.trim().toLowerCase() : '';
      const exists = unique.some(u => {
        const uMob = u?.mobile ? u.mobile.replace(/\D/g, '').slice(-10) : '';
        const uName = u?.firstName ? `${u.firstName} ${u.lastName || ''}`.trim().toLowerCase() : '';
        return (pMob && uMob && pMob === uMob) || (pName && uName && pName === uName);
      });
      if (!exists && p) {
        unique.push(p);
      }
    });

    return unique.filter(p => {
      const mob = p?.mobile ? p.mobile.replace(/\D/g, '') : '';
      return mob.includes(query);
    });
  }, [searchMobile, patients]);

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
    if (!mobile?.trim()) return [];
    const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
    const cleanFullName = (fullName || '').trim().toLowerCase();

    if (cleanMobile.length < 5 && cleanFullName.length < 2) return [];

    const isStrictMatch = (aptMobile?: string, aptName?: string) => {
      const aMobileDigits = (aptMobile || '').replace(/\D/g, '').slice(-10);
      const aName = (aptName || '').trim().toLowerCase();

      // Primary check: exact 10-digit mobile match
      if (cleanMobile.length >= 10 && aMobileDigits === cleanMobile) {
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

    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const fromContext = safeAppointments.filter(a => isStrictMatch(a?.patientMobile, a?.patientName));

    const deduplicated = fromContext.filter((apt, index, self) => index === self.findIndex(t => t?.id === apt?.id));

    // Sort descending by date
    return deduplicated.sort((a, b) => {
      const dateA = new Date(a?.date || '').getTime();
      const dateB = new Date(b?.date || '').getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }
      return (b?.id || '').localeCompare(a?.id || '');
    });
  }, [mobile, fullName, appointments]);

  // Confirm Cancellation Handler with direct text input
  const handleConfirmCancel = () => {
    if (!cancelingApt) return;
    if (!cancelReasonInput.trim()) {
      addToast('warning', 'Reason Required', 'Please enter a cancellation reason.');
      return;
    }

    const finalReason = cancelReasonInput.trim();
    cancelAppointment(cancelingApt.id, finalReason);

    addToast('info', 'Appointment Cancelled', `Appointment #${cancelingApt.id} marked as Cancelled.`);
    setCancelingApt(null);
    setCancelReasonInput('');
  };

  // Reschedule Navigation Handler: Jump directly to Step 3 (Date & Time Page)
  const handleStartReschedule = (apt: Appointment) => {
    setIsReschedulingMode(true);
    setReschedulingAptId(apt.id);
    setReschedulingAptObj(apt);

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
      slots: [],
      status: 'Available' as const,
      email: '',
    };
    setSelectedDoctor(matchedDoc);

    addToast('info', 'Reschedule Mode', `Select new Date & Time slot for appointment #${apt.id}`);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Existing Patient Lookup button trigger
  const handleSearchPatient = async () => {
    if (!searchMobile.trim() || searchMobile.length < 3) {
      addToast('warning', 'Mobile Number Required', 'Please enter at least 3 digits of a registered mobile number.');
      return;
    }
    if (matchingPatients.length > 0) {
      selectPatientRecord(matchingPatients[0]);
      return;
    }

    setIsSearching(true);
    try {
      const dbResults = await searchPatients(searchMobile.trim());
      if (dbResults && dbResults.length > 0) {
        selectPatientRecord(dbResults[0]);
      } else {
        addToast('error', 'Patient Not Found', 'No existing record matching this Mobile Number in the database.');
      }
    } catch (err: any) {
      addToast('error', 'Search Error', err?.message || 'Error looking up patient from database.');
    } finally {
      setIsSearching(false);
    }
  };

  // Validation before step change
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        addToast('error', 'Validation Error', 'Please enter a valid Full Name.');
        return false;
      }
      if (!mobile.trim() || mobile.replace(/\D/g, '').length !== 10) {
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

  // Final Confirmation Submit
  const handleFinalBooking = async () => {
    if (!selectedDoctor) return;

    if (isReschedulingMode && reschedulingAptId) {
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

      setConfirmedApt(updatedObj);
      setIsReschedulingMode(false);
      setReschedulingAptId(null);
      setReschedulingAptObj(null);

      addToast('success', 'Reschedule Confirmed', `Appointment rescheduled to ${selectedDate} at ${selectedSlot}`);
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Normal New Booking Request sent to Reception for selected Branch
    let targetUhid = existingUhid;
    let targetName = fullName;

    // Check if patient already exists by Mobile, UHID, or Full Name
    const mobDigits = (mobile || '').replace(/\D/g, '').slice(-10);
    const cleanName = (fullName || '').trim().toLowerCase();

    const existingPatient = patients.find((p) => {
      const pMob = (p.mobile || '').replace(/\D/g, '').slice(-10);
      const pName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
      if (existingUhid && p.uhid === existingUhid) return true;
      if (mobDigits && pMob && mobDigits === pMob) return true;
      if (cleanName && pName && cleanName === pName) return true;
      return false;
    });

    if (existingPatient) {
      targetUhid = existingPatient.uhid;
      targetName = `${existingPatient.firstName} ${existingPatient.lastName}`.trim();
      setExistingUhid(existingPatient.uhid);
    } else if (patientType === 'New Patient' || !targetUhid) {
      try {
        const nameParts = (fullName || 'New Patient').trim().split(' ');
        const fName = nameParts[0] || 'Patient';
        const lName = nameParts.slice(1).join(' ') || '';
        const createdPat = await addPatient({
          firstName: fName,
          lastName: lName,
          gender: gender || 'Male',
          dob: dob || '2000-01-01',
          age: 0,
          bloodGroup: (bloodGroup as any) || 'O+',
          maritalStatus: 'Single',
          nationality: 'Indian',
          mobile: mobile,
          altMobile: '',
          email: email || '',
          address: address || 'OPD Booking',
          city: city || 'Local',
          state: state || 'Local',
          country: 'India',
          pincode: pincode || '600001',
          aadhaar: '',
          pan: '',
          emergencyContactName: '',
          emergencyRelationship: '',
          emergencyPhone: '',
          branch: selectedBranch,
        });

        if (createdPat && createdPat.uhid) {
          targetUhid = createdPat.uhid;
          targetName = `${createdPat.firstName} ${createdPat.lastName}`.trim();
          setExistingUhid(createdPat.uhid);
        }
      } catch (err) {
        console.warn('Patient auto-registration in frontend context:', err);
      }
    }

    const created = await bookAppointment({
      patientUhid: targetUhid || `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: targetName || fullName,
      patientMobile: mobile,
      department: selectedDept,
      doctorId: selectedDoctor ? selectedDoctor.id : '',
      doctorName: selectedDoctor ? selectedDoctor.name : '',
      date: selectedDate,
      timeSlot: selectedSlot,
      reason: reason || 'General Medical Consultation',
      branch: selectedBranch,
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
      status: 'Pending',
      bookingSource: 'Online',
    } as any);

    setConfirmedApt(created);
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Static fallback doctors
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
      slots: ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'],
      status: 'Available' as const,
      email: 'priya.sharma@aegiscare.com',
      rating: 4.8,
      photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
      biography: 'Highly experienced specialist with 15+ years of clinical excellence and patient-centered care.',
      education: ['MBBS - AIIMS Delhi', 'MD - CMC Vellore'],
      awards: ['Best Doctor Award 2024', 'Healthcare Excellence Award'],
      clinicTimings: 'Mon - Sat: 09:00 AM - 01:00 PM, 02:00 PM - 05:00 PM, 06:00 PM - 09:00 PM',
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
      slots: ['09:30 AM', '10:30 AM', '11:30 AM', '12:30 PM', '02:30 PM', '03:30 PM', '04:30 PM', '06:30 PM', '07:30 PM', '08:30 PM'],
      status: 'Available' as const,
      email: 'rajesh.kumar@aegiscare.com',
      rating: 4.6,
      photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300',
      biography: 'Dedicated consultant known for comprehensive diagnosis and personalized treatment plans.',
      education: ['MBBS - Madras Medical College', 'DNB - Apollo Hospitals'],
      awards: ['Patient Choice Award 2023'],
      clinicTimings: 'Mon - Fri: 09:00 AM - 01:00 PM, 02:00 PM - 05:00 PM, 06:00 PM - 09:00 PM',
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
      slots: ['09:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '08:00 PM', '09:00 PM'],
      status: 'Available' as const,
      email: 'meena.sundaram@aegiscare.com',
      rating: 4.9,
      photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964f369?w=300',
      biography: 'Compassionate specialist with modern treatment approaches and a focus on holistic patient well-being.',
      education: ['MBBS - JIPMER', 'MS - Sri Ramachandra University'],
      awards: ['Young Achiever in Medicine 2022', 'Research Excellence Award'],
      clinicTimings: 'Mon, Wed - Sat: 09:00 AM - 01:00 PM, 02:00 PM - 05:00 PM, 06:00 PM - 09:00 PM',
    },
  ], [selectedDept]);

  const departmentDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const matchDept = !selectedDept || selectedDept === 'All' || (d.department || '').toLowerCase().trim() === selectedDept.toLowerCase().trim();
      const docBranch = (d.branch || '').toLowerCase().trim();
      const selBranch = (selectedBranch || '').toLowerCase().trim();
      const matchBranch = !selectedBranch || selectedBranch === 'All' || !docBranch || docBranch === 'main branch' || docBranch.includes(selBranch) || selBranch.includes(docBranch);
      return matchDept && matchBranch;
    });
  }, [doctors, selectedDept, selectedBranch]);

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

  const timeSlotCategories = [
    { title: 'Morning (9 AM - 1 PM)', slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM'] },
    { title: 'Afternoon (2 PM - 5 PM)', slots: ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'] },
    { title: 'Evening (6 PM - 9 PM)', slots: ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'] },
  ];

  const getSlotStatus = (slot: string) => {
    if (slot === '10:00 AM' || slot === '02:00 PM') return 'Booked';
    if (slot === '11:00 AM' || slot === '05:30 PM') return 'Almost Full';
    return 'Available';
  };

  const stepDefs = [
    { step: 1, title: 'Patient Info' },
    { step: 2, title: 'Department & Doctor' },
    { step: 3, title: 'Date & Time' },
    { step: 4, title: 'Review & Confirm' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      <Navbar />

      {/* Main Banner Header */}
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

      {/* Progress Bar Row */}
      {currentStep <= 4 && (
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-20 z-30 shadow-sm py-3.5 transition-all">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              {stepDefs.map((item, idx) => {
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;
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

        {/* STEP 1: PATIENT INFORMATION */}
        {currentStep === 1 && (
          <div className="w-full space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Patient Information</h2>
                <p className="text-xs text-slate-500">Fill in patient details to proceed.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 1 of 4
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Side: Patient Category Selection */}
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
                        disabled={isSearching}
                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Search className="w-4 h-4" />
                        <span>{isSearching ? 'Searching...' : 'Search'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Form Inputs */}
              <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Personal Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group *</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Select Doctor</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DEPARTMENT & DOCTOR SELECTION */}
        {currentStep === 2 && (
          <div className="w-full space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Branch, Department & Doctor</h2>
                <p className="text-xs text-slate-500">Choose hospital branch, specialty department, and specialist doctor.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 2 of 4
              </span>
            </div>

            {/* Hospital Branch Selector (Fetched from DB) */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block mb-1">
                    Hospital Branch * (Loaded from DB)
                  </label>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-300 shrink-0" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer w-full sm:w-80"
                    >
                      {branches.length > 0 ? (
                        branches.map((b) => (
                          <option key={b.id} value={b.branchName} className="text-slate-900">
                            {b.branchName} ({b.city || 'Hospital Branch'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Main Branch" className="text-slate-900">Main Branch</option>
                          <option value="City Center Branch" className="text-slate-900">City Center Branch</option>
                          <option value="North Wing Branch" className="text-slate-900">North Wing Branch</option>
                          <option value="East Wing Branch" className="text-slate-900">East Wing Branch</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-blue-200">
                  Specialists filtered for {selectedBranch}
                </span>
              </div>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDept(d.name)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-start justify-between h-24 ${selectedDept === d.name
                    ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100">
                    {getDeptIcon(d.iconName)}
                  </div>
                  <span className="text-xs font-bold text-slate-900 leading-tight">{d.name}</span>
                </button>
              ))}
            </div>

            {/* Doctor Cards Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Available Specialists ({departmentDoctors.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departmentDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${selectedDoctor?.id === doc.id
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-lg overflow-hidden shrink-0">
                          {doc.photoUrl ? (
                            <img src={doc.photoUrl} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            doc.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                          <p className="text-[11px] text-blue-600 font-semibold">{doc.specialization}</p>
                          <p className="text-[10px] text-slate-400">{doc.qualification}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-600">{doc.experienceYears} Years Exp</span>
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px]">
                        {doc.roomNo ? `Room ${doc.roomNo}` : 'OPD Specialist'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Date & Time</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME SLOT SELECTION */}
        {currentStep === 3 && (
          <div className="w-full space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Date & Time Slot</h2>
                <p className="text-xs text-slate-500">Pick appointment date and preferred consultation time.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 3 of 4
              </span>
            </div>

            {/* Date Carousel */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Select Date</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {availableCalendarDates.map((item) => (
                  <button
                    key={item.isoStr}
                    type="button"
                    disabled={item.isDisabled}
                    onClick={() => setSelectedDate(item.isoStr)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-w-24 shrink-0 ${selectedDate === item.isoStr
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : item.isDisabled
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                  >
                    <span className="text-[10px] font-bold uppercase block opacity-80">{item.dayName}</span>
                    <span className="text-lg font-black block leading-tight">{item.dayNum}</span>
                    <span className="text-[10px] font-semibold block">{item.monthName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Available Time Slots</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Morning (9 AM - 1 PM)', icon: '🌅' },
                  { title: 'Afternoon (2 PM - 5 PM)', icon: '☀️' },
                  { title: 'Evening (6 PM - 9 PM)', icon: '🌙' },
                ].map((session) => {
                  const isSelected = selectedSlot === session.title;

                  return (
                    <button
                      key={session.title}
                      type="button"
                      onClick={() => setSelectedSlot(session.title)}
                      className={`p-6 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg ring-2 ring-blue-600/30'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-slate-800'
                      }`}
                    >
                      <span className="text-3xl">{session.icon}</span>
                      <span className="text-sm font-black tracking-tight">{session.title}</span>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Available Slot
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Review</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {currentStep === 4 && (
          <div className="w-full space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Confirm Booking</h2>
                <p className="text-xs text-slate-500">Verify appointment summary before final submission.</p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 4 of 4
              </span>
            </div>

            {/* Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                  <p className="font-bold text-slate-900 text-sm">{fullName}</p>
                  <p className="text-slate-600">{mobile} • {gender}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedDoctor?.name}</p>
                  <p className="text-blue-600 font-semibold">{selectedDept}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Schedule</span>
                  <p className="font-bold text-emerald-700 text-sm">{selectedDate}</p>
                  <p className="text-slate-700 font-bold">{selectedSlot}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital Branch</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedBranch}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Confirmed OPD Appointment</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit / Symptoms (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Describe your health symptoms or consultation goal..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalBooking}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Appointment</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS SLIP SCREEN */}
        {currentStep === 5 && confirmedApt && (
          <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                  Request Sent to Reception Portal
                </span>
                <h2 className="text-2xl font-black text-slate-900 pt-2">Appointment Request Submitted</h2>
                <p className="text-xs text-slate-500">
                  Your appointment request has been forwarded to the <strong className="text-blue-700">{confirmedApt.branch || selectedBranch}</strong> Reception Desk. Reception will verify doctor availability and confirm your booking.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-left space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">APPOINTMENT ID</span>
                  <span className="font-extrabold text-blue-700">{confirmedApt.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">UHID</span>
                  <span className="font-bold text-slate-800">{confirmedApt.patientUhid || existingUhid || 'Generated'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">Patient Name</span>
                  <span className="font-bold text-slate-800">{confirmedApt.patientName || fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">Doctor</span>
                  <span className="font-bold text-slate-800">{confirmedApt.doctorName || selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">Department</span>
                  <span className="font-bold text-blue-600">{confirmedApt.department || selectedDept}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-black text-emerald-700">{(confirmedApt.date || selectedDate)} @ {(confirmedApt.timeSlot || selectedSlot)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setConfirmedApt(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md cursor-pointer"
                >
                  Book Another
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};
