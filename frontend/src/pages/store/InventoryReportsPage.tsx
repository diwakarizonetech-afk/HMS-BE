import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  Clock,
  Truck,
  Building2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useHMS } from '../../context/HMSContext';

type ReportType =
  | 'stock-ledger'
  | 'movement-analysis'
  | 'expiry-analysis'
  | 'vendor-performance'
  | 'dept-consumption'
  | 'reorder-summary';

export const InventoryReportsPage: React.FC = () => {
  const { addToast } = useHMS();
  const [selectedReport, setSelectedReport] = useState<ReportType>('stock-ledger');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-24');

  const reportTypes = [
    { id: 'stock-ledger', title: 'Stock Ledger Report', icon: FileSpreadsheet, desc: 'Complete opening, inward, outward & closing balance log' },
    { id: 'movement-analysis', title: 'Fast & Slow Moving Items', icon: TrendingUp, desc: 'Consumption velocity & inventory turnover analysis' },
    { id: 'expiry-analysis', title: 'Expiry Analysis Report', icon: Clock, desc: 'Batch aging, near-expiry risks & expired stock write-offs' },
    { id: 'vendor-performance', title: 'Vendor Performance Report', icon: Truck, desc: 'Supplier fulfillment rates, lead time & defect metrics' },
    { id: 'dept-consumption', title: 'Department Consumption', icon: Building2, desc: 'Departmental expenditure breakdown & usage trends' },
    { id: 'reorder-summary', title: 'Reorder Level Summary', icon: AlertTriangle, desc: 'Critical stock deficit alerts & safety buffer status' },
  ];

  // Dummy report data rows based on selected report
  const sampleData = useMemo(() => {
    if (selectedReport === 'stock-ledger') {
      return [
        { code: 'ITM-1001', name: 'Paracetamol 500mg', open: 1200, inward: 500, outward: 450, closing: 1250, value: '₹3,125' },
        { code: 'ITM-1002', name: 'Amoxicillin 500mg', open: 450, inward: 200, outward: 320, closing: 330, value: '₹2,640' },
        { code: 'ITM-1003', name: 'Surgical Gloves (Size M)', open: 2500, inward: 1000, outward: 1200, closing: 2300, value: '₹4,600' },
        { code: 'ITM-1004', name: 'IV Cannula 20G', open: 180, inward: 300, outward: 280, closing: 200, value: '₹1,000' },
        { code: 'ITM-1005', name: 'Saline 0.9% 500ml', open: 600, inward: 400, outward: 520, closing: 480, value: '₹1,680' },
      ];
    } else if (selectedReport === 'movement-analysis') {
      return [
        { code: 'ITM-1001', name: 'Paracetamol 500mg', category: 'Fast Moving', turns: '8.4x / mo', totalQty: '4,500 units', status: 'Optimal' },
        { code: 'ITM-1003', name: 'Surgical Gloves (Size M)', category: 'Fast Moving', turns: '6.2x / mo', totalQty: '3,800 units', status: 'Optimal' },
        { code: 'ITM-1005', name: 'Saline 0.9% 500ml', category: 'Medium Velocity', turns: '3.1x / mo', totalQty: '1,400 units', status: 'Stable' },
        { code: 'ITM-1006', name: 'Digital Thermometer Probe', category: 'Slow Moving', turns: '0.4x / mo', totalQty: '40 units', status: 'Overstocked' },
      ];
    } else if (selectedReport === 'expiry-analysis') {
      return [
        { code: 'ITM-1002', name: 'Amoxicillin 500mg', batch: 'BAT-AMX-2026A', exp: '2026-08-15', days: '22 days', value: '₹12,400', status: 'Near Expiry' },
        { code: 'ITM-1007', name: 'Insulin Glargine Vials', batch: 'BAT-INS-2025D', exp: '2026-06-30', days: 'Expired', value: '₹8,500', status: 'Write Off' },
      ];
    } else if (selectedReport === 'vendor-performance') {
      return [
        { vendor: 'Apex Meditech Pvt Ltd', orders: 18, fulfillRate: '98.5%', avgLead: '2.4 Days', defectRate: '0.2%', rating: 'A+' },
        { vendor: 'Cipla Health Care', orders: 24, fulfillRate: '96.0%', avgLead: '3.0 Days', defectRate: '0.5%', rating: 'A' },
        { vendor: 'Sun Pharma Surgical', orders: 12, fulfillRate: '91.2%', avgLead: '4.8 Days', defectRate: '1.4%', rating: 'B+' },
      ];
    } else if (selectedReport === 'dept-consumption') {
      return [
        { dept: 'Operation Theatre (OT)', topItem: 'Surgical Gloves / Sutures', issueValue: '₹6,45,000', share: '38%' },
        { dept: 'Central Pharmacy', topItem: 'Analgesics / Antibiotics', issueValue: '₹4,76,000', share: '28%' },
        { dept: 'ICU & Wards', topItem: 'IV Fluids / Cannula', issueValue: '₹3,06,000', share: '18%' },
        { dept: 'Pathology & Lab', topItem: 'Reagents / Blood Tubes', issueValue: '₹1,70,000', share: '10%' },
      ];
    } else {
      return [
        { code: 'ITM-1004', name: 'IV Cannula 20G', current: 200, reorder: 300, deficit: '100 units', vendor: 'Apex Meditech', urgency: 'High' },
        { code: 'ITM-1008', name: 'Digital BP Cuff', current: 15, reorder: 50, deficit: '35 units', vendor: 'Sun Pharma', urgency: 'Critical' },
      ];
    }
  }, [selectedReport]);

  const handleExportCSV = () => {
    addToast('success', 'Report Exported', `Exported ${selectedReport} to Excel (CSV).`);
  };

  const handleExportPDF = () => {
    addToast('info', 'PDF Generated', `Downloaded PDF document for ${selectedReport}.`);
  };

  const handlePrint = () => {
    window.print();
    addToast('success', 'Printing', 'Sending report sheet to printer...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Inventory Reports</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Store ERP Analytics Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate executive stock ledgers, movement velocities, expiry risk metrics & vendor performance.
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
              title="Export PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Selector Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id as ReportType)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs">{rep.title}</h3>
                  <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {rep.desc}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 capitalize">
              {reportTypes.find((r) => r.id === selectedReport)?.title}
            </h3>
            <p className="text-xs text-slate-500">
              Active Period: {startDate} to {endDate}
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {sampleData.length} records generated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {Object.keys(sampleData[0] || {}).map((key) => (
                  <th key={key} className="py-3.5 px-4 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sampleData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="py-3.5 px-4 font-medium text-slate-800">
                      {val as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
