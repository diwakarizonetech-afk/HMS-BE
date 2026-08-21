import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { Patient } from '../../../types/hms';
import { Save, UserCheck, Shield, Phone, Heart, FileText, CheckCircle2 } from 'lucide-react';

export const UpdatePatientPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { patients, updatePatient } = useHMS();

  const [selectedUhid, setSelectedUhid] = useState(searchParams.get('uhid') || (patients[0]?.uhid || ''));
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'medical' | 'insurance' | 'emergency'>('basic');

  const [currentPatient, setCurrentPatient] = useState<Patient | undefined>(() =>
    patients.find((p) => p.uhid === selectedUhid)
  );

  const [formData, setFormData] = useState<Partial<Patient>>({});

  useEffect(() => {
    const found = patients.find((p) => p.uhid === selectedUhid);
    setCurrentPatient(found);
    if (found) {
      setFormData(found);
    }
  }, [selectedUhid, patients]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.mobile && formData.mobile.replace(/\D/g, '').length !== 10) {
      alert('Mobile number must be exactly 10 digits.');
      return;
    }
    if (formData.altMobile && formData.altMobile.replace(/\D/g, '').length !== 10) {
      alert('Alternate mobile number must be exactly 10 digits.');
      return;
    }
    if (currentPatient) {
      updatePatient(currentPatient.id, formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Patient Select Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Update Patient Profile</h1>
          <p className="text-xs text-slate-500">
            Edit patient demographics, emergency contact details, and insurance parameters.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="w-full sm:w-72">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Select Patient Record
          </label>
          <select
            value={selectedUhid}
            onChange={(e) => setSelectedUhid(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.uhid}>
                {p.uhid} - {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentPatient ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Tab Navigation Headers */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/80 p-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'basic'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              1. Basic Information
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'contact'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              2. Contact Details
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'medical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              3. Medical History
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'insurance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              4. Insurance
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'emergency'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              5. Emergency Contacts
            </button>
          </div>

          {/* Tab Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup || 'B+'}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    value={formData.aadhaar || ''}
                    onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number (10 digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alternate Mobile (10 digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.altMobile || ''}
                    onChange={(e) => setFormData({ ...formData, altMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit alternate mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'medical' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Known Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies || ''}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pre-existing Diseases / Conditions</label>
                  <textarea
                    rows={3}
                    value={formData.existingDiseases || ''}
                    onChange={(e) => setFormData({ ...formData, existingDiseases: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'insurance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insurance Company Name</label>
                  <input
                    type="text"
                    value={formData.insuranceProvider || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insurance Policy Number</label>
                  <input
                    type="text"
                    value={formData.insuranceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'emergency' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergencyRelationship || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          No patient selected or record not found.
        </div>
      )}
    </div>
  );
};
