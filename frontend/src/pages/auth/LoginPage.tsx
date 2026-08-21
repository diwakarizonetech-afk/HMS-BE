import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getDefaultRouteForRole } from '../../context/AuthContext';
import { fetchLoginCredentialsApi } from '../../services/api';
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
  Database,
  UserCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = getDefaultRouteForRole(user.role);
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // DB credentials fetched dynamically
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loadingDbUsers, setLoadingDbUsers] = useState(false);

  useEffect(() => {
    const getCredentials = async () => {
      setLoadingDbUsers(true);
      try {
        const users = await fetchLoginCredentialsApi();
        setDbUsers(users);
      } catch (err) {
        console.warn('Failed to load DB user credentials:', err);
      } finally {
        setLoadingDbUsers(false);
      }
    };
    getCredentials();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await login(email, password);
      setLoading(false);
      if (res.success && res.redirectPath) {
        navigate(res.redirectPath);
      } else {
        setErrorMessage(res.error || 'Invalid Email or Password');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Invalid Email or Password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-stretch font-sans text-slate-800">
      {/* Split Screen - LEFT SIDE: Dynamic DB Branding & Registered Accounts */}
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
            Live DB Auth System
          </span>
        </div>

        {/* Center Dynamic DB Credentials Container */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
              <Database className="w-3.5 h-3.5" />
              Dynamic DB Credentials Engine
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
              Multi-Branch Hospital Staff Portal
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Log in with your database-provisioned credentials. All modules filter patient records, appointments, inventory, and bed allocations according to your assigned branch.
            </p>
          </div>

          {/* Registered Database Users Card */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Registered Staff Accounts in DB</h4>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full">
                {dbUsers.length} Users
              </span>
            </div>

            {loadingDbUsers ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading DB credentials...</div>
            ) : dbUsers.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {dbUsers.slice(0, 8).map((u) => {
                  const roleStr = String(u.role || '').toLowerCase();
                  const suggestedPw =
                    u.email === 'admin@hms.com' || roleStr === 'admin' || roleStr === 'super_admin'
                      ? 'admin123'
                      : u.email === 'cashier@hms.com'
                      ? 'cashier123'
                      : roleStr.includes('billing')
                      ? 'billing123'
                      : roleStr === 'doctor'
                      ? 'Doctor@123'
                      : roleStr === 'reception'
                      ? 'Reception@123'
                      : roleStr === 'pharmacy'
                      ? 'Pharma@123'
                      : roleStr === 'nurse'
                      ? 'nurse123'
                      : 'admin123';

                  return (
                    <div
                      key={u.id || u.email}
                      onClick={() => {
                        setEmail(u.email);
                        setPassword(suggestedPw);
                      }}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{u.name}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/30 text-cyan-300 border border-blue-400/20">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 truncate mt-0.5">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 block">
                          {u.branch || 'Main Branch'}
                        </span>
                        <span className="text-[9px] font-mono text-cyan-300 group-hover:text-cyan-200 transition-colors block mt-0.5">
                          pw: {suggestedPw}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-300">
                Default Super Admin: <span className="font-mono font-bold text-cyan-300">admin@hms.com</span> / <span className="font-mono font-bold text-cyan-300">admin123</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>Protected by HIPAA & AES 256 Encryption</span>
          <span className="text-cyan-300 font-semibold">v2026.1 Enterprise</span>
        </div>
      </div>

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
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Portal Access Login</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your authorized hospital ID or email address to continue.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User Email or Staff ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@hms.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
