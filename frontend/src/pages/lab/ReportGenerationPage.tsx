import React, { useState, useMemo } from 'react';
import { useLab } from '../../context/LabContext';
import { useHMS } from '../../context/HMSContext';
import { LabReportItem, ReportStatus } from '../../types/hms';
import {
  FileCheck2,
  Search,
  Filter,
  Calendar,
  Eye,
  Printer,
  Download,
  Mail,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Save,
} from 'lucide-react';

export const ReportGenerationPage: React.FC = () => {
  const { labReports, testMasterList, labResults, updateReportStatus, updateLabReport } = useLab();
  const { addToast } = useHMS();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [activeReport, setActiveReport] = useState<LabReportItem | null>(null);
  const [emailInput, setEmailInput] = useState('patient@hms.com');

  // Form state for Editing Report
  const [editForm, setEditForm] = useState<{
    doctorComments: string;
    testResults: Array<{
      id: string;
      testName: string;
      resultValue: string;
      unit: string;
      referenceRange: string;
      flag: 'Normal' | 'High' | 'Low' | 'Critical';
    }>;
  }>({
    doctorComments: '',
    testResults: [],
  });

  // Filtered List with Date Filter
  const filteredReports = useMemo(() => {
    return labReports.filter((rep) => {
      const matchesSearch =
        rep.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.patientUhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || rep.status === selectedStatus;

      let matchesDate = true;
      if (selectedDateFilter.trim() !== '') {
        matchesDate = rep.generatedDate.includes(selectedDateFilter);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [labReports, searchQuery, selectedStatus, selectedDateFilter]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage]);

  // Stat Counters
  const generatedCount = labReports.filter((r) => r.status === 'Generated').length;
  const pendingCount = labReports.filter((r) => r.doctorReviewStatus === 'Pending Review').length;
  const printedCount = labReports.filter((r) => r.status === 'Printed').length;
  const emailedCount = labReports.filter((r) => r.status === 'Emailed').length;

  const handleOpenPreview = (rep: LabReportItem) => {
    setActiveReport(rep);
    setIsPreviewModalOpen(true);
  };

  const handleOpenEmail = (rep: LabReportItem) => {
    setActiveReport(rep);
    setEmailInput('patient@hms.com');
    setIsEmailModalOpen(true);
  };

  const handleOpenEditModal = (rep: LabReportItem) => {
    setActiveReport(rep);
    const initialResults =
      rep.testResults && rep.testResults.length > 0
        ? rep.testResults.map((tr) => {
            const master = testMasterList.find((m) => m.testName.toLowerCase().trim() === tr.testName.toLowerCase().trim());
            return {
              ...tr,
              unit: tr.unit || master?.unit || 'mg/dL',
              referenceRange: tr.referenceRange || master?.normalRange || '70 - 140',
            };
          })
        : (rep.tests || []).map((tName, idx) => {
            const master = testMasterList.find((m) => m.testName.toLowerCase().trim() === tName.toLowerCase().trim());
            const labRes = labResults.find((lr) => lr.testName.toLowerCase().trim() === tName.toLowerCase().trim());
            return {
              id: `tr-${idx}`,
              testName: tName,
              resultValue: labRes?.resultValue || '',
              unit: master?.unit || labRes?.unit || 'mg/dL',
              referenceRange: master?.normalRange || labRes?.referenceRange || '70 - 140',
              flag: (labRes?.flag as any) || 'Normal',
            };
          });

    setEditForm({
      doctorComments: rep.doctorComments || 'Verified & approved without deviations.',
      testResults: initialResults,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveReportEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    const updatedTestResults = editForm.testResults.map((tr, idx) => {
      const original = activeReport.testResults?.[idx];
      return {
        id: tr.id,
        patientName: original?.patientName || activeReport.patientName,
        patientUhid: original?.patientUhid || activeReport.patientUhid,
        testName: tr.testName,
        testCode: original?.testCode || '',
        sampleId: original?.sampleId || '',
        resultValue: tr.resultValue,
        unit: tr.unit,
        referenceRange: tr.referenceRange,
        flag: tr.flag,
        technician: original?.technician || activeReport.generatedBy || '',
        verifiedBy: original?.verifiedBy || '',
        entryDate: original?.entryDate || activeReport.generatedDate,
        status: original?.status || 'Verified',
      };
    });

    const updated: LabReportItem = {
      ...activeReport,
      doctorComments: editForm.doctorComments,
      testResults: updatedTestResults,
    };
    setActiveReport(updated);

    await updateLabReport(activeReport.id, {
      doctorComments: editForm.doctorComments,
      testResults: updatedTestResults,
    });

    addToast('success', 'Report Saved to DB', `Lab report ${activeReport.reportNumber} saved to database successfully.`);
    setIsEditModalOpen(false);
  };

  const handleSendEmail = () => {
    if (activeReport && emailInput) {
      updateReportStatus(activeReport.id, 'Emailed');
      addToast('success', 'Email Sent', `Report ${activeReport.reportNumber} emailed to ${emailInput}`);
      setIsEmailModalOpen(false);
    }
  };

  const handlePrintReport = (rep: LabReportItem) => {
    updateReportStatus(rep.id, 'Printed');
    window.print();
  };

  const handleDownloadPDF = (rep: LabReportItem) => {
    addToast('success', 'PDF Downloaded', `Lab report ${rep.reportNumber}.pdf saved to downloads.`);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              LIS Report Compilation Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">Professional Laboratory Report Release</h1>
          <p className="text-xs text-slate-500 mt-1">
            Compile verified test parameter results, print official hospital diagnostic reports & dispatch digital PDF copies.
          </p>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reports Generated</span>
          <h2 className="text-2xl font-black text-emerald-600">{generatedCount}</h2>
          <p className="text-[10px] text-slate-400">Ready for distribution</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Release</span>
          <h2 className="text-2xl font-black text-amber-600">{pendingCount}</h2>
          <p className="text-[10px] text-slate-400">Awaiting doctor sign-off</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Printed Reports</span>
          <h2 className="text-2xl font-black text-blue-600">{printedCount}</h2>
          <p className="text-[10px] text-slate-400">Hard copies issued</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emailed Reports</span>
          <h2 className="text-2xl font-black text-cyan-600">{emailedCount}</h2>
          <p className="text-[10px] text-slate-400">Sent to patient email</p>
        </div>
      </div>

      {/* Search & Filter Toolbar with Date Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Report Number, Patient, Doctor..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Report Statuses</option>
              <option value="Generated">Generated</option>
              <option value="Printed">Printed</option>
              <option value="Emailed">Emailed</option>
              <option value="Draft">Draft</option>
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
                <th className="py-3.5 px-4">Report Number</th>
                <th className="py-3.5 px-4">Patient Name & UHID</th>
                <th className="py-3.5 px-4">Doctor & Dept</th>
                <th className="py-3.5 px-4">Included Tests</th>
                <th className="py-3.5 px-4">Generated Date</th>
                <th className="py-3.5 px-4">Generated By</th>
                <th className="py-3.5 px-4">Doctor Review</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedReports.length > 0 ? (
                paginatedReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-600 font-mono whitespace-nowrap">{rep.reportNumber}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{rep.patientName}</p>
                      <p className="text-[10px] text-blue-600 font-semibold">{rep.patientUhid}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-800">{rep.doctorName}</p>
                      <p className="text-[10px] text-slate-400">{rep.department}</p>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]" title={rep.tests.join(', ')}>
                      <div className="flex flex-wrap gap-1">
                        {rep.tests.map((t, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{rep.generatedDate}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{rep.generatedBy}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          rep.doctorReviewStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rep.doctorReviewStatus === 'Rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rep.doctorReviewStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          rep.status === 'Generated'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rep.status === 'Printed'
                            ? 'bg-blue-100 text-blue-700'
                            : rep.status === 'Emailed'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenPreview(rep)}
                          title="Preview Full Report"
                          className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handlePrintReport(rep)}
                          title="Print Report"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(rep)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEmail(rep)}
                          title="Email Report"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No laboratory reports match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{paginatedReports.length}</strong> of{' '}
            <strong className="text-slate-800">{filteredReports.length}</strong> reports
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

      {/* Modal 2: Full Formal LIS Report Preview Modal */}
      {isPreviewModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-up font-sans my-8">
            {/* Report Letterhead Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">AEGISCARE MULTI-SPECIALTY HOSPITAL</h2>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Department of Laboratory Medicine & Diagnostics • ISO 15189 Accredited
                </p>
                <p className="text-[10px] text-slate-500">124 Healthcare Boulevard, Sector 4, Metro City • Helpline: 1800-400-999</p>
              </div>

              <div className="text-right">
                <div className="py-1 px-3 bg-slate-900 text-white text-xs font-mono font-bold rounded">
                  {activeReport.reportNumber}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">|||| | ||||| || ||||</p>
              </div>
            </div>

            {/* Patient & Doctor Demographics Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1">
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Patient Name:</span> <strong className="text-slate-900">{activeReport.patientName}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">UHID:</span> <strong className="text-blue-600">{activeReport.patientUhid}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Age / Gender:</span> <strong>{activeReport.patientAge} Years / {activeReport.patientGender}</strong></p>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Referred By:</span> <strong>{activeReport.doctorName}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Department:</span> <strong>{activeReport.department}</strong></p>
                <p><span className="text-slate-400 font-bold uppercase text-[10px]">Report Date:</span> <strong>{activeReport.generatedDate}</strong></p>
              </div>
            </div>

            {/* Test Results Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                DIAGNOSTIC TEST RESULTS
              </h3>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <th className="py-2 px-3">Test Investigation</th>
                    <th className="py-2 px-3">Observed Result</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Biological Reference Interval</th>
                    <th className="py-2 px-3">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeReport.testResults && activeReport.testResults.length > 0 ? (
                    activeReport.testResults.map((r) => {
                      const master = testMasterList.find((m) => m.testName.toLowerCase().trim() === r.testName.toLowerCase().trim());
                      const unitStr = r.unit || master?.unit || 'mg/dL';
                      const rangeStr = r.referenceRange || master?.normalRange || master?.criticalRange || '70 - 140';
                      return (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.testName}</td>
                          <td className="py-2.5 px-3 font-extrabold text-sm text-slate-900">{r.resultValue || '--'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{unitStr}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rangeStr}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.flag === 'Critical'
                                  ? 'bg-rose-100 text-rose-700'
                                  : r.flag === 'High'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {r.flag || 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : activeReport.tests && activeReport.tests.length > 0 ? (
                    activeReport.tests.map((tName, i) => {
                      const master = testMasterList.find((m) => m.testName.toLowerCase().trim() === tName.toLowerCase().trim());
                      const labRes = labResults.find((lr) => lr.testName.toLowerCase().trim() === tName.toLowerCase().trim());
                      const unitStr = master?.unit || labRes?.unit || 'mg/dL';
                      const rangeStr = master?.normalRange || labRes?.referenceRange || '70 - 140';
                      return (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{tName}</td>
                          <td className="py-2.5 px-3 font-extrabold text-sm text-slate-900">{labRes?.resultValue || '--'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{unitStr}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rangeStr}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              {labRes?.flag || 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 font-medium">No test results found for this report.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Doctor Comments & Signatures */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Pathologist Impression</span>
                <p className="font-semibold text-slate-800 mt-1">{activeReport.doctorComments || 'Verified & approved without deviations.'}</p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block p-2 border-b-2 border-slate-800 font-serif italic text-sm text-slate-800">
                  {activeReport.doctorName ? `${activeReport.doctorName}` : 'Consultant Pathologist'}
                </div>
                <p className="text-[10px] font-bold text-slate-600">{activeReport.department ? `${activeReport.department} Department` : 'Chief Consultant Pathologist'}</p>
                <p className="text-[9px] text-emerald-600 font-bold">DIGITALLY VERIFIED LIS REPORT</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(activeReport)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileEdit className="w-4 h-4 text-blue-600" /> Edit Report Details
                </button>
                <button
                  onClick={() => handlePrintReport(activeReport)}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Formal Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Report Details & Parameter Values Modal */}
      {isEditModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scale-up my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
                  Edit Lab Report Details
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Edit Report: {activeReport.reportNumber} ({activeReport.patientName})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReportEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Name</span>
                  <span className="font-bold text-slate-800">{activeReport.patientName} ({activeReport.patientUhid})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Referred Doctor</span>
                  <span className="font-bold text-slate-800">{activeReport.doctorName} ({activeReport.department})</span>
                </div>
              </div>

              {/* Edit Test Results Table */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">Edit Parameter Observed Values & Flags</label>
                <div className="space-y-3">
                  {editForm.testResults.map((tr, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 text-xs">{tr.testName}</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Result Value</label>
                          <input
                            type="text"
                            value={tr.resultValue}
                            onChange={(e) => {
                              const updated = [...editForm.testResults];
                              updated[idx].resultValue = e.target.value;
                              setEditForm({ ...editForm, testResults: updated });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Unit</label>
                          <input
                            type="text"
                            value={tr.unit}
                            onChange={(e) => {
                              const updated = [...editForm.testResults];
                              updated[idx].unit = e.target.value;
                              setEditForm({ ...editForm, testResults: updated });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Ref Range</label>
                          <input
                            type="text"
                            value={tr.referenceRange}
                            onChange={(e) => {
                              const updated = [...editForm.testResults];
                              updated[idx].referenceRange = e.target.value;
                              setEditForm({ ...editForm, testResults: updated });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Flag</label>
                          <select
                            value={tr.flag}
                            onChange={(e) => {
                              const updated = [...editForm.testResults];
                              updated[idx].flag = e.target.value as any;
                              setEditForm({ ...editForm, testResults: updated });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800"
                          >
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Low">Low</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pathologist Impression / Comments */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pathologist Impression & Clinical Notes</label>
                <textarea
                  rows={2}
                  value={editForm.doctorComments}
                  onChange={(e) => setEditForm({ ...editForm, doctorComments: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Report Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Email Report Modal */}
      {isEmailModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-600" /> Email Laboratory Report PDF
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Send encrypted LIS report <strong>{activeReport.reportNumber}</strong> to patient or doctor email address.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-500/20"
              >
                Send Email PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
