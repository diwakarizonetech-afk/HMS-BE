import React from 'react';
import { Activity, Mail, Phone, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          {/* Col 1: Hospital Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">
                AegisCare HMS
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enterprise smart hospital management platform empowering healthcare professionals with digital patient records, automated queue management, and IPD bed allocation.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>24/7 Emergency & Critical Care Active</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#hero" className="hover:text-blue-400 transition-colors">Home & Portal</a>
              </li>
              <li>
                <a href="#about" className="hover:text-blue-400 transition-colors">About System</a>
              </li>
              <li>
                <a href="#departments" className="hover:text-blue-400 transition-colors">Medical Departments</a>
              </li>
              <li>
                <a href="/login" className="hover:text-blue-400 transition-colors">Staff Login</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Modules */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hospital Modules
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>• Reception & Registration</li>
              <li>• OPD & Appointment Scheduling</li>
              <li>• IPD & Bed Management Grid</li>
              <li>• Laboratory & Pharmacy</li>
              <li>• Doctor & Nurse Portals</li>
            </ul>
          </div>

          {/* Col 4: Contact & Location */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hospital Location
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <span>AegisCare Multi-Specialty Hospital, Healthcare Boulevard, Tech City</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400 shrink-0" />
                <span>+91 (080) 4567-8900 / 1800-420-9900</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                <span>info@aegiscare-hms.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 AegisCare Hospital Management System. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with precision for healthcare operations</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
