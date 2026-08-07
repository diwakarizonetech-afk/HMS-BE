import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogIn, Menu, X, PhoneCall } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* HMS Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 bg-clip-text text-transparent">
                AegisCare
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
                Hospital System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Home
            </Link>

            <button
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Emergency Contact, Booking & Login Button */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>24/7 Helpline: 1800-420-9900</span>
            </div>
            <button
              onClick={() => navigate('/patient/book-appointment')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Book Appointment
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-500" />
              <span>Login</span>
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            to="/patient/book-appointment"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-bold text-blue-600 bg-blue-50"
          >
            Book Appointment
          </Link>

          <button
            onClick={() => scrollToSection('about')}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            About
          </button>
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/patient/book-appointment');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              Book Appointment Now
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Login to Staff Portal</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
