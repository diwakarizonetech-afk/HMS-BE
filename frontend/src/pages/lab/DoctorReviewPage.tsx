import React, { useState, useMemo } from 'react';
import { useLab } from '../../context/LabContext';
import { useHMS } from '../../context/HMSContext';
import { LabReportItem, DoctorReviewStatus } from '../../types/hms';
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Send,
  Search,
  Filter,
  Calendar,
  X,
  FileCheck2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const DoctorReviewPage: React.FC = () => {
  const { labReports, doctorReviewReport } = useLab();
  const { addToast } = useHMS();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<LabReportItem | null>(null);
  const [doctorCommentsInput, setDoctorCommentsInput] = useState('');

  // Filtered List
  const filteredReports = useMemo(() => {
    return labReports.filter((rep) => {
      const matchesSearch =
        rep.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.patientUhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesReview =
        selectedReviewStatus === 'All' || rep.doctorReviewStatus === selectedReviewStatus;

      let matchesDate = true;
      if (selectedDateFilter.trim() !== '') {
        matchesDate =
          rep.generatedDate.includes(selectedDateFilter) ||
          (rep.doctorReviewDate && rep.doctorReviewDate.includes(selectedDateFilter));
      }

      return matchesSearch && matchesReview && matchesDate;
    });
  }, [labReports, searchQuery, selectedReviewStatus, selectedDateFilter]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage]);

  // Stat Counters
  const pendingReviewCount = labReports.filter((r) => r.doctorReviewStatus === 'Pending Review').length;
  const reviewedCount = labReports.filter((r) => r.doctorReviewStatus !== 'Pending Review').length;
  const approvedCount = labReports.filter((r) => r.doctorReviewStatus === 'Approved').length;
  const rejectedCount = labReports.filter((r) => r.doctorReviewStatus === 'Rejected' || r.doctorReviewStatus === 'Re-Test Requested').length;

  const handleOpenReviewModal = (rep: LabReportItem) => {
    setActiveReport(rep);
    setDoctorCommentsInput(rep.doctorComments || '');
    setIsReviewModalOpen(true);
  };

  const handleApprove = (rep: LabReportItem) => {
    doctorReviewReport(rep.id, 'Approved', 'Approved by Consultant Pathologist.');
  };

  const handleReject = (rep: LabReportItem) => {
    doctorReviewReport(rep.id, 'Rejected', 'Report rejected due to parameter mismatch.');
  };

  const handleReTest = (rep: LabReportItem) => {
    doctorReviewReport(rep.id, 'Re-Test Requested', 'Re-test requested on fresh specimen.');
  };

  const handleSendToDoctor = (rep: LabReportItem) => {
    addToast('info', 'Sent to Doctor', `Report ${rep.reportNumber} forwarded to ${rep.doctorName}'s EMR portal.`);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Pathologist & Doctor Verification
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">Doctor Report Verification Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review lab reports awaiting medical officer approval, add clinical impressions, issue re-tests or authorize patient report release.
          </p>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
          <h2 className="text-2xl font-black text-amber-600">{pendingReviewCount}</h2>
          <p className="text-[10px] text-slate-400">Awaiting doctor digital signature</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reviewed</span>
          <h2 className="text-2xl font-black text-blue-600">{reviewedCount}</h2>
          <p className="text-[10px] text-slate-400">Processed medical reviews</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Reports</span>
          <h2 className="text-2xl font-black text-emerald-600">{approvedCount}</h2>
          <p className="text-[10px] text-slate-400">Authorized for patient access</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rejected / Re-Test</span>
          <h2 className="text-2xl font-black text-rose-600">{rejectedCount}</h2>
          <p className="text-[10px] text-slate-400">Discrepancy / Re-draw requested</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
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

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Review Status:</span>
            <select
              value={selectedReviewStatus}
              onChange={(e) => {
                setSelectedReviewStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Review Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Re-Test Requested">Re-Test Requested</option>
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
                <th className="py-3.5 px-4">Attending Doctor</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Included Tests</th>
                <th className="py-3.5 px-4">Review Status</th>
                <th className="py-3.5 px-4">Review Date</th>
                <th className="py-3.5 px-4">Doctor Comments</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
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
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{rep.doctorName}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{rep.department}</td>
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          rep.doctorReviewStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rep.doctorReviewStatus === 'Rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : rep.doctorReviewStatus === 'Re-Test Requested'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {rep.doctorReviewStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{rep.doctorReviewDate || 'Pending'}</td>
                    <td className="py-3 px-4 max-w-[220px]" title={rep.doctorComments}>
                      {rep.doctorComments ? (
                        <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-2 text-indigo-950 font-medium text-[11px] leading-tight shadow-2xs">
                          <span className="font-bold text-indigo-700 block text-[9px] uppercase tracking-wider mb-0.5">Doctor Reply:</span>
                          {rep.doctorComments}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No doctor reply yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReviewModal(rep)}
                        title="View Report Details"
                        className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No doctor review items match your filter.
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

      {/* Modal: Detailed Doctor Review Modal */}
      {isReviewModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
                  {activeReport.reportNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Medical Review & Pathologist Approval</h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">{activeReport.patientName} ({activeReport.patientUhid})</p>
                <p className="text-slate-600">Referred Doctor: {activeReport.doctorName} • Dept: {activeReport.department}</p>
                <p className="text-slate-500">Report Date: {activeReport.generatedDate}</p>
              </div>

              {/* Observed Results Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Observed Diagnostic Parameter Results</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Test Investigation</th>
                        <th className="py-2 px-3">Observed Value</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Reference Range</th>
                        <th className="py-2 px-3">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReport.testResults && activeReport.testResults.length > 0 ? (
                        activeReport.testResults.map((r, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 font-bold text-slate-900">{r.testName}</td>
                            <td className="py-2 px-3 font-extrabold text-slate-900">{r.resultValue || '(Pending)'}</td>
                            <td className="py-2 px-3 text-slate-600">{r.unit}</td>
                            <td className="py-2 px-3 text-slate-600">{r.referenceRange}</td>
                            <td className="py-2 px-3">
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400 italic">No test results keyed in yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Instructions / Clinical Impression</label>
                <textarea
                  rows={3}
                  value={doctorCommentsInput}
                  onChange={(e) => setDoctorCommentsInput(e.target.value)}
                  placeholder="Enter medical instructions or clinical advice for lab technician..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl p-3 font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  doctorReviewReport(activeReport.id, 'Re-Test Requested', doctorCommentsInput || 'Re-test requested on specimen.');
                  setIsReviewModalOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs cursor-pointer border border-purple-200"
              >
                Request Re-Test
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    doctorReviewReport(activeReport.id, 'Rejected', doctorCommentsInput || 'Report rejected.');
                    setIsReviewModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs cursor-pointer border border-rose-200"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    doctorReviewReport(activeReport.id, 'Approved', doctorCommentsInput || 'Verified & approved.');
                    setIsReviewModalOpen(false);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Approve Report Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
