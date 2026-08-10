import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { calculateAge, generateUHID } from '../../../utils/helpers';
import { UserPlus, Save, RotateCcw, XCircle, ShieldCheck, HeartPulse } from 'lucide-react';

export const RegisterPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const { addPatient } = useHMS();

  const [previewUHID] = useState(() => generateUHID());

  const initialFormState = {
    // Personal
    firstName: '',
    lastName: '',
    gender: 'Male' as const,
    dob: '',
    age: 0,
    bloodGroup: 'B+' as const,
    maritalStatus: 'Single' as const,
    nationality: 'Indian',

    // Contact
    mobile: '',
    altMobile: '',
    email: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '',

    // Identity
    aadhaar: '',
    pan: '',

    // Emergency
    emergencyContactName: '',
    emergencyRelationship: 'Spouse',
    emergencyPhone: '',

    // Medical
    allergies: '',
    existingDiseases: '',
    insuranceProvider: '',
    insuranceNumber: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleDobChange = (dobValue: string) => {
    const ageCalculated = calculateAge(dobValue);
    setFormData((prev) => ({
      ...prev,
      dob: dobValue,
      age: ageCalculated,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      alert('Mobile number must be exactly 10 digits.');
      return;
    }
    const created = await addPatient({
      ...formData,
      mobile: cleanMobile,
      altMobile: formData.altMobile ? formData.altMobile.replace(/\D/g, '').slice(0, 10) : '',
    });
    navigate(`/reception/patient/search?query=${encodeURIComponent(created.uhid)}`);
  };

  const handleReset = () => {
    setFormData(initialFormState);
  };

  return (
    <div className="space-y-6">
      {/* Page Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              UHID Auto-Generator Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">New Patient Registration</h1>
          <p className="text-xs text-slate-500">Register new patient demographics & medical profiles.</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-right">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Allocated UHID Preview</p>
          <p className="text-sm font-black text-blue-700">{previewUHID}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Ramesh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Kumar"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Auto Calculated)</label>
              <input
                type="number"
                readOnly
                value={formData.age}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-bold outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group *</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile (10 digits)</label>
              <input
                type="tel"
                maxLength={10}
                value={formData.altMobile}
                onChange={(e) => setFormData({ ...formData, altMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit alternate mobile"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="patient@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 560038"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="House No., Street Name, Area"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Identity & Emergency Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900">Identity Documents</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number *</label>
                <input
                  type="text"
                  required
                  value={formData.aadhaar}
                  onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                  placeholder="e.g. 4532 8901 2345"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (Optional)</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs">
                4
              </div>
              <h3 className="text-sm font-bold text-slate-900">Emergency Contact</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  placeholder="e.g. Sunita Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship *</label>
                  <input
                    type="text"
                    required
                    value={formData.emergencyRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                    placeholder="e.g. Spouse / Father"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="+91 98765 43212"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Medical & Insurance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
              5
            </div>
            <h3 className="text-sm font-bold text-slate-900">Medical Details & Insurance</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Latex, Dust"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Existing Medical Conditions</label>
              <input
                type="text"
                value={formData.existingDiseases}
                onChange={(e) => setFormData({ ...formData, existingDiseases: e.target.value })}
                placeholder="e.g. Diabetes, Hypertension"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Provider</label>
              <input
                type="text"
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                placeholder="e.g. Star Health / HDFC ERGO"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Policy Number</label>
              <input
                type="text"
                value={formData.insuranceNumber}
                onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                placeholder="e.g. SHI-9876543"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reception/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Patient Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};
