import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { ConsultationCharge } from '../../../types/superAdmin';

export const ConsultationChargesPage: React.FC = () => {
  const { consultationCharges, addConsultationCharge, updateConsultationCharge, deleteConsultationCharge, departments, users } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<ConsultationCharge | null>(null);

  const initialForm = {
    department: 'Cardiology',
    doctorId: 'd-101',
    doctorName: 'Dr. Vikram Malhotra',
    specialization: 'Cardiologist',
    consultationFee: 1200,
    emergencyFee: 2500,
    followUpFee: 600,
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setSelectedCharge(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (charge: ConsultationCharge) => {
    setSelectedCharge(charge);
    setFormData({
      department: charge.department,
      doctorId: charge.doctorId,
      doctorName: charge.doctorName,
      specialization: charge.specialization,
      consultationFee: charge.consultationFee,
      emergencyFee: charge.emergencyFee,
      followUpFee: charge.followUpFee,
      status: charge.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (charge: ConsultationCharge) => {
    setSelectedCharge(charge);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCharge) {
      updateConsultationCharge(selectedCharge.id, formData);
    } else {
      addConsultationCharge(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedCharge) {
      deleteConsultationCharge(selectedCharge.id);
      setIsDeleteModalOpen(false);
      setSelectedCharge(null);
    }
  };

  const filteredCharges = useMemo(() => {
    return consultationCharges.filter((c) => {
      const matchesSearch =
        c.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'All' || c.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [consultationCharges, searchQuery, selectedDept]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Consultation Charges</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            OPD Consultation & Emergency Tariffs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Set and update OPD doctor consultation fees, emergency triage charges & follow-up discounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Fee Structure</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search doctor name, department or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Dept:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Doctor Name</th>
                <th className="py-3.5 px-4">Specialization</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4 text-right">Standard Consultation Fee</th>
                <th className="py-3.5 px-4 text-right">Emergency Tariff</th>
                <th className="py-3.5 px-4 text-right">Follow-Up Fee</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCharges.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{c.doctorName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{c.specialization}</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-600">{c.department}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{c.consultationFee}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-600">₹{c.emergencyFee}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">₹{c.followUpFee}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Fee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Fee Structure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCharge ? `Edit Consultation Charges` : 'Configure Doctor Consultation Charges'}
        subtitle="Set standard OPD, Emergency & Follow-up consultation fees"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Doctor Name</label>
              <input
                type="text"
                required
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                placeholder="e.g. Dr. Vikram Malhotra"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Specialization</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Cardiologist"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Standard OPD Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Emergency Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.emergencyFee}
                onChange={(e) => setFormData({ ...formData, emergencyFee: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Follow-Up Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.followUpFee}
                onChange={(e) => setFormData({ ...formData, followUpFee: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
            >
              {selectedCharge ? 'Update Fees' : 'Save Fee Structure'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedCharge && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Delete fee configuration for <span className="font-bold text-slate-900">{selectedCharge.doctorName}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
