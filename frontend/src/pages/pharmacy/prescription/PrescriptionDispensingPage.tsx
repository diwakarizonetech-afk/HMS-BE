import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Printer,
  Eye,
  Search,
  Filter,
  X,
  Stethoscope,
  Pill,
  User,
  Clock,
  Tag,
  BadgeCheck,
  Save,
  CreditCard,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { PrescriptionOrder, PrescriptionItem } from '../../../types/hms';
import { useHMS } from '../../../context/HMSContext';
import { updatePrescriptionApi } from '../../../services/api';

export const PrescriptionDispensingPage: React.FC = () => {
  const { addToast } = useHMS();
  const { prescriptions: initialPrescriptions, refreshData } = usePharmacy();
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>(initialPrescriptions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  React.useEffect(() => {
    setPrescriptions(initialPrescriptions);
  }, [initialPrescriptions]);

  // Selected Modal State (Holds draft until submitted)
  const [selectedRx, setSelectedRx] = useState<PrescriptionOrder | null>(null);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [activeLabelItem, setActiveLabelItem] = useState<PrescriptionItem | null>(null);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const rxNum = rx?.prescriptionNumber || '';
    const patName = rx?.patientName || '';
    const patUhid = rx?.patientUhid || '';
    const docName = rx?.doctorName || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      rxNum.toLowerCase().includes(query) ||
      patName.toLowerCase().includes(query) ||
      patUhid.toLowerCase().includes(query) ||
      docName.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || rx?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateRxTotal = (rx: PrescriptionOrder) => {
    return (rx?.items || []).reduce((acc, item) => acc + (item?.price || 0), 0);
  };

  const handleOpenDispense = (rx: PrescriptionOrder) => {
    const cloned: PrescriptionOrder = JSON.parse(JSON.stringify(rx));
    const total = calculateRxTotal(cloned);
    if (cloned.totalAmount === undefined) cloned.totalAmount = total;
    if (cloned.paymentStatus === undefined) cloned.paymentStatus = 'Paid';
    if (cloned.amountPaid === undefined) cloned.amountPaid = cloned.paymentStatus === 'Paid' ? total : 0;
    if (cloned.dueAmount === undefined) cloned.dueAmount = total - (cloned.amountPaid || 0);
    if (cloned.paymentMethod === undefined) cloned.paymentMethod = 'Cash';

    setSelectedRx(cloned);
    setDispenseModalOpen(true);
  };

  const handleVerify = () => {
    if (!selectedRx) return;
    setSelectedRx((prev) => (prev ? { ...prev, status: 'Verified' } : prev));
    addToast('info', 'Prescription Verified', `Prescription ${selectedRx.prescriptionNumber} verified successfully.`);
  };

  const handleDispenseAll = () => {
    if (!selectedRx) return;
    const updatedItems = selectedRx.items.map((i) => ({ ...i, dispensed: true }));
    setSelectedRx((prev) => (prev ? { ...prev, status: 'Dispensed', items: updatedItems } : prev));
    addToast('success', 'All Items Selected', 'All prescription medicines marked as dispensed.');
  };

  const handleToggleItemDispensed = (itemId: string) => {
    if (!selectedRx) return;
    const updatedItems = selectedRx.items.map((i) =>
      i.id === itemId ? { ...i, dispensed: !i.dispensed } : i
    );
    const allDispensed = updatedItems.every((i) => i.dispensed);
    const someDispensed = updatedItems.some((i) => i.dispensed);
    const newStatus = allDispensed
      ? 'Dispensed'
      : someDispensed
      ? 'Partially Dispensed'
      : 'Verified';

    setSelectedRx((prev) => (prev ? { ...prev, status: newStatus, items: updatedItems } : prev));
  };

  const handleSubmitDispensing = async () => {
    if (!selectedRx) return;

    try {
      // This is what actually deducts medicine stock for newly-dispensed
      // items on the backend (see update_prescription in pharmacy.py) --
      // this handler used to only update local component state and never
      // called the API at all, so dispensing a prescription never
      // persisted and never touched inventory.
      const updated = await updatePrescriptionApi(selectedRx.id, {
        status: selectedRx.status,
        items: selectedRx.items,
        paymentStatus: selectedRx.paymentStatus,
        totalAmount: selectedRx.totalAmount,
        amountPaid: selectedRx.amountPaid,
        dueAmount: selectedRx.dueAmount,
        paymentMethod: selectedRx.paymentMethod,
      });
      setPrescriptions((prev) =>
        prev.map((item) => (item.id === selectedRx.id ? { ...selectedRx, ...updated } : item))
      );
    } catch (err) {
      console.error('handleSubmitDispensing failed:', err);
      const message = err instanceof Error ? err.message : 'Could not save the dispensing to the server.';
      addToast('error', 'Save Failed', message);
      return;
    }

    setDispenseModalOpen(false);

    const total = calculateRxTotal(selectedRx);
    const collected = selectedRx.amountPaid ?? total;
    const pStatus = selectedRx.paymentStatus || 'Paid';

    addToast(
      'success',
      'Prescription Updated Successfully! 🎉',
      `${selectedRx.prescriptionNumber} — Status: ${selectedRx.status} | Total: ₹${total.toFixed(2)} | Collected: ₹${collected.toFixed(2)} (${pStatus})`
    );
  };

  const handlePrintBill = () => {
    window.print();
  };

  const handleOpenLabel = (item: PrescriptionItem) => {
    setActiveLabelItem(item);
    setLabelModalOpen(true);
  };

  // Helper for modal total calculation
  const modalTotalBill = selectedRx ? calculateRxTotal(selectedRx) : 0;

  // Summary Metrics for Header
  const totalPaidCollected = prescriptions.reduce((acc, rx) => {
    const totalBill = rx.totalAmount || calculateRxTotal(rx);
    const pStatus = rx.paymentStatus || 'Paid';
    const paid = rx.amountPaid !== undefined ? rx.amountPaid : (pStatus === 'Paid' ? totalBill : 0);
    return acc + paid;
  }, 0);

  const totalPendingDue = prescriptions.reduce((acc, rx) => {
    const totalBill = rx.totalAmount || calculateRxTotal(rx);
    const pStatus = rx.paymentStatus || 'Paid';
    const paid = rx.amountPaid !== undefined ? rx.amountPaid : (pStatus === 'Paid' ? totalBill : 0);
    const due = rx.dueAmount !== undefined ? rx.dueAmount : (totalBill - paid);
    return acc + due;
  }, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-emerald-600" /> Doctor Prescription Dispensing Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify E-Prescriptions from OPD/IPD rooms, track total bill amount, collect payments & dispense medicines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50/80 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">Total Paid Collected</span>
                <span className="text-base font-black text-emerald-700">₹{totalPaidCollected.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-rose-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block">Total Pending Due</span>
                <span className="text-base font-black text-rose-700">₹{totalPendingDue.toFixed(2)}</span>
              </div>
            </div>
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
              placeholder="Search by Prescription No, Patient Name, UHID or Doctor..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white outline-none cursor-pointer"
            >
              <option value="All">All Prescription Statuses</option>
              <option value="Pending">Pending Verification</option>
              <option value="Verified">Verified</option>
              <option value="Partially Dispensed">Partially Dispensed</option>
              <option value="Dispensed">Dispensed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescription List Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Prescription No</th>
                <th className="p-4">Patient Name & UHID</th>
                <th className="p-4">Doctor & Department</th>
                <th className="p-4">Visit Date</th>
                <th className="p-4">Medicine Count</th>
                <th className="p-4">Total Amount (₹)</th>
                <th className="p-4">Dispense Status</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPrescriptions.map((rx) => {
                const totalBill = rx.totalAmount || calculateRxTotal(rx);
                const pStatus = rx.paymentStatus || 'Paid';
                const paidAmt = rx.amountPaid !== undefined ? rx.amountPaid : (pStatus === 'Paid' ? totalBill : 0);
                const dueAmt = rx.dueAmount !== undefined ? rx.dueAmount : (totalBill - paidAmt);

                return (
                  <tr key={rx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-black text-emerald-700 text-xs">{rx.prescriptionNumber}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-xs">{rx.patientName}</p>
                      <p className="text-[10px] font-semibold text-blue-600">{rx.patientUhid} ({rx.patientAge}y/{rx.patientGender})</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{rx.doctorName}</p>
                      <p className="text-[10px] text-slate-400">{rx.department}</p>
                    </td>
                    <td className="p-4 text-slate-600">{rx.visitDate}</td>
                    <td className="p-4 font-bold text-slate-900">{rx.items.length} Items</td>
                    <td className="p-4 font-black text-purple-700 text-xs">₹{totalBill.toFixed(2)}</td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          rx.status === 'Dispensed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rx.status === 'Verified'
                            ? 'bg-blue-100 text-blue-800'
                            : rx.status === 'Partially Dispensed'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rx.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                          pStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : pStatus === 'Partial'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        <Receipt className="w-3 h-3" />
                        {rx.paymentMethod === 'IPD Credit / Post Bill' ? (
                          `IPD Credit`
                        ) : (
                          <>
                            {pStatus === 'Paid' && `Paid (₹${paidAmt.toFixed(0)})`}
                            {pStatus === 'Due' && `Due (₹${dueAmt.toFixed(0)})`}
                            {pStatus === 'Unpaid' && `Unpaid (₹${dueAmt.toFixed(0)})`}
                            {pStatus === 'Partial' && `Paid ₹${paidAmt.toFixed(0)} / Due ₹${dueAmt.toFixed(0)}`}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenDispense(rx)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                      >
                        <Pill className="w-3.5 h-3.5" /> Process & Dispense
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Process & Dispense */}
      {dispenseModalOpen && selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" /> Prescription Dispensing Console — {selectedRx.prescriptionNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient: <strong className="text-slate-800">{selectedRx.patientName} ({selectedRx.patientUhid})</strong> • Doctor: <strong>{selectedRx.doctorName}</strong>
                </p>
              </div>
              <button onClick={() => setDispenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">Dispense Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {selectedRx.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedRx.status === 'Pending' && (
                  <button
                    onClick={handleVerify}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" /> Verify Prescription
                  </button>
                )}

                <button
                  onClick={handleDispenseAll}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Select All Dispense
                </button>

                <button
                  onClick={handlePrintBill}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Bill
                </button>
              </div>
            </div>

            {/* Payment & Billing Collection Panel */}
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600" /> Payment & Billing Collection
                </h4>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Prescription Amount</span>
                  <span className="text-base font-black text-purple-700">₹{modalTotalBill.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Payment Status *</label>
                  <select
                    value={selectedRx.paymentStatus || 'Paid'}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      const total = modalTotalBill;
                      let paid = selectedRx.amountPaid ?? total;
                      let due = selectedRx.dueAmount ?? 0;
                      if (newStatus === 'Paid') {
                        paid = total;
                        due = 0;
                      } else if (newStatus === 'Due' || newStatus === 'Unpaid') {
                        paid = 0;
                        due = total;
                      }
                      setSelectedRx((prev) => (prev ? { ...prev, paymentStatus: newStatus, amountPaid: paid, dueAmount: due } : prev));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Paid">Paid (Collected Full)</option>
                    <option value="Due">Due / Unpaid</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="IPD Credit / Post Bill">IPD Room Credit (Post Bill)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Payment Method</label>
                  <select
                    value={selectedRx.paymentMethod || 'Cash'}
                    onChange={(e) => {
                      const method = e.target.value as any;
                      setSelectedRx((prev) => (prev ? { ...prev, paymentMethod: method } : prev));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="IPD Credit / Post Bill">IPD Account Credit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Amount Collected (₹)</label>
                  <input
                    type="number"
                    value={selectedRx.amountPaid ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const total = modalTotalBill;
                      const due = Math.max(0, total - val);
                      const pStatus = val >= total ? 'Paid' : val > 0 ? 'Partial' : 'Due';
                      setSelectedRx((prev) => (prev ? { ...prev, amountPaid: val, dueAmount: due, paymentStatus: pStatus } : prev));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Balance Due (₹)</label>
                  <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-rose-600 flex items-center">
                    ₹{(selectedRx.dueAmount ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Medicines List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Dispense</th>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Dosage Schedule</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Instructions</th>
                    <th className="p-3">Price</th>
                    <th className="p-3 text-center">Label</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedRx.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={item.dispensed}
                          onChange={() => handleToggleItemDispensed(item.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.medicineName}</td>
                      <td className="p-3 font-extrabold text-indigo-700">{item.batchNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{item.quantity} units</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className={`px-1.5 py-0.5 rounded ${item.morning ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>M</span>
                          <span className={`px-1.5 py-0.5 rounded ${item.afternoon ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'}`}>A</span>
                          <span className={`px-1.5 py-0.5 rounded ${item.night ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-400'}`}>N</span>
                          <span className="text-slate-500 ml-1">({item.dosage})</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">{item.days} days</td>
                      <td className="p-3 text-slate-600">{item.instructions}</td>
                      <td className="p-3 font-bold text-emerald-700">₹{item.price.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenLabel(item)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          Label
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDispenseModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close Console
              </button>
              <button
                onClick={handleSubmitDispensing}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Submit & Update Dispensing + Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Medicine Label Preview */}
      {labelModalOpen && activeLabelItem && selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" /> Medicine Label Preview
              </h3>
              <button onClick={() => setLabelModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 space-y-2 font-mono text-[11px]">
              <p className="font-black text-center text-xs uppercase text-slate-900">AegisCare Hospital Pharmacy</p>
              <div className="border-t border-slate-200 pt-1">
                <p><strong>Patient:</strong> {selectedRx.patientName}</p>
                <p><strong>UHID:</strong> {selectedRx.patientUhid}</p>
                <p><strong>Date:</strong> {selectedRx.visitDate}</p>
              </div>
              <div className="border-t border-slate-200 pt-1 font-bold text-emerald-900">
                <p className="text-xs">{activeLabelItem.medicineName}</p>
                <p>Batch: {activeLabelItem.batchNumber} | Qty: {activeLabelItem.quantity}</p>
              </div>
              <div className="border-t border-slate-200 pt-1">
                <p><strong>Schedule:</strong> {activeLabelItem.morning ? '1' : '0'} - {activeLabelItem.afternoon ? '1' : '0'} - {activeLabelItem.night ? '1' : '0'}</p>
                <p><strong>Instructions:</strong> {activeLabelItem.instructions}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                  setLabelModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
              >
                Print Sticker Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
