import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { DoctorSpecialization } from '../../../types/superAdmin';

export const DoctorSpecializationPage: React.FC = () => {
  const { specializations, addSpecialization, updateSpecialization, deleteSpecialization, departments } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<DoctorSpecialization | null>(null);

  const initialForm = {
    specializationName: '',
    category: 'Surgical Specialty',
    associatedDepartment: 'Cardiology',
    description: '',
    doctorCount: 4,
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setSelectedSpec(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (spec: DoctorSpecialization) => {
    setSelectedSpec(spec);
    setFormData({
      specializationName: spec.specializationName,
      category: spec.category,
      associatedDepartment: spec.associatedDepartment,
      description: spec.description,
      doctorCount: spec.doctorCount,
      status: spec.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (spec: DoctorSpecialization) => {
    setSelectedSpec(spec);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.specializationName.trim()) {
      addToast('error', 'Validation Error', 'Specialization Name is required.');
      return;
    }

    if (selectedSpec) {
      updateSpecialization(selectedSpec.id, formData);
    } else {
      addSpecialization(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedSpec) {
      deleteSpecialization(selectedSpec.id);
      setIsDeleteModalOpen(false);
      setSelectedSpec(null);
    }
  };

  const filteredSpecs = useMemo(() => {
    return specializations.filter(
      (s) =>
        s.specializationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.associatedDepartment.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [specializations, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Doctor Specializations</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Medical & Clinical Specializations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure specialty tracks, surgical classifications & clinical expertise domains.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Specialization</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search specialization name, code or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Specializations: <span className="text-indigo-600 font-extrabold">{filteredSpecs.length}</span>
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredSpecs.map((spec) => (
          <div
            key={spec.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 font-bold flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{spec.specializationName}</h3>
                    <span className="text-[10px] font-mono font-bold text-indigo-600">{spec.code}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{spec.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">Dept: <strong className="text-slate-800">{spec.associatedDepartment}</strong></span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {spec.doctorCount} Doctors
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${spec.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {spec.status}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(spec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="Edit Specialization"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(spec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Specialization"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSpec ? `Edit Specialization (${selectedSpec.code})` : 'Create Medical Specialization'}
        subtitle="Define clinical specialty scope & department linkage"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Specialization Name *</label>
            <input
              type="text"
              required
              value={formData.specializationName}
              onChange={(e) => setFormData({ ...formData, specializationName: e.target.value })}
              placeholder="e.g. Cardiologist"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Associated Department</label>
            <select
              value={formData.associatedDepartment}
              onChange={(e) => setFormData({ ...formData, associatedDepartment: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Category Classification</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Surgical & Invasive"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Scope of practice and diagnostics..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            />
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
              {selectedSpec ? 'Update Specialization' : 'Save Specialization'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedSpec && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Specialization Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete specialization <span className="font-bold text-slate-900">{selectedSpec.specializationName}</span>?
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
