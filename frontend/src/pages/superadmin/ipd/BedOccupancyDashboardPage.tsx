import React, { useState, useMemo, useEffect } from 'react';
import {
  BedDouble,
  Building,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Stethoscope,
  ShieldAlert,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import { useHMS } from '../../../context/HMSContext';
import { Modal } from '../../../components/common/Modal';
import { fetchBedsDashboardApi, createBedApi, updateBedApi } from '../../../services/api';

interface BedItem {
  id: string;
  bedNo: string;
  wardType: 'ICU' | 'General Ward' | 'Deluxe Suite' | 'Semi-Private';
  branch: string;
  patientName?: string;
  admissionDate?: string;
  doctorAssigned?: string;
  nurseInCharge?: string;
  dailyRate: number;
  status: 'Occupied' | 'Available' | 'Maintenance' | 'Reserved';
}

export const BedOccupancyDashboardPage: React.FC = () => {
  const { branches } = useSuperAdmin();
  const { addToast } = useHMS();

  const [beds, setBeds] = useState<BedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedWard, setSelectedWard] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBedForm, setNewBedForm] = useState({
    bedNo: '',
    wardType: 'ICU' as const,
    branch: branches[0]?.branchName || '',
    dailyRate: 5000,
    status: 'Available' as const,
  });

  // Load beds from backend on mount
  useEffect(() => {
    fetchBedsDashboardApi()
      .then((data) => {
        if (Array.isArray(data)) setBeds(data as BedItem[]);
      })
      .catch((err) => console.warn('Could not load beds from API:', err));
  }, []);

  const handleCreateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBedForm.bedNo.trim()) {
      addToast('error', 'Validation Error', 'Please enter a unique bed number.');
      return;
    }

    try {
      const created = await createBedApi({
        bedNo: newBedForm.bedNo.trim(),
        wardType: newBedForm.wardType,
        branch: newBedForm.branch || branches[0]?.branchName || 'Main Campus',
        dailyRate: Number(newBedForm.dailyRate),
        status: newBedForm.status,
      });
      const newBed: BedItem = {
        id: created.id,
        bedNo: created.bed_number || newBedForm.bedNo.trim(),
        wardType: (created.ward || newBedForm.wardType) as BedItem['wardType'],
        branch: created.branch || newBedForm.branch,
        dailyRate: created.daily_rate ?? newBedForm.dailyRate,
        status: (created.status || newBedForm.status) as BedItem['status'],
      };
      setBeds((prev) => [newBed, ...prev]);
      addToast('success', 'Bed Created', `New bed unit ${newBed.bedNo} successfully added to hospital capacity.`);
    } catch (err) {
      console.warn('Failed to create bed via API:', err);
      addToast('error', 'Error', 'Could not save bed to database.');
    }

    setIsCreateModalOpen(false);
    setNewBedForm({
      bedNo: '',
      wardType: 'ICU',
      branch: branches[0]?.branchName || '',
      dailyRate: 5000,
      status: 'Available',
    });
  };

  // Statistics calculation
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
  const availableBeds = beds.filter((b) => b.status === 'Available').length;
  const maintenanceBeds = beds.filter((b) => b.status === 'Maintenance').length;
  const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

  const toggleBedMaintenance = async (bedId: string) => {
    const bed = beds.find((b) => b.id === bedId);
    if (!bed) return;
    const newStatus = bed.status === 'Maintenance' ? 'Available' : 'Maintenance';
    setBeds((prev) =>
      prev.map((b) => (b.id === bedId ? { ...b, status: newStatus as BedItem['status'] } : b))
    );
    addToast('info', 'Bed Status Updated', `${bed.bedNo} status set to ${newStatus}.`);
    try {
      await updateBedApi(bedId, { status: newStatus });
    } catch (err) {
      console.warn('Failed to update bed status:', err);
    }
  };

  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
      const matchesSearch =
        b.bedNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.patientName && b.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.doctorAssigned && b.doctorAssigned.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBranch = selectedBranch === 'All' || b.branch === selectedBranch;
      const matchesWard = selectedWard === 'All' || b.wardType === selectedWard;
      const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;

      return matchesSearch && matchesBranch && matchesWard && matchesStatus;
    });
  }, [beds, searchQuery, selectedBranch, selectedWard, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>IPD Management</span>
            <span>/</span>
            <span className="text-indigo-600">Bed Occupancy Dashboard</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            IPD Real-Time Bed Occupancy Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real-time bed utilization across ICU, General Wards, Deluxe Suites & Semi-Private rooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create / Add New Bed</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total IPD Capacity</span>
          <p className="text-2xl font-black text-slate-900">{totalBeds} Beds</p>
          <span className="text-[10px] font-semibold text-slate-500">Configured Units</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupied Beds</span>
          <p className="text-2xl font-black text-rose-600">{occupiedBeds}</p>
          <span className="text-[10px] font-semibold text-rose-600">Patients Admitted</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Beds</span>
          <p className="text-2xl font-black text-emerald-600">{availableBeds}</p>
          <span className="text-[10px] font-semibold text-emerald-600">Ready for Admission</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Maintenance</span>
          <p className="text-2xl font-black text-amber-600">{maintenanceBeds}</p>
          <span className="text-[10px] font-semibold text-amber-600">Sanitizing / Repairs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
          <p className="text-2xl font-black text-indigo-600">{occupancyRate}%</p>
          <span className="text-[10px] font-semibold text-indigo-600">System Capacity</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bed no, patient name or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Ward:</span>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Ward Types</option>
              <option value="ICU">ICU</option>
              <option value="General Ward">General Ward</option>
              <option value="Deluxe Suite">Deluxe Suite</option>
              <option value="Semi-Private">Semi-Private</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.branchName}>{b.branchName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Occupied">Occupied</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bed Status Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBeds.map((bed) => (
          <div
            key={bed.id}
            className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
              bed.status === 'Occupied'
                ? 'bg-rose-50/40 border-rose-200'
                : bed.status === 'Available'
                ? 'bg-emerald-50/40 border-emerald-200'
                : 'bg-amber-50/40 border-amber-200'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 ${
                      bed.status === 'Occupied'
                        ? 'bg-rose-100 text-rose-700'
                        : bed.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{bed.bedNo}</h3>
                    <span className="text-[10px] font-bold text-indigo-600">{bed.wardType}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    bed.status === 'Occupied'
                      ? 'bg-rose-100 text-rose-700'
                      : bed.status === 'Available'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {bed.status}
                </span>
              </div>

              {bed.status === 'Occupied' ? (
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <strong className="text-slate-900">{bed.patientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admitted:</span>
                    <span className="font-mono text-slate-700">{bed.admissionDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doctor:</span>
                    <span className="font-semibold text-indigo-600">{bed.doctorAssigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nurse:</span>
                    <span className="text-slate-700">{bed.nurseInCharge}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/80 rounded-xl border border-slate-100 text-xs text-slate-500">
                  {bed.status === 'Available'
                    ? 'Bed ready for IPD admission & allocation.'
                    : 'Bed under maintenance, deep cleaning or sterilization.'}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">₹{bed.dailyRate} / day</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBedMaintenance(bed.id)}
                  className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-[11px]"
                >
                  {bed.status === 'Maintenance' ? 'Mark Ready' : 'Maintenance'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Add New Bed Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create & Allocate New Bed Unit"
        subtitle="Add a new IPD bed unit to expand hospital capacity"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBed} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bed Number / Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ICU-BED-08 or GW-BED-25"
                value={newBedForm.bedNo}
                onChange={(e) => setNewBedForm({ ...newBedForm, bedNo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ward Category</label>
              <select
                value={newBedForm.wardType}
                onChange={(e) => setNewBedForm({ ...newBedForm, wardType: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="ICU">ICU</option>
                <option value="General Ward">General Ward</option>
                <option value="Deluxe Suite">Deluxe Suite</option>
                <option value="Semi-Private">Semi-Private</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hospital Branch</label>
              <select
                value={newBedForm.branch}
                onChange={(e) => setNewBedForm({ ...newBedForm, branch: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.branchName}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Daily Charge Rate (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={newBedForm.dailyRate}
                onChange={(e) => setNewBedForm({ ...newBedForm, dailyRate: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
              <select
                value={newBedForm.status}
                onChange={(e) => setNewBedForm({ ...newBedForm, status: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
              >
                <option value="Available">Available (Ready)</option>
                <option value="Maintenance">Maintenance / Sanitization</option>
                <option value="Reserved">Reserved</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
            >
              Create Bed Unit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
