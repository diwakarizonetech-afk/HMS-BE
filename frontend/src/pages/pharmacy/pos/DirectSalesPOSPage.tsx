import React, { useState } from 'react';
import {
  ShoppingCart,
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Download,
  X,
  CheckCircle2,
  User,
  Phone,
  Tag,
  Receipt,
  History,
  Calendar,
  FileText,
  Filter,
  Eye,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { Medicine, POSSaleItem, POSInvoice } from '../../../types/hms';
import { useHMS } from '../../../context/HMSContext';
import { createInvoiceApi } from '../../../services/api';

export const DirectSalesPOSPage: React.FC = () => {
  const { addToast } = useHMS();
  const { medicines, invoices: initialInvoices } = usePharmacy();
  const [recentInvoices, setRecentInvoices] = useState<POSInvoice[]>(initialInvoices);

  // Active View Tab: 'pos' or 'history'
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // History search & filter state
  const [historySearch, setHistorySearch] = useState('');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState('All');

  // Cart State
  const [cart, setCart] = useState<POSSaleItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [discountPercent, setDiscountPercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Split'>('UPI');

  // Invoice Preview Modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<POSInvoice | null>(null);

  // Search Filter for Medicines in POS
  const filteredMedicines = medicines.filter((m) => {
    const query = searchQuery.toLowerCase();
    const barcode = barcodeInput.toLowerCase();

    const name = m?.name || '';
    const code = m?.code || '';
    const brand = m?.brand || '';

    const matchesSearch =
      !query ||
      name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query) ||
      brand.toLowerCase().includes(query);

    const matchesBarcode = !barcode || code.toLowerCase().includes(barcode);

    return matchesSearch && matchesBarcode && (m?.currentStock || 0) > 0;
  });

  // Filter Invoices History
  const filteredInvoices = recentInvoices.filter((inv) => {
    const query = historySearch.toLowerCase();
    const invNum = inv?.invoiceNumber || '';
    const custName = inv?.customerName || '';
    const custPhone = inv?.customerPhone || '';
    const items = inv?.items || [];

    const matchesSearch =
      !query ||
      invNum.toLowerCase().includes(query) ||
      custName.toLowerCase().includes(query) ||
      custPhone.toLowerCase().includes(query) ||
      items.some((i) => (i?.medicineName || '').toLowerCase().includes(query));

    const matchesPayment =
      historyPaymentFilter === 'All' || inv?.paymentMethod === historyPaymentFilter;

    return matchesSearch && matchesPayment;
  });

  const handleAddToCart = (m: Medicine) => {
    const availableStock = m.currentStock ?? 0;
    if (availableStock <= 0) {
      addToast('error', 'Item Out of Stock', `${m.name} is currently out of stock (0 available).`);
      return;
    }
    const existingIndex = cart.findIndex((item) => item.medicineId === m.id);
    if (existingIndex > -1) {
      const currentCartQty = cart[existingIndex].quantity;
      if (currentCartQty + 1 > availableStock) {
        addToast('warning', 'Stock Limit Reached', `Cannot add more than available stock (${availableStock} units) for ${m.name}.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      const newItem: POSSaleItem = {
        id: `posi-${Date.now()}-${Math.random()}`,
        medicineId: m.id,
        medicineName: `${m.name} (${m.brand})`,
        batchNumber: `BAT-2026-${Math.floor(100 + Math.random() * 800)}`,
        expiryDate: '2027-08-31',
        unitPrice: m.sellingPrice,
        quantity: 1,
        gst: m.gst,
        total: m.sellingPrice,
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  const handleUpdateQty = (id: string, delta: number) => {
    const cartItem = cart.find((item) => item.id === id);
    if (!cartItem) return;
    const med = medicines.find((m) => m.id === cartItem.medicineId);
    const availableStock = med?.currentStock ?? 999;

    if (delta > 0 && cartItem.quantity + delta > availableStock) {
      addToast('warning', 'Stock Limit Reached', `Cannot increase beyond available stock (${availableStock} units).`);
      return;
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, Math.min(availableStock, item.quantity + delta));
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = (taxableAmount * 12) / 100; // avg 12% GST
  const grandTotal = taxableAmount + gstAmount;

  // History Metrics Summary
  const totalPosRevenue = recentInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalItemsSold = recentInvoices.reduce(
    (acc, inv) => acc + inv.items.reduce((sum, i) => sum + i.quantity, 0),
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      addToast('warning', 'Empty Cart', 'Shopping cart is empty! Add medicines before checkout.');
      return;
    }

    const invoicePayload = {
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '+91 98765 43210',
      date: new Date().toLocaleString(),
      paymentMethod,
      subtotal,
      discount: discountAmount,
      gstAmount,
      totalAmount: grandTotal,
      items: [...cart],
    };

    let created: POSInvoice;
    try {
      // This deducts real batch stock (FEFO) for every item on the backend
      // and fails with a clear error if there isn't enough on hand -- it
      // used to just fabricate an invoice number client-side and never
      // touch the database or inventory at all.
      created = await createInvoiceApi(invoicePayload);
    } catch (err) {
      console.error('POS checkout failed:', err);
      const message = err instanceof Error ? err.message : 'Could not complete the sale.';
      addToast('error', 'Sale Failed', message);
      return;
    }

    setRecentInvoices((prev) => [created, ...prev]);
    setCompletedInvoice(created);
    setCheckoutModalOpen(true);
    setCart([]);

    addToast(
      'success',
      'POS Sale Completed! 🎉',
      `Invoice ${created.invoiceNumber} recorded. Total Paid: ₹${grandTotal.toFixed(2)} (${paymentMethod})`
    );
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleViewPastInvoice = (inv: POSInvoice) => {
    setCompletedInvoice(inv);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner with View Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-cyan-600" /> Pharmacy Direct Sales (POS Console)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              OTC sales counter, barcode checkout, GST receipts & real-time medicine sales history log.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('pos')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pos'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" /> POS Terminal
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Sales History ({recentInvoices.length})
              </button>
            </div>

            {/* Quick KPI Badge */}
            <div className="hidden xl:flex items-center bg-cyan-50/80 border border-cyan-200 px-3.5 py-1.5 rounded-xl gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-extrabold uppercase text-cyan-800 block">Total Revenue</span>
                <span className="text-xs font-black text-cyan-700">₹{totalPosRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* POS Search Controls (When activeTab === 'pos') */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search OTC medicine name, code, generic or brand..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white outline-none"
              />
            </div>

            <div className="sm:col-span-4 relative flex items-center bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-1">
              <Scan className="w-4 h-4 text-cyan-700 shrink-0 mr-2" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode Scanner Input..."
                className="w-full bg-transparent text-xs font-bold text-cyan-900 outline-none placeholder-cyan-500"
              />
              {barcodeInput && (
                <button onClick={() => setBarcodeInput('')} className="text-cyan-600 hover:text-cyan-800 p-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: POS TERMINAL COUNTER */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 65% (8 Cols): Medicine Cards Grid */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Available OTC Formulations ({filteredMedicines.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredMedicines.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleAddToCart(m)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-cyan-400 transition-all cursor-pointer space-y-2 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                        {m.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ (m.currentStock || 0) > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200' }`}>
                        Available: {m.currentStock || 0} units
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-cyan-700 transition-colors">
                      {m.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">{m.brand} • {m.strength}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">MRP</span>
                      <p className="text-xs font-black text-emerald-700">₹{m.sellingPrice.toFixed(2)}</p>
                    </div>

                    <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-xl group-hover:bg-cyan-600 group-hover:text-white transition-all flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 35% (5 Cols): POS Cart & Checkout Console */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-600" /> POS Billing Cart ({cart.length})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Customer Details Inputs */}
              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Mobile No</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Cart is empty. Click any medicine on the left grid to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">{item.medicineName}</span>
                        <span className="text-emerald-700">₹{item.total.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Rate: ₹{item.unitPrice}</span>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="text-slate-500 hover:text-rose-600 p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-extrabold text-slate-800 px-1.5">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="text-slate-500 hover:text-emerald-600 p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment & Totals Footer */}
            <div className="pt-4 border-t border-slate-200 space-y-3 text-xs">
              <div className="space-y-1.5 text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    Discount (%):
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-12 bg-slate-100 border border-slate-300 rounded px-1 text-center text-xs font-bold"
                    />
                  </span>
                  <span className="font-bold text-rose-600">-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (12% Avg):</span>
                  <span className="font-bold text-slate-800">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700 text-base">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Payment Method</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['UPI', 'Cash', 'Card', 'Split'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Checkout & Generate Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SALES & BILLING HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Top Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shrink-0 border border-cyan-100">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total POS Revenue</span>
                <span className="text-xl font-black text-cyan-700">₹{totalPosRevenue.toFixed(2)}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Across all POS receipts</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Bills Issued</span>
                <span className="text-xl font-black text-slate-900">{recentInvoices.length} Bills</span>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Completed Sales</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Medicines Sold</span>
                <span className="text-xl font-black text-purple-700">{totalItemsSold} Units</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Total units dispensed</p>
              </div>
            </div>
          </div>

          {/* History Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search Invoice #, Customer, Mobile or Medicine..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 font-medium text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-500 shrink-0">Payment Method:</span>
              <select
                value={historyPaymentFilter}
                onChange={(e) => setHistoryPaymentFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Payment Methods</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Split">Split Payment</option>
              </select>
            </div>
          </div>

          {/* Detailed Sales History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Medicines Sold Breakdown</th>
                    <th className="p-4">Grand Total (₹)</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        No sales history records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-black text-cyan-700">{inv.invoiceNumber}</td>
                        <td className="p-4 text-slate-600 font-medium">{inv.date}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{inv.customerName}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{inv.customerPhone}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {inv.items.map((item) => (
                              <span
                                key={item.id}
                                className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80"
                              >
                                {item.medicineName} <strong className="text-cyan-700">({item.quantity}x)</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-black text-emerald-700 text-sm">
                          ₹{inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewPastInvoice(inv)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="View Tax Receipt"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" /> Receipt
                            </button>
                            <button
                              onClick={() => {
                                setCompletedInvoice(inv);
                                setTimeout(() => window.print(), 100);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receipt Preview */}
      {checkoutModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-600" /> POS Sales Tax Receipt
              </h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 font-mono text-[11px]">
              <div className="text-center">
                <p className="font-black text-xs text-slate-900 uppercase">AegisCare Hospital Pharmacy</p>
                <p className="text-[10px] text-slate-500">Invoice: {completedInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500">{completedInvoice.date}</p>
              </div>

              <div className="border-t border-b border-slate-200 py-1.5 space-y-0.5">
                <p><strong>Customer:</strong> {completedInvoice.customerName}</p>
                <p><strong>Phone:</strong> {completedInvoice.customerPhone}</p>
                <p><strong>Payment Method:</strong> {completedInvoice.paymentMethod}</p>
              </div>

              <div className="space-y-1">
                {completedInvoice.items.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.medicineName} x {i.quantity}</span>
                    <span className="font-bold">₹{i.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-1.5 space-y-0.5 text-right">
                <p>Subtotal: ₹{completedInvoice.subtotal.toFixed(2)}</p>
                <p>Discount: -₹{completedInvoice.discount.toFixed(2)}</p>
                <p>GST: ₹{completedInvoice.gstAmount.toFixed(2)}</p>
                <p className="font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                  Total Paid: ₹{completedInvoice.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm cursor-pointer flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Tax Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
