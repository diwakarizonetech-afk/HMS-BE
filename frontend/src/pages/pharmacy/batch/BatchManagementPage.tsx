import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowLeftRight,
  History,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { Batch } from '../../../types/hms';

export const BatchManagementPage: React.FC = () => {
  const { batches: initialBatches, medicines } = usePharmacy();
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Form states for Add Batch
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formMedName, setFormMedName] = useState(medicines[0]?.name || '');
  const [formSupplier, setFormSupplier] = useState('Apex Medical Distributors');
  const [formMfgDate, setFormMfgDate] = useState('2025-10-01');
  const [formExpDate, setFormExpDate] = useState('2027-09-30');
  const [formPurchasePrice, setFormPurchasePrice] = useState(25.0);
  const [formSellingPrice, setFormSellingPrice] = useState(40.0);
  const [formQty, setFormQty] = useState(500);

  // Transfer stock state
  const [transferQty, setTransferQty] = useState(50);
  const [targetLocation, setTargetLocation] = useState('IPD Emergency Dispensing Rack');

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || b.batchStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormBatchNo(`BAT-2026-${Math.floor(100 + Math.random() * 900)}`);
    setAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newBatch: Batch = {
      id: `bat-${Date.now()}`,
      batchNumber: formBatchNo,
      medicineId: 'med-101',
      medicineName: formMedName,
      supplierName: formSupplier,
      manufacturingDate: formMfgDate,
      expiryDate: formExpDate,
      purchasePrice: Number(formPurchasePrice),
      sellingPrice: Number(formSellingPrice),
      quantityReceived: Number(formQty),
      availableQuantity: Number(formQty),
      batchStatus: 'Available',
    };
    setBatches((prev) => [newBatch, ...prev]);
    setAddModalOpen(false);
  };

  const handleOpenTransfer = (b: Batch) => {
    setSelectedBatch(b);
    setTransferQty(Math.min(20, b.availableQuantity));
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setBatches((prev) =>
      prev.map((item) =>
        item.id === selectedBatch.id
          ? {
              ...item,
              availableQuantity: Math.max(0, item.availableQuantity - Number(transferQty)),
            }
          : item
      )
    );
    setTransferModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-blue-600" /> Batch Master & Stock Control
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track manufacturing dates, expiry dates, supplier source & available stock for every medicine batch.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" /> Add New Batch
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Batch Number, Medicine Name or Supplier..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
            >
              <option value="All">All Batch Statuses</option>
              <option value="Available">Available</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Batch Number</th>
                <th className="p-4">Medicine Name</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Mfg Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Buy Price</th>
                <th className="p-4">Sell Price</th>
                <th className="p-4">Received Qty</th>
                <th className="p-4">Available Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-black text-indigo-700 text-xs">{b.batchNumber}</td>
                  <td className="p-4 font-bold text-slate-900 text-xs">{b.medicineName}</td>
                  <td className="p-4 text-slate-600 font-medium">{b.supplierName}</td>
                  <td className="p-4 text-slate-500">{b.manufacturingDate}</td>
                  <td className="p-4 font-bold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {b.expiryDate}
                  </td>
                  <td className="p-4 text-slate-600 font-semibold">₹{b.purchasePrice.toFixed(2)}</td>
                  <td className="p-4 text-emerald-700 font-bold">₹{b.sellingPrice.toFixed(2)}</td>
                  <td className="p-4 text-slate-700">{b.quantityReceived}</td>
                  <td className="p-4">
                    <span
                      className={`font-black text-xs px-2.5 py-0.5 rounded-full ${
                        b.availableQuantity <= 30
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.availableQuantity}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        b.batchStatus === 'Expired'
                          ? 'bg-rose-600 text-white'
                          : b.batchStatus === 'Expiring Soon'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : b.batchStatus === 'Low Stock'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.batchStatus}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenTransfer(b)}
                        title="Transfer Stock"
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBatch(b);
                          setHistoryModalOpen(true);
                        }}
                        title="Batch History"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Batch */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" /> Add New Medicine Batch
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-indigo-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Medicine *</label>
                  <select
                    value={formMedName}
                    onChange={(e) => setFormMedName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  >
                    {medicines.map((m) => (
                      <option key={m.id} value={`${m.name} (${m.brand})`}>
                        {m.name} ({m.brand})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mfg Date *</label>
                  <input
                    type="date"
                    value={formMfgDate}
                    onChange={(e) => setFormMfgDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={formExpDate}
                    onChange={(e) => setFormExpDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (MRP ₹)</label>
                  <input
                    type="number"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Create Batch Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Stock */}
      {transferModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" /> Stock Transfer — {selectedBatch.batchNumber}
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">{selectedBatch.medicineName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Available Stock: <strong>{selectedBatch.availableQuantity} Units</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  max={selectedBatch.availableQuantity}
                  min={1}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Rack / Ward Location</label>
                <select
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                >
                  <option value="IPD Emergency Dispensing Rack">IPD Emergency Dispensing Rack</option>
                  <option value="OPD Counter B Stock">OPD Counter B Stock</option>
                  <option value="ICU Medicine Sub-store">ICU Medicine Sub-store</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Confirm Stock Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch History */}
      {historyModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> Audit Log — {selectedBatch.batchNumber}
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Batch Initial Stock Inward</span>
                  <span className="text-[10px] text-slate-400">{selectedBatch.manufacturingDate}</span>
                </div>
                <p className="text-slate-600">Received {selectedBatch.quantityReceived} units from supplier {selectedBatch.supplierName}.</p>
              </div>
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-blue-900">
                  <span>Dispensed at OPD Counter</span>
                  <span className="text-[10px] text-blue-600">2026-07-24 10:15 AM</span>
                </div>
                <p className="text-blue-800">5 units dispensed under receipt POS-2026-00411.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
