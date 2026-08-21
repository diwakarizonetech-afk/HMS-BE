import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  BedDouble,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { DepartmentItem } from '../../../types/superAdmin';

export const DepartmentManagementPage: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);

  const initialForm = {
    departmentName: '',
    headOfDepartment: '',
    email: '',
    phone: '',
    floorLocation: '1st Floor',
    doctorCount: 5,
    bedCount: 20,
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setSelectedDept(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setFormData({
      departmentName: dept.departmentName,
      headOfDepartment: dept.headOfDepartment,
      email: dept.email,
      phone: dept.phone,
      floorLocation: dept.floorLocation,
      doctorCount: dept.doctorCount,
      bedCount: dept.bedCount,
      status: dept.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.departmentName.trim()) {
      addToast('error', 'Validation Error', 'Department Name is required.');
      return;
    }

    if (selectedDept) {
      updateDepartment(selectedDept.id, formData);
    } else {
      addDepartment(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedDept) {
      deleteDepartment(selectedDept.id);
      setIsDeleteModalOpen(false);
      setSelectedDept(null);
    }
  };

  const filteredDepts = useMemo(() => {
    return departments.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.departmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.headOfDepartment.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Department Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Clinical & Administrative Departments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage hospital departments, heads of department, floor locations & doctor roster capacities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search department name, code or HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total Departments: <span className="text-indigo-600 font-extrabold">{filteredDepts.length}</span>
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepts.map((dept) => (
          <div
            key={dept.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 font-bold flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{dept.departmentName || dept.name}</h3>
                    <span className="text-[10px] font-mono font-bold text-indigo-600">{dept.departmentCode || dept.code}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dept.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {dept.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{dept.floorLocation}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{dept.phone}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-700">HOD: <strong className="text-indigo-600">{dept.headOfDepartment}</strong></span>
                <span className="flex items-center gap-3 font-semibold">
                  <span className="flex items-center gap-1 text-violet-600"><UserCheck className="w-3 h-3" /> {dept.doctorCount} Doctors</span>
                  <span className="flex items-center gap-1 text-emerald-600"><BedDouble className="w-3 h-3" /> {dept.bedCount} Beds</span>
                </span>
              </div>

              <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-50">
                <button
                  onClick={() => handleOpenEdit(dept)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  title="Edit Department"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(dept)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Department"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDept ? `Edit Department (${selectedDept.departmentCode})` : 'Create Clinical Department'}
        subtitle="Define department leadership, location & medical capacity"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
              <input
                type="text"
                required
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                placeholder="e.g. Cardiology"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Head of Department</label>
              <input
                type="text"
                value={formData.headOfDepartment}
                onChange={(e) => setFormData({ ...formData, headOfDepartment: e.target.value })}
                placeholder="e.g. Dr. Vikram Malhotra"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Floor Location</label>
              <input
                type="text"
                value={formData.floorLocation}
                onChange={(e) => setFormData({ ...formData, floorLocation: e.target.value })}
                placeholder="e.g. 2nd Floor, Block A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 (022) 4920-8101"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cardiology@aegiscarehealth.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Doctor Count</label>
              <input
                type="number"
                value={formData.doctorCount}
                onChange={(e) => setFormData({ ...formData, doctorCount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Bed Count</label>
              <input
                type="number"
                value={formData.bedCount}
                onChange={(e) => setFormData({ ...formData, bedCount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
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
              {selectedDept ? 'Update Department' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedDept && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Department Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete department <span className="font-bold text-slate-900">{selectedDept.departmentName}</span>?
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
                Yes, Delete Department
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
