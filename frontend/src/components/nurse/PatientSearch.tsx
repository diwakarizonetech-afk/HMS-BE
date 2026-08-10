import React, { useState } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { useHMS } from '../../context/HMSContext';
import { Patient } from '../../types/hms';

interface PatientSearchProps {
  onSelectPatient: (patient: Patient) => void;
  selectedPatient: Patient | null;
  onClearPatient: () => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  onSelectPatient,
  selectedPatient,
  onClearPatient,
}) => {
  const { patients } = useHMS();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter matching patients from HMS Reception database
  const matchingPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase().trim();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const uhid = p.uhid.toLowerCase();
    const mobile = p.mobile.toLowerCase();

    // Synthetic matches for Token / Apt ID / IP No
    const tokenMatch = `token-${p.uhid.split('-').pop()}`.includes(term) || `t-${p.uhid.split('-').pop()}`.includes(term);
    const aptMatch = `apt-${p.uhid.split('-').pop()}`.includes(term);
    const ipMatch = `ip-${p.uhid.split('-').pop()}`.includes(term) || `ipd-${p.uhid.split('-').pop()}`.includes(term);

    return fullName.includes(term) || uhid.includes(term) || mobile.includes(term) || tokenMatch || aptMatch || ipMatch;
  });

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span>Search Patient Record (HMS Database)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Search by Patient ID (UHID), Name, Phone, Token Number, Appointment ID, or IP Number
          </p>
        </div>

        {selectedPatient && (
          <button
            onClick={onClearPatient}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Patient</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by UHID, Patient Name, Token, or Appointment ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isDropdownOpen && searchTerm.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
            {matchingPatients.length > 0 ? (
              matchingPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="p-3 hover:bg-blue-50/60 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {p.firstName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        UHID: <span className="text-blue-600 font-bold">{p.uhid}</span> • {p.age}y / {p.gender} • Mobile: {p.mobile}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Admitted'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {p.status === 'Admitted' ? 'IPD Admitted' : 'OPD Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching patient found in Reception database.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
