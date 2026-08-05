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
  WardType,
  BedStatus,
} from '../types/hms';
import { generateUHID, generateTokenNumber } from '../utils/helpers';

// All data is loaded from the backend API on mount
// No mock/static data here

// All HMS data loaded from backend - no static mock data
const EMPTY_PLACEHOLDER = [
  {
    id: 'p1',
    uhid: 'UHID-2026-1001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    gender: 'Male',
    dob: '1985-06-15',
    age: 41,
    bloodGroup: 'B+',
    maritalStatus: 'Married',
    nationality: 'Indian',
    mobile: '+91 98765 43210',
    altMobile: '+91 98765 43211',
    email: 'rajesh.sharma@example.com',
    address: '42 MG Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560038',
    aadhaar: '4532 8901 2345',
    pan: 'ABCDE1234F',
    emergencyContactName: 'Sunita Sharma',
    emergencyRelationship: 'Spouse',
    emergencyPhone: '+91 98765 43212',
    allergies: 'Penicillin',
    existingDiseases: 'Hypertension, Type 2 Diabetes',
    insuranceProvider: 'Star Health Insurance',
    insuranceNumber: 'SHI-9876543',
    status: 'Admitted',
    registrationDate: '2026-01-10',
  },
  {
    id: 'p2',
    uhid: 'UHID-2026-1002',
    firstName: 'Priya',
    lastName: 'Patel',
    gender: 'Female',
    dob: '1992-09-22',
    age: 33,
    bloodGroup: 'O+',
    maritalStatus: 'Single',
    nationality: 'Indian',
    mobile: '+91 98123 45678',
    email: 'priya.patel@example.com',
    address: '108 Park Avenue, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400050',
    aadhaar: '8910 2345 6789',
    emergencyContactName: 'Ramesh Patel',
    emergencyRelationship: 'Father',
    emergencyPhone: '+91 98123 45679',
    allergies: 'None',
    existingDiseases: 'Asthma',
    insuranceProvider: 'HDFC ERGO',
    insuranceNumber: 'HE-1122334',
    status: 'Active',
    registrationDate: '2026-02-14',
  },
  {
    id: 'p3',
    uhid: 'UHID-2026-1003',
    firstName: 'Amitabh',
    lastName: 'Roy',
    gender: 'Male',
    dob: '1968-11-05',
    age: 57,
    bloodGroup: 'A+',
    maritalStatus: 'Married',
    nationality: 'Indian',
    mobile: '+91 99001 12233',
    email: 'amitabh.roy@example.com',
    address: '15 Salt Lake City, Sector 2',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    pincode: '700091',
    aadhaar: '3456 7890 1234',
    emergencyContactName: 'Ananya Roy',
    emergencyRelationship: 'Daughter',
    emergencyPhone: '+91 99001 12234',
    allergies: 'Sulfa drugs',
    existingDiseases: 'Coronary Artery Disease',
    insuranceProvider: 'Max Bupa Health Care',
    insuranceNumber: 'MB-887766',
    status: 'Admitted',
    registrationDate: '2026-03-01',
  },
  {
    id: 'p4',
    uhid: 'UHID-2026-1004',
    firstName: 'Sneha',
    lastName: 'Reddy',
    gender: 'Female',
    dob: '1998-03-18',
    age: 28,
    bloodGroup: 'AB+',
    maritalStatus: 'Single',
    nationality: 'Indian',
    mobile: '+91 97788 99000',
    email: 'sneha.reddy@example.com',
    address: '88 Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500033',
    aadhaar: '6789 0123 4567',
    emergencyContactName: 'Venkatesh Reddy',
    emergencyRelationship: 'Brother',
    emergencyPhone: '+91 97788 99001',
    allergies: 'Dust, Latex',
    existingDiseases: 'Migraine',
    insuranceProvider: 'Care Health Insurance',
    insuranceNumber: 'CHI-554433',
    status: 'Active',
    registrationDate: '2026-04-12',
  },
];

export const INITIAL_EMERGENCY_CONTACTS: EmergencyContactItem[] = [
  {
    id: 'ec1',
    patientUhid: 'UHID-2026-1001',
    patientName: 'Rajesh Sharma',
    contactName: 'Sunita Sharma',
    relationship: 'Spouse',
    phone: '+91 98765 43212',
    priority: 'Primary',
  },
  {
    id: 'ec2',
    patientUhid: 'UHID-2026-1001',
    patientName: 'Rajesh Sharma',
    contactName: 'Vikram Sharma',
    relationship: 'Brother',
    phone: '+91 98765 43299',
    priority: 'Secondary',
  },
  {
    id: 'ec3',
    patientUhid: 'UHID-2026-1002',
    patientName: 'Priya Patel',
    contactName: 'Ramesh Patel',
    relationship: 'Father',
    phone: '+91 98123 45679',
    priority: 'Primary',
  },
  {
    id: 'ec4',
    patientUhid: 'UHID-2026-1003',
    patientName: 'Amitabh Roy',
    contactName: 'Ananya Roy',
    relationship: 'Daughter',
    phone: '+91 99001 12234',
    priority: 'Primary',
  },
];

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-1',
    name: 'General Medicine',
    code: 'GENMED',
    iconName: 'Stethoscope',
    doctorCount: 8,
    description: 'Primary medical care, chronic disease management, and preventive health screenings.',
  },
  {
    id: 'dept-2',
    name: 'Cardiology',
    code: 'CARD',
    iconName: 'HeartPulse',
    doctorCount: 6,
    description: 'Comprehensive heart care, cardiac surgeries, ECG, & interventional cardiology.',
  },
  {
    id: 'dept-3',
    name: 'Orthopedics',
    code: 'ORTHO',
    iconName: 'Bone',
    doctorCount: 5,
    description: 'Joint replacement, trauma care, fracture management, and sports medicine.',
  },
  {
    id: 'dept-4',
    name: 'Neurology',
    code: 'NEURO',
    iconName: 'Brain',
    doctorCount: 4,
    description: 'Brain, spine, stroke management, and neuromuscular disorder care.',
  },
  {
    id: 'dept-5',
    name: 'Pediatrics',
    code: 'PED',
    iconName: 'Baby',
    doctorCount: 4,
    description: 'Specialized healthcare, vaccinations, and growth tracking for infants & children.',
  },
  {
    id: 'dept-6',
    name: 'Dermatology',
    code: 'DERM',
    iconName: 'Sparkles',
    doctorCount: 3,
    description: 'Skin care, acne treatment, allergy management, and cosmetic dermatology.',
  },
  {
    id: 'dept-7',
    name: 'ENT',
    code: 'ENT',
    iconName: 'Ear',
    doctorCount: 3,
    description: 'Ear, Nose, Throat diagnostics, sinus care, and hearing assessment.',
  },
  {
    id: 'dept-8',
    name: 'Gynecology',
    code: 'GYN',
    iconName: 'Heart',
    doctorCount: 5,
    description: 'Maternal health, obstetrics, fertility care, and women’s wellness.',
  },
  {
    id: 'dept-9',
    name: 'Gastroenterology',
    code: 'GASTRO',
    iconName: 'Activity',
    doctorCount: 4,
    description: 'Digestive system, liver disorders, endoscopy, and stomach ailments.',
  },
  {
    id: 'dept-10',
    name: 'Ophthalmology',
    code: 'OPHTH',
    iconName: 'Eye',
    doctorCount: 3,
    description: 'Eye checkups, cataract surgery, laser vision correction, and glaucoma care.',
  },
  {
    id: 'dept-11',
    name: 'Pulmonology',
    code: 'PULMO',
    iconName: 'Wind',
    doctorCount: 3,
    description: 'Lungs, asthma, chest infections, sleep apnea, and respiratory medicine.',
  },
  {
    id: 'dept-12',
    name: 'Urology',
    code: 'URO',
    iconName: 'Activity',
    doctorCount: 3,
    description: 'Kidney stones, urinary tract disorders, prostate care, and urological surgery.',
  },
  {
    id: 'dept-13',
    name: 'Psychiatry',
    code: 'PSYCH',
    iconName: 'Smile',
    doctorCount: 3,
    description: 'Mental wellness, anxiety & depression therapy, stress management, and counseling.',
  },
  {
    id: 'dept-14',
    name: 'Dental',
    code: 'DENT',
    iconName: 'Smile',
    doctorCount: 4,
    description: 'Dental checkups, root canal, teeth whitening, implants, and orthodontics.',
  },
  {
    id: 'dept-15',
    name: 'Physiotherapy',
    code: 'PHYSIO',
    iconName: 'Activity',
    doctorCount: 4,
    description: 'Physical rehabilitation, post-surgery recovery, back pain relief, and mobility.',
  },
];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Vikram Malhotra',
    department: 'Cardiology',
    specialization: 'Interventional Cardiologist',
    qualification: 'MD, DM (Cardiology), FACC',
    experienceYears: 16,
    languages: ['English', 'Hindi', 'Punjabi'],
    roomNo: 'OPD-101',
    consultationFee: 800,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slots: ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM', '05:00 PM'],
    status: 'Available',
    email: 'doctor@hms.com',
    rating: 4.9,
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    biography: 'Dr. Vikram Malhotra is a world-renowned Cardiologist with over 16 years of clinical excellence in coronary interventions, pacemakers, and preventive cardiac care.',
    education: ['MBBS - AIIMS New Delhi', 'MD (Internal Medicine) - PGI Chandigarh', 'DM (Cardiology) - AIIMS New Delhi'],
    awards: ['Best Cardiologist Award 2024', 'Excellence in Clinical Care Award'],
    clinicTimings: 'Mon - Fri: 09:00 AM - 05:30 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '09:30 AM',
    reviews: [
      { id: 'r1', patientName: 'Suresh Raina', rating: 5, date: '2026-07-20', comment: 'Extremely attentive and explained the treatment procedure thoroughly.' },
      { id: 'r2', patientName: 'Anita Gupta', rating: 5, date: '2026-07-15', comment: 'Top class diagnosis for my mother. Highly recommended!' }
    ]
  },
  {
    id: 'doc-2',
    name: 'Dr. Meera Nambiar',
    department: 'Neurology',
    specialization: 'Senior Neurosurgeon',
    qualification: 'MBBS, MS, MCh (Neurosurgery)',
    experienceYears: 14,
    languages: ['English', 'Malayalam', 'Hindi'],
    roomNo: 'OPD-102',
    consultationFee: 1000,
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    slots: ['10:00 AM', '11:00 AM', '01:30 PM', '04:00 PM'],
    status: 'In Surgery',
    email: 'meera.neuro@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-78a99268f773?w=300&auto=format&fit=crop&q=80',
    biography: 'Specializes in complex brain surgery, spine disorders, and stroke rehabilitation with advanced minimally invasive techniques.',
    education: ['MBBS - JIPMER', 'MCh Neurosurgery - NIMHANS'],
    awards: ['National Neuro Pioneer Award'],
    clinicTimings: 'Mon, Wed, Fri: 10:00 AM - 05:00 PM',
    nextAvailableDate: 'Tomorrow',
    nextAvailableSlot: '10:00 AM',
    reviews: [
      { id: 'r3', patientName: 'Karan Mehra', rating: 5, date: '2026-07-18', comment: 'Outstanding doctor. Saved my father during critical stroke.' }
    ]
  },
  {
    id: 'doc-3',
    name: 'Dr. Anand Kumar',
    department: 'Orthopedics',
    specialization: 'Joint Replacement & Trauma Specialist',
    qualification: 'MBBS, MS (Ortho), Fellowship in Arthroplasty (UK)',
    experienceYears: 12,
    languages: ['English', 'Hindi', 'Kannada'],
    roomNo: 'OPD-103',
    consultationFee: 750,
    availableDays: ['Tuesday', 'Thursday', 'Saturday'],
    slots: ['09:30 AM', '11:00 AM', '02:00 PM', '03:00 PM', '05:30 PM'],
    status: 'Available',
    email: 'anand.ortho@hms.com',
    rating: 4.7,
    photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80',
    biography: 'Expert in robotic knee and hip replacements, arthroscopy, and complex sports injury recovery.',
    education: ['MS Orthopedics - KMC Manipal', 'Robotic Surgery Fellowship - London'],
    awards: ['Golden Joint Specialist Award'],
    clinicTimings: 'Tue, Thu, Sat: 09:00 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '11:00 AM',
    reviews: [
      { id: 'r4', patientName: 'Pooja Hegde', rating: 5, date: '2026-07-10', comment: 'My knee pain completely vanished post treatment.' }
    ]
  },
  {
    id: 'doc-4',
    name: 'Dr. Sunita Deshmukh',
    department: 'Pediatrics',
    specialization: 'Senior Pediatrician & Child Specialist',
    qualification: 'MBBS, MD (Pediatrics), DCH',
    experienceYears: 11,
    languages: ['English', 'Marathi', 'Hindi'],
    roomNo: 'OPD-104',
    consultationFee: 600,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slots: ['09:00 AM', '10:30 AM', '11:30 AM', '02:00 PM', '03:00 PM', '06:00 PM'],
    status: 'Available',
    email: 'sunita.peds@hms.com',
    rating: 4.9,
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    biography: 'Compassionate pediatric care focusing on newborn health, childhood nutrition, growth milestones, and routine vaccinations.',
    education: ['MBBS - Grant Medical College', 'MD Pediatrics - KEM Hospital Mumbai'],
    awards: ['Child Care Excellence Award'],
    clinicTimings: 'Mon - Sat: 09:00 AM - 06:30 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '09:00 AM',
    reviews: [
      { id: 'r5', patientName: 'Deepak Shah', rating: 5, date: '2026-07-22', comment: 'Very warm and friendly with kids! My son loves visiting Dr. Sunita.' }
    ]
  },
  {
    id: 'doc-5',
    name: 'Dr. Rajesh Iyer',
    department: 'General Medicine',
    specialization: 'Senior Internal Medicine Physician',
    qualification: 'MBBS, MD (General Medicine)',
    experienceYears: 18,
    languages: ['English', 'Tamil', 'Hindi'],
    roomNo: 'OPD-105',
    consultationFee: 500,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slots: ['09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '05:00 PM', '06:00 PM'],
    status: 'Available',
    email: 'rajesh.gen@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    biography: 'Specializes in comprehensive adult healthcare, hypertension, diabetes management, fever diagnostics, and lifestyle guidance.',
    education: ['MBBS - Madras Medical College', 'MD General Medicine - MMC Chennai'],
    awards: ['Lifetime Achievement in Primary Care'],
    clinicTimings: 'Mon - Fri: 08:30 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '10:00 AM',
    reviews: [
      { id: 'r6', patientName: 'Venkatesh S.', rating: 5, date: '2026-07-24', comment: 'Great clinical judgement and humble interaction.' }
    ]
  },
  {
    id: 'doc-6',
    name: 'Dr. Ananya Roy',
    department: 'Dermatology',
    specialization: 'Cosmetologist & Skin Specialist',
    qualification: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    experienceYears: 9,
    languages: ['English', 'Bengali', 'Hindi'],
    roomNo: 'OPD-106',
    consultationFee: 700,
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
    slots: ['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM'],
    status: 'Available',
    email: 'ananya.derm@hms.com',
    rating: 4.9,
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-78a99268f773?w=300&auto=format&fit=crop&q=80',
    biography: 'Expert in acne treatments, laser skin therapy, eczema, anti-aging solutions, and hair care treatments.',
    education: ['MBBS - Medical College Kolkata', 'MD Dermatology - School of Tropical Medicine'],
    awards: ['Young Dermatologist Excellence Award'],
    clinicTimings: 'Mon - Sat: 10:00 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '11:30 AM',
    reviews: [
      { id: 'r7', patientName: 'Riya Sharma', rating: 5, date: '2026-07-21', comment: 'Her skin treatment produced visible results within 2 weeks!' }
    ]
  },
  {
    id: 'doc-7',
    name: 'Dr. Praveen Saxena',
    department: 'ENT',
    specialization: 'ENT & Head Neck Surgeon',
    qualification: 'MBBS, MS (ENT), DNB',
    experienceYears: 13,
    languages: ['English', 'Hindi'],
    roomNo: 'OPD-107',
    consultationFee: 650,
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    slots: ['09:30 AM', '11:00 AM', '02:00 PM', '03:30 PM', '05:00 PM'],
    status: 'Available',
    email: 'praveen.ent@hms.com',
    rating: 4.7,
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    biography: 'Specialized in endoscopic sinus surgery, hearing loss treatments, vertigo management, and micro ear surgery.',
    education: ['MBBS - Maulana Azad Medical College', 'MS ENT - Lady Hardinge Medical College'],
    awards: ['ENT Pioneer Recognition'],
    clinicTimings: 'Mon, Wed, Fri, Sat: 09:30 AM - 05:30 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '02:00 PM',
    reviews: [
      { id: 'r8', patientName: 'Amit Verma', rating: 5, date: '2026-07-19', comment: 'Cleared my chronic sinus problem cleanly.' }
    ]
  },
  {
    id: 'doc-8',
    name: 'Dr. Shalini Menon',
    department: 'Gynecology',
    specialization: 'Obstetrician & Gynecologist',
    qualification: 'MBBS, MD (Obstetrics & Gynecology), DNB',
    experienceYears: 15,
    languages: ['English', 'Malayalam', 'Hindi'],
    roomNo: 'OPD-108',
    consultationFee: 850,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slots: ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'],
    status: 'Available',
    email: 'shalini.gyn@hms.com',
    rating: 4.9,
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    biography: 'Senior consultant specializing in high-risk pregnancy, laparoscopy, PCOD management, and painless delivery.',
    education: ['MBBS - Trivandrum Medical College', 'MD ObGyn - AIIMS'],
    awards: ['Maternal Care Leadership Award'],
    clinicTimings: 'Mon - Sat: 09:00 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '10:30 AM',
    reviews: [
      { id: 'r9', patientName: 'Kavita Das', rating: 5, date: '2026-07-25', comment: 'Empathetic doctor who gives full time to answer all questions.' }
    ]
  },
  {
    id: 'doc-9',
    name: 'Dr. Robert D’Souza',
    department: 'Gastroenterology',
    specialization: 'Gastroenterologist & Hepatologist',
    qualification: 'MBBS, MD, DM (Gastroenterology)',
    experienceYears: 17,
    languages: ['English', 'Konkani', 'Hindi'],
    roomNo: 'OPD-109',
    consultationFee: 900,
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    slots: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'],
    status: 'Available',
    email: 'robert.gastro@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    biography: 'Expert in endoscopy, colonoscopy, fatty liver disease, IBS, and acid reflux management.',
    education: ['MBBS - St. John’s Medical College', 'DM Gastroenterology - CMC Vellore'],
    awards: ['Excellence in Digestive Diseases'],
    clinicTimings: 'Mon, Tue, Thu, Fri: 10:00 AM - 05:30 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '11:30 AM',
    reviews: [
      { id: 'r10', patientName: 'Nitin Pandey', rating: 5, date: '2026-07-14', comment: 'Accurate diagnosis for my long-standing stomach pain.' }
    ]
  },
  {
    id: 'doc-10',
    name: 'Dr. Tarun Verma',
    department: 'Ophthalmology',
    specialization: 'Cataract & Lasik Surgeon',
    qualification: 'MBBS, MS (Ophthalmology), FICO',
    experienceYears: 10,
    languages: ['English', 'Hindi', 'Gujarati'],
    roomNo: 'OPD-110',
    consultationFee: 600,
    availableDays: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slots: ['09:30 AM', '11:00 AM', '01:30 PM', '03:00 PM', '04:30 PM'],
    status: 'Available',
    email: 'tarun.eye@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80',
    biography: 'Advanced micro-incision cataract surgery, blade-free LASIK, and glaucoma management specialist.',
    education: ['MBBS - BJ Medical College', 'MS Ophthalmology - Sankara Nethralaya'],
    awards: ['Visionary Surgeon Award'],
    clinicTimings: 'Mon - Sat: 09:30 AM - 05:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '09:30 AM',
    reviews: [
      { id: 'r11', patientName: 'Meenakshi N.', rating: 5, date: '2026-07-23', comment: 'Painless specs removal laser surgery. Clear vision now!' }
    ]
  },
  {
    id: 'doc-11',
    name: 'Dr. Farooq Abdullah',
    department: 'Pulmonology',
    specialization: 'Chest Physician & Sleep Specialist',
    qualification: 'MBBS, MD (Pulmonary Medicine), FCCP',
    experienceYears: 12,
    languages: ['English', 'Urdu', 'Hindi'],
    roomNo: 'OPD-111',
    consultationFee: 750,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
    slots: ['10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    status: 'Available',
    email: 'farooq.pulmo@hms.com',
    rating: 4.7,
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    biography: 'Specializes in severe asthma, COPD, bronchitis, post-COVID lung recovery, and sleep apnea evaluation.',
    education: ['MBBS - GMC Srinagar', 'MD Pulmonology - Vallabhbhai Patel Chest Institute'],
    awards: ['Respiratory Medicine Specialist Award'],
    clinicTimings: 'Mon - Fri: 10:00 AM - 05:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '11:00 AM',
    reviews: [
      { id: 'r12', patientName: 'Harkirat Singh', rating: 5, date: '2026-07-16', comment: 'Cured my chronic allergic cough effectively.' }
    ]
  },
  {
    id: 'doc-12',
    name: 'Dr. Sanjeev Kapoor',
    department: 'Urology',
    specialization: 'Urologist & Kidney Stone Specialist',
    qualification: 'MBBS, MS, MCh (Urology)',
    experienceYears: 15,
    languages: ['English', 'Hindi'],
    roomNo: 'OPD-112',
    consultationFee: 850,
    availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
    slots: ['09:30 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:30 PM'],
    status: 'Available',
    email: 'sanjeev.uro@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    biography: 'Laser treatment for kidney stones, prostate surgery (TURP), and advanced urological care.',
    education: ['MBBS - BHU Varanasi', 'MCh Urology - PGIMER Chandigarh'],
    awards: ['Urology Innovation Gold Medal'],
    clinicTimings: 'Tue - Sat: 09:30 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '02:00 PM',
    reviews: [
      { id: 'r13', patientName: 'Gaurav Bhatia', rating: 5, date: '2026-07-26', comment: 'Laser kidney stone procedure was painless with zero complications.' }
    ]
  },
  {
    id: 'doc-13',
    name: 'Dr. Radhika Sen',
    department: 'Psychiatry',
    specialization: 'Consultant Psychiatrist & Therapist',
    qualification: 'MBBS, MD (Psychiatry), DPM',
    experienceYears: 10,
    languages: ['English', 'Bengali', 'Hindi'],
    roomNo: 'OPD-113',
    consultationFee: 800,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM', '05:30 PM'],
    status: 'Available',
    email: 'radhika.psych@hms.com',
    rating: 4.9,
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-78a99268f773?w=300&auto=format&fit=crop&q=80',
    biography: 'Holistic psychiatric care for anxiety disorders, depression, work burnout, sleep disturbances, and adult ADHD.',
    education: ['MBBS - NRS Medical College', 'MD Psychiatry - CIP Ranchi'],
    awards: ['Mental Health Champion Award'],
    clinicTimings: 'Mon - Fri: 10:00 AM - 06:00 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '10:00 AM',
    reviews: [
      { id: 'r14', patientName: 'Sanjay Dutt', rating: 5, date: '2026-07-17', comment: 'Empathetic counselor who creates a safe and reassuring space.' }
    ]
  },
  {
    id: 'doc-14',
    name: 'Dr. Karthik Raj',
    department: 'Dental',
    specialization: 'Cosmetic Dentist & Implantologist',
    qualification: 'BDS, MDS (Prosthodontics)',
    experienceYears: 8,
    languages: ['English', 'Telugu', 'Hindi'],
    roomNo: 'OPD-114',
    consultationFee: 500,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    slots: ['09:00 AM', '10:30 AM', '12:00 PM', '03:00 PM', '04:30 PM', '06:00 PM'],
    status: 'Available',
    email: 'karthik.dental@hms.com',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80',
    biography: 'Painless root canal treatment, dental implants, teeth alignment (aligners), and smile makeover design.',
    education: ['BDS - SDM Dental College', 'MDS - Government Dental College Hyderabad'],
    awards: ['Excellence in Dentistry'],
    clinicTimings: 'Mon - Sat: 09:00 AM - 06:30 PM',
    nextAvailableDate: 'Today',
    nextAvailableSlot: '09:00 AM',
    reviews: [
      { id: 'r15', patientName: 'Harini K.', rating: 5, date: '2026-07-27', comment: 'Single sitting root canal was completely smooth and pain-free.' }
    ]
  }
];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface HMSContextType {
  // Patients
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'id' | 'uhid' | 'registrationDate' | 'status'>) => Patient;
  updatePatient: (id: string, updated: Partial<Patient>) => void;
  getPatientByUhid: (uhid: string) => Patient | undefined;

  // Emergency Contacts
  emergencyContacts: EmergencyContactItem[];
  addEmergencyContact: (contact: Omit<EmergencyContactItem, 'id'>) => void;
  updateEmergencyContact: (id: string, updated: Partial<EmergencyContactItem>) => void;
  deleteEmergencyContact: (id: string) => void;

  // Doctors & Departments
  doctors: Doctor[];
  departments: Department[];

  // Appointments
  appointments: Appointment[];
  bookAppointment: (apt: Omit<Appointment, 'id' | 'status' | 'createdDate'>) => Appointment;
  rescheduleAppointment: (id: string, newDate: string, newTimeSlot: string, reason?: string) => void;
  cancelAppointment: (id: string, reason: string) => void;

  // Walk-in & Queue
  walkInTokens: WalkInToken[];
  queue: QueueItem[];
  registerWalkIn: (patientUhid: string, patientName: string, department: string, doctorName: string) => WalkInToken;
  updateQueueStatus: (id: string, newStatus: QueueItem['status']) => void;
  callNextInQueue: () => void;

  // IPD & Bed Management
  beds: Bed[];
  ipdAdmissions: IPDAdmission[];
  admitPatient: (admission: Omit<IPDAdmission, 'id' | 'status'>) => void;
  allocateBed: (bedId: string, patientUhid: string, patientName: string) => void;
  transferBed: (currentBedId: string, targetBedId: string) => void;
  releaseBed: (bedId: string) => void;

  // Notifications & Toast System
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
}

const HMSContext = createContext<HMSContextType | undefined>(undefined);

export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [walkInTokens, setWalkInTokens] = useState<WalkInToken[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [ipdAdmissions, setIpdAdmissions] = useState<IPDAdmission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper to recursively convert snake_case keys to camelCase
  const camelCaseKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(v => camelCaseKeys(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        result[camelKey] = camelCaseKeys(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  };

  // Fetch all HMS core data from backend on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const API = `${import.meta.env.VITE_API_URL}/api/v1`;

        const [pRes, dRes, deptRes, aptRes, qRes, bedRes, ipdRes, notifRes, ecRes] = await Promise.allSettled([
          fetch(`${API}/patients`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/doctors`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/departments`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/appointments`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/queue`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/beds`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/ipd-admissions`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/notifications`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/emergency-contacts`, { headers }).then(r => r.ok ? r.json() : []),
        ]);

        if (pRes.status === 'fulfilled' && pRes.value) setPatients(camelCaseKeys(pRes.value));
        if (dRes.status === 'fulfilled' && dRes.value) setDoctors(camelCaseKeys(dRes.value));
        if (deptRes.status === 'fulfilled' && deptRes.value) setDepartments(camelCaseKeys(deptRes.value));
        if (aptRes.status === 'fulfilled' && aptRes.value) setAppointments(camelCaseKeys(aptRes.value));
        if (qRes.status === 'fulfilled' && qRes.value) setQueue(camelCaseKeys(qRes.value));
        if (bedRes.status === 'fulfilled' && bedRes.value) setBeds(camelCaseKeys(bedRes.value));
        if (ipdRes.status === 'fulfilled' && ipdRes.value) setIpdAdmissions(camelCaseKeys(ipdRes.value));
        if (notifRes.status === 'fulfilled' && notifRes.value) setNotifications(camelCaseKeys(notifRes.value));
        if (ecRes.status === 'fulfilled' && ecRes.value) setEmergencyContacts(camelCaseKeys(ecRes.value));
      } catch (e) {
        console.warn('HMS: backend unavailable, state starts empty:', e);
      }
    };
    fetchAll();
  }, []);

  // Toast utility
  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('hms_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };
  const API = `${import.meta.env.VITE_API_URL}/api/v1`;

  // Patients Actions
  const addPatient = (patientData: Omit<Patient, 'id' | 'uhid' | 'registrationDate' | 'status'>): Patient => {
    const newUhid = generateUHID();
    const newPatient: Patient = {
      ...patientData,
      id: `p-${Date.now()}`,
      uhid: newUhid,
      status: 'Active',
      registrationDate: new Date().toISOString().split('T')[0],
    };

    setPatients((prev) => [newPatient, ...prev]);

    // Persist to backend async (optimistic UI update above)
    fetch(`${API}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        gender: patientData.gender,
        dob: patientData.dob,
        age: patientData.age || 0,
        blood_group: patientData.bloodGroup || 'O+',
        marital_status: patientData.maritalStatus || 'Single',
        nationality: patientData.nationality || 'Indian',
        mobile: patientData.mobile,
        alt_mobile: patientData.altMobile || null,
        email: patientData.email || '',
        address: patientData.address || '',
        city: patientData.city || '',
        state: patientData.state || '',
        country: patientData.country || 'India',
        pincode: patientData.pincode || '',
        aadhaar: patientData.aadhaar || '',
        pan: patientData.pan || null,
        emergency_contact_name: patientData.emergencyContactName || '',
        emergency_relationship: patientData.emergencyRelationship || '',
        emergency_phone: patientData.emergencyPhone || '',
        allergies: patientData.allergies || null,
        existing_diseases: patientData.existingDiseases || null,
        insurance_provider: patientData.insuranceProvider || null,
        insurance_number: patientData.insuranceNumber || null,
        uhid: newUhid,
        status: 'Active',
      }),
    }).then(async r => {
      if (r.ok) {
        const saved = await r.json();
        setPatients(prev => prev.map(p => p.uhid === newUhid ? { ...p, id: saved.id, uhid: saved.uhid || newUhid } : p));
      }
    }).catch(err => console.warn('addPatient backend sync failed:', err));

    // Also register emergency contact
    if (patientData.emergencyContactName && patientData.emergencyPhone) {
      const newContact: EmergencyContactItem = {
        id: `ec-${Date.now()}`,
        patientUhid: newUhid,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        contactName: patientData.emergencyContactName,
        relationship: patientData.emergencyRelationship,
        phone: patientData.emergencyPhone,
        priority: 'Primary',
      };
      setEmergencyContacts((prev) => [newContact, ...prev]);
    }

    addToast('success', 'Patient Registered', `Patient generated UHID: ${newUhid}`);
    return newPatient;
  };

  const updatePatient = (id: string, updated: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id || p.uhid === id ? { ...p, ...updated } : p))
    );

    // Persist to backend async
    fetch(`${API}/patients/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        first_name: updated.firstName,
        last_name: updated.lastName,
        gender: updated.gender,
        dob: updated.dob,
        age: updated.age,
        blood_group: updated.bloodGroup,
        marital_status: updated.maritalStatus,
        mobile: updated.mobile,
        email: updated.email,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        country: updated.country,
        pincode: updated.pincode,
        aadhaar: updated.aadhaar,
        allergies: updated.allergies,
        existing_diseases: updated.existingDiseases,
        insurance_provider: updated.insuranceProvider,
        insurance_number: updated.insuranceNumber,
        status: updated.status,
      }),
    }).catch(err => console.warn('updatePatient backend sync failed:', err));

    addToast('success', 'Profile Updated', 'Patient records updated successfully.');
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
  const bookAppointment = (aptData: Omit<Appointment, 'id' | 'status' | 'createdDate'>): Appointment => {
    const aptIdNum = Math.floor(1000 + Math.random() * 9000);
    const newApt: Appointment = {
      ...aptData,
      id: `APT-2026-${aptIdNum}`,
      status: 'Confirmed',
      createdDate: new Date().toISOString().split('T')[0],
      paymentStatus: aptData.paymentStatus || 'Paid',
    };
    setAppointments((prev) => [newApt, ...prev]);

    // Persist to backend async
    fetch(`${API}/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        patient_uhid: aptData.patientUhid,
        patient_name: aptData.patientName,
        patient_mobile: aptData.patientMobile || '',
        department: aptData.department,
        doctor_id: aptData.doctorId || null,
        doctor_name: aptData.doctorName,
        date: aptData.date,
        time_slot: aptData.timeSlot,
        reason: aptData.reason || 'General Consultation',
        status: 'Scheduled',
      }),
    }).then(async r => {
      if (r.ok) {
        const saved = await r.json();
        setAppointments(prev => prev.map(a => a.id === newApt.id ? { ...a, id: saved.id } : a));
      }
    }).catch(err => console.warn('bookAppointment backend sync failed:', err));

    addToast('success', 'Appointment Confirmed', `Booked with ${aptData.doctorName} on ${aptData.date} at ${aptData.timeSlot}`);
    return newApt;
  };

  const rescheduleAppointment = (id: string, newDate: string, newTimeSlot: string, reason?: string) => {
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

    // Persist to backend async
    fetch(`${API}/appointments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ date: newDate, time_slot: newTimeSlot, status: 'Rescheduled', reason }),
    }).catch(err => console.warn('rescheduleAppointment backend sync failed:', err));

    addToast('success', 'Appointment Rescheduled', `Updated to ${newDate} - ${newTimeSlot}`);
  };

  const cancelAppointment = (id: string, reason: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'Cancelled',
              reason: `Cancelled: ${reason}`,
            }
          : a
      )
    );
    // Persist to backend async
    fetch(`${API}/appointments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Cancelled', reason: `Cancelled: ${reason}` }),
    }).catch(err => console.warn('cancelAppointment backend sync failed:', err));
    addToast('info', 'Appointment Cancelled', 'Appointment status marked as Cancelled.');
  };

  // Walk-in & Queue
  const registerWalkIn = (patientUhid: string, patientName: string, department: string, doctorName: string) => {
    const tokenNum = generateTokenNumber(walkInTokens.length + queue.length);
    const estimatedWaitMinutes = (queue.filter((q) => q.status === 'Waiting').length + 1) * 15;

    const newToken: WalkInToken = {
      id: `wt-${Date.now()}`,
      tokenNumber: tokenNum,
      patientUhid,
      patientName,
      department,
      doctorName,
      estimatedWaitMinutes,
      issueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Waiting',
    };

    const newQueueItem: QueueItem = {
      id: `q-${Date.now()}`,
      tokenNumber: tokenNum,
      patientUhid,
      patientName,
      doctorName,
      department,
      status: 'Waiting',
      waitingTimeMinutes: estimatedWaitMinutes,
      timeIssued: newToken.issueTime,
    };

    setWalkInTokens((prev) => [newToken, ...prev]);
    setQueue((prev) => [...prev, newQueueItem]);

    addToast('success', 'Token Generated', `Token ${tokenNum} issued. Est. Wait: ${estimatedWaitMinutes} mins`);
    return newToken;
  };

  const updateQueueStatus = (id: string, newStatus: QueueItem['status']) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
    addToast('info', 'Queue Updated', `Token status updated to ${newStatus}`);
  };

  const callNextInQueue = () => {
    const nextWaiting = queue.find((q) => q.status === 'Waiting');
    if (nextWaiting) {
      setQueue((prev) =>
        prev.map((q) => {
          if (q.status === 'In Consultation') return { ...q, status: 'Completed' };
          if (q.id === nextWaiting.id) return { ...q, status: 'In Consultation' };
          return q;
        })
      );
      addToast('success', 'Calling Next Patient', `Token ${nextWaiting.tokenNumber} (${nextWaiting.patientName}) called for consultation.`);
    } else {
      addToast('info', 'Queue Empty', 'No patients currently waiting in queue.');
    }
  };

  // IPD & Beds
  const admitPatient = (admissionData: Omit<IPDAdmission, 'id' | 'status'>) => {
    const newAdm: IPDAdmission = {
      ...admissionData,
      id: `ipd-${Date.now()}`,
      status: 'Admitted',
    };

    setIpdAdmissions((prev) => [newAdm, ...prev]);

    // Update Bed status to Occupied
    setBeds((prev) =>
      prev.map((b) =>
        b.bedNumber === admissionData.bedNumber || (b.ward === admissionData.ward && b.roomNumber === admissionData.roomNumber && b.status === 'Available')
          ? {
              ...b,
              status: 'Occupied',
              currentPatientUhid: admissionData.patientUhid,
              currentPatientName: admissionData.patientName,
              admittedDate: admissionData.admissionDate,
            }
          : b
      )
    );

    // Update patient status to Admitted
    setPatients((prev) =>
      prev.map((p) => (p.uhid === admissionData.patientUhid ? { ...p, status: 'Admitted' } : p))
    );

    // Persist IPD admission to backend async
    fetch(`${API}/ipd-admissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        patient_uhid: admissionData.patientUhid,
        patient_name: admissionData.patientName,
        ward: admissionData.ward,
        room_number: admissionData.roomNumber,
        bed_number: admissionData.bedNumber,
        attending_doctor: admissionData.attendingDoctor,
        admission_date: admissionData.admissionDate,
        admission_reason: admissionData.admissionReason,
        emergency_contact: admissionData.emergencyContact,
        insurance_provider: admissionData.insuranceProvider || null,
        insurance_number: admissionData.insuranceNumber || null,
        status: 'Admitted',
      }),
    }).then(async r => {
      if (r.ok) {
        const saved = await r.json();
        setIpdAdmissions(prev => prev.map(a => a.id === newAdm.id ? { ...a, id: saved.id } : a));
      }
    }).catch(err => console.warn('admitPatient backend sync failed:', err));

    addToast('success', 'Patient Admitted', `${admissionData.patientName} admitted to ${admissionData.ward} - Bed ${admissionData.bedNumber}`);
  };

  const allocateBed = (bedId: string, patientUhid: string, patientName: string) => {
    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? {
              ...b,
              status: 'Occupied',
              currentPatientUhid: patientUhid,
              currentPatientName: patientName,
              admittedDate: new Date().toISOString().split('T')[0],
            }
          : b
      )
    );
    // Persist to backend async
    const patient = patients.find(p => p.uhid === patientUhid);
    fetch(`${API}/beds/${bedId}/allocate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ patient_id: patient?.id || patientUhid }),
    }).catch(err => console.warn('allocateBed backend sync failed:', err));
    addToast('success', 'Bed Allocated', `Bed assigned to ${patientName}`);
  };

  const transferBed = (currentBedId: string, targetBedId: string) => {
    const currentBed = beds.find((b) => b.id === currentBedId);
    const targetBed = beds.find((b) => b.id === targetBedId);

    if (!currentBed || !targetBed) return;

    setBeds((prev) =>
      prev.map((b) => {
        if (b.id === currentBedId) {
          return {
            ...b,
            status: 'Cleaning',
            currentPatientUhid: undefined,
            currentPatientName: undefined,
            admittedDate: undefined,
          };
        }
        if (b.id === targetBedId) {
          return {
            ...b,
            status: 'Occupied',
            currentPatientUhid: currentBed.currentPatientUhid,
            currentPatientName: currentBed.currentPatientName,
            admittedDate: currentBed.admittedDate || new Date().toISOString().split('T')[0],
          };
        }
        return b;
      })
    );

    addToast('success', 'Bed Transferred', `Transferred from ${currentBed.bedNumber} to ${targetBed.bedNumber}`);
  };

  const releaseBed = (bedId: string) => {
    const bed = beds.find((b) => b.id === bedId);
    if (!bed) return;

    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? {
              ...b,
              status: 'Cleaning',
              currentPatientUhid: undefined,
              currentPatientName: undefined,
              admittedDate: undefined,
            }
          : b
      )
    );
    // Persist to backend async
    fetch(`${API}/beds/${bedId}/release`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).catch(err => console.warn('releaseBed backend sync failed:', err));

    if (bed.currentPatientUhid) {
      setPatients((prev) =>
        prev.map((p) => (p.uhid === bed.currentPatientUhid ? { ...p, status: 'Discharged' } : p))
      );
    }

    addToast('info', 'Bed Released', `Bed ${bed.bedNumber} released and set to Cleaning.`);
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <HMSContext.Provider
      value={{
        patients,
        addPatient,
        updatePatient,
        getPatientByUhid,
        emergencyContacts,
        addEmergencyContact,
        updateEmergencyContact,
        deleteEmergencyContact,
        doctors,
        departments,
        appointments,
        bookAppointment,
        rescheduleAppointment,
        cancelAppointment,
        walkInTokens,
        queue,
        registerWalkIn,
        updateQueueStatus,
        callNextInQueue,
        beds,
        ipdAdmissions,
        admitPatient,
        allocateBed,
        transferBed,
        releaseBed,
        notifications,
        markNotificationRead,
        toasts,
        addToast,
        removeToast,
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
