import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { Clock, Calendar, Filter, UserCheck, ShieldAlert, CheckCircle2, Building2, UserX } from 'lucide-react';

export const DoctorAvailabilityPage: React.FC = () => {
  const { doctors, departments } = useHMS();
  const { user } = useAuth();

  const userBranch = user?.branch || 'Main Branch';
  const [branchFilter, setBranchFilter] = useState<string>(userBranch);
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState('All');

  const filteredDoctors = doctors.filter((doc) => {
    const docBranch = (doc.branch || '').toLowerCase().trim();
    const selBranch = (branchFilter || '').toLowerCase().trim();
    const matchesBranch =
      !branchFilter ||
      branchFilter === 'All' ||
      !docBranch ||
      docBranch === 'main branch' ||
      docBranch.includes(selBranch) ||
      selBranch.includes(docBranch);

    const matchesDept = deptFilter === 'All' || doc.department === deptFilter;
    const matchesDoc = selectedDoctorId === 'All' || doc.id === selectedDoctorId;
    return matchesBranch && matchesDept && matchesDoc;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Doctor Availability Schedule</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Building2 className="w-3 h-3" />
              {branchFilter}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time OPD consultation hours, available time slots, and duty rosters separated by branch.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Filter By Hospital Branch
            </label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-blue-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Hospital Branches</option>
              <option value="Main Branch">Main Branch</option>
              <option value="City Center Branch">City Center Branch</option>
              <option value="North Wing Branch">North Wing Branch</option>
              <option value="East Wing Branch">East Wing Branch</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Filter By Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setSelectedDoctorId('All');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Filter By Specialist
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Doctor Availability Grid */}
      {filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Doctors Found for this Branch</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No active doctor rosters match the selected filter criteria for <span className="font-semibold text-slate-700">{branchFilter}</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div>
                {/* Doctor Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                      {doc.department}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{doc.name}</h3>
                    <p className="text-xs text-slate-500">{doc.specialization}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      doc.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.status === 'In Surgery'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                {/* Room & Fee */}
                <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">OPD Room</span>
                    <span className="font-bold text-slate-900">{doc.roomNo}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">Consultation Fee</span>
                    <span className="font-bold text-blue-700">₹{doc.consultationFee}</span>
                  </div>
                </div>

                {/* Available Days */}
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available Working Days
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(doc.availableDays) && doc.availableDays.length > 0
                      ? doc.availableDays
                      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                    ).map((day) => (
                      <span
                        key={day}
                        className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="mt-4 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Today's Time Slots
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Array.isArray(doc.slots) && doc.slots.length > 0
                      ? doc.slots
                      : ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM']
                    ).map((slot) => (
                      <span
                        key={slot}
                        className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 p-1.5 rounded-lg text-center"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Email Contact */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{doc.email}</span>
                <span className="font-semibold text-blue-600">Active Duty</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
