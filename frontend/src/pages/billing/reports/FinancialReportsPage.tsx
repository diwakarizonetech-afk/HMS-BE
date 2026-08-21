import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBilling } from '../../../context/BillingContext';
import {
  BarChart3,
  Download,
  Printer,
  CalendarDays,
  Wallet,
  Building2,
  UserCheck,
  TrendingUp,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Row = Record<string, string | number>;

const formatMoney = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().split('T')[0];
const chartColors = ['#059669', '#2563eb', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2', '#475569'];

const EmptyRow: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400 font-bold">
      No billing records found.
    </td>
  </tr>
);

export const FinancialReportsPage: React.FC = () => {
  const { bills, collections, refunds, discounts, supplierPayables, kpis } = useBilling();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'daily';
  const [dateRange, setDateRange] = useState('Today');
  const [exportGroup, setExportGroup] = useState<'day' | 'month' | 'year'>('day');

  const todayStr = today();
  const visibleCollections = useMemo(
    () => (dateRange === 'Today' ? collections.filter((c) => c.payment_date?.startsWith(todayStr)) : collections),
    [collections, dateRange, todayStr]
  );
  const visibleBills = useMemo(
    () => (dateRange === 'Today' ? bills.filter((b) => b.bill_date?.startsWith(todayStr)) : bills),
    [bills, dateRange, todayStr]
  );
  const visibleRefunds = useMemo(
    () => (dateRange === 'Today' ? refunds.filter((r) => r.refund_date?.startsWith(todayStr)) : refunds),
    [refunds, dateRange, todayStr]
  );
  const visibleDiscounts = useMemo(
    () => (dateRange === 'Today' ? discounts.filter((d) => d.request_date?.startsWith(todayStr)) : discounts),
    [discounts, dateRange, todayStr]
  );

  const paymentModeRows = useMemo(() => {
    const rows: Record<string, { amount: number; count: number }> = {};
    visibleCollections.forEach((collection) => {
      const mode = collection.payment_mode || 'Other';
      rows[mode] = rows[mode] || { amount: 0, count: 0 };
      rows[mode].amount += collection.current_payment || 0;
      rows[mode].count += 1;
    });
    const total = Object.values(rows).reduce((sum, row) => sum + row.amount, 0);
    return Object.entries(rows).map(([mode, row]) => ({
      mode,
      ...row,
      share: total ? `${((row.amount / total) * 100).toFixed(1)}%` : '0%',
    }));
  }, [visibleCollections]);

  const departmentRows = useMemo(() => {
    const rows: Record<string, Row> = {};
    visibleBills.forEach((bill) => {
      const department = bill.department || 'Unassigned';
      const row = rows[department] || {
        department,
        gross: 0,
        collected: 0,
        outstanding: 0,
      };
      row.gross = Number(row.gross) + (bill.net_amount || 0);
      row.collected = Number(row.collected) + (bill.paid_amount || 0);
      row.outstanding = Number(row.outstanding) + (bill.pending_amount || 0);
      rows[department] = row;
    });
    return Object.values(rows);
  }, [visibleBills]);

  const doctorRows = useMemo(() => {
    const rows: Record<string, Row> = {};
    visibleBills.forEach((bill) => {
      const doctor = bill.doctor_name || 'Unassigned';
      const row = rows[doctor] || {
        doctor,
        department: bill.department || 'Unassigned',
        bills: 0,
        gross: 0,
        discounts: 0,
        net: 0,
        collected: 0,
      };
      row.bills = Number(row.bills) + 1;
      row.gross = Number(row.gross) + (bill.gross_amount || 0);
      row.discounts = Number(row.discounts) + (bill.discount_amount || 0);
      row.net = Number(row.net) + (bill.net_amount || 0);
      row.collected = Number(row.collected) + (bill.paid_amount || 0);
      rows[doctor] = row;
    });
    return Object.values(rows);
  }, [visibleBills]);

  const doctorPatientRows = useMemo(
    () =>
      visibleBills
        .filter((bill) => bill.doctor_name || bill.patient_name)
        .map((bill) => ({
          doctor: bill.doctor_name || 'Unassigned',
          patient: bill.patient_name || 'Unknown Patient',
          uhid: bill.uhid || '-',
          appointmentId: bill.appointment_id || 'N/A',
          department: bill.department || 'Unassigned',
          billType: bill.bill_type || '-',
          billNumber: bill.bill_number,
          billDate: bill.bill_date || '-',
          net: bill.net_amount || 0,
          collected: bill.paid_amount || 0,
          due: bill.pending_amount || 0,
        }))
        .sort((a, b) => a.doctor.localeCompare(b.doctor) || a.patient.localeCompare(b.patient)),
    [visibleBills]
  );

  const cashierRows = useMemo(() => {
    const rows: Record<string, Row> = {};
    visibleCollections.forEach((collection) => {
      const cashier = collection.collected_by || 'Unassigned';
      const row = rows[cashier] || {
        cashier,
        cash: 0,
        digital: 0,
        refunds: 0,
        total: 0,
      };
      const amount = collection.current_payment || 0;
      if (collection.payment_mode === 'Cash') {
        row.cash = Number(row.cash) + amount;
      } else {
        row.digital = Number(row.digital) + amount;
      }
      row.total = Number(row.total) + amount;
      rows[cashier] = row;
    });
    return Object.values(rows);
  }, [visibleCollections]);

  const dailyChartData = useMemo(
    () => [
      { name: 'Billed', amount: visibleBills.reduce((sum, b) => sum + (b.net_amount || 0), 0) },
      { name: 'Collected', amount: visibleCollections.reduce((sum, c) => sum + (c.current_payment || 0), 0) },
      { name: 'Outstanding', amount: visibleBills.reduce((sum, b) => sum + (b.pending_amount || 0), 0) },
      { name: 'Discounts', amount: visibleDiscounts.reduce((sum, d) => sum + (d.discount_amount || 0), 0) },
      { name: 'Refunds', amount: visibleRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0) },
    ],
    [visibleBills, visibleCollections, visibleDiscounts, visibleRefunds]
  );

  const departmentChartData = departmentRows.map((row) => ({
    name: String(row.department),
    gross: Number(row.gross),
    collected: Number(row.collected),
    outstanding: Number(row.outstanding),
  }));

  const doctorChartData = doctorRows
    .map((row) => ({
      name: String(row.doctor),
      net: Number(row.net),
      collected: Number(row.collected),
    }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 8);

  const cashierChartData = cashierRows.map((row) => ({
    name: String(row.cashier),
    cash: Number(row.cash),
    digital: Number(row.digital),
  }));

  const revenueExpenseChartData = [
    { name: 'Collected', amount: kpis.total_revenue },
    { name: 'Expenses', amount: kpis.total_expenses },
    { name: 'Net', amount: kpis.net_revenue },
  ];

  const discountRefundChartData = [
    { name: 'Discounts', amount: visibleDiscounts.reduce((sum, d) => sum + (d.discount_amount || 0), 0) },
    { name: 'Refunds', amount: visibleRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0) },
    { name: 'Supplier Due', amount: supplierPayables.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0) },
  ];

  const paymentExportRows = useMemo(() => {
    const rows: Record<string, { period: string; transactions: number; collected: number; cash: number; upi: number; card: number; bank: number; other: number }> = {};

    collections.forEach((collection) => {
      const date = collection.payment_date || collection.receipt_number || 'Unknown';
      const day = date.slice(0, 10) || 'Unknown';
      const period = exportGroup === 'year' ? day.slice(0, 4) : exportGroup === 'month' ? day.slice(0, 7) : day;
      const row = rows[period] || {
        period,
        transactions: 0,
        collected: 0,
        cash: 0,
        upi: 0,
        card: 0,
        bank: 0,
        other: 0,
      };
      const amount = collection.current_payment || 0;
      row.transactions += 1;
      row.collected += amount;
      if (collection.payment_mode === 'Cash') row.cash += amount;
      else if (collection.payment_mode === 'UPI') row.upi += amount;
      else if (collection.payment_mode === 'Card') row.card += amount;
      else if (collection.payment_mode === 'Bank Transfer') row.bank += amount;
      else row.other += amount;
      rows[period] = row;
    });

    return Object.values(rows).sort((a, b) => b.period.localeCompare(a.period));
  }, [collections, exportGroup]);

  const downloadPaymentTotalsCsv = () => {
    const headers = ['Period', 'Transactions', 'Total Collected', 'Cash', 'UPI', 'Debit/Credit', 'Bank Transfer', 'Other'];
    const csvRows = paymentExportRows.map((row) => [
      row.period,
      row.transactions,
      row.collected,
      row.cash,
      row.upi,
      row.card,
      row.bank,
      row.other,
    ]);
    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-totals-${exportGroup}-${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabItems = [
    { id: 'daily', name: 'Daily Collection', icon: CalendarDays },
    { id: 'payment-mode', name: 'Payment Mode', icon: Wallet },
    { id: 'department', name: 'Department Revenue', icon: Building2 },
    { id: 'doctor', name: 'Doctor Revenue', icon: UserCheck },
    { id: 'revenue-expense', name: 'Revenue vs Expense', icon: TrendingUp },
    { id: 'cashier', name: 'Shift Collection', icon: DollarSign },
    { id: 'discounts-refunds', name: 'Discounts & Refunds', icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hospital Financial Reports & Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Financial reports generated from billing records.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={exportGroup}
            onChange={(e) => setExportGroup(e.target.value as 'day' | 'month' | 'year')}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="day">Day-wise</option>
            <option value="month">Month-wise</option>
            <option value="year">Year-wise</option>
          </select>
          <button
            type="button"
            onClick={downloadPaymentTotalsCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Payments
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="Today">Today</option>
            <option value="All">All Records</option>
          </select>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive ? 'bg-white text-blue-600 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Collection Snapshot" subtitle={dateRange === 'Today' ? todayStr : 'All billing records'}>
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <CompactYAxis />
                  <Tooltip content={<MoneyTooltip />} />
                  <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payment Mix" subtitle="Collected amount split by mode">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentModeRows} dataKey="amount" nameKey="mode" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {paymentModeRows.map((row, index) => (
                      <Cell key={row.mode} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ReportTable title="Daily Billing Collection Report">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total Billed</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Refunds</th>
              <th className="px-4 py-3 text-right">Discounts</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {visibleBills.length || visibleCollections.length ? (
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{dateRange === 'Today' ? todayStr : 'All Records'}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(visibleBills.reduce((sum, b) => sum + (b.net_amount || 0), 0))}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(visibleCollections.reduce((sum, c) => sum + (c.current_payment || 0), 0))}</td>
                <td className="px-4 py-3 text-right text-rose-600 font-bold">{formatMoney(visibleRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0))}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-bold">{formatMoney(visibleDiscounts.reduce((sum, d) => sum + (d.discount_amount || 0), 0))}</td>
                <td className="px-4 py-3 text-right text-rose-600 font-bold">{formatMoney(visibleBills.reduce((sum, b) => sum + (b.pending_amount || 0), 0))}</td>
              </tr>
            ) : (
              <EmptyRow colSpan={6} />
            )}
          </tbody>
          </ReportTable>

          <ReportTable title={`Payment Totals Download Preview (${exportGroup}-wise)`}>
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-center">Transactions</th>
                <th className="px-4 py-3 text-right">Total Collected</th>
                <th className="px-4 py-3 text-right">Cash</th>
                <th className="px-4 py-3 text-right">UPI</th>
                <th className="px-4 py-3 text-right">Debit/Credit</th>
                <th className="px-4 py-3 text-right">Bank</th>
                <th className="px-4 py-3 text-right">Other</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paymentExportRows.length ? paymentExportRows.slice(0, 12).map((row) => (
                <tr key={row.period} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-extrabold text-slate-900">{row.period}</td>
                  <td className="px-4 py-3 text-center font-bold">{row.transactions}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-black">{formatMoney(row.collected)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.cash)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.upi)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.card)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.bank)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.other)}</td>
                </tr>
              )) : <EmptyRow colSpan={8} />}
            </tbody>
          </ReportTable>
        </div>
      )}

      {activeTab === 'payment-mode' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Payment Mode Distribution" subtitle="Share of collected payments">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeRows}
                    dataKey="amount"
                    nameKey="mode"
                    outerRadius={96}
                    label={(entry: any) => `${entry.name || entry.mode || ''} ${entry.payload?.share || entry.share || ''}`.trim()}
                  >
                    {paymentModeRows.map((row, index) => (
                      <Cell key={row.mode} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<MoneyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Collection by Mode" subtitle="Amount collected per payment channel">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={paymentModeRows} layout="vertical" margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <YAxis dataKey="mode" type="category" width={90} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Bar dataKey="amount" name="Amount" fill="#059669" radius={[0, 6, 6, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {paymentModeRows.length ? (
              paymentModeRows.map((row) => (
                <div key={row.mode} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase">{row.mode}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{formatMoney(row.amount)}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">
                    {row.count} Transactions ({row.share})
                  </p>
                </div>
              ))
            ) : (
              <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
                No payment collections found.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'department' && (
        <div className="space-y-6">
          <ChartCard title="Department Revenue Comparison" subtitle="Gross, collected, and outstanding by department">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={departmentChartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <CompactYAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="gross" name="Gross" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#e11d48" radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ReportTable title="Department-wise Revenue Summary">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Gross Revenue</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {departmentRows.length ? departmentRows.map((row) => (
              <tr key={String(row.department)} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-extrabold text-slate-900">{row.department}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(Number(row.gross))}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-bold">{formatMoney(Number(row.collected))}</td>
                <td className="px-4 py-3 text-right text-rose-600 font-bold">{formatMoney(Number(row.outstanding))}</td>
              </tr>
            )) : <EmptyRow colSpan={4} />}
          </tbody>
          </ReportTable>
        </div>
      )}

      {activeTab === 'doctor' && (
        <div className="space-y-6">
          <ChartCard title="Top Doctor Revenue" subtitle="Net and collected revenue by doctor">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={doctorChartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <CompactYAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="net" name="Net" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#059669" radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ReportTable title="Doctor-wise Financial Revenue">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Doctor Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-center">Bills</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Discounts</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {doctorRows.length ? doctorRows.map((row) => (
                <tr key={String(row.doctor)} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-extrabold text-slate-900">{row.doctor}</td>
                  <td className="px-4 py-3 text-slate-600 font-bold">{row.department}</td>
                  <td className="px-4 py-3 text-center font-bold">{row.bills}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(Number(row.gross))}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatMoney(Number(row.discounts))}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{formatMoney(Number(row.net))}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">{formatMoney(Number(row.collected))}</td>
                </tr>
              )) : <EmptyRow colSpan={7} />}
            </tbody>
          </ReportTable>

          <ReportTable title="Patient Treatment Details by Doctor">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3">Appointment ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Bill Type</th>
                <th className="px-4 py-3">Bill No</th>
                <th className="px-4 py-3">Bill Date</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Collected</th>
                <th className="px-4 py-3 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {doctorPatientRows.length ? doctorPatientRows.map((row) => (
                <tr key={`${row.billNumber}-${row.uhid}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-extrabold text-slate-900">{row.doctor}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{row.patient}</td>
                  <td className="px-4 py-3 text-blue-700 font-bold">{row.uhid}</td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">{row.appointmentId}</td>
                  <td className="px-4 py-3 text-slate-600 font-bold">{row.department}</td>
                  <td className="px-4 py-3 text-slate-600 font-bold">{row.billType}</td>
                  <td className="px-4 py-3 text-blue-700 font-bold">{row.billNumber}</td>
                  <td className="px-4 py-3 text-slate-500">{row.billDate}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(row.net)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">{formatMoney(row.collected)}</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-bold">{formatMoney(row.due)}</td>
                </tr>
              )) : <EmptyRow colSpan={11} />}
            </tbody>
          </ReportTable>
        </div>
      )}

      {activeTab === 'revenue-expense' && (
        <div className="space-y-6">
          <ChartCard title="Revenue vs Expense" subtitle="Collected revenue, expenses, and net position">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={revenueExpenseChartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <CompactYAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                  {revenueExpenseChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? '#059669' : index === 1 ? '#e11d48' : '#0f172a'} />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <Metric title="Gross Hospital Collections" amount={kpis.total_revenue} detail="Sum of collected billing revenue" />
            <Metric title="Relevant Expenses" amount={kpis.total_expenses} detail="Supplier payments and processed refunds" tone="expense" />
            <Metric title="Net Operating Revenue" amount={kpis.net_revenue} detail="Gross revenue minus expenses" tone="net" />
          </div>
        </div>
      )}

      {activeTab === 'cashier' && (
        <div className="space-y-6">
          <ChartCard title="Cashier Shift Collection" subtitle="Cash versus digital collection by staff">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={cashierChartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <CompactYAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="cash" name="Cash" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="digital" name="Digital / Bank" stackId="a" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ReportTable title="Shift Collection Summary">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3 text-right">Cash</th>
              <th className="px-4 py-3 text-right">Digital / Bank</th>
              <th className="px-4 py-3 text-right">Total Collection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {cashierRows.length ? cashierRows.map((row) => (
              <tr key={String(row.cashier)} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-extrabold text-slate-900">{row.cashier}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(Number(row.cash))}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(Number(row.digital))}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-black">{formatMoney(Number(row.total))}</td>
              </tr>
            )) : <EmptyRow colSpan={4} />}
          </tbody>
          </ReportTable>
        </div>
      )}

      {activeTab === 'discounts-refunds' && (
        <div className="space-y-6">
          <ChartCard title="Adjustments & Liabilities" subtitle="Discounts, refunds, and supplier outstanding">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={discountRefundChartData} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
                  {discountRefundChartData.map((row, index) => (
                    <Cell key={row.name} fill={chartColors[(index + 2) % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<MoneyTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <Metric title="Discount Requests" amount={visibleDiscounts.reduce((sum, d) => sum + (d.discount_amount || 0), 0)} detail={`${visibleDiscounts.length} records`} />
            <Metric title="Refund Requests" amount={visibleRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0)} detail={`${visibleRefunds.length} records`} tone="expense" />
            <Metric title="Supplier Outstanding" amount={supplierPayables.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0)} detail={`${supplierPayables.length} payable records`} tone="net" />
          </div>
        </div>
      )}
    </div>
  );
};

const ReportTable: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
    <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">{title}</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">{children}</table>
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
    <div className="mb-4">
      <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>}
    </div>
    <div className="h-72">{children}</div>
  </div>
);

const MoneyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-extrabold text-slate-900 mb-1">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} className="font-bold" style={{ color: item.color || item.fill }}>
          {item.name || item.dataKey}: {formatMoney(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
};

const CompactYAxis = () => <YAxis width={74} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />;

const Metric: React.FC<{ title: string; amount: number; detail: string; tone?: 'revenue' | 'expense' | 'net' }> = ({
  title,
  amount,
  detail,
  tone = 'revenue',
}) => {
  const toneClass =
    tone === 'expense'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : tone === 'net'
        ? 'bg-slate-900 border-slate-900 text-white'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  return (
    <div className={`p-4 rounded-xl border space-y-2 ${toneClass}`}>
      <p className="font-extrabold text-sm">{title}</p>
      <p className="text-2xl font-black">{formatMoney(amount)}</p>
      <p className="text-slate-500">{detail}</p>
    </div>
  );
};
