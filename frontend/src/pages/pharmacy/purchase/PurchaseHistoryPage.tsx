import React, { useState } from 'react';
import { History, Eye, Download, Printer, Search, Filter, X, CheckCircle2 } from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { PurchaseEntry } from '../../../types/hms';

export const PurchaseHistoryPage: React.FC = () => {
  const { purchases } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseEntry | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDetails = (p: PurchaseEntry) => {
    setSelectedPurchase(p);
    setDetailsModalOpen(true);
  };

  const handleDownloadInvoice = (poNo: string) => {
    alert(`Downloading invoice document for ${poNo}...`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-purple-600" /> Supplier Purchase History
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Audit inward supplier purchase orders, payment statuses, GST invoices & batch logs.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO Number, Supplier Name or Invoice Number..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Purchase Number</th>
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Purchase Date</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Total Amount (₹)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-black text-purple-700 text-xs">{p.purchaseNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{p.supplierName}</td>
                  <td className="p-4 font-semibold text-slate-600">{p.invoiceNumber}</td>
                  <td className="p-4 text-slate-600">{p.purchaseDate}</td>
                  <td className="p-4 text-slate-600 font-medium">{p.paymentMethod}</td>
                  <td className="p-4 font-black text-slate-900 text-sm">₹{p.totalAmount.toFixed(2)}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        p.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenDetails(p)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Order
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(p.purchaseNumber)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Purchase Details */}
      {detailsModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" /> Purchase Order Details — {selectedPurchase.purchaseNumber}
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Supplier</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedPurchase.supplierName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice No</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedPurchase.invoiceNumber}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Purchase Date</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedPurchase.purchaseDate}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</span>
                <p className="font-bold text-purple-700 mt-0.5">{selectedPurchase.paymentMethod}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Expiry</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-3 font-bold text-slate-900">{i.medicineName}</td>
                      <td className="p-3 font-bold text-indigo-700">{i.batchNumber}</td>
                      <td className="p-3 text-slate-600">{i.expiryDate}</td>
                      <td className="p-3 text-slate-900 font-bold">{i.quantity}</td>
                      <td className="p-3 text-slate-700">₹{i.purchasePrice.toFixed(2)}</td>
                      <td className="p-3 font-black text-purple-700">₹{i.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-black text-slate-900">
                Grand Total: ₹{selectedPurchase.totalAmount.toFixed(2)}
              </span>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
