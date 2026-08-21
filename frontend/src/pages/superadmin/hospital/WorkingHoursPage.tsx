import React, { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { WorkingHours } from '../../../types/superAdmin';

export const WorkingHoursPage: React.FC = () => {
  const { workingHours, addWorkingHours, updateWorkingHours, deleteWorkingHours, departments } = useSuperAdmin();
  const { addToast } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedWH, setSelectedWH] = useState<WorkingHours | null>(null);

  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const initialForm = {
    department: 'Cardiology',
    startTime: '08:00 AM',
    endTime: '08:00 PM',
    breakTime: '01:00 PM - 02:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    status: 'Active' as 'Active' | 'Inactive',
  };

  const [formData, setFormData] = useState(initialForm);

  const handleOpenCreate = () => {
    setSelectedWH(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh: WorkingHours) => {
    setSelectedWH(wh);
    setFormData({
      department: wh.department,
      startTime: wh.startTime,
      endTime: wh.endTime,
      breakTime: wh.breakTime,
      workingDays: wh.workingDays,
      status: wh.status,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (wh: WorkingHours) => {
    setSelectedWH(wh);
    setIsDeleteModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(day);
      if (exists) {
        return { ...prev, workingDays: prev.workingDays.filter((d) => d !== day) };
      }
      return { ...prev, workingDays: [...prev.workingDays, day] };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWH) {
      updateWorkingHours(selectedWH.id, formData);
    } else {
      addWorkingHours(formData);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedWH) {
      deleteWorkingHours(selectedWH.id);
      setIsDeleteModalOpen(false);
      setSelectedWH(null);
    }
  };

  const filteredWH = useMemo(() => {
    return workingHours.filter((item) =>
      item.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workingHours, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Hospital Setup</span>
            <span>/</span>
            <span className="text-indigo-600">Working Hours</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Department Working Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure department operational hours, break windows & active work days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search department operating hours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredWH.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.department}</h3>
                    <p className="text-xs font-bold text-indigo-600">
                      {item.startTime} - {item.endTime}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Break Period:</span>
                  <span className="font-bold text-slate-800">{item.breakTime}</span>
                </p>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Working Days:</span>
                  <div className="flex flex-wrap gap-1">
                    {allDays.map((d) => {
                      const isActive = item.workingDays.includes(d);
                      return (
                        <span
                          key={d}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isActive ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
              <button
                onClick={() => handleOpenEdit(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Edit Schedule"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenDelete(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Schedule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedWH ? `Edit Schedule` : 'Create Department Working Schedule'}
        subtitle="Specify shift hours and operational days"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <label className="block font-bold text-slate-700 mb-1">Start Time</label>
              <input
                type="text"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="08:00 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">End Time</label>
              <input
                type="text"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="08:00 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Break Time Window</label>
              <input
                type="text"
                value={formData.breakTime}
                onChange={(e) => setFormData({ ...formData, breakTime: e.target.value })}
                placeholder="01:00 PM - 02:00 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Working Days Selection</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map((day) => {
                  const selected = formData.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        selected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
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
              {selectedWH ? 'Update Schedule' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {selectedWH && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Schedule Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Delete schedule for <span className="font-bold text-slate-900">{selectedWH.department}</span>?
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
