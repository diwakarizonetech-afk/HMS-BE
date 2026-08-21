import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Vendor } from '../../types/store';
import { fetchVendorsApi, createVendorApi, updateVendorApi, deleteVendorApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const VendorManagementPage: React.FC = () => {
  const { addToast } = useHMS();
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const loadVendors = async () => {
    try {
      const data = await fetchVendorsApi();
      if (Array.isArray(data)) {
        setVendors(data.map((v: any): Vendor => ({
          id: v.id,
          vendorCode: v.vendor_code || v.vendorCode,
          vendorName: v.vendor_name || v.vendorName,
          category: v.category || 'Pharmaceuticals',
          contactPerson: v.contact_person || v.contactPerson || '',
          mobile: v.mobile || v.phone || '',
          email: v.email || '',
          gstNumber: v.gst_number || v.gstNumber || '',
          pan: v.pan || '',
          address: v.address || '',
          city: v.city || 'Bengaluru',
          state: v.state || 'Karnataka',
          country: v.country || 'India',
          paymentTerms: v.payment_terms || v.paymentTerms || 'Net 30',
          status: v.status || 'Active',
        })));
      }
    } catch (err) {
      console.warn('Error fetching vendors from API:', err);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentTermFilter, setPaymentTermFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const initialForm: Omit<Vendor, 'id'> = {
    vendorCode: `VND-${200 + vendors.length + 1}`,
    vendorName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstNumber: '',
    pan: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    paymentTerms: 'Net 30',
    status: 'Active',
  };

  const [formData, setFormData] = useState<Omit<Vendor, 'id'>>(initialForm);

  const handleOpenCreate = () => {
    setSelectedVendor(null);
    setFormData({
      ...initialForm,
      vendorCode: `VND-${200 + vendors.length + 1}`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setSelectedVendor(v);
    setFormData({
      ...initialForm,
      ...v,
      vendorName: v.vendorName || '',
      contactPerson: v.contactPerson || '',
      mobile: v.mobile || '',
      email: v.email || '',
      gstNumber: v.gstNumber || '',
      pan: v.pan || '',
      address: v.address || '',
      city: v.city || '',
      state: v.state || '',
      country: v.country || '',
      paymentTerms: v.paymentTerms || 'Net 30',
      status: v.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenView = (v: Vendor) => {
    setSelectedVendor(v);
    setIsViewModalOpen(true);
  };

  const handleOpenDelete = (v: Vendor) => {
    setSelectedVendor(v);
    setIsDeleteModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName.trim() || !formData.contactPerson.trim()) {
      addToast('error', 'Validation Error', 'Vendor Name & Contact Person are required.');
      return;
    }

    try {
      if (selectedVendor) {
        const updated = await updateVendorApi(selectedVendor.id, formData);
        setVendors((prev) =>
          prev.map((v) => (v.id === selectedVendor.id ? { ...v, ...formData, id: selectedVendor.id } : v))
        );
        addToast('success', 'Vendor Updated (API)', `${formData.vendorName} updated in database.`);
      } else {
        const created = await createVendorApi(formData);
        const mappedCreated: Vendor = {
          id: created.id,
          vendorCode: created.vendor_code || created.vendorCode || formData.vendorCode,
          vendorName: created.vendor_name || created.vendorName || formData.vendorName,
          category: created.category || formData.category,
          contactPerson: created.contact_person || created.contactPerson || formData.contactPerson,
          mobile: created.mobile || formData.mobile,
          email: created.email || formData.email,
          gstNumber: created.gst_number || formData.gstNumber,
          pan: created.pan || formData.pan,
          address: created.address || formData.address,
          city: created.city || formData.city,
          state: created.state || formData.state,
          country: created.country || formData.country,
          paymentTerms: created.payment_terms || formData.paymentTerms,
          status: created.status || formData.status,
        };
        setVendors((prev) => [mappedCreated, ...prev]);
        addToast('success', 'Vendor Created (API)', `${formData.vendorName} added to database.`);
      }
    } catch (err) {
      console.warn('API error saving vendor:', err);
      addToast('error', 'Save Failed', 'Could not save vendor to database.');
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedVendor) {
      try {
        await deleteVendorApi(selectedVendor.id);
        setVendors((prev) => prev.filter((v) => v.id !== selectedVendor.id));
        addToast('info', 'Vendor Removed (API)', `Vendor ${selectedVendor.vendorName} deleted from database.`);
      } catch (err) {
        console.warn('API error deleting vendor:', err);
      }
      setIsDeleteModalOpen(false);
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.gstNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
      const matchesTerm = paymentTermFilter === 'All' || v.paymentTerms === paymentTermFilter;

      return matchesSearch && matchesStatus && matchesTerm;
    });
  }, [vendors, searchQuery, statusFilter, paymentTermFilter]);

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage) || 1;
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(start, start + itemsPerPage);
  }, [filteredVendors, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Vendor Management</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Vendor Directory & Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage certified pharmaceutical, equipment & surgical suppliers, GST & payment agreements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => addToast('info', 'Exporting Vendors', 'Exporting vendor list as CSV...')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export List</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vendor</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Vendor Name, Code, GST..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Terms:</span>
            <select
              value={paymentTermFilter}
              onChange={(e) => setPaymentTermFilter(e.target.value)}
              className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
            >
              <option value="All">All Terms</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Advance">Advance</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Vendor Code & Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone / Email</th>
                <th className="py-3.5 px-4">GST / PAN</th>
                <th className="py-3.5 px-4">City / Location</th>
                <th className="py-3.5 px-4">Payment Terms</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedVendors.length > 0 ? (
                paginatedVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{v.vendorName}</p>
                          <span className="text-[10px] text-blue-600 font-mono font-semibold">{v.vendorCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {v.contactPerson}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="font-medium text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{v.mobile}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{v.email}</span>
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <p className="font-bold text-slate-800">GST: {v.gstNumber}</p>
                      <p className="text-slate-500">PAN: {v.pan}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-semibold">{v.city}</span>, {v.state}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[10px]">
                        {v.paymentTerms}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedVendors.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredVendors.length}</span> vendors
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedVendor ? `Edit Vendor (${selectedVendor.vendorCode})` : 'Register Vendor'}
        subtitle="Specify supplier company info, GST, PAN, and agreed payment terms"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveVendor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Code</label>
              <input
                type="text"
                disabled
                value={formData.vendorCode || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Name *</label>
              <input
                type="text"
                required
                value={formData.vendorName || ''}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                placeholder="e.g. Apex Meditech Distributors Pvt Ltd"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
              <input
                type="text"
                value={formData.mobile || ''}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sales@vendor.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                value={formData.gstNumber || ''}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="27AAACA1234H1Z5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={formData.pan || ''}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                placeholder="AAACA1234H"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={formData.paymentTerms || 'Net 30'}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              >
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Advance">Advance Payment</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Plot 45, Industrial Suburb Stage 2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {selectedVendor ? 'Update Vendor' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      {selectedVendor && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Vendor Details: ${selectedVendor.vendorName}`}
          subtitle={`Code: ${selectedVendor.vendorCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 font-medium">Contact Person:</span>
                <p className="font-bold text-slate-900">{selectedVendor.contactPerson}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Payment Terms:</span>
                <p className="font-bold text-blue-600">{selectedVendor.paymentTerms}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Phone:</span>
                <p className="font-bold text-slate-800">{selectedVendor.mobile}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Email:</span>
                <p className="font-bold text-slate-800">{selectedVendor.email}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">GST Number:</span>
                <p className="font-mono font-bold text-slate-900">{selectedVendor.gstNumber}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">PAN Number:</span>
                <p className="font-mono font-bold text-slate-900">{selectedVendor.pan}</p>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Address:</span>
              <p className="text-slate-800 font-medium mt-0.5">
                {selectedVendor.address}, {selectedVendor.city}, {selectedVendor.state}, {selectedVendor.country}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {selectedVendor && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Remove Vendor"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to remove <span className="font-bold text-slate-900">{selectedVendor.vendorName}</span>?
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
