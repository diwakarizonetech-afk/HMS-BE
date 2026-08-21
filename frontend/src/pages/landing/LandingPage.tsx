import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import {
  Users,
  CalendarCheck,
  FlaskConical,
  Pill,
  Boxes,
  Headset,
  Syringe,
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
  ChevronLeft,
  ChevronRight,
  Activity,
  BedDouble,
  Timer,
  UserCheck,
  FileCheck2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Module data — 7 core hospital roles                                 */
/* ------------------------------------------------------------------ */

interface HospitalModule {
  icon: React.ElementType;
  title: string;
  description: string;
  bullets: string[];
  iconBg: string;
  iconShadow: string;
  hex: string;
  badgeText: string;
  image: string;
}

const HOSPITAL_MODULES: HospitalModule[] = [
  {
    icon: Headset,
    title: 'Receptionist',
    description:
      'Walk-in registration, appointment scheduling, billing counters, and front-desk patient coordination.',
    bullets: ['Instant Token & Appointment Booking', 'Front-Desk Billing & Coordination'],
    iconBg: 'bg-purple-600',
    iconShadow: 'shadow-purple-600/30',
    hex: '#9333ea',
    badgeText: 'Module 01',
    image: '/reception-1.jpg',
  },
  {
    icon: Users,
    title: 'Patient',
    description:
      'Unified patient profiles with medical history, admission records, and real-time treatment status across every visit.',
    bullets: ['Unified UHID & Medical History', 'Live Treatment & Visit Timeline'],
    iconBg: 'bg-blue-600',
    iconShadow: 'shadow-blue-600/30',
    hex: '#2563eb',
    badgeText: 'Module 02',
    image: '/patient-1.jpg',
  },
  {
    icon: Stethoscope,
    title: 'Doctor',
    description:
      'Consultation dashboard for OPD queues, e-prescriptions, diagnosis notes, and complete patient case history.',
    bullets: ['Smart OPD Queue & Case Notes', 'One-Click e-Prescription'],
    iconBg: 'bg-indigo-600',
    iconShadow: 'shadow-indigo-600/30',
    hex: '#4f46e5',
    badgeText: 'Module 03',
    image: '/doctor-1.jpg',
  },
  {
    icon: Syringe,
    title: 'Nurse',
    description:
      'Ward rounds, vitals tracking, medication administration schedules, and shift handover notes in one workspace.',
    bullets: ['Vitals & Medication Charting', 'Shift Handover & Task Alerts'],
    iconBg: 'bg-rose-600',
    iconShadow: 'shadow-rose-600/30',
    hex: '#e11d48',
    badgeText: 'Module 04',
    image: '/nurse-1.jpg',
  },
  {
    icon: FlaskConical,
    title: 'Lab',
    description:
      'Sample collection tracking, test order dispatch, diagnostic report uploads, and pathologist sign-off workflows.',
    bullets: ['Digital Diagnostic Requisitions', 'Fast-Track Result Authorization'],
    iconBg: 'bg-cyan-600',
    iconShadow: 'shadow-cyan-600/30',
    hex: '#0891b2',
    badgeText: 'Module 05',
    image: '/lab-1.jpg',
  },
  {
    icon: Pill,
    title: 'Pharmacy',
    description:
      'E-prescription dispensing, real-time drug stock alerts, dosage guidance, and integrated OPD/IPD billing.',
    bullets: ['Low-Stock & Expiry Alerts', 'Point-of-Sale Medicine Billing'],
    iconBg: 'bg-emerald-600',
    iconShadow: 'shadow-emerald-600/30',
    hex: '#059669',
    badgeText: 'Module 06',
    image: '/pharmacy-1.jpg',
  },
  {
    icon: Boxes,
    title: 'Store & Inventory',
    description:
      'Central procurement, stock movement tracking, vendor management, and department-wise supply allocation.',
    bullets: ['Purchase Order & Vendor Tracking', 'Department-Wise Stock Allocation'],
    iconBg: 'bg-amber-600',
    iconShadow: 'shadow-amber-600/30',
    hex: '#d97706',
    badgeText: 'Module 07',
    image: '/store-1.jpg',
  },
];

const MODULE_COUNT = HOSPITAL_MODULES.length;
const STEP_X = 172; // px — horizontal distance between neighbouring cards
const STEP_Z = 130; // px — how far each step recedes into the screen
const STEP_ROTATE = 22; // deg — inward tilt per step

// Shortest signed distance from `active` to `i` around the circular deck
function getOffset(i: number, active: number, total: number) {
  let diff = i - active;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

// Keep the on-card explanation short — the full text still lives in the data
function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const AUTOPLAY_INTERVAL = 3200; // ms

/* ------------------------------------------------------------------ */
/* SystemOverview — 3D live-dashboard mockup + product explanation     */
/* Sits directly after the Hero section.                               */
/* ------------------------------------------------------------------ */

const DEPARTMENT_LOAD = [
  { label: 'Cardiology', pct: 82, color: '#e11d48' },
  { label: 'Orthopedics', pct: 64, color: '#d97706' },
  { label: 'Pediatrics', pct: 48, color: '#0891b2' },
  { label: 'General Medicine', pct: 71, color: '#059669' },
];

const LIVE_QUEUE = [
  { initials: 'RK', name: 'Rahul Krishnan', status: 'In Consultation — Dr. Menon', color: '#4f46e5' },
  { initials: 'SM', name: 'Sara Mathews', status: 'Waiting — Token 42', color: '#0891b2' },
];

const OVERVIEW_STATS = [
  { icon: Activity, label: 'OPD Tokens Today', value: '182', color: '#2563eb' },
  { icon: BedDouble, label: 'Bed Occupancy', value: '76%', color: '#0891b2' },
  { icon: Timer, label: 'Avg. Wait Time', value: '8 min', color: '#d97706' },
];

const OVERVIEW_CHECKLIST = [
  'Unified patient record shared across reception, OPD, lab, pharmacy and wards',
  'Real-time OPD token, bed and inventory visibility for staff on duty',
  'Role-based dashboards — doctors, nurses, pharmacists and admins see only what they need',
  'Built for Indian hospital workflows, with DLT-compliant SMS notifications',
];

const SystemOverview: React.FC = () => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 8, y: (px - 0.5) * 10 });
  };
  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <section id="overview" className="py-20 bg-white border-t border-slate-100 overflow-hidden">
      <style>{`
        @keyframes hms-ov-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-9px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hms-ov-float { animation: none !important; }
        }
      `}</style>

      <div
        ref={sectionRef}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out"
      >
        <div className="grid lg:grid-cols-12 gap-14 lg:gap-16 items-center">
          {/* Left — 3D live dashboard mockup */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div
              ref={wrapRef}
              onMouseMove={handleMove}
              onMouseLeave={resetTilt}
              className="relative mx-auto max-w-md"
              style={{ perspective: '1600px' }}
            >
              {/* Grounding shadow */}
              <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 w-[70%] h-10 rounded-full bg-slate-900/10 blur-2xl pointer-events-none" />

              <div
                className="relative transition-transform duration-300 ease-out"
                style={
                  {
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${8 + tilt.x}deg) rotateY(${tilt.y}deg)`,
                  } as React.CSSProperties
                }
              >
                {/* Device panel */}
                <div className="relative rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl overflow-hidden">
                  {/* Title bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Live
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Stat row */}
                    <div className="grid grid-cols-3 gap-3">
                      {OVERVIEW_STATS.map((s) => {
                        const StatIcon = s.icon;
                        return (
                          <div
                            key={s.label}
                            className="p-2.5 rounded-xl bg-slate-50 border-l-2"
                            style={{ borderColor: s.color }}
                          >
                            <StatIcon className="w-3.5 h-3.5 mb-1.5" style={{ color: s.color }} />
                            <p className="text-sm font-extrabold text-slate-900 leading-none">{s.value}</p>
                            <p className="text-[9px] text-slate-500 mt-1 leading-tight">{s.label}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Department load */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Department Load
                      </p>
                      {DEPARTMENT_LOAD.map((d) => (
                        <div key={d.label} className="flex items-center gap-2.5">
                          <span className="w-20 sm:w-24 text-[10px] font-semibold text-slate-500 shrink-0">
                            {d.label}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: visible ? `${d.pct}%` : '0%',
                                backgroundColor: d.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{d.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Live queue */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Live Patient Queue
                      </p>
                      {LIVE_QUEUE.map((q) => (
                        <div
                          key={q.name}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <span
                            className="w-8 h-8 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: q.color }}
                          >
                            {q.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{q.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{q.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating status chips */}
                <div
                  className="hms-ov-float absolute -top-5 -right-4 sm:-right-8 rotate-3 flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2"
                  style={{ animation: 'hms-ov-float 5s ease-in-out infinite' }}
                >
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Dr. Menon
                    <br />
                    <span className="text-emerald-600">Online</span>
                  </span>
                </div>

                <div
                  className="hms-ov-float absolute -bottom-5 -left-4 sm:-left-8 -rotate-2 flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2"
                  style={{ animation: 'hms-ov-float 6s ease-in-out 0.8s infinite' }}
                >
                  <span className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Lab Report
                    <br />
                    <span className="text-cyan-600">Ready</span>
                  </span>
                </div>

                <div
                  className="hms-ov-float hidden sm:flex absolute top-1/3 -left-10 rotate-2 items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2"
                  style={{ animation: 'hms-ov-float 5.5s ease-in-out 1.4s infinite' }}
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <BedDouble className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Ward 3B
                    <br />
                    <span className="text-blue-600">4 Beds Free</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — product explanation */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <span className="inline-block text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              System Overview
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Every Department, Working Off The Same Live Record
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              From the moment a patient takes a token at reception to the moment their prescription is
              billed at pharmacy, every step updates the same patient record in real time — no paper
              handoffs, no re-entering the same details twice.
            </p>

            <ul className="space-y-3">
              {OVERVIEW_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="#about"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all text-sm"
            >
              <span>Explore the 7 Modules</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* ModuleShowcase — full-width 3D coverflow, photo + caption per card  */
/* ------------------------------------------------------------------ */

const ModuleShowcase: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const panelRef = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(false);

  const active = HOSPITAL_MODULES[activeIndex];

  // Slow autoplay through the deck, paused while the user is exploring
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % MODULE_COUNT);
    }, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(id);
  }, [paused]);

  // Reveal the whole diagram once when it scrolls into view
  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPanelVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Mouse-parallax tilt for the 3D rig — gives a subtle "look around" feel
  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 6, y: (px - 0.5) * 8 });
  };

  const handleTiltLeave = () => {
    setTilt({ x: 0, y: 0 });
    setPaused(false);
  };

  const goPrev = () => setActiveIndex((i) => (i - 1 + MODULE_COUNT) % MODULE_COUNT);
  const goNext = () => setActiveIndex((i) => (i + 1) % MODULE_COUNT);

  return (
    <div
      ref={panelRef}
      style={{
        opacity: panelVisible ? 1 : 0,
        transform: panelVisible ? 'translateY(0)' : 'translateY(24px)',
      }}
      className="w-full transition-all duration-700 ease-out"
    >
      <style>{`
        @keyframes hms3d-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes hms3d-glow {
          0%, 100% { box-shadow: 0 26px 50px -18px var(--hms-glow, #2563eb55); }
          50% { box-shadow: 0 34px 60px -16px var(--hms-glow, #2563eb75); }
        }
        @keyframes hms3d-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: .5; }
          85% { opacity: .3; }
          100% { transform: translateY(-160px) translateX(10px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hms3d-bob, .hms3d-glow, .hms3d-particle { animation: none !important; }
        }
      `}</style>

      <div
        className="relative w-full h-[460px] sm:h-[500px] rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-inner overflow-hidden"
        style={{ perspective: '1800px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseMove={handleTiltMove}
        onMouseLeave={handleTiltLeave}
      >
        {/* Perspective floor grid — grounds the deck in 3D space */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[88%] w-[900px] h-[900px] pointer-events-none"
          style={{
            transform: 'translate(-50%, -50%) translateZ(-260px) rotateX(82deg)',
            backgroundImage:
              'repeating-linear-gradient(0deg, #cbd5e1 0px, #cbd5e1 1px, transparent 1px, transparent 34px), repeating-linear-gradient(90deg, #cbd5e1 0px, #cbd5e1 1px, transparent 1px, transparent 34px)',
            opacity: 0.4,
            maskImage: 'radial-gradient(ellipse, black 15%, transparent 68%)',
            WebkitMaskImage: 'radial-gradient(ellipse, black 15%, transparent 68%)',
          }}
        />

        {/* Soft grounding shadow beneath the active card */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 w-72 h-16 rounded-full blur-2xl pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: active.hex, opacity: 0.2, transform: 'translate(-50%, 160px)' }}
        />

        {/* Ambient drifting particles */}
        {[...Array(8)].map((_, p) => (
          <span
            key={p}
            className="hms3d-particle absolute rounded-full pointer-events-none transition-colors duration-500"
            style={{
              left: `${8 + p * 11}%`,
              top: '82%',
              width: 4,
              height: 4,
              backgroundColor: active.hex,
              animation: `hms3d-drift ${5 + p}s ease-in-out ${p * 0.6}s infinite`,
            }}
          />
        ))}

        {/* Eyebrow readout */}
        <div className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase z-20">
          <span
            className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
            style={{ backgroundColor: active.hex }}
          />
          Module {String(activeIndex + 1).padStart(2, '0')} of {String(MODULE_COUNT).padStart(2, '0')}
        </div>

        {/* The 3D stage — the whole deck responds to mouse parallax */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${6 + tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {HOSPITAL_MODULES.map((module, i) => {
            const Icon = module.icon;
            const isActive = i === activeIndex;
            const offset = getOffset(i, activeIndex, MODULE_COUNT);
            const abs = Math.abs(offset);
            const x = offset * STEP_X;
            const z = -abs * STEP_Z;
            const rotateY = -offset * STEP_ROTATE;
            const scale = Math.max(1 - abs * 0.14, 0.55);
            const opacity = Math.max(1 - abs * 0.28, 0.15);
            const zIndex = 100 - abs * 10;

            return (
              <button
                key={module.title}
                onClick={() => setActiveIndex(i)}
                aria-label={`Show ${module.title} module`}
                aria-current={isActive}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: 'transform 550ms cubic-bezier(0.22, 1, 0.36, 1), opacity 550ms ease',
                }}
              >
                <span
                  className={`hms3d-bob relative block rounded-[1.5rem] overflow-hidden border-2 bg-slate-100 transition-[width,height] duration-300 ${isActive ? 'hms3d-glow w-56 h-72 sm:w-64 sm:h-80' : 'w-36 h-52 sm:w-40 sm:h-60'
                    }`}
                  style={{
                    display: 'block',
                    borderColor: isActive ? active.hex : 'rgba(226,232,240,0.9)',
                    // @ts-ignore custom property for the glow keyframes
                    '--hms-glow': `${active.hex}55`,
                    animationDelay: `${i * 0.25}s`,
                  } as React.CSSProperties}
                >
                  <img
                    src={module.image}
                    alt={`${module.title} module`}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    loading={isActive ? 'eager' : 'lazy'}
                    decoding="async"
                  />

                  {/* Icon badge, top-left */}
                  <span
                    className={`absolute top-2.5 left-2.5 rounded-lg flex items-center justify-center shadow-md transition-all duration-300 ${isActive
                      ? `${module.iconBg} text-white w-9 h-9 sm:w-10 sm:h-10`
                      : 'bg-white/90 text-slate-500 w-7 h-7'
                      }`}
                  >
                    <Icon className={isActive ? 'w-4.5 h-4.5 sm:w-5 sm:h-5' : 'w-3.5 h-3.5'} />
                  </span>

                  {/* Bottom caption — title always, short explanation only on the active card */}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-8 pb-3 flex flex-col items-start text-left">
                    <span
                      className={`font-extrabold text-white uppercase tracking-wide leading-tight ${isActive ? 'text-[12px] sm:text-sm' : 'text-[9px] sm:text-[10px]'
                        }`}
                    >
                      {module.title}
                    </span>
                    {isActive && (
                      <span className="mt-1 text-[10px] sm:text-[11px] text-white/85 leading-snug">
                        {truncate(module.description, 92)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Prev / next controls */}
        <button
          onClick={goPrev}
          aria-label="Previous module"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 shadow-md flex items-center justify-center hover:text-slate-800 hover:border-slate-300 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          aria-label="Next module"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 shadow-md flex items-center justify-center hover:text-slate-800 hover:border-slate-300 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {HOSPITAL_MODULES.map((module, i) => (
            <button
              key={module.title}
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to ${module.title}`}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 22 : 8,
                backgroundColor: i === activeIndex ? active.hex : '#cbd5e1',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Department cards — mouse-tilt, depth badge, specialty tag           */
/* ------------------------------------------------------------------ */

interface DepartmentItem {
  icon: React.ElementType;
  title: string;
  description: string;
  tag: string;
  iconBg: string;
  iconText: string;
  hex: string;
}

const DEPARTMENTS: DepartmentItem[] = [
  {
    icon: HeartPulse,
    title: 'Cardiology',
    description: 'Interventional cardiology, ECG, echocardiography, and cardiac surgery.',
    tag: '24/7 ICU',
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    hex: '#e11d48',
  },
  {
    icon: Brain,
    title: 'Neurology',
    description: 'Comprehensive treatment for stroke, epilepsy, spine, and brain disorders.',
    tag: 'Diagnostic',
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    hex: '#4f46e5',
  },
  {
    icon: Bone,
    title: 'Orthopedics',
    description: 'Joint replacement, fracture trauma care, and arthroscopic procedures.',
    tag: 'Surgical',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    hex: '#d97706',
  },
  {
    icon: Baby,
    title: 'Pediatrics',
    description: 'Neonatal ICU, pediatric emergency, and child immunization programs.',
    tag: 'Child Care',
    iconBg: 'bg-cyan-50',
    iconText: 'text-cyan-600',
    hex: '#0891b2',
  },
  {
    icon: Stethoscope,
    title: 'General Medicine',
    description: 'Primary adult health evaluations, diabetes management, and preventive care.',
    tag: 'Preventive',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    hex: '#059669',
  },
  {
    icon: Ambulance,
    title: 'Emergency & Trauma',
    description: '24/7 level-1 trauma care, cardiac emergency response, and triage units.',
    tag: '24/7 Trauma',
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    hex: '#dc2626',
  },
];

const DepartmentCard: React.FC<{ dept: DepartmentItem }> = ({ dept }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const Icon = dept.icon;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 8, y: (px - 0.5) * 8 });
  };

  const handleLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(${hovered ? -6 : 0}px)`,
        transition: 'transform 300ms ease, box-shadow 300ms ease',
      }}
      className="group relative p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-xl overflow-hidden"
    >
      {/* Faint background icon — depth accent */}
      <Icon className="absolute -right-4 -bottom-4 w-28 h-28 text-slate-900/5 pointer-events-none" strokeWidth={1.5} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-2xl ${dept.iconBg} ${dept.iconText} flex items-center justify-center shadow-sm`}>
          <Icon className="w-7 h-7" />
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
          style={{ color: dept.hex, backgroundColor: `${dept.hex}14` }}
        >
          {dept.tag}
        </span>
      </div>

      <h4 className="relative text-base font-bold text-slate-900 mb-1.5">{dept.title}</h4>
      <p className="relative text-xs text-slate-500 leading-relaxed">{dept.description}</p>

      <span
        className="absolute left-6 right-6 bottom-0 h-0.5 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
        style={{ backgroundColor: dept.hex }}
      />
    </div>
  );
};


/* ------------------------------------------------------------------ */
/* LandingPage                                                         */
/* ------------------------------------------------------------------ */

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
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-cyan-50/60 via-blue-50/40 to-white pt-10 pb-0 lg:pt-16 lg:pb-0 min-h-[580px] lg:min-h-[640px] flex flex-col justify-between">
        {/* Background Decorative Graphic Blobs */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-200/40 to-blue-300/30 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Left Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            {/* Hero Text Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left pb-10 lg:pb-20 pt-4">
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

            {/* Mobile Fallback Image Container */}
            <div className="lg:hidden relative flex justify-center items-end w-full mt-4">
              <img
                src="/hms_landing_img1.png"
                alt="Smart Hospital Management System"
                className="w-full h-auto max-h-[440px] sm:max-h-[480px] object-contain object-bottom drop-shadow-2xl"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Image Visual - Flush to Screen Right End (0) and Bottom (0) with reduced top height */}
        <div className="hidden lg:flex absolute right-0 bottom-0 top-0 w-1/2 max-w-[580px] xl:max-w-[660px] 2xl:max-w-[740px] items-end justify-end pointer-events-none z-0">
          <div className="relative w-full h-full flex items-end justify-end">
            <div className="absolute right-0 bottom-0 w-[85%] h-[85%] bg-gradient-to-tr from-cyan-300/30 via-blue-400/20 to-indigo-300/25 rounded-full blur-3xl -z-10" />
            <img
              src="/hms_landing_img1.png"
              alt="Smart Hospital Management System"
              className="w-full h-auto max-h-[520px] lg:max-h-[550px] xl:max-h-[600px] 2xl:max-h-[640px] object-contain object-right-bottom drop-shadow-2xl hover:scale-[1.015] transition-transform duration-300 pointer-events-auto block"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
        </div>
      </section>

      {/* System Overview — 3D live dashboard mockup + product explanation */}
      <SystemOverview />

      {/* How It Works - Staggered 4-Step Patient Journey Section */}
      <section id="how-it-works" className="relative py-16 sm:py-20 bg-slate-50/70 border-y border-slate-200/80 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>How It Works</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Simple Steps To Better <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">Healthcare Operations</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Streamlined patient journey from instant token registration to doctor consultation, lab diagnostics, and care management.
            </p>
          </div>

          {/* Desktop Flex Layout with Inline SVG Connectors */}
          <div className="hidden lg:flex items-start justify-between max-w-6xl mx-auto px-2 relative h-[230px]">
            {/* Defs for arrowheads */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
              <defs>
                <marker id="hms-arrowhead-fixed" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
                </marker>
                <linearGradient id="hms-arrow-grad-fixed" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>

            {/* STEP 01: Circle at TOP (Center Y=40px), Text BELOW */}
            <div className="w-[210px] flex flex-col items-center text-center shrink-0">
              {/* Circle 01 */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-blue-500 shadow-md shadow-blue-500/15 flex items-center justify-center relative z-10">
                  <CalendarCheck className="w-8 h-8 text-blue-600" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs border-2 border-white">
                    01
                  </span>
                </div>
              </div>
              {/* Text 01 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow h-[114px] flex flex-col justify-center w-full">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Schedule & Tokening</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Online appointment booking and live OPD queue token generation.
                </p>
              </div>
            </div>

            {/* CONNECTOR 1: Curves Down from Circle 01 (Y=40) to Circle 02 (Y=180) */}
            <div className="flex-1 h-[220px] shrink-0 pointer-events-none mx-[-10px]">
              <svg className="w-full h-full" viewBox="0 0 120 220" fill="none" preserveAspectRatio="none">
                <path
                  d="M 5 40 C 60 40, 30 180, 112 180"
                  stroke="url(#hms-arrow-grad-fixed)"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  fill="none"
                  markerEnd="url(#hms-arrowhead-fixed)"
                />
              </svg>
            </div>

            {/* STEP 02: Text ABOVE, Circle at BOTTOM (Center Y=180px) */}
            <div className="w-[210px] flex flex-col items-center text-center shrink-0">
              {/* Text 02 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow mb-6 h-[114px] flex flex-col justify-center w-full">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Smart Consultation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clinical EHR record updates and instant digital e-prescriptions.
                </p>
              </div>
              {/* Circle 02 */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-indigo-500 shadow-md shadow-indigo-500/15 flex items-center justify-center relative z-10">
                  <Stethoscope className="w-8 h-8 text-indigo-600" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs border-2 border-white">
                    02
                  </span>
                </div>
              </div>
            </div>

            {/* CONNECTOR 2: Curves Up from Circle 02 (Y=180) to Circle 03 (Y=40) */}
            <div className="flex-1 h-[220px] shrink-0 pointer-events-none mx-[-10px]">
              <svg className="w-full h-full" viewBox="0 0 120 220" fill="none" preserveAspectRatio="none">
                <path
                  d="M 5 180 C 60 180, 30 40, 112 40"
                  stroke="url(#hms-arrow-grad-fixed)"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  fill="none"
                  markerEnd="url(#hms-arrowhead-fixed)"
                />
              </svg>
            </div>

            {/* STEP 03: Circle at TOP (Center Y=40px), Text BELOW */}
            <div className="w-[210px] flex flex-col items-center text-center shrink-0">
              {/* Circle 03 */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-cyan-500 shadow-md shadow-cyan-500/15 flex items-center justify-center relative z-10">
                  <FlaskConical className="w-8 h-8 text-cyan-600" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs border-2 border-white">
                    03
                  </span>
                </div>
              </div>
              {/* Text 03 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow h-[114px] flex flex-col justify-center w-full">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Lab & Pharmacy Sync</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Automatic routing for fast lab diagnostics and medicine billing.
                </p>
              </div>
            </div>

            {/* CONNECTOR 3: Curves Down from Circle 03 (Y=40) to Circle 04 (Y=180) */}
            <div className="flex-1 h-[220px] shrink-0 pointer-events-none mx-[-10px]">
              <svg className="w-full h-full" viewBox="0 0 120 220" fill="none" preserveAspectRatio="none">
                <path
                  d="M 5 40 C 60 40, 30 180, 112 180"
                  stroke="url(#hms-arrow-grad-fixed)"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  fill="none"
                  markerEnd="url(#hms-arrowhead-fixed)"
                />
              </svg>
            </div>

            {/* STEP 04: Text ABOVE, Circle at BOTTOM (Center Y=180px) */}
            <div className="w-[210px] flex flex-col items-center text-center shrink-0">
              {/* Text 04 */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow mb-6 h-[114px] flex flex-col justify-center w-full">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Care & Analytics</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  IPD bed allocation tracking and operational hospital analytics.
                </p>
              </div>
              {/* Circle 04 */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-emerald-500 shadow-md shadow-emerald-500/15 flex items-center justify-center relative z-10">
                  <HeartPulse className="w-8 h-8 text-emerald-600" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs border-2 border-white">
                    04
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Fallback Layout (lg:hidden) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden max-w-xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-500 text-blue-600 font-bold flex items-center justify-center shrink-0 relative">
                <CalendarCheck className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">01</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Schedule & Tokening</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Online appointment booking and live OPD queue token generation.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-500 text-indigo-600 font-bold flex items-center justify-center shrink-0 relative">
                <Stethoscope className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">02</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Smart Consultation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Clinical EHR record updates and instant digital e-prescriptions.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-cyan-50 border-2 border-cyan-500 text-cyan-600 font-bold flex items-center justify-center shrink-0 relative">
                <FlaskConical className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">03</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Lab & Pharmacy Sync</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Automatic routing for fast lab diagnostics and medicine billing.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 font-bold flex items-center justify-center shrink-0 relative">
                <HeartPulse className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">04</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Care & Analytics</h3>
                <p className="text-xs text-slate-500 leading-relaxed">IPD bed allocation tracking and operational hospital analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Modules Grid — 7 core hospital roles */}
      <section id="about" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Core Architecture
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              One Core. Seven Connected Modules.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Every role — from the front desk to the pharmacy counter — plugs into a single connected system core.
            </p>
          </div>

          <ModuleShowcase />
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
            {DEPARTMENTS.map((dept) => (
              <DepartmentCard key={dept.title} dept={dept} />
            ))}
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
                        maxLength={50}
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
                        maxLength={80}
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
                      inputMode="numeric"
                      maxLength={10}
                      value={contactForm.phone}
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setContactForm({ ...contactForm, phone: onlyNums });
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                          !e.ctrlKey &&
                          !e.metaKey
                        ) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="e.g. 9876543210 (10 digits)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Inquiry Message *
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {contactForm.message.length}/500
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      maxLength={500}
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