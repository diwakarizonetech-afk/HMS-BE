import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Building2,
  Stethoscope,
  Users,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Field-level validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /** Validate email field */
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email or Staff ID is required.');
      return false;
    }
    // Allow role shortcuts like "reception", "doctor" or full emails
    const isShortcut = ['reception', 'doctor', 'nurse', 'lab', 'pharmacy', 'admin', 'patient'].includes(value.trim().toLowerCase());
    const isPartialEmail = value.includes('@');
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!isShortcut && isPartialEmail && !isValidEmail) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    if (!isShortcut && !isPartialEmail && value.trim().length < 3) {
      setEmailError('Staff ID must be at least 3 characters.');
      return false;
    }
    setEmailError('');
    return true;
  };

  /** Validate password field */
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required.');
      return false;
    }
    if (value.length < 4) {
      setPasswordError('Password must be at least 4 characters.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Run validation
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      const res = await login(email, password);
      setLoading(false);
      if (res.success && res.redirectPath) {
        navigate(res.redirectPath);
      } else {
        setErrorMessage(res.error || 'Invalid Email or Password');
      }
    } catch {
      setLoading(false);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-stretch font-sans text-slate-800">
      {/* Split Screen - LEFT SIDE: Original Gradient Branding & Doctor Profile Integration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">AegisCare HMS</h1>
              <p className="text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">Enterprise Hospital ERP</p>
            </div>
          </Link>

          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Operational
          </span>
        </div>

        {/* Center Healthcare Branding, Doctor Card & Interactive Feature Badges */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          {/* Badge & Title */}
          <div className="space-y-3">
            <span className="inline-block text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
              Phase 1 Reception & Clinical Engine Live
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
              Integrated Clinical & Operations Platform
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Empowering hospital staff with unified patient registration, automated OPD queue management, and IPD bed allocation.
            </p>
          </div>

          {/* Doctor PNG Profile & Active Medical Team Banner */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-4 shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80"
              alt="Chief Doctor"
              className="w-16 h-16 rounded-xl object-cover object-top border-2 border-cyan-400/50 shadow-md shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white truncate">Dr. Vikram Malhotra, MD</h4>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 shrink-0">
                  On Duty
                </span>
              </div>
              <p className="text-xs text-cyan-300 font-medium truncate">Chief Medical Officer & OPD Consultant</p>
              <p className="text-[11px] text-slate-300 mt-0.5">AegisCare Multi-Speciality Center</p>
            </div>
          </div>

          {/* Original Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <Building2 className="w-6 h-6 text-cyan-300 mb-2" />
              <h4 className="text-sm font-bold text-white">Smart Reception</h4>
              <p className="text-xs text-slate-300 mt-0.5">Automated UHID & Walk-in Token Registration</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <Stethoscope className="w-6 h-6 text-blue-300 mb-2" />
              <h4 className="text-sm font-bold text-white">OPD Queue Engine</h4>
              <p className="text-xs text-slate-300 mt-0.5">Real-time Call Next & Doctor Availability</p>
            </div>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>Protected by HIPAA & AES 256 Encryption</span>
          <span className="text-cyan-300 font-semibold">v2026.1 Enterprise</span>
        </div>
      </div>


      {/* Split Screen - RIGHT SIDE: Login Card with Validation */}
      {/* Split Screen - RIGHT SIDE: Clean Login Card (No Demo Account Box) */}

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Logo Mobile Header */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900">AegisCare HMS</span>
          </div>

          {/* Form Card Container */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Portal Access Login</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your authorized hospital ID or email address to continue.
              </p>
            </div>

            {/* Global Error Message */}
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">

              {/* Email Field */}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User Email or Staff ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"

                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => email && validateEmail(email)}
                    placeholder="e.g. reception@hms.com or doctor"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 outline-none transition-all ${
                      emailError
                        ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => password && validatePassword(password)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-3 text-xs font-semibold text-slate-900 outline-none transition-all ${
                      passwordError
                        ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember Me</span>
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact hospital IT helpdesk at ext. 4000 to reset staff credentials.'); }} className="text-blue-600 font-semibold hover:underline">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-md shadow-blue-600/20 transition-all cursor-pointer text-xs"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Login to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500">
            <Link to="/" className="hover:text-blue-600 font-semibold">
              ← Return to Hospital Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
