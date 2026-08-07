import React, { useState, useMemo } from 'react';
import { useLab } from '../../context/LabContext';
import { useHMS } from '../../context/HMSContext';
import { LabResultItem, ResultFlag, ResultStatus } from '../../types/hms';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  FlaskConical,
  Save,
  Printer,
  Plus,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';

export interface PatientOrder {
  id: string;
  sampleId: string;
  patientName: string;
  patientUhid: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  doctorName: string;
  department: string;
  orderDate: string;
  priority: 'Normal' | 'STAT' | 'Emergency';
  overallStatus: ResultStatus;
  tests: LabResultItem[];
}

// Predefined available lab tests catalog for manual order creation
const AVAILABLE_TESTS_CATALOG = [
  { name: 'Complete Blood Count (CBC)', code: 'CBC-001', unit: 'g/dL', range: '13.5 - 17.5 g/dL' },
  { name: 'Troponin-I High Sensitivity (STAT)', code: 'TROP-008', unit: 'ng/mL', range: '< 0.04 ng/mL' },
  { name: 'Thyroid Stimulating Hormone (TSH)', code: 'TSH-005', unit: 'µIU/mL', range: '0.45 - 4.50 µIU/mL' },
  { name: 'Glycated Hemoglobin (HbA1c)', code: 'HBA1C-006', unit: '%', range: '< 5.7%' },
  { name: 'Lipid Profile Complete', code: 'LIP-002', unit: 'mg/dL', range: '< 200 mg/dL' },
  { name: 'Kidney Function Test (KFT/RFT)', code: 'KFT-004', unit: 'mg/dL', range: '0.6 - 1.2 mg/dL' },
  { name: 'Serum Creatinine', code: 'KFT-004', unit: 'mg/dL', range: '0.6 - 1.2 mg/dL' },
  { name: 'Liver Function Test (LFT)', code: 'LFT-003', unit: 'U/L', range: '7 - 56 U/L' },
  { name: 'Serum Bilirubin Total', code: 'LFT-003', unit: 'mg/dL', range: '0.2 - 1.2 mg/dL' },
  { name: 'Urine Routine & Microscopy', code: 'UR-007', unit: 'HPF', range: 'Nil' },
  { name: 'RT-PCR Viral Load Screening', code: 'PCR-010', unit: 'Copies/mL', range: 'Target Not Detected' },
];

export const ResultEntryPage: React.FC = () => {
  const { labResults, labReports, saveLabResult, updateLabResult } = useLab();
  const { addToast } = useHMS();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [testSearchQuery, setTestSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBatchEntryModalOpen, setIsBatchEntryModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<PatientOrder | null>(null);

  // Form State for Batch Result Entry
  const [batchFormData, setBatchFormData] = useState<
    Array<{
      id?: string;
      testName: string;
      testCode: string;
      resultValue: string;
      unit: string;
      referenceRange: string;
      flag: ResultFlag;
      notes: string;
    }>
  >([]);

  // Form State for Manual New Patient Order Creation
  const [createOrderForm, setCreateOrderForm] = useState({
    patientName: '',
    patientUhid: '',
    age: 35,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    doctorName: 'Dr. Vikram Malhotra',
    department: 'General Medicine',
    priority: 'Normal' as 'Normal' | 'STAT' | 'Emergency',
    selectedTestNames: ['Complete Blood Count (CBC)'],
  });

  // Initial Patient Orders grouped from Lab Context / mock data
  const initialPatientOrders: PatientOrder[] = useMemo(() => {
    const mapBySample = new Map<string, PatientOrder>();

    const baseOrders: PatientOrder[] = [];

    baseOrders.forEach((bo) => mapBySample.set(bo.sampleId, bo));

    labResults.forEach((res) => {
      if (mapBySample.has(res.sampleId)) {
        const existing = mapBySample.get(res.sampleId)!;
        if (!existing.tests.some((t) => t.id === res.id || t.testName === res.testName)) {
          existing.tests.push(res);
        }
      } else {
        mapBySample.set(res.sampleId, {
          id: `ord-${res.sampleId}`,
          sampleId: res.sampleId,
          patientName: res.patientName,
          patientUhid: res.patientUhid,
          age: 35,
          gender: 'Male',
          doctorName: 'Dr. Vikram Malhotra',
          department: 'General Medicine',
          orderDate: res.entryDate || '2026-07-24 09:00 AM',
          priority: res.flag === 'Critical' ? 'Emergency' : 'Normal',
          overallStatus: res.status,
          tests: [res],
        });
      }
    });

    return Array.from(mapBySample.values());
  }, [labResults]);

  const [patientOrders, setPatientOrders] = useState<PatientOrder[]>(initialPatientOrders);

  // Sync patientOrders whenever initialPatientOrders updates from LabContext
  React.useEffect(() => {
    setPatientOrders(initialPatientOrders);
  }, [initialPatientOrders]);

  // Filtered Orders with Date Filter
  const filteredOrders = useMemo(() => {
    return patientOrders.filter((order) => {
      const matchesSearch =
        order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.patientUhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.tests.some((t) => t.testName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === 'All' || order.overallStatus === selectedStatus;

      let matchesDate = true;
      if (selectedDateFilter.trim() !== '') {
        matchesDate = order.orderDate.includes(selectedDateFilter);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [patientOrders, searchQuery, selectedStatus, selectedDateFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // Stat Counters
  const pendingOrdersCount = patientOrders.filter((o) => o.overallStatus === 'Pending').length;
  const completedOrdersCount = patientOrders.filter((o) => o.overallStatus === 'Completed' || o.overallStatus === 'Verified').length;
  const criticalOrdersCount = patientOrders.filter((o) => o.overallStatus === 'Critical').length;
  const totalTestsCount = patientOrders.reduce((sum, o) => sum + o.tests.length, 0);

  // Open View Modal
  const handleOpenViewModal = (order: PatientOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  // Open Batch Result Entry Modal (Preserves partially saved values!)
  const handleOpenBatchEntryModal = (order: PatientOrder) => {
    setSelectedOrder(order);
    // Initialize form fields for each test in the patient's order.
    // Retains any existing / partially saved test values, flags, units & notes.
    const formRows = order.tests.map((t) => ({
      id: t.id,
      testName: t.testName,
      testCode: t.testCode,
      resultValue: t.resultValue || '',
      unit: t.unit || '',
      referenceRange: t.referenceRange || '',
      flag: t.flag || 'Normal',
      notes: t.notes || '',
    }));
    setBatchFormData(formRows);
    setIsBatchEntryModalOpen(true);
  };

  // Update field value in Batch Entry Form
  const handleBatchFieldChange = (index: number, field: string, value: any) => {
    setBatchFormData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save Batch Test Results (supports both Partial Save / Draft & Complete Save)
  const handleSaveBatchResults = (e: React.FormEvent, isPartialSave: boolean = false) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!isPartialSave) {
      // Validate that required values are entered for complete save
      const hasEmpty = batchFormData.some((item) => !item.resultValue.trim());
      if (hasEmpty) {
        addToast('warning', 'Validation Warning', 'Please enter result values for all tests, or use Partial Save to save a draft.');
        return;
      }
    }

    // Determine overall status and update tests
    let hasCritical = false;
    const updatedTests: LabResultItem[] = selectedOrder.tests.map((test, index) => {
      const formItem = batchFormData[index];
      if (formItem.flag === 'Critical') {
        hasCritical = true;
      }

      const updatedItem: LabResultItem = {
        ...test,
        resultValue: formItem.resultValue,
        unit: formItem.unit,
        referenceRange: formItem.referenceRange,
        flag: formItem.flag,
        notes: formItem.notes,
        status: isPartialSave
          ? 'Pending'
          : formItem.flag === 'Critical'
            ? 'Critical'
            : 'Completed',
        entryDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        technician: 'Tech. Robert Vance',
      };

      // Sync with global LabContext silently (skipToast = true) to prevent multiple toast popups
      if (test.id) {
        updateLabResult(test.id, updatedItem, true);
      } else {
        saveLabResult(updatedItem, true);
      }

      return updatedItem;
    });

    const newOverallStatus: ResultStatus = isPartialSave
      ? 'Pending'
      : hasCritical
        ? 'Critical'
        : 'Completed';

    // Update local patient orders state
    setPatientOrders((prev) =>
      prev.map((ord) =>
        ord.id === selectedOrder.id
          ? {
            ...ord,
            overallStatus: newOverallStatus,
            tests: updatedTests,
          }
          : ord
      )
    );

    // Single common toast notification
    if (isPartialSave) {
      addToast('info', 'Partial Results Saved', `Partial test values for ${selectedOrder.patientName} saved as draft.`);
    } else {
      addToast(
        hasCritical ? 'error' : 'success',
        hasCritical ? 'CRITICAL ALERT!' : 'Results Saved',
        `All ${updatedTests.length} test results completed for ${selectedOrder.patientName}.`
      );
      setIsBatchEntryModalOpen(false);
    }
  };

  // Open Create New Patient Test Order Modal
  const handleOpenCreateOrderModal = () => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    setCreateOrderForm({
      patientName: '',
      patientUhid: `UHID-2026-${nextNum}`,
      age: 35,
      gender: 'Male',
      doctorName: 'Dr. Vikram Malhotra',
      department: 'General Medicine',
      priority: 'Normal',
      selectedTestNames: ['Complete Blood Count (CBC)'],
    });
    setIsCreateOrderModalOpen(true);
  };

  // Submit New Patient Test Order
  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrderForm.patientName.trim()) {
      addToast('error', 'Validation Error', 'Patient Name is required.');
      return;
    }
    if (createOrderForm.selectedTestNames.length === 0) {
      addToast('error', 'Validation Error', 'Select at least one test.');
      return;
    }

    const nextId = `ord-${Date.now()}`;
    const nextSampleId = `SMP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newTests: LabResultItem[] = createOrderForm.selectedTestNames.map((testName, i) => {
      const match = AVAILABLE_TESTS_CATALOG.find((t) => t.name === testName);
      return {
        id: `res-${Date.now()}-${i}`,
        patientName: createOrderForm.patientName,
        patientUhid: createOrderForm.patientUhid,
        testName,
        testCode: match?.code || 'GEN-001',
        sampleId: nextSampleId,
        resultValue: '',
        unit: match?.unit || '',
        referenceRange: match?.range || '',
        flag: 'Normal',
        technician: 'Tech. Robert Vance',
        verifiedBy: 'Pending',
        entryDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        status: 'Pending',
        notes: '',
      };
    });

    const newOrder: PatientOrder = {
      id: nextId,
      sampleId: nextSampleId,
      patientName: createOrderForm.patientName,
      patientUhid: createOrderForm.patientUhid,
      age: Number(createOrderForm.age),
      gender: createOrderForm.gender,
      doctorName: createOrderForm.doctorName,
      department: createOrderForm.department,
      orderDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      priority: createOrderForm.priority,
      overallStatus: 'Pending',
      tests: newTests,
    };

    setPatientOrders((prev) => [newOrder, ...prev]);
    addToast('success', 'Patient Order Created', `New order ${nextSampleId} added for ${createOrderForm.patientName}.`);
    setIsCreateOrderModalOpen(false);
  };

  // Toggle test selection in Create Order Form
  const handleToggleTestSelection = (testName: string) => {
    setCreateOrderForm((prev) => {
      const exists = prev.selectedTestNames.includes(testName);
      if (exists) {
        return { ...prev, selectedTestNames: prev.selectedTestNames.filter((t) => t !== testName) };
      } else {
        return { ...prev, selectedTestNames: [...prev.selectedTestNames, testName] };
      }
    });
  };

  // Print Partial / Full Test Values
  const handlePrintBatchResults = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              LIS Patient Result Entry Console
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Patient Direct Test Result Entry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Directly select a patient to enter test values for all assigned tests simultaneously in a single structured view.
          </p>
        </div>

        {/* Generate New Report / Patient Order Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenCreateOrderModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Generate New Report / Order
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Patient Orders</span>
          <h2 className="text-2xl font-black text-amber-600">{pendingOrdersCount}</h2>
          <p className="text-[10px] text-slate-400">Patients awaiting result key-in</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Orders</span>
          <h2 className="text-2xl font-black text-emerald-600">{completedOrdersCount}</h2>
          <p className="text-[10px] text-slate-400">Test values saved & completed</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1 border-l-4 border-l-rose-500">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical Flag Alerts</span>
          <h2 className="text-2xl font-black text-rose-700">{criticalOrdersCount}</h2>
          <p className="text-[10px] text-rose-600 font-semibold">Immediate STAT value alerts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tests Ordered</span>
          <h2 className="text-2xl font-black text-blue-600">{totalTestsCount}</h2>
          <p className="text-[10px] text-slate-400">Individual test parameters</p>
        </div>
      </div>

      {/* Search & Filter Bar with Date Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Patient Name, UHID, Sample ID, Test..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Native HTML5 Date Input Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Select Date:</span>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => {
                setSelectedDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="All">All Statuses (Pending, Completed, Critical)</option>
              <option value="Pending">Pending Entry</option>
              <option value="Completed">Completed</option>
              <option value="Critical">Critical Alert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Patient List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Sample ID & Date</th>
                <th className="py-3.5 px-4">Doctor & Department</th>
                <th className="py-3.5 px-4">Assigned Tests</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Result Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Patient Details */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{order.patientName}</p>
                          <p className="text-[10px] text-blue-600 font-semibold">{order.patientUhid} • {order.age} Yrs / {order.gender}</p>
                        </div>
                      </div>
                    </td>

                    {/* Sample ID & Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800">{order.sampleId}</p>
                      <p className="text-[10px] text-slate-400">{order.orderDate}</p>
                    </td>

                    {/* Doctor & Dept */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{order.doctorName}</p>
                      <p className="text-[10px] text-slate-400">{order.department}</p>
                    </td>

                    {/* Assigned Tests Summary */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {order.tests.map((test, i) => (
                          <span
                            key={i}
                            className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80"
                          >
                            {test.testName}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${order.priority === 'Emergency' || order.priority === 'STAT'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {order.priority}
                      </span>
                    </td>

                    {/* Overall Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${order.overallStatus === 'Completed' || order.overallStatus === 'Verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.overallStatus === 'Critical'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {order.overallStatus}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Details Icon */}
                        <button
                          onClick={() => handleOpenViewModal(order)}
                          title="View Patient Test Details"
                          className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Enter / Edit Result Button */}
                        <button
                          onClick={() => handleOpenBatchEntryModal(order)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{order.overallStatus === 'Completed' ? 'Edit Results' : 'Enter Results'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No patient lab records match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{paginatedOrders.length}</strong> of{' '}
            <strong className="text-slate-800">{filteredOrders.length}</strong> patient orders
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: VIEW PATIENT ORDER DETAILS */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                  Patient Test Details
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedOrder.patientName} ({selectedOrder.patientUhid})
                </h3>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Sample ID</span>
                <span className="font-mono font-bold text-slate-800">{selectedOrder.sampleId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Age / Gender</span>
                <span className="font-bold text-slate-800">{selectedOrder.age} Yrs / {selectedOrder.gender}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Doctor</span>
                <span className="font-bold text-slate-800">{selectedOrder.doctorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                <span className="font-bold text-blue-600">{selectedOrder.overallStatus}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Tests ({selectedOrder.tests.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Test Name</th>
                      <th className="py-2.5 px-3">Result Value</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Reference Range</th>
                      <th className="py-2.5 px-3">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.tests.map((test, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{test.testName}</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-800">
                          {test.resultValue || <span className="text-slate-400 font-normal italic">Pending</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{test.unit}</td>
                        <td className="py-2.5 px-3 text-slate-600">{test.referenceRange}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${test.flag === 'Critical'
                                ? 'bg-rose-100 text-rose-700'
                                : test.flag === 'High'
                                  ? 'bg-amber-100 text-amber-800'
                                  : test.flag === 'Low'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}
                          >
                            {test.flag || 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenBatchEntryModal(selectedOrder);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <FileEdit className="w-4 h-4" /> Edit / Enter Test Values
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH MULTI-TEST RESULT ENTRY MODAL */}
      {isBatchEntryModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 my-8 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase border border-amber-200">
                  Batch Multi-Test Result Entry
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Enter Results for {selectedOrder.patientName}
                </h3>
              </div>
              <button
                onClick={() => setIsBatchEntryModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* COMMON HEADER: PATIENT NAME & UHID INFORMATION */}
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedOrder.patientName}</h4>
                  <p className="text-xs font-bold text-blue-700">
                    UHID: <span className="underline">{selectedOrder.patientUhid}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-slate-700 font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Sample ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedOrder.sampleId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Age / Gender</span>
                  <span className="font-bold text-slate-900">{selectedOrder.age} Yrs / {selectedOrder.gender}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Referring Doctor</span>
                  <span className="font-bold text-slate-900">{selectedOrder.doctorName}</span>
                </div>
              </div>
            </div>

            {/* OPD Doctor Clinical Instructions Banner (if any) */}
            {(() => {
              const matchingReport = labReports.find(
                (r) =>
                  r.patientUhid.toLowerCase() === selectedOrder.patientUhid.toLowerCase() ||
                  r.patientName.toLowerCase() === selectedOrder.patientName.toLowerCase()
              );

              if (matchingReport && matchingReport.doctorComments) {
                return (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        👨‍⚕️ Attending Doctor Instructions:
                      </span>
                      <span className="text-[10px] font-bold bg-purple-200 text-purple-800 px-2.5 py-0.5 rounded-full">
                        Status: {matchingReport.doctorReviewStatus}
                      </span>
                    </div>
                    <p className="text-purple-800 font-medium leading-relaxed">{matchingReport.doctorComments}</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* FORM TABLE FOR SIMULTANEOUS MULTI-TEST RESULT ENTRY */}
            <form onSubmit={(e) => handleSaveBatchResults(e, false)} className="space-y-6">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4 min-w-[200px] w-1/5">Test Name (Leftside)</th>
                        <th className="py-3 px-3 w-36">Result Value *</th>
                        <th className="py-3 px-3 w-28">Unit</th>
                        <th className="py-3 px-3 w-44">Reference Range</th>
                        <th className="py-3 px-3 w-36">Result Flag</th>
                        <th className="py-3 px-3 min-w-[280px]">Technician Notes & Observations</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs bg-white">
                      {batchFormData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4 text-cyan-600 shrink-0" />
                              <div>
                                <p className="font-bold text-slate-900">{row.testName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{row.testCode}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <input
                              type="text"
                              placeholder="Enter value"
                              value={row.resultValue}
                              onChange={(e) => handleBatchFieldChange(idx, 'resultValue', e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs"
                            />
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => handleBatchFieldChange(idx, 'unit', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700"
                            />
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <input
                              type="text"
                              value={row.referenceRange}
                              onChange={(e) => handleBatchFieldChange(idx, 'referenceRange', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700"
                            />
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <select
                              value={row.flag}
                              onChange={(e) => handleBatchFieldChange(idx, 'flag', e.target.value as ResultFlag)}
                              className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none ${row.flag === 'Critical'
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : row.flag === 'High'
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : row.flag === 'Low'
                                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                            >
                              <option value="Normal">Normal</option>
                              <option value="High">High</option>
                              <option value="Low">Low</option>
                              <option value="Critical">Critical Alert</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <input
                              type="text"
                              placeholder="Enter technical notes, observations, or microscope findings..."
                              value={row.notes}
                              onChange={(e) => handleBatchFieldChange(idx, 'notes', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-800 transition-colors"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  Saving will submit test results for all <strong className="text-slate-900">{batchFormData.length}</strong> tests simultaneously.
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={() => setIsBatchEntryModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  {/* Print Results Button */}
                  <button
                    type="button"
                    onClick={handlePrintBatchResults}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-slate-600" /> Print Results
                  </button>

                  {/* Save Button */}
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE NEW PATIENT TEST ORDER MODAL */}
      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 my-8 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                  LIS Test Order Generator
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Create New Patient Test Order
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOrderModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandran"
                    value={createOrderForm.patientName}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, patientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UHID Number</label>
                  <input
                    type="text"
                    required
                    value={createOrderForm.patientUhid}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, patientUhid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={createOrderForm.age}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, age: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sex / Gender</label>
                  <select
                    value={createOrderForm.gender}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createOrderForm.priority}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="STAT">STAT</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Referring Doctor</label>
                  <input
                    type="text"
                    value={createOrderForm.doctorName}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, doctorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={createOrderForm.department}
                    onChange={(e) => setCreateOrderForm({ ...createOrderForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              {/* Select Tests Catalog Checkboxes with Searchbar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-slate-700">
                    Assign Investigation Tests * ({createOrderForm.selectedTestNames.length} Selected)
                  </label>
                </div>

                {/* Test Selection Search Bar */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search investigation test name or code..."
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {testSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTestSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200 custom-scrollbar">
                  {AVAILABLE_TESTS_CATALOG.filter(
                    (test) =>
                      test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
                      test.code.toLowerCase().includes(testSearchQuery.toLowerCase())
                  ).length > 0 ? (
                    AVAILABLE_TESTS_CATALOG.filter(
                      (test) =>
                        test.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
                        test.code.toLowerCase().includes(testSearchQuery.toLowerCase())
                    ).map((test) => {
                      const isChecked = createOrderForm.selectedTestNames.includes(test.name);
                      return (
                        <div
                          key={test.name}
                          onClick={() => handleToggleTestSelection(test.name)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${isChecked
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold'
                              : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs truncate">{test.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{test.code}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border text-white ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                              }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 py-4 text-center text-slate-400 text-xs">
                      No investigation tests match "{testSearchQuery}"
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOrderModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Submit & Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINT PREVIEW MODAL FOR PARTIAL / COMPLETED TEST VALUES */}
      {isPrintModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-up font-sans my-8">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">AEGISCARE DIAGNOSTICS & LABS</h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Laboratory Test Result Sheet (Partial / Working Copy)
                </p>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Patient Name:</span> <strong>{selectedOrder.patientName}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">UHID:</span> <strong className="text-blue-600">{selectedOrder.patientUhid}</strong></p>
              </div>
              <div>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Sample ID:</span> <strong>{selectedOrder.sampleId}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Doctor:</span> <strong>{selectedOrder.doctorName}</strong></p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Test Parameter Values</h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2.5">Test Name</th>
                    <th className="p-2.5">Entered Result Value</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5">Reference Range</th>
                    <th className="p-2.5">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchFormData.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-slate-900">{row.testName}</td>
                      <td className="p-2.5 font-extrabold text-slate-900">{row.resultValue || '(Pending)'}</td>
                      <td className="p-2.5 text-slate-600">{row.unit}</td>
                      <td className="p-2.5 text-slate-600">{row.referenceRange}</td>
                      <td className="p-2.5 font-bold text-slate-800">{row.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Execute Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
