import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { Patient } from '../../../types/hms';
import { Search, UserCheck, Siren, UserPlus, AlertCircle, ArrowRight, ShieldCheck, Users } from 'lucide-react';

export const ExistingPatientSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { patients } = useHMS();

  const [query, setQuery] = useState('');

  // Real-time filter of patient master records
  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter(
      (p) =>
        (p.uhid || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q) ||
        (p.mobile && p.mobile.includes(q))
    );
  }, [query, patients]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">2. Existing Patient / UHID Search</h1>
            <p className="text-xs text-slate-500">
              Lookup existing patient master records by UHID, Name, or Mobile before registering an emergency visit.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <label className="block text-xs font-bold text-slate-700">Search Patient Master *</label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type UHID (e.g. UHID-2026-1001), Patient Name, or Mobile Number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Results / Full Directory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              {query ? `Search Results (${filteredPatients.length})` : `All Patient Master Records (${patients.length})`}
            </span>
          </h2>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    <th className="py-3.5 px-4">UHID</th>
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Age & Gender</th>
                    <th className="py-3.5 px-4">Blood Group</th>
                    <th className="py-3.5 px-4">Mobile Phone</th>
                    <th className="py-3.5 px-4">Emergency Contact</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* UHID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-xs inline-block">
                          {patient.uhid}
                        </span>
                      </td>

                      {/* Patient Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px]">
                            {patient.firstName ? patient.firstName.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">
                              {patient.firstName} {patient.lastName}
                            </p>
                            {patient.branch && (
                              <p className="text-[10px] text-slate-400 font-normal">{patient.branch}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Age & Gender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">
                          {patient.age} yrs, {patient.gender}
                        </span>
                      </td>

                      {/* Blood Group */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-100">
                          {patient.bloodGroup || 'N/A'}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-800">{patient.mobile || 'N/A'}</span>
                      </td>

                      {/* Emergency Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{patient.emergencyPhone || patient.mobile || 'N/A'}</p>
                        {patient.emergencyContactName && (
                          <p className="text-[10px] text-slate-400">({patient.emergencyContactName})</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/reception/er/register?uhid=${patient.uhid}`)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <Siren className="w-3.5 h-3.5" />
                          <span>Create Emergency Visit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/60 p-8 rounded-2xl border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No Patient Found with "{query}"</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                This patient is not currently registered in the Hospital Patient Master. You can proceed directly to Walk-in Emergency Registration to create a new UHID.
              </p>
            </div>
            <button
              onClick={() => navigate('/reception/er/walk-in')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register as Walk-in Emergency Patient</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
