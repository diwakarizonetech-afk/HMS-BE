import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import {
  Users,
  CalendarCheck,
  FlaskConical,
  Pill,
  BedDouble,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HeartPulse,
  Brain,
  Bone,
  Baby,
  Stethoscope,
  Ambulance,
  Phone,
  Mail,
  Send,
  Building2,
  Clock,
  UserCheck,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-cyan-50/60 via-blue-50/40 to-white pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Background Decorative Graphic Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-200/40 to-blue-300/30 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Text Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-semibold shadow-2xs">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Next-Gen Smart Healthcare Operations</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Smart Hospital <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  Management System
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Digital platform for patient management, appointments, doctors, laboratory, pharmacy and hospital operations.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-600/25 transition-all cursor-pointer text-sm"
                >
                  <span>Login to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#about"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-xs transition-all cursor-pointer text-sm"
                >
                  Learn More
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <h4 className="text-xl font-black text-slate-900">99.9%</h4>
                  <p className="text-xs text-slate-500 font-medium">Uptime Guarantee</p>
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">250+</h4>
                  <p className="text-xs text-slate-500 font-medium">Daily OPD Tokens</p>
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">ISO 27001</h4>
                  <p className="text-xs text-slate-500 font-medium">HIPAA Compliant</p>
                </div>
              </div>
            </div>

            {/* Hero Illustration Card Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-3xl bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-2xl border border-slate-100">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">AegisCare Main Facility</h3>
                        <p className="text-[11px] text-slate-500">Live Hospital Status</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      OPERATIONAL
                    </span>
                  </div>

                  {/* Simulated OPD Queue Metric */}
                  <div className="mt-4 space-y-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">OPD Queue Status</p>
                          <p className="text-[11px] text-slate-500">Avg. Wait: 12 Minutes</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-blue-700">TK-104 active</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BedDouble className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">IPD Bed Availability</p>
                          <p className="text-[11px] text-slate-500">42 Beds Total</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        12 Available
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Doctors On Duty</p>
                          <p className="text-[11px] text-slate-500">18 Specialists Active</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        Cardio & Neuro
                      </span>
                    </div>
                  </div>

                  {/* Floating Quick Action Badge */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Secure Role Based Access
                    </span>
                    <button
                      onClick={() => navigate('/login')}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Staff Login →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Cards Grid */}
      <section id="about" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Core Architecture
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Integrated Hospital Operations
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A unified digital ecosystem designed to streamline reception, clinical workflows, laboratory tasks, and bed allocations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1: Patient Management */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Patient Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Automated UHID generation, comprehensive demographic records, emergency contact logging, and medical history tracking.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant UHID Search & Filtering
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tabbed Profile Updates
                </li>
              </ul>
            </div>

            {/* Card 2: Appointment Management */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Appointment Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Walk-in token registration, doctor slot calendar, live OPD queue management, and easy rescheduling/cancellation workflows.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live Queue Call Next / Hold / Skip
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Estimated Wait Time Calculation
                </li>
              </ul>
            </div>

            {/* Card 3: Laboratory */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-6 shadow-md shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Laboratory</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Sample collection tracking, test order dispatch, diagnostic report upload, and pathologist authorization workflows.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Digital Diagnostic Requisitions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fast-Track Lab Results
                </li>
              </ul>
            </div>

            {/* Card 4: Pharmacy */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-6 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pharmacy</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                E-prescription dispensing, real-time drug inventory alerts, dosage guidance, and point-of-sale billing integration.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stock Level Low Quantity Alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> OPD & IPD Medicine Billing
                </li>
              </ul>
            </div>

            {/* Card 5: IPD & Bed Management */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-6 shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <BedDouble className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">In-Patient Department (IPD)</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Visual bed allocation grid by ward and room, patient admission forms, bed transfers, and discharge management.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Color-Coded Status (Occupied, Cleaning, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> One-Click Bed Allocation & Release
                </li>
              </ul>
            </div>

            {/* Card 6: Analytics */}
            <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-6 shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hospital Analytics</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Operational KPIs, daily footfall metrics, department revenue summaries, and bed turnover statistics.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Executive Operational Reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Real-Time Footfall Tracking
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="departments" className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Specialties
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Hospital Departments
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              World-class clinical specialties led by expert doctors equipped with advanced diagnostic technologies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Cardiology</h4>
                <p className="text-xs text-slate-500 mt-1">Interventional cardiology, ECG, echocardiography, and cardiac surgery.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Neurology</h4>
                <p className="text-xs text-slate-500 mt-1">Comprehensive treatment for stroke, epilepsy, spine, and brain disorders.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Bone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Orthopedics</h4>
                <p className="text-xs text-slate-500 mt-1">Joint replacement, fracture trauma care, and arthroscopic procedures.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Baby className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Pediatrics</h4>
                <p className="text-xs text-slate-500 mt-1">Neonatal ICU, pediatric emergency, and child immunization programs.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">General Medicine</h4>
                <p className="text-xs text-slate-500 mt-1">Primary adult health evaluations, diabetes management, and preventive care.</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Ambulance className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Emergency & Trauma</h4>
                <p className="text-xs text-slate-500 mt-1">24/7 level-1 trauma care, cardiac emergency response, and triage units.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Get In Touch
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Hospital Administration & Inquiries
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Have questions regarding hospital services, OPD appointment bookings, or insurance tie-ups? Contact our reception team directly.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">24/7 Helpline</p>
                    <p className="text-sm font-bold text-slate-900">+91 (080) 4567-8900</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">General Email</p>
                    <p className="text-sm font-bold text-slate-900">reception@aegiscare-hms.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-7 bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Send an Inquiry Message</h3>
              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-100/80 text-emerald-900 text-sm font-semibold text-center border border-emerald-300">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  Thank you! Your message has been sent to reception.
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="e.g. ramesh@example.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Inquiry Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="How can we assist you?"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer text-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
