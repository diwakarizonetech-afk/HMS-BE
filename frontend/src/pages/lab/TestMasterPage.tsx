import React, { useState, useMemo } from 'react';
import { useLab } from '../../context/LabContext';
import { useHMS } from '../../context/HMSContext';
import { LabTestMaster, TestCategory } from '../../types/hms';
import { LabBranchSelector } from '../../components/lab/LabBranchSelector';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Edit,
  Trash2,
  Eye,
  Copy,
  X,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const CATEGORIES: TestCategory[] = [
  'Hematology',
  'Clinical Pathology',
  'Biochemistry',
  'Microbiology',
  'Serology',
  'Immunology',
  'Histopathology',
  'Cytology',
  'Molecular Diagnostics',
  'Endocrinology',
];

export const TestMasterPage: React.FC = () => {
  const { testMasterList, addTestMaster, updateTestMaster, deleteTestMaster, duplicateTestMaster } = useLab();
  const { addToast } = useHMS();

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestMaster | null>(null);
  const [viewingTest, setViewingTest] = useState<LabTestMaster | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<LabTestMaster, 'id'>>({
    testCode: '',
    testName: '',
    department: 'Pathology',
    category: 'Hematology',
    subCategory: '',
    sampleType: 'Whole Blood',
    containerType: 'EDTA Vial (Lavender Top)',
    method: 'Automated Cell Counter',
    machine: 'Sysmex XN-1000',
    normalRange: '',
    criticalRange: '',
    unit: '',
    tatHours: 4,
    price: 500,
    status: 'Active',
    prepInstructions: '',
    reportTemplate: 'Standard Template v1',
    remarks: '',
  });

  // Filtered List
  const filteredTests = useMemo(() => {
    return testMasterList.filter((test) => {
      const matchesSearch =
        test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.testCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.machine.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || test.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [testMasterList, searchQuery, selectedCategory, selectedStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage) || 1;
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTests.slice(start, start + itemsPerPage);
  }, [filteredTests, currentPage]);

  // Stat Counters
  const totalTestsCount = testMasterList.length;
  const activeTestsCount = testMasterList.filter((t) => t.status === 'Active').length;
  const inactiveTestsCount = testMasterList.filter((t) => t.status === 'Inactive').length;
  const categoriesCount = new Set(testMasterList.map((t) => t.category)).size;

  const handleOpenAddModal = () => {
    setEditingTest(null);
    setFormData({
      testCode: `TEST-00${testMasterList.length + 1}`,
      testName: '',
      department: 'Pathology',
      category: 'Hematology',
      subCategory: 'Routine',
      sampleType: 'Whole Blood',
      containerType: 'EDTA Lavender Top',
      method: 'Automated Analyzer',
      machine: 'Roche Cobas / Sysmex',
      normalRange: '',
      criticalRange: '',
      unit: 'mg/dL',
      tatHours: 4,
      price: 500,
      status: 'Active',
      prepInstructions: '',
      reportTemplate: 'Standard Laboratory Format',
      remarks: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (test: LabTestMaster) => {
    setEditingTest(test);
    setFormData({ ...test });
    setIsAddModalOpen(true);
  };

  const handleOpenViewModal = (test: LabTestMaster) => {
    setViewingTest(test);
    setIsViewModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testCode || !formData.testName) {
      addToast('error', 'Validation Error', 'Please fill in Test Code and Test Name.');
      return;
    }

    if (editingTest) {
      updateTestMaster(editingTest.id, formData);
    } else {
      addTestMaster(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleExportExcel = () => {
    addToast('success', 'Export Success', 'Test Master catalog exported as Excel spreadsheet.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              LIS Test Master Management
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">Laboratory Test Master Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure laboratory test parameters, methodologies, normal & critical ranges, machine analyzers and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-blue-600" /> Print
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Test
          </button>
        </div>
      </div>

      {/* Branch Selection Bar */}
      <LabBranchSelector />

      {/* 4 Summary Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tests</span>
          <h2 className="text-2xl font-black text-slate-900">{totalTestsCount}</h2>
          <p className="text-[10px] text-slate-400">All registered test parameters</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Tests</span>
          <h2 className="text-2xl font-black text-emerald-600">{activeTestsCount}</h2>
          <p className="text-[10px] text-slate-400">Currently orderable in LIS</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive Tests</span>
          <h2 className="text-2xl font-black text-slate-400">{inactiveTestsCount}</h2>
          <p className="text-[10px] text-slate-400">Temporarily disabled</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Categories</span>
          <h2 className="text-2xl font-black text-cyan-600">{categoriesCount}</h2>
          <p className="text-[10px] text-slate-400">Pathology & diagnostic departments</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test code, name, analyzer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Test Code</th>
                <th className="py-3.5 px-4">Test Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedTests.length > 0 ? (
                paginatedTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">{test.testCode}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{test.testName}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{test.department}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                        {test.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">₹{test.price}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          test.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenViewModal(test)}
                          title="View Full Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(test)}
                          title="Edit Test"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTestMaster(test.id)}
                          title="Delete Test"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No laboratory tests matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{paginatedTests.length}</strong> of{' '}
            <strong className="text-slate-800">{filteredTests.length}</strong> tests
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Test Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTest ? 'Edit Laboratory Test Master' : 'Add New Laboratory Test Master'}
                </h3>
                <p className="text-xs text-slate-500">
                  Enter complete test profile, parameters, reference ranges & LIS template specs.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Test Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.testCode}
                    onChange={(e) => setFormData({ ...formData, testCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Test Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TestCategory })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub Category</label>
                  <input
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sample Type</label>
                  <input
                    type="text"
                    value={formData.sampleType}
                    onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Container</label>
                  <input
                    type="text"
                    value={formData.containerType}
                    onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Method</label>
                  <input
                    type="text"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Machine Analyzer</label>
                  <input
                    type="text"
                    value={formData.machine}
                    onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference Normal Range</label>
                  <input
                    type="text"
                    value={formData.normalRange}
                    onChange={(e) => setFormData({ ...formData, normalRange: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Critical Value Range</label>
                  <input
                    type="text"
                    value={formData.criticalRange}
                    onChange={(e) => setFormData({ ...formData, criticalRange: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turnaround Time (Hours)</label>
                  <input
                    type="number"
                    value={formData.tatHours}
                    onChange={(e) => setFormData({ ...formData, tatHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preparation Instructions</label>
                <textarea
                  rows={2}
                  value={formData.prepInstructions}
                  onChange={(e) => setFormData({ ...formData, prepInstructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Template & Remarks</label>
                <input
                  type="text"
                  value={formData.reportTemplate}
                  onChange={(e) => setFormData({ ...formData, reportTemplate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
                >
                  {editingTest ? 'Save Changes' : 'Create Master Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Test Details Modal */}
      {isViewModalOpen && viewingTest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                  {viewingTest.testCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{viewingTest.testName}</h3>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Category & Sub</span>
                  <p className="font-bold text-slate-800">{viewingTest.category} ({viewingTest.subCategory})</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Department</span>
                  <p className="font-bold text-slate-800">{viewingTest.department}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Sample Specimen</span>
                  <p className="font-bold text-slate-800">{viewingTest.sampleType}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Container Tube</span>
                  <p className="font-bold text-slate-800">{viewingTest.containerType}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Methodology</span>
                  <p className="font-bold text-slate-800">{viewingTest.method}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Machine Analyzer</span>
                  <p className="font-bold text-slate-800">{viewingTest.machine}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase">Normal Reference Range:</span>
                  <p className="font-extrabold text-slate-900">{viewingTest.normalRange}</p>
                </div>
                <div>
                  <span className="text-rose-500 font-bold text-[10px] uppercase">Critical Value Threshold:</span>
                  <p className="font-extrabold text-rose-700">{viewingTest.criticalRange}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Unit</span>
                  <p className="font-bold text-slate-800">{viewingTest.unit}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">TAT Time</span>
                  <p className="font-bold text-slate-800">{viewingTest.tatHours} Hours</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Price</span>
                  <p className="font-bold text-emerald-700 text-sm">₹{viewingTest.price}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Patient Preparation Instructions</span>
                <p className="text-slate-700 font-medium">{viewingTest.prepInstructions || 'None specified'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
