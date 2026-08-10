import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import { WalkInToken } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import { UserCheck2, Clock, Ticket, Printer, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export const WalkInPage: React.FC = () => {
  const { patients, departments, doctors, queue, registerWalkIn } = useHMS();
  const { user } = useAuth();

  const userBranch = user?.branch || 'Main Branch';
  const [selectedBranch, setSelectedBranch] = useState<string>(userBranch);

  const [selectedUhid, setSelectedUhid] = useState(patients[0]?.uhid || '');
  const [selectedDept, setSelectedDept] = useState(departments[0]?.name || '');
  const [selectedDoctorName, setSelectedDoctorName] = useState(doctors[0]?.name || '');

  const [issuedToken, setIssuedToken] = useState<WalkInToken | null>(null);

  // Doctors strictly filtered by selected Branch AND Department
  const filteredDoctors = doctors.filter((d) => {
    const docBranch = (d.branch || '').toLowerCase().trim();
    const selBranch = (selectedBranch || '').toLowerCase().trim();
    const matchesBranch =
      !selectedBranch ||
      selectedBranch === 'All' ||
      !docBranch ||
      docBranch === 'main branch' ||
      docBranch.includes(selBranch) ||
      selBranch.includes(docBranch);

    if (!selectedDept || selectedDept === 'All') return matchesBranch;
    const docDept = (d.department || '').toLowerCase().trim();
    const selDept = selectedDept.toLowerCase().trim();
    return matchesBranch && (docDept.includes(selDept) || selDept.includes(docDept));
  });

  React.useEffect(() => {
    if (!selectedUhid && patients.length > 0) {
      setSelectedUhid(patients[0]?.uhid || '');
    }
  }, [patients, selectedUhid]);

  React.useEffect(() => {
    if (departments.length > 0 && !departments.some((d) => d.name === selectedDept)) {
      setSelectedDept(departments[0]?.name || '');
    }
  }, [departments, selectedDept]);

  React.useEffect(() => {
    if (filteredDoctors.length > 0) {
      if (!filteredDoctors.some((d) => d.name === selectedDoctorName)) {
        setSelectedDoctorName(filteredDoctors[0].name);
      }
    } else {
      setSelectedDoctorName('');
    }
  }, [selectedBranch, filteredDoctors, selectedDept, selectedDoctorName]);

  const handleGenerateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUhid = selectedUhid || patients[0]?.uhid;
    const patientObj = patients.find((p) => p.uhid === targetUhid);
    if (!patientObj) return;

    const docName = selectedDoctorName || (filteredDoctors[0]?.name || doctors[0]?.name || 'Dr. Doctor');

    const token = await registerWalkIn(
      patientObj.uhid,
      `${patientObj.firstName} ${patientObj.lastName}`,
      selectedDept,
      docName
    );

    setIssuedToken(token);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">Walk-in OPD Registration</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <Building2 className="w-3 h-3" />
            {selectedBranch}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Issue instant walk-in OPD queue tokens with automated wait time estimation per hospital branch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Issue Walk-in Queue Token
          </h3>

          <form onSubmit={handleGenerateWalkIn} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Hospital Branch *</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-blue-50/60 border border-blue-200 rounded-xl px-3.5 py-2.5 outline-none font-bold text-blue-900 focus:bg-white"
              >
                <option value="Main Branch">Main Branch</option>
                <option value="City Center Branch">City Center Branch</option>
                <option value="North Wing Branch">North Wing Branch</option>
                <option value="East Wing Branch">East Wing Branch</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Registered Patient *</label>
              <select
                value={selectedUhid}
                onChange={(e) => setSelectedUhid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold focus:bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.uhid}>
                    {p.uhid} - {p.firstName} {p.lastName} ({p.mobile})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Department *</label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  const docs = doctors.filter((d) => d.department === e.target.value);
                  if (docs.length > 0) setSelectedDoctorName(docs[0].name);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold focus:bg-white"
              >
                {departments.map((d) => {
                  const deptName = d.name || (d as any).departmentName || '';
                  const deptCode = d.code || (d as any).departmentCode || '';
                  return (
                    <option key={d.id} value={deptName}>
                      {deptName}{deptCode ? ` (${deptCode})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign Doctor *</label>
              <select
                value={selectedDoctorName}
                onChange={(e) => setSelectedDoctorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold focus:bg-white"
              >
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name} - {doc.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-blue-900 block">Est. Waiting Time</span>
                <span className="text-slate-600">Based on active OPD queue depth</span>
              </div>
              <span className="text-base font-black text-blue-700">
                ~{(queue.filter((q) => q.status === 'Waiting').length + 1) * 15} Mins
              </span>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>Generate Token Slip</span>
            </button>
          </form>
        </div>

        {/* Live Active Queue Preview Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Active Tokens in Queue ({queue.length})
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    {item.tokenNumber}
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{item.patientName}</p>
                  <p className="text-[10px] text-slate-500">{item.doctorName}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Token Slip Modal */}
      {issuedToken && (
        <Modal
          isOpen={!!issuedToken}
          onClose={() => setIssuedToken(null)}
          title="OPD Token Ticket Issued"
          subtitle="Print or hand over token slip to patient"
          maxWidth="sm"
        >
          <div className="space-y-6 text-center">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-200 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Ticket className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">TOKEN NUMBER</p>
                <h2 className="text-4xl font-black text-blue-700 mt-1">{issuedToken.tokenNumber}</h2>
              </div>

              <div className="text-xs text-slate-700 space-y-1 pt-2 border-t border-slate-200">
                <p>
                  Patient: <span className="font-bold">{issuedToken.patientName}</span> ({issuedToken.patientUhid})
                </p>
                <p>
                  Dept: <span className="font-bold">{issuedToken.department}</span>
                </p>
                <p>
                  Doctor: <span className="font-bold">{issuedToken.doctorName}</span>
                </p>
                <p className="text-blue-600 font-bold mt-2">
                  Est. Wait Time: {issuedToken.estimatedWaitMinutes} minutes
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ticket</span>
              </button>
              <button
                onClick={() => setIssuedToken(null)}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
