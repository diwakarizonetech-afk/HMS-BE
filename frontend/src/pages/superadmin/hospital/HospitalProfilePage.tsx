import React, { useState } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  Award,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';

export const HospitalProfilePage: React.FC = () => {
  const { hospitalProfile, updateHospitalProfile } = useSuperAdmin();
  const { addToast } = useHMS();

  const [formData, setFormData] = useState(hospitalProfile);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateHospitalProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-4">
          {formData.hospitalLogoUrl ? (
            <img
              src={formData.hospitalLogoUrl}
              alt="Hospital Logo"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-md shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 shadow-md shrink-0 font-bold text-xl">
              {hospitalProfile.hospitalName ? hospitalProfile.hospitalName.charAt(0) : 'H'}
            </div>
          )}
          <div>
            <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
              <span>Hospital Setup</span>
              <span>/</span>
              <span className="text-indigo-600">Hospital Profile</span>
            </nav>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {hospitalProfile.hospitalName}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-600">{hospitalProfile.hospitalCode}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600">{hospitalProfile.accreditation}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer"
            >
              Edit Hospital Profile
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Form Card */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>General Hospital Information</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {isEditing ? 'Mode: Edit Enabled' : 'Mode: Read Only'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hospital Name</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.hospitalName}
              onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Hospital Code</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.hospitalCode}
              onChange={(e) => setFormData({ ...formData, hospitalCode: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold text-indigo-600 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Established Year</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.establishedYear}
              onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Registration Number</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">License Number</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Accreditation Standards</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.accreditation}
              onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-emerald-600 disabled:opacity-80 outline-none"
            />
          </div>
        </div>

        <div className="border-b border-slate-100 pb-3 pt-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Contact & Web Details</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Official Email</label>
            <input
              type="email"
              disabled={!isEditing}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Website URL</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-blue-600 disabled:opacity-80 outline-none"
            />
          </div>
        </div>

        <div className="border-b border-slate-100 pb-3 pt-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Location & Regional Configuration</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="md:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">City</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">State</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Timezone</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Default Currency</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 disabled:opacity-80 outline-none"
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
