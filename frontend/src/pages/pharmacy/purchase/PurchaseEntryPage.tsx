import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Save,
  Printer,
  Download,
  FileText,
  CheckCircle2,
  DollarSign,
  Building2,
  Calendar,
} from 'lucide-react';
import { useHMS } from '../../../context/HMSContext';
import { PurchaseItem } from '../../../types/hms';

export const PurchaseEntryPage: React.FC = () => {
  const { addToast } = useHMS();

  // Form Top Metadata
  const [purchaseNo, setPurchaseNo] = useState(`PO-2026-${Math.floor(500 + Math.random() * 500)}`);
  const [supplierName, setSupplierName] = useState('Apex Medical Distributors');
  const [supplierGst, setSupplierGst] = useState('29ABCDE1234F1Z5');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-APX-98412');
  const [purchaseDate, setPurchaseDate] = useState('2026-07-24');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque'>('Bank Transfer');

  // Purchase Items Table
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: 'pi-101',
      medicineName: 'Paracetamol 650mg (Dolo 650)',
      batchNumber: 'BAT-2026-112',
      expiryDate: '2027-08-31',
      quantity: 500,
      mrp: 34.0,
      purchasePrice: 22.5,
      discount: 5,
      gst: 12,
      totalAmount: 10687.5,
    },
    {
      id: 'pi-102',
      medicineName: 'Augmentin 625 Duo',
      batchNumber: 'BAT-2026-140',
      expiryDate: '2027-10-31',
      quantity: 100,
      mrp: 201.5,
      purchasePrice: 135.0,
      discount: 0,
      gst: 12,
      totalAmount: 13500.0,
    },
  ]);

  // New Item input state
  const [selectedMed, setSelectedMed] = useState('Paracetamol 650mg (Dolo 650)');
  const [inputBatch, setInputBatch] = useState('BAT-2026-150');
  const [inputExpiry, setInputExpiry] = useState('2027-12-31');
  const [inputQty, setInputQty] = useState(100);
  const [inputMrp, setInputMrp] = useState(120);
  const [inputPurchasePrice, setInputPurchasePrice] = useState(80);
  const [inputDiscount, setInputDiscount] = useState(0);
  const [inputGst, setInputGst] = useState(12);

  const calculateItemTotal = (qty: number, price: number, disc: number, gstRate: number) => {
    const discountedPrice = price - (price * disc) / 100;
    const baseTotal = qty * discountedPrice;
    const gstVal = (baseTotal * gstRate) / 100;
    return Math.round((baseTotal + gstVal) * 100) / 100;
  };

  const handleAddItem = () => {
    if (!selectedMed.trim()) {
      addToast('warning', 'Missing Medicine Name', 'Please enter a valid medicine name before adding to grid.');
      return;
    }
    const total = calculateItemTotal(inputQty, inputPurchasePrice, inputDiscount, inputGst);
    const newItem: PurchaseItem = {
      id: `pi-${Date.now()}`,
      medicineName: selectedMed,
      batchNumber: inputBatch,
      expiryDate: inputExpiry,
      quantity: Number(inputQty),
      mrp: Number(inputMrp),
      purchasePrice: Number(inputPurchasePrice),
      discount: Number(inputDiscount),
      gst: Number(inputGst),
      totalAmount: total,
    };
    setItems((prev) => [...prev, newItem]);
    addToast('success', 'Medicine Added', `${selectedMed} (${inputQty} units) added to purchase grid.`);

    // Clear item inputs after adding
    setSelectedMed('');
    setInputBatch('');
    setInputExpiry('');
    setInputQty(100);
    setInputMrp(0);
    setInputPurchasePrice(0);
    setInputDiscount(0);
  };

  const handleRemoveItem = (id: string) => {
    const itemToRemove = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (itemToRemove) {
      addToast('info', 'Item Removed', `${itemToRemove.medicineName} removed from inward list.`);
    }
  };

  const grandTotal = items.reduce((acc, i) => acc + i.totalAmount, 0);

  const resetForm = () => {
    setPurchaseNo(`PO-2026-${Math.floor(500 + Math.random() * 500)}`);
    setSupplierName('');
    setInvoiceNumber('');
    setItems([]);
    setSelectedMed('');
    setInputBatch('');
    setInputExpiry('');
    setInputQty(100);
    setInputMrp(0);
    setInputPurchasePrice(0);
    setInputDiscount(0);
    setInputGst(12);
  };

  const handleSavePurchase = (status: 'Completed' | 'Draft') => {
    if (items.length === 0) {
      addToast('warning', 'Empty Inward Items', 'Please add at least one medicine item to save purchase.');
      return;
    }
    const currentPo = purchaseNo;
    const currentTotal = grandTotal.toFixed(2);

    addToast(
      'success',
      status === 'Completed' ? 'Purchase Saved Successfully! 🎉' : 'Purchase Saved as Draft! 📁',
      `Order ${currentPo} with total ₹${currentTotal} has been successfully recorded.`
    );
    resetForm();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    addToast('info', 'Generating PDF', `Downloading Purchase Order PDF for ${purchaseNo}...`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-purple-600" /> Supplier Purchase Entry
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Record new inventory inward shipments, batch expiry dates, GST & supplier invoice totals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Print Invoice
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> PDF
            </button>
            <button
              onClick={() => handleSavePurchase('Draft')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-amber-100 hover:bg-amber-200 transition-all cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSavePurchase('Completed')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Purchase
            </button>
          </div>
        </div>

        {/* Top Metadata Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Purchase Order No *</label>
            <input
              type="text"
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-purple-700 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Enter supplier name"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier Invoice Number *</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit">Credit Account (30 Days)</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Item Panel */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Purchased Medicine Item
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Medicine</label>
            <input
              type="text"
              value={selectedMed}
              onChange={(e) => setSelectedMed(e.target.value)}
              placeholder="Enter medicine name"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Batch Number</label>
            <input
              type="text"
              value={inputBatch}
              onChange={(e) => setInputBatch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
            <input
              type="date"
              value={inputExpiry}
              onChange={(e) => setInputExpiry(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
            <input
              type="number"
              value={inputQty}
              onChange={(e) => setInputQty(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Purchase Price (₹)</label>
            <input
              type="number"
              value={inputPurchasePrice}
              onChange={(e) => setInputPurchasePrice(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selling MRP (₹)</label>
            <input
              type="number"
              value={inputMrp}
              onChange={(e) => setInputMrp(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discount (%)</label>
            <input
              type="number"
              value={inputDiscount}
              onChange={(e) => setInputDiscount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GST (%)</label>
            <input
              type="number"
              value={inputGst}
              onChange={(e) => setInputGst(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddItem}
              className="w-full py-2 rounded-xl text-xs font-bold text-slate-900 bg-purple-400 hover:bg-purple-300 transition-all cursor-pointer"
            >
              + Add Item to Grid
            </button>
          </div>
        </div>
      </div>

      {/* Purchased Items Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Inward Items List ({items.length})
          </span>
          <span className="text-sm font-black text-purple-700">
            Grand Total: ₹{grandTotal.toFixed(2)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Medicine Item</th>
                <th className="p-4">Batch Number</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Qty</th>
                <th className="p-4">MRP (₹)</th>
                <th className="p-4">Purchase Rate (₹)</th>
                <th className="p-4">Discount</th>
                <th className="p-4">GST</th>
                <th className="p-4">Total Amount (₹)</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-4 font-bold text-slate-900">{item.medicineName}</td>
                  <td className="p-4 font-extrabold text-indigo-700">{item.batchNumber}</td>
                  <td className="p-4 text-slate-600">{item.expiryDate}</td>
                  <td className="p-4 font-bold text-slate-900">{item.quantity}</td>
                  <td className="p-4 text-slate-700">₹{item.mrp.toFixed(2)}</td>
                  <td className="p-4 text-slate-700 font-semibold">₹{item.purchasePrice.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{item.discount}%</td>
                  <td className="p-4 text-slate-600">{item.gst}%</td>
                  <td className="p-4 font-black text-purple-700 text-sm">₹{item.totalAmount.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
