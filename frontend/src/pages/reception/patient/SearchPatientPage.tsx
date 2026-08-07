import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { Patient } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import {
  Search,
  Filter,
  Eye,
  Edit,
  CalendarPlus,
  BedDouble,
  User,
  Phone,
  CreditCard,
  Heart,
  Shield,
  FileText,
} from 'lucide-react';

export const SearchPatientPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { patients } = useHMS();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal for view details
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const q = searchParams.get('query');
    if (q) setQuery(q);
  }, [searchParams]);

  // Filtering logic
  const filteredPatients = patients.filter((p) => {
    const qLower = query.toLowerCase().trim();
    const matchesSearch =
      !qLower ||
      p.uhid.toLowerCase().includes(qLower) ||
      p.firstName.toLowerCase().includes(qLower) ||
      p.lastName.toLowerCase().includes(qLower) ||
      p.mobile.includes(qLower) ||
      p.aadhaar.includes(qLower);

    const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesGender && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Patient Directory Search</h1>
            <p className="text-xs text-slate-500">
              Query hospital records by UHID, Full Name, Phone, or Aadhaar.
            </p>
          </div>

          <button
            onClick={() => navigate('/reception/patient/register')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            + Register New Patient
          </button>
        </div>

        {/* Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Main Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search UHID, Name, Mobile, or Aadhaar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Gender Filter */}
          <div className="sm:col-span-3">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active (OPD)</option>
              <option value="Admitted">Admitted (IPD)</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Matching Patients ({filteredPatients.length})
          </span>
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setGenderFilter('All');
                setStatusFilter('All');
              }}
              className="text-xs text-rose-600 font-semibold hover:underline"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">UHID</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Demographics</th>
                <th className="p-4">Mobile & City</th>
                <th className="p-4">Aadhaar</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-blue-600">{p.uhid}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                      <p className="text-[10px] text-slate-500">{p.email}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      {p.age} yrs • {p.gender} • <span className="font-semibold text-rose-600">{p.bloodGroup}</span>
                    </td>
                    <td className="p-4 text-slate-600">
                      <p>{p.mobile}</p>
                      <p className="text-[10px] text-slate-400">{p.city}</p>
                    </td>
                    <td className="p-4 text-slate-600">{p.aadhaar}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'Admitted'
                            ? 'bg-rose-100 text-rose-800'
                            : p.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedPatient(p)}
                          title="View Profile"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/patient/update?uhid=${p.uhid}`)}
                          title="Edit Profile"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/appointment/book?uhid=${p.uhid}`)}
                          title="Book Appointment"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/reception/ipd/admit?uhid=${p.uhid}`)}
                          title="Admit to Ward"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <BedDouble className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No patient records found matching query "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Profile View Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={`Patient Record: ${selectedPatient.uhid}`}
          subtitle={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Header Badge */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedPatient.firstName[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedPatient.age} yrs • {selectedPatient.gender} • Blood Group: <span className="font-bold text-rose-600">{selectedPatient.bloodGroup}</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                {selectedPatient.status}
              </span>
            </div>

            {/* Demographics Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Date of Birth</span>
                <span className="font-bold text-slate-900">{selectedPatient.dob}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Marital Status</span>
                <span className="font-bold text-slate-900">{selectedPatient.maritalStatus}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Nationality</span>
                <span className="font-bold text-slate-900">{selectedPatient.nationality}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Mobile</span>
                <span className="font-bold text-slate-900">{selectedPatient.mobile}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Email</span>
                <span className="font-bold text-slate-900 truncate">{selectedPatient.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-semibold block">Aadhaar</span>
                <span className="font-bold text-slate-900">{selectedPatient.aadhaar}</span>
              </div>
            </div>

            {/* Address */}
            <div className="p-3 rounded-xl bg-slate-50 text-xs">
              <span className="text-slate-400 font-semibold block">Address</span>
              <span className="font-bold text-slate-900">
                {selectedPatient.address}, {selectedPatient.city}, {selectedPatient.state} - {selectedPatient.pincode}
              </span>
            </div>

            {/* Emergency & Medical */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
                <h5 className="font-bold text-rose-900 mb-1">Emergency Contact</h5>
                <p className="text-slate-700 font-medium">{selectedPatient.emergencyContactName} ({selectedPatient.emergencyRelationship})</p>
                <p className="text-slate-600 font-bold mt-0.5">{selectedPatient.emergencyPhone}</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <h5 className="font-bold text-indigo-900 mb-1">Insurance Policy</h5>
                <p className="text-slate-700 font-medium">{selectedPatient.insuranceProvider || 'None Logged'}</p>
                <p className="text-slate-600 font-bold mt-0.5">{selectedPatient.insuranceNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
