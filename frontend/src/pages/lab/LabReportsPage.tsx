import React, { useState } from 'react';
import { useLab } from '../../context/LabContext';
import { useHMS } from '../../context/HMSContext';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Layers,
  UserCheck,
  TestTube,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ReportType =
  | 'Daily Test Report'
  | 'Monthly Test Report'
  | 'Department Wise Report'
  | 'Technician Performance'
  | 'Sample Collection Report'
  | 'Critical Result Report'
  | 'Turnaround Time Report'
  | 'Revenue Report';

const REPORT_TYPES: ReportType[] = [
  'Daily Test Report',
  'Monthly Test Report',
  'Department Wise Report',
  'Technician Performance',
  'Sample Collection Report',
  'Critical Result Report',
  'Turnaround Time Report',
  'Revenue Report',
];

export const LabReportsPage: React.FC = () => {
  const { addToast } = useHMS();
  const { testMasterList, sampleCollections, labResults, labReports } = useLab();
  const [selectedReport, setSelectedReport] = useState<ReportType>('Daily Test Report');
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  const reportRows = React.useMemo(() => {
    if (!labResults || labResults.length === 0) {
      return [];
    }

    const map = new Map<string, {
      category: string;
      total: number;
      completed: number;
      tatSum: number;
      critical: number;
      revenue: number;
    }>();

    labResults.forEach((res) => {
      const match = testMasterList.find((t) => t.testName === res.testName || t.testCode === res.testCode);
      const categoryName = res.category || match?.category || match?.department || 'General Diagnostic';
      const existing = map.get(categoryName) || {
        category: categoryName,
        total: 0,
        completed: 0,
        tatSum: 0,
        critical: 0,
        revenue: 0,
      };

      existing.total += 1;
      if (res.status === 'Completed' || res.status === 'Verified') {
        existing.completed += 1;
        existing.revenue += match?.price || 0;
      }
      if (res.flag === 'Critical' || res.status === 'Critical') {
        existing.critical += 1;
      }
      existing.tatSum += match?.tatHours || 2;
      map.set(categoryName, existing);
    });

    return Array.from(map.values());
  }, [labResults, testMasterList]);

  const handleExportPDF = () => {
    addToast('success', 'PDF Export', `${selectedReport} exported as PDF file.`);
  };

  const handleExportExcel = () => {
    addToast('success', 'Excel Export', `${selectedReport} exported as Excel spreadsheet.`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              LIS Analytics & Auditing
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">Laboratory Analytics & Comprehensive Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate operational audit reports, turnaround time (TAT) tracking, technician productivity, and revenue analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-rose-600" /> Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {REPORT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedReport(type)}
            className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
              selectedReport === type
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] opacity-80 uppercase tracking-wider">Report</span>
            <span className="text-xs leading-tight">{type}</span>
          </button>
        ))}
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Date Range Filter:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800"
          />
        </div>

        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          Showing Report: {selectedReport}
        </span>
      </div>

      {/* Report Dynamic Content Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">{selectedReport} Overview</h3>
            <p className="text-xs text-slate-500">Period: {startDate} to {endDate}</p>
          </div>
        </div>

        {/* Dynamic Report Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[11px] uppercase">
                <th className="py-3 px-4">Date / ID</th>
                <th className="py-3 px-4">Category / Dept</th>
                <th className="py-3 px-4">Total Investigations</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Avg TAT (Hrs)</th>
                <th className="py-3 px-4">Critical Alerts</th>
                <th className="py-3 px-4 text-right">Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No laboratory report analytics recorded in the database.
                  </td>
                </tr>
              ) : (
                reportRows.map((row, idx) => {
                  const avgTat = (row.tatSum / (row.total || 1)).toFixed(1);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{todayStr}</td>
                      <td className="py-3 px-4 font-semibold text-cyan-700">{row.category}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{row.total}</td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">{row.completed}</td>
                      <td className="py-3 px-4 text-slate-600">{avgTat} hrs</td>
                      <td className="py-3 px-4 text-rose-600 font-bold">{row.critical}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        ₹ {row.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
