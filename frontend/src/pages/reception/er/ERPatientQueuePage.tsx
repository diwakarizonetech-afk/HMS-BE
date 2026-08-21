import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useER } from '../../../context/ERContext';
import { useAuth } from '../../../context/AuthContext';
import { ERStatus, TriageStatus, EmergencyType } from '../../../types/er';
import {
  Siren,
  Search,
  Filter,
  Eye,
  BedDouble,
  UserPlus2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Truck,
  UserCheck,
  Building2,
  Stethoscope,
} from 'lucide-react';

export const ERPatientQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { erVisits } = useER();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    user?.department && user.role !== 'reception' && user.role !== 'admin' && user.role !== 'super_admin'
      ? user.department
      : 'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTriage, setSelectedTriage] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Department List
  const departmentOptions = ['ALL', 'Cardiology', 'General Medicine', 'Orthopedics', 'Neurology', 'Pulmonology', 'Pediatrics', 'Plastic Surgery', 'Emergency'];

  // Filtered ER Visits with Priority Sorting
  const filteredVisits = useMemo(() => {
    const matched = erVisits.filter((v) => {
      const matchesSearch =
        (v.encounter_number || v.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.patient_uhid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.phone || v.chief_complaint || '').toLowerCase().includes(searchTerm.toLowerCase());

      const vDept = v.department || v.assigned_department || '';
      const matchesDept =
        selectedDepartment === 'ALL' ||
        (vDept && vDept.toLowerCase().includes(selectedDepartment.toLowerCase())) ||
        (selectedDepartment === 'Cardiology' && (v.emergency_type === 'Cardiac' || (v.assigned_doctor || '').includes('Cardio'))) ||
        (selectedDepartment === 'Orthopedics' && v.emergency_type === 'Trauma') ||
        (selectedDepartment === 'Neurology' && v.emergency_type === 'Neurological') ||
        (selectedDepartment === 'Pediatrics' && v.emergency_type === 'Pediatric') ||
        (selectedDepartment === 'Pulmonology' && v.emergency_type === 'Respiratory');

      const matchesStatus = selectedStatus === 'ALL' || v.er_status === selectedStatus;
      const matchesTriage = selectedTriage === 'ALL' || v.triage_status === selectedTriage;
      const matchesCategory = selectedCategory === 'ALL' || v.emergency_type === selectedCategory;

      return matchesSearch && matchesDept && matchesStatus && matchesTriage && matchesCategory;
    });

    return matched.sort((a, b) => {
      const isADone = a.er_status === 'Discharged' || a.er_status === 'Transferred';
      const isBDone = b.er_status === 'Discharged' || b.er_status === 'Transferred';
      if (isADone !== isBDone) {
        return isADone ? 1 : -1; // Discharged / Transferred last
      }
      const getTriageWeight = (t: string) => {
        if ((t || '').includes('Priority 1') || (t || '').includes('Red')) return 0;
        if ((t || '').includes('Priority 2') || (t || '').includes('Yellow')) return 1;
        if ((t || '').includes('Priority 3') || (t || '').includes('Green')) return 2;
        return 3;
      };
      return getTriageWeight(a.triage_status) - getTriageWeight(b.triage_status);
    });
  }, [erVisits, searchTerm, selectedDepartment, selectedStatus, selectedTriage, selectedCategory]);

  const getTriageBadge = (triage: TriageStatus) => {
    if (triage.includes('Priority 1') || triage.includes('Red')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          Priority 1 (Red - Critical)
        </span>
      );
    }
    if (triage.includes('Priority 2') || triage.includes('Yellow')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          Priority 2 (Yellow - Urgent)
        </span>
      );
    }
    if (triage.includes('Priority 3') || triage.includes('Green')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Priority 3 (Green - Non-Urgent)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        Pending Triage
      </span>
    );
  };

  const getStatusBadge = (status: ERStatus) => {
    switch (status) {
      case 'Registered':
      case 'Waiting for Triage':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">Waiting Triage</span>;
      case 'Triage Completed':
      case 'Waiting for Doctor':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">Awaiting Doctor</span>;
      case 'Under Doctor Assessment':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">Under Assessment</span>;
      case 'Observation':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">Observation Bed</span>;
      case 'IPD Admission Pending':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap animate-pulse">IPD Pending</span>;
      case 'Discharged':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">Discharged</span>;
      case 'Transferred':
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-800 whitespace-nowrap">IPD Transferred</span>;
      default:
        return <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">4. Real-Time ER Patient Queue & Monitoring</h1>
            <p className="text-xs text-slate-500">
              Live hospital emergency room oversight tracking department assignments, staff responsibilities, triage, and disposition status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reception/er/register')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
          >
            + Existing Patient ER
          </button>
          <button
            onClick={() => navigate('/reception/er/walk-in')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            + Walk-in New Patient ER
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Visit ID, UHID, Patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-semibold outline-none focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3 py-2 font-bold text-blue-900 outline-none"
            >
              <option value="ALL">All Departments</option>
              {departmentOptions.filter((d) => d !== 'ALL').map((dept) => (
                <option key={dept} value={dept}>
                  {dept} Department
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              <option value="ALL">All ER Statuses</option>
              <option value="Registered">Registered / Waiting Triage</option>
              <option value="Waiting for Doctor">Waiting for Doctor</option>
              <option value="Under Doctor Assessment">Under Assessment</option>
              <option value="Observation">Observation Bed</option>
              <option value="IPD Admission Pending">IPD Admission Pending</option>
              <option value="Discharged">Discharged</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>

          <div>
            <select
              value={selectedTriage}
              onChange={(e) => setSelectedTriage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              <option value="ALL">All Triage Levels</option>
              <option value="Priority 1 (Red - Critical)">Priority 1 (Red - Critical)</option>
              <option value="Priority 2 (Yellow - Urgent)">Priority 2 (Yellow - Urgent)</option>
              <option value="Priority 3 (Green - Non-Urgent)">Priority 3 (Green - Non-Urgent)</option>
              <option value="Pending Triage">Pending Triage</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              <option value="ALL">All Emergency Types</option>
              <option value="Cardiac">Cardiac</option>
              <option value="Trauma">Trauma</option>
              <option value="Respiratory">Respiratory</option>
              <option value="Neurological">Neurological</option>
              <option value="Burns">Burns</option>
              <option value="Pediatric">Pediatric</option>
              <option value="General Emergency">General Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                <th className="py-3.5 px-4">ER Visit ID</th>
                <th className="py-3.5 px-4">Patient Profile</th>
                <th className="py-3.5 px-4">Department & Category</th>
                <th className="py-3.5 px-4">Arrival</th>
                <th className="py-3.5 px-4">Triage Priority</th>
                <th className="py-3.5 px-4">Current Location</th>
                <th className="py-3.5 px-4">Assigned Department Staffs</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((visit) => {
                  const isCritical = visit.triage_status?.includes('Priority 1') || visit.triage_status?.includes('Red');
                  const isDone = visit.er_status === 'Discharged' || visit.er_status === 'Transferred';

                  return (
                  <tr
                    key={visit.id}
                    className={`transition-colors ${
                      isCritical
                        ? 'bg-rose-50/50 border-l-4 border-l-rose-500 hover:bg-rose-50/80'
                        : isDone
                        ? 'hover:bg-slate-50/50 opacity-80'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* ER Visit ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-xs inline-block">
                        {visit.encounter_number || visit.id}
                      </span>
                      <div className="mt-1">{getStatusBadge(visit.er_status)}</div>
                    </td>

                    {/* Patient Profile */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs">{visit.patient_name}</p>
                        {isCritical && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-blue-600">{visit.patient_uhid}</span>
                        <span className="text-slate-300">•</span>
                        <span>{visit.arrival_mode}</span>
                      </div>
                    </td>

                    {/* Department & Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                        <Building2 className="w-3 h-3 text-blue-600" />
                        {visit.department || 'General Medicine'}
                      </span>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">{visit.emergency_type}</p>
                    </td>

                    {/* Arrival */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                        {visit.arrival_mode === 'Ambulance' ? (
                          <Truck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <span>{visit.arrival_mode}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{visit.arrival_time}</p>
                    </td>

                    {/* Triage Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getTriageBadge(visit.triage_status)}</td>

                    {/* Current Location */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 text-xs">{visit.current_location}</span>
                    </td>

                    {/* Assigned Staffs */}
                    <td className="py-3.5 px-4 whitespace-nowrap space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Doctor: {visit.assigned_doctor || visit.assignedDoctor || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <HeartPulse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Nurse: {visit.assigned_nurse || visit.assignedNurse || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/reception/er/patient/${visit.id}`)}
                          title="View ER Patient Record"
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {(visit.er_status === 'Observation' || visit.er_disposition === 'Observation') && (
                          <button
                            onClick={() => navigate(`/reception/er/observation-beds?erVisitId=${visit.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BedDouble className="w-3.5 h-3.5" />
                            <span>Assign Bed</span>
                          </button>
                        )}

                        {(visit.er_status === 'IPD Admission Pending' || visit.er_disposition === 'IPD') && (
                          <button
                            onClick={() => navigate(`/reception/er/ipd-coordination?erVisitId=${visit.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <UserPlus2 className="w-3.5 h-3.5" />
                            <span>Coordinate IPD</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No active emergency visits match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
