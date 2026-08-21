import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../../../context/BillingContext';
import {
  Search,
  Filter,
  FileText,
  PlusCircle,
  Eye,
  CreditCard,
  RefreshCw,
  XCircle,
  Download,
  Printer,
  ChevronRight,
} from 'lucide-react';

export const AllBillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { bills, setSelectedBillForModal } = useBilling();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      !search.trim() ||
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      b.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      b.uhid.toLowerCase().includes(search.toLowerCase()) ||
      (b.appointment_id && b.appointment_id.toLowerCase().includes(search.toLowerCase())) ||
      (b.ipd_number && b.ipd_number.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'ALL' || b.bill_type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || b.payment_status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Master Hospital Bills & Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete central repository of all financial bills generated across hospital departments.
          </p>
        </div>
        <button
          onClick={() => navigate('/billing/create')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Bill
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Global Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Bill No, Patient Name, UHID, Appt ID, IPD No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Service Types</option>
            <option value="OPD">OPD Consultation</option>
            <option value="IPD">IPD Admission</option>
            <option value="Lab">Laboratory</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Procedure">Procedure</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Refunded">Refunded</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bills Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Showing <span className="text-slate-900 font-extrabold">{filteredBills.length}</span> Hospital Bills
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3">Service Category</th>
                <th className="px-4 py-3">Department / Doctor</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
                <th className="px-4 py-3 text-right">Paid Amount</th>
                <th className="px-4 py-3 text-right">Pending Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Bill Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
                  <tr key={bill.id || bill.bill_number} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-blue-700">{bill.bill_number}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{bill.patient_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-semibold">{bill.uhid}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px]">
                        {bill.bill_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {bill.department || 'General'}
                      {bill.doctor_name && <p className="text-[10px] text-slate-400">{bill.doctor_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      ₹{bill.net_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                      ₹{bill.paid_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-bold">
                      ₹{bill.pending_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${bill.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.payment_status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{bill.bill_date}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedBillForModal(bill)}
                          title="View Tax Invoice"
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No hospital bills matched your search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
