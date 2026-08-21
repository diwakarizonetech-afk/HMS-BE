import React, { useState } from 'react';
import {
  Warehouse,
  Boxes,
  AlertTriangle,
  PackageX,
  Search,
  Scan,
  Edit3,
  ArrowLeftRight,
  History,
  X,
  Save,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { Medicine } from '../../../types/hms';

export const StockInventoryPage: React.FC = () => {
  const { medicines, setMedicines } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'OutOfStock'>('All');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Modals
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Physical Audit Recount');

  const totalStockCount = medicines.reduce((acc, m) => acc + m.currentStock, 0);
  const availableStockCount = medicines.filter((m) => m.currentStock > m.minStock).length;
  const lowStockCount = medicines.filter((m) => m.currentStock > 0 && m.currentStock <= m.minStock).length;
  const outOfStockCount = medicines.filter((m) => m.currentStock === 0).length;

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.rackLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBarcode = !barcodeInput || m.code.toLowerCase().includes(barcodeInput.toLowerCase());

    if (stockFilter === 'Low') {
      return matchesSearch && matchesBarcode && m.currentStock <= m.minStock && m.currentStock > 0;
    } else if (stockFilter === 'OutOfStock') {
      return matchesSearch && matchesBarcode && m.currentStock === 0;
    }

    return matchesSearch && matchesBarcode;
  });

  const handleOpenAdjustment = (m: Medicine) => {
    setSelectedMedicine(m);
    setAdjustmentQty(m.currentStock);
    setAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;

    setMedicines((prev) =>
      prev.map((item) =>
        item.id === selectedMedicine.id
          ? { ...item, currentStock: Number(adjustmentQty) }
          : item
      )
    );
    setAdjustmentModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="w-6 h-6 text-emerald-600" /> Stock & Inventory Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time medicine stock status, total quantities & inventory availability.
            </p>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div
            onClick={() => setStockFilter('All')}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              stockFilter === 'All' ? 'bg-blue-100 border-blue-400 shadow-sm' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Items</span>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{medicines.length} Medicines</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setStockFilter('All')}
            className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Available Stock</span>
              <h3 className="text-2xl font-black text-emerald-950 mt-0.5">{availableStockCount} Items</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setStockFilter('Low')}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              stockFilter === 'Low' ? 'bg-amber-100 border-amber-400 shadow-sm' : 'bg-amber-50/60 border-amber-200'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-amber-900 uppercase">Low Stock Alerts</span>
              <h3 className="text-2xl font-black text-amber-950 mt-0.5">{lowStockCount} Items</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setStockFilter('OutOfStock')}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              stockFilter === 'OutOfStock' ? 'bg-rose-100 border-rose-400 shadow-sm' : 'bg-rose-50/60 border-rose-200'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-rose-900 uppercase">Out of Stock</span>
              <h3 className="text-2xl font-black text-rose-950 mt-0.5">{outOfStockCount} Items</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
              <PackageX className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Medicine Name or Code..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Low', 'OutOfStock'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStockFilter(filter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === filter
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'All' ? 'All Stock' : filter === 'Low' ? 'Low Stock Alerts' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table - S.No, Code, Medicine Name, Quantity, Stock Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">S.No</th>
                <th className="p-4">Code</th>
                <th className="p-4">Medicine Name</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMedicines.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`transition-colors ${
                    m.currentStock === 0
                      ? 'bg-rose-50/30 hover:bg-rose-50'
                      : m.currentStock <= m.minStock
                      ? 'bg-amber-50/30 hover:bg-amber-50'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="p-4 font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-4 font-extrabold text-emerald-700">{m.code}</td>
                  <td className="p-4 font-bold text-slate-900 text-xs">{m.name}</td>
                  <td className="p-4">
                    <span className="font-black text-sm text-slate-900">
                      {m.currentStock} Units
                    </span>
                  </td>
                  <td className="p-4">
                    {m.currentStock === 0 ? (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full">
                        OUT OF STOCK
                      </span>
                    ) : m.currentStock <= m.minStock ? (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                        AVAILABLE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adjust Stock */}
      {adjustmentModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" /> Stock Adjustment — {selectedMedicine.code}
              </h3>
              <button onClick={() => setAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">{selectedMedicine.name}</p>
                <p className="text-[10px] text-slate-500">Rack Location: {selectedMedicine.rackLocation}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Physical Stock Count *</label>
                <input
                  type="number"
                  min={0}
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Reason</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                >
                  <option value="Physical Audit Recount">Physical Audit Recount</option>
                  <option value="Damaged Stock Written-Off">Damaged Stock Written-Off</option>
                  <option value="Sample Pack Allocation">Sample Pack Allocation</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
