import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHMS } from '../../../context/HMSContext';
import { useER } from '../../../context/ERContext';
import { useAuth } from '../../../context/AuthContext';
import { ArrivalMode, EmergencyType } from '../../../types/er';
import { UserCheck, Siren, Save, ShieldAlert, Truck, Sparkles, Building2, Stethoscope, HeartPulse } from 'lucide-react';
import { fetchDoctorsApi, fetchNursesApi } from '../../../services/api';
import { getCategoryForDepartment, getDepartmentForCategory } from '../../../utils/departmentMapping';

export const WalkInEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { addPatient, doctors, departments } = useHMS();
  const { createERVisit } = useER();
  const { user } = useAuth();

  // Step 1: Patient Master Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState<number | ''>(35);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [mobile, setMobile] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [existingDiseases, setExistingDiseases] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Relative');

  // Step 2: ER Visit Fields
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>('Walk-in');
  const [ambulanceNumber, setAmbulanceNumber] = useState('');
  const [referralHospital, setReferralHospital] = useState('');
  const [paramedicName, setParamedicName] = useState('');
  const [initialComplaint, setInitialComplaint] = useState('');

  // Department & Staff Selection
  const [selectedDepartment, setSelectedDepartment] = useState('General Medicine');
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('General Emergency');
  const [accompaniedBy, setAccompaniedBy] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [assignedNurse, setAssignedNurse] = useState('');
  // State for fetched department staff
  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string; department?: string }[]>([]);
  const [nursesList, setNursesList] = useState<{ id: string; name: string; department?: string; assignedWard?: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingNurses, setLoadingNurses] = useState(false);

  // Fetch doctors and nurses strictly for the assigned department
  useEffect(() => {
    setLoadingDoctors(true);
    fetchDoctorsApi(user?.branch, selectedDepartment)
      .then((data) => {
        const list = data || [];
        setDoctorsList(list);
        if (list.length > 0) {
          setAssignedDoctor(list[0].name);
        } else {
          setAssignedDoctor('');
        }
      })
      .catch((err) => {
        console.warn('Failed to load doctors list:', err);
        setDoctorsList([]);
        setAssignedDoctor('');
      })
      .finally(() => setLoadingDoctors(false));

    setLoadingNurses(true);
    fetchNursesApi(user?.branch, selectedDepartment)
      .then((data) => {
        const list = data || [];
        setNursesList(list);
        if (list.length > 0) {
          setAssignedNurse(list[0].name);
        } else {
          setAssignedNurse('');
        }
      })
      .catch((err) => {
        console.warn('Failed to load nurses list:', err);
        setNursesList([]);
        setAssignedNurse('');
      })
      .finally(() => setLoadingNurses(false));
  }, [user?.branch, selectedDepartment]);

  // Available departments list
  const availableDepartments = useMemo(() => {
    const sysDepts = departments.map((d) => d.name);
    const docDepts = doctors.map((d) => d.department).filter(Boolean) as string[];
    const standard = ['Cardiology', 'General Medicine', 'Orthopedics', 'Neurology', 'Pulmonology', 'Pediatrics', 'Plastic Surgery', 'Emergency'];
    return Array.from(new Set([...standard, ...sysDepts, ...docDepts])).sort();
  }, [departments, doctors]);

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    setEmergencyType(getCategoryForDepartment(dept));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !mobile || !initialComplaint) return;

    let registeredUhid = '';
    try {
      const newPatient = await addPatient({
        firstName,
        lastName,
        gender,
        age: Number(age) || 30,
        mobile,
        bloodGroup: bloodGroup as any,
        allergies: allergies || 'None',
        existingDiseases: existingDiseases || 'None',
        emergencyContactName: emergencyContactName || firstName,
        emergencyPhone: emergencyPhone || mobile,
        emergencyRelationship,
        branch: user?.branch || 'Main Hospital',
      } as any);

      if (!newPatient || !newPatient.uhid) {
        throw new Error('Patient registration did not return a UHID. Please try again.');
      }
      registeredUhid = newPatient.uhid;
    } catch (err: any) {
      console.error('Patient creation failed:', err);
      return;
    }

    try {
      await createERVisit({
        patientUhid: registeredUhid,
        patientName: `${firstName} ${lastName}`,
        age: Number(age) || 30,
        gender,
        bloodGroup,
        phone: mobile,
        emergencyContactName: emergencyContactName || firstName,
        emergencyContactPhone: emergencyPhone || mobile,
        emergencyRelationship,
        allergies,
        existingDiseases,
        arrivalDate,
        arrivalTime,
        arrivalMode,
        ambulanceInfo:
          arrivalMode === 'Ambulance'
            ? { ambulanceNumber, referralHospital, paramedicName, arrivalTime }
            : undefined,
        department: selectedDepartment,
        emergencyType,
        accompaniedBy: accompaniedBy || 'Self / Escort',
        emergencyContact: `${emergencyContactName || firstName} (${emergencyPhone || mobile})`,
        initialComplaint,
        registeredBy: user?.name || 'Receptionist',
        assignedDoctor: assignedDoctor || 'Dr. Emergency Specialist',
        assignedNurse: assignedNurse || 'Duty Staff Nurse',
        branch: user?.branch || 'Main Hospital',
      });

      navigate('/reception/er/queue');
    } catch (err) {
      console.error('Walk-in ER visit creation failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-4 sm:p-5 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-base font-bold">3. Walk-in Emergency Patient Registration</h1>
            <p className="text-xs text-emerald-100 mt-0.5">
              Create a new Patient Master record (UHID) and instantly launch their active ER Visit in one seamless flow.
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-bold flex items-center gap-1.5 self-start md:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          <span>Unified 2-Step Flow</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Patient Master Details */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Step 1: Patient Master Profile Setup (Generates UHID)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amit"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kumar"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Age (Years) *</label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Mobile Phone Number (10 digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Emergency Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Sunita Kumar (Wife)"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Known Drug/Food Allergies</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Sulfa, None"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Pre-existing Medical History</label>
              <input
                type="text"
                placeholder="e.g. Diabetes, Asthma, Hypertension"
                value={existingDiseases}
                onChange={(e) => setExistingDiseases(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Emergency Encounter Details */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Step 2: Emergency Visit Encounter Details</span>
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Arrival Date *</label>
                <input
                  type="date"
                  required
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Arrival Time *</label>
                <input
                  type="text"
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Arrival Mode *</label>
                <select
                  value={arrivalMode}
                  onChange={(e) => setArrivalMode(e.target.value as ArrivalMode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Ambulance">Ambulance</option>
                </select>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block font-bold text-blue-700 text-xs mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Assigned Department *</span>
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {arrivalMode === 'Ambulance' && (
              <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200 space-y-2.5">
                <p className="font-bold text-rose-800 flex items-center gap-1.5 text-xs">
                  <Truck className="w-3.5 h-3.5" />
                  Ambulance Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Ambulance Vehicle #"
                    value={ambulanceNumber}
                    onChange={(e) => setAmbulanceNumber(e.target.value)}
                    className="bg-white border border-rose-200 px-3 py-1.5 text-xs rounded-lg outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Referral Hospital"
                    value={referralHospital}
                    onChange={(e) => setReferralHospital(e.target.value)}
                    className="bg-white border border-rose-200 px-3 py-1.5 text-xs rounded-lg outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Paramedic Name"
                    value={paramedicName}
                    onChange={(e) => setParamedicName(e.target.value)}
                    className="bg-white border border-rose-200 px-3 py-1.5 text-xs rounded-lg outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Accompanied By</label>
                <input
                  type="text"
                  placeholder="e.g. Brother / Relative"
                  value={accompaniedBy}
                  onChange={(e) => setAccompaniedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Assigned Doctor ({selectedDepartment}) *</span>
                </label>
                <select
                  value={assignedDoctor}
                  onChange={(e) => setAssignedDoctor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  {loadingDoctors ? (
                    <option value="">Loading doctors...</option>
                  ) : doctorsList.length > 0 ? (
                    doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name} - {doc.department || selectedDepartment}
                      </option>
                    ))
                  ) : (
                    <option value="">-- No doctors found for {selectedDepartment} --</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Assigned Nurse ({selectedDepartment}) *</span>
                </label>
                <select
                  value={assignedNurse}
                  onChange={(e) => setAssignedNurse(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                >
                  {loadingNurses ? (
                    <option value="">Loading nurses...</option>
                  ) : nursesList.length > 0 ? (
                    nursesList.map((nurse) => (
                      <option key={nurse.id} value={nurse.name}>
                        {nurse.name} {nurse.assignedWard ? `(${nurse.assignedWard})` : nurse.department ? `(${nurse.department})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">-- No nurses found for {selectedDepartment} --</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">Initial Complaint & Symptoms *</label>
              <textarea
                required
                rows={2}
                placeholder="Describe acute emergency symptoms, injuries, or complaints..."
                value={initialComplaint}
                onChange={(e) => setInitialComplaint(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/reception/er/queue')}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Register Patient & Launch ER Visit</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
