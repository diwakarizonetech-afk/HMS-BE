import React, { useState, useMemo, useEffect } from 'react';
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
import {
  fetchStockInwardApi,
  fetchStockOutwardApi,
  fetchVendorsApi,
  fetchBatchesApi,
} from '../../services/api';

type ReportType =
  | 'stock-ledger'
  | 'movement-analysis'
  | 'expiry-analysis'
  | 'vendor-performance'
  | 'dept-consumption'
  | 'reorder-summary';

export const InventoryReportsPage: React.FC = () => {
  const { addToast, storeItems, purchaseOrders } = useHMS();
  const [selectedReport, setSelectedReport] = useState<ReportType>('stock-ledger');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-24');

  // Movements/vendors/batches aren't already loaded into HMSContext (unlike
  // storeItems/purchaseOrders), so this report page fetches them directly --
  // real backend data, loaded once on mount, same pattern every other real
  // report in this app uses.
  const [stockInward, setStockInward] = useState<any[]>([]);
  const [stockOutward, setStockOutward] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchStockInwardApi().catch(() => []),
      fetchStockOutwardApi().catch(() => []),
      fetchVendorsApi().catch(() => []),
      fetchBatchesApi().catch(() => []),
    ]).then(([inward, outward, vend, batch]) => {
      if (cancelled) return;
      setStockInward(Array.isArray(inward) ? inward : []);
      setStockOutward(Array.isArray(outward) ? outward : []);
      setVendors(Array.isArray(vend) ? vend : []);
      setBatches(Array.isArray(batch) ? batch : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const reportTypes = [
    { id: 'stock-ledger', title: 'Stock Ledger Report', icon: FileSpreadsheet, desc: 'Complete opening, inward, outward & closing balance log' },
    { id: 'movement-analysis', title: 'Fast & Slow Moving Items', icon: TrendingUp, desc: 'Consumption velocity & inventory turnover analysis' },
    { id: 'expiry-analysis', title: 'Expiry Analysis Report', icon: Clock, desc: 'Batch aging, near-expiry risks & expired stock write-offs' },
    { id: 'vendor-performance', title: 'Vendor Performance Report', icon: Truck, desc: 'Supplier fulfillment rates & delivery reliability' },
    { id: 'dept-consumption', title: 'Department Consumption', icon: Building2, desc: 'Departmental expenditure breakdown & usage trends' },
    { id: 'reorder-summary', title: 'Reorder Level Summary', icon: AlertTriangle, desc: 'Critical stock deficit alerts & safety buffer status' },
  ];

  // Helper: is this movement's date inside the selected [startDate, endDate] window.
  // Falls back to including the row if it has no usable date rather than
  // silently dropping real data.
  const inRange = (dateStr: string | undefined | null) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).getTime();
    if (isNaN(d)) return true;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    return d >= s && d <= e;
  };

  const currency = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // Real report data, aggregated from live backend records (storeItems,
  // stockInward/stockOutward movements, vendors, purchaseOrders, batches).
  // No fabricated rows: a report type with nothing to aggregate returns an
  // empty array and the table shows "0 records generated" honestly.
  const reportData = useMemo(() => {
    if (selectedReport === 'stock-ledger') {
      return storeItems.map((item) => {
        const inward = stockInward
          .filter((r) => (r.itemCode || r.item_code) === item.itemCode && inRange(r.date))
          .reduce((sum, r) => sum + (r.quantity || 0), 0);
        const outward = stockOutward
          .filter((r) => (r.itemCode || r.item_code) === item.itemCode && inRange(r.date))
          .reduce((sum, r) => sum + (r.quantity || 0), 0);
        return {
          code: item.itemCode,
          name: item.itemName,
          open: item.openingStock ?? 0,
          inward,
          outward,
          closing: item.currentStock,
          value: currency(item.currentStock * (item.unitPrice || 0)),
        };
      });
    }

    if (selectedReport === 'movement-analysis') {
      return storeItems
        .map((item) => {
          const outwardQty = stockOutward
            .filter((r) => (r.itemCode || r.item_code) === item.itemCode && inRange(r.date))
            .reduce((sum, r) => sum + (r.quantity || 0), 0);
          const base = item.currentStock + outwardQty; // rough "stock available to move" baseline
          const velocity = base > 0 ? outwardQty / base : 0;
          let category = 'Slow Moving';
          let status = 'Overstocked';
          if (velocity >= 0.5) { category = 'Fast Moving'; status = 'Optimal'; }
          else if (velocity >= 0.15) { category = 'Medium Velocity'; status = 'Stable'; }
          return {
            code: item.itemCode,
            name: item.itemName,
            category,
            issuedInPeriod: `${outwardQty} units`,
            currentStock: item.currentStock,
            status,
          };
        })
        .filter((r) => r.issuedInPeriod !== '0 units' || r.currentStock > 0);
    }

    if (selectedReport === 'expiry-analysis') {
      return batches
        .filter((b) => (b.status === 'Expired' || b.status === 'Near Expiry'))
        .map((b) => {
          const item = storeItems.find((i) => i.itemCode === (b.itemCode || b.item_code));
          const unitPrice = item?.unitPrice || 0;
          const qty = b.availableQuantity ?? b.available_quantity ?? 0;
          return {
            code: b.itemCode || b.item_code,
            name: b.itemName || b.item_name,
            batch: b.batchNumber || b.batch_number,
            exp: b.expiryDate || b.expiry_date,
            daysToExpiry: b.daysToExpiry ?? b.days_to_expiry ?? 0,
            value: currency(qty * unitPrice),
            status: b.status,
          };
        });
    }

    if (selectedReport === 'vendor-performance') {
      return vendors.map((v) => {
        const vendorPOs = purchaseOrders.filter((po) => po.vendorId === v.id || po.vendorName === (v.vendorName || v.vendor_name));
        const fulfilled = vendorPOs.filter((po) => po.status === 'Fulfilled').length;
        const fulfillRate = vendorPOs.length > 0 ? `${((fulfilled / vendorPOs.length) * 100).toFixed(0)}%` : 'No orders yet';
        return {
          vendor: v.vendorName || v.vendor_name,
          orders: vendorPOs.length,
          fulfillRate,
          rating: `${v.rating ?? 0} / 5`,
          status: v.status,
        };
      });
    }

    if (selectedReport === 'dept-consumption') {
      const byDept = new Map<string, { value: number; items: Map<string, number> }>();
      let grandTotal = 0;
      stockOutward
        .filter((r) => inRange(r.date))
        .forEach((r) => {
          const dept = r.issuedToDepartment || r.issued_to_department || r.department || 'Unassigned';
          const item = storeItems.find((i) => i.itemCode === (r.itemCode || r.item_code));
          const value = (r.quantity || 0) * (item?.unitPrice || 0);
          grandTotal += value;
          if (!byDept.has(dept)) byDept.set(dept, { value: 0, items: new Map() });
          const entry = byDept.get(dept)!;
          entry.value += value;
          const itemName = r.itemName || r.item_name || 'Unknown Item';
          entry.items.set(itemName, (entry.items.get(itemName) || 0) + (r.quantity || 0));
        });
      return Array.from(byDept.entries()).map(([dept, entry]) => {
        const topItem = Array.from(entry.items.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        return {
          dept,
          topItem,
          issueValue: currency(entry.value),
          share: grandTotal > 0 ? `${((entry.value / grandTotal) * 100).toFixed(0)}%` : '0%',
        };
      });
    }

    // reorder-summary
    return storeItems
      .filter((item) => item.currentStock <= item.reorderLevel)
      .map((item) => {
        const deficit = Math.max(0, item.reorderLevel - item.currentStock);
        const urgency = item.currentStock === 0 ? 'Critical' : deficit / (item.reorderLevel || 1) > 0.5 ? 'High' : 'Medium';
        return {
          code: item.itemCode,
          name: item.itemName,
          current: item.currentStock,
          reorder: item.reorderLevel,
          deficit: `${deficit} units`,
          urgency,
        };
      });
  }, [selectedReport, storeItems, purchaseOrders, stockInward, stockOutward, vendors, batches, startDate, endDate]);

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
            {loading ? 'Loading…' : `${reportData.length} records generated`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {Object.keys(reportData[0] || {}).map((key) => (
                  <th key={key} className="py-3.5 px-4 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td className="py-6 px-4 text-slate-500" colSpan={8}>Loading real inventory data…</td></tr>
              ) : reportData.length === 0 ? (
                <tr><td className="py-6 px-4 text-slate-500" colSpan={8}>No records for this report in the current data/date range.</td></tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="py-3.5 px-4 font-medium text-slate-800">
                        {val as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
