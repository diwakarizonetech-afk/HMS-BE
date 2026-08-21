import React, { useEffect, useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
  confirmRazorpayTestPaymentApi,
  createRazorpayCheckoutOrderApi,
  createRazorpayQrPaymentApi,
  syncRazorpayPaymentApi,
  verifyRazorpayCheckoutPaymentApi,
} from '../../../services/api';
import { PaymentMode } from '../../../types/billing';
import {
  CreditCard,
  Search,
  CheckCircle2,
  QrCode,
  Loader2,
  ExternalLink,
  XCircle,
  Receipt,
  Printer,
  User,
  Clock,
  DollarSign,
} from 'lucide-react';

type PaymentHistoryFilter = 'All' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cash';

export const PaymentCollectionPage: React.FC = () => {
  const { bills, collections, collectPayment, refreshBillingData, setSelectedReceiptForModal } = useBilling();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [selectedBillNo, setSelectedBillNo] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [amountInput, setAmountInput] = useState<number>(0);
  const [txRef, setTxRef] = useState('');
  const [notes, setNotes] = useState('');
  const [qrTransaction, setQrTransaction] = useState<any>(null);
  const [qrStatus, setQrStatus] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [cashConfirmPayload, setCashConfirmPayload] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState<PaymentHistoryFilter>('All');

  const loadRazorpayCheckout = () =>
    new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const selectedBill = bills.find((b) => b.bill_number === selectedBillNo);
  const pendingBills = bills.filter((b) => b.payment_status !== 'Paid' && b.payment_status !== 'Cancelled');
  const visibleCollections =
    historyFilter === 'All' ? collections : collections.filter((rc) => rc.payment_mode === historyFilter);
  const historyTabs: Array<{ id: PaymentHistoryFilter; label: string }> = [
    { id: 'All', label: 'All' },
    { id: 'UPI', label: 'UPI' },
    { id: 'Card', label: 'Debit/Credit' },
    { id: 'Bank Transfer', label: 'Bank' },
    { id: 'Cash', label: 'Cash' },
  ];
  const filteredPendingBills = billSearch.trim()
    ? pendingBills.filter((b) => {
        const query = billSearch.toLowerCase();
        return (
          b.bill_number.toLowerCase().includes(query) ||
          b.patient_name.toLowerCase().includes(query) ||
          b.uhid.toLowerCase().includes(query) ||
          (b.appointment_id || '').toLowerCase().includes(query)
        );
      })
    : [];

  const handleBillSelect = (billNo: string) => {
    setSelectedBillNo(billNo);
    const target = bills.find((b) => b.bill_number === billNo);
    if (target) {
      setAmountInput(target.pending_amount);
      setBillSearch(`${target.bill_number} - ${target.patient_name}`);
    }
  };

  useEffect(() => {
    const billNumber = searchParams.get('bill');
    if (!billNumber || selectedBillNo || bills.length === 0) return;

    const target = bills.find((b) => b.bill_number === billNumber && b.pending_amount > 0 && b.payment_status !== 'Cancelled');
    if (target) {
      handleBillSelect(target.bill_number);
      setQrStatus(`Outstanding due loaded for ${target.patient_name}.`);
    }
  }, [bills, searchParams, selectedBillNo]);

  const resetPaymentForm = () => {
    setSelectedBillNo('');
    setBillSearch('');
    setAmountInput(0);
    setTxRef('');
    setNotes('');
    setCashConfirmPayload(null);
  };

  const submitPaymentPayload = async (payload: any) => {
    setQrLoading(true);
    try {
      const newRc = await collectPayment(payload);
      setSelectedReceiptForModal(newRc);
      setQrStatus('Payment collected. Receipt is ready to print.');
      resetPaymentForm();
    } finally {
      setQrLoading(false);
    }
  };

  const buildPaymentPayload = () => {
    if (!selectedBill) return null;

    return {
      bill_id: selectedBill.id,
      bill_number: selectedBill.bill_number,
      patient_name: selectedBill.patient_name,
      uhid: selectedBill.uhid,
      service_type: selectedBill.bill_type,
      total_bill: selectedBill.net_amount,
      previously_paid: selectedBill.paid_amount,
      current_payment: amountInput,
      remaining_due: Math.max(0, selectedBill.pending_amount - amountInput),
      payment_mode: paymentMode,
      transaction_ref: txRef || undefined,
      payer_name: selectedBill.patient_name,
      payer_identifier: txRef || undefined,
      payment_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      collected_by: user?.name || '',
      branch: selectedBill.branch || user?.branch || '',
      notes,
    };
  };

  const handleStartQrPayment = async () => {
    if (!selectedBill) return;

    setQrLoading(true);
    setQrStatus('Creating Razorpay QR payment...');
    try {
      const tx = await createRazorpayQrPaymentApi({
        bill_number: selectedBill.bill_number,
        amount: amountInput,
        payment_mode: 'UPI',
        collected_by: user?.name || '',
        branch: selectedBill.branch || user?.branch || '',
        notes,
      });
      setQrTransaction(tx);
      setQrStatus(tx.provider_reference?.startsWith('mock_') ? 'Test QR ready. Use confirm button after scan simulation.' : 'Razorpay QR ready. Waiting for payment confirmation.');
    } catch (err: any) {
      setQrStatus(err?.message || 'Could not create Razorpay QR payment.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleConfirmQrPayment = async () => {
    if (!qrTransaction) return;

    setQrLoading(true);
    setQrStatus('Confirming QR payment...');
    try {
      const result = await confirmRazorpayTestPaymentApi(qrTransaction.id, {
        provider_payment_id: txRef || qrTransaction.provider_reference,
        collected_by: user?.name || '',
        notes: notes || 'Razorpay QR test payment confirmed',
      });
      await refreshBillingData();
      if (result.receipt) {
        setSelectedReceiptForModal(result.receipt);
      }
      setQrStatus('Payment successful. Receipt is ready to print.');
      setQrTransaction(null);
      resetPaymentForm();
    } catch (err: any) {
      setQrStatus(err?.message || 'Could not confirm QR payment.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleCheckRazorpayStatus = async () => {
    if (!qrTransaction) return;

    setQrLoading(true);
    setQrStatus('Checking Razorpay payment status...');
    try {
      const result = await syncRazorpayPaymentApi(qrTransaction.id);
      if (result.receipt) {
        await refreshBillingData();
        setSelectedReceiptForModal(result.receipt);
        setQrStatus('Razorpay payment captured. Receipt is ready to print.');
        setQrTransaction(null);
        resetPaymentForm();
      } else {
        setQrStatus('Payment not captured yet. Ask patient to complete UPI payment, then check again.');
      }
    } catch (err: any) {
      setQrStatus(err?.message || 'Could not check Razorpay payment status.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleRazorpayCardPayment = async () => {
    if (!selectedBill) return;

    setQrLoading(true);
    setQrStatus('Creating Razorpay checkout order...');
    try {
      const checkoutReady = await loadRazorpayCheckout();
      if (!checkoutReady) {
        setQrStatus('Could not load Razorpay Checkout. Please check internet connection.');
        return;
      }

      const order = await createRazorpayCheckoutOrderApi({
        bill_number: selectedBill.bill_number,
        amount: amountInput,
        payment_mode: 'Card',
        collected_by: user?.name || '',
        branch: selectedBill.branch || user?.branch || '',
        notes,
      });

      setQrStatus('Razorpay checkout opened. Complete test card payment.');
      const Razorpay = (window as any).Razorpay;
      const checkout = new Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: {
          name: selectedBill.patient_name,
        },
        notes: {
          bill_number: selectedBill.bill_number,
          uhid: selectedBill.uhid,
        },
        theme: {
          color: '#059669',
        },
        handler: async (response: any) => {
          setQrLoading(true);
          setQrStatus('Verifying Razorpay payment...');
          try {
            const result = await verifyRazorpayCheckoutPaymentApi({
              transaction_id: order.transaction.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              collected_by: user?.name || '',
              notes: notes || 'Razorpay card checkout payment verified',
            });
            await refreshBillingData();
            if (result.receipt) {
              setSelectedReceiptForModal(result.receipt);
            }
            setQrStatus(`Payment successful. Transaction ID: ${response.razorpay_payment_id}`);
            resetPaymentForm();
          } catch (err: any) {
            setQrStatus(err?.message || 'Payment verification failed.');
          } finally {
            setQrLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setQrStatus('Razorpay checkout closed before payment completion.');
            setQrLoading(false);
          },
        },
      });
      checkout.open();
    } catch (err: any) {
      setQrStatus(err?.message || 'Could not start Razorpay checkout payment.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) {
      alert('Please select a bill to collect payment against.');
      return;
    }
    if (amountInput <= 0) {
      alert('Please enter a positive payment amount.');
      return;
    }
    if (paymentMode === 'Bank Transfer' && !txRef.trim()) {
      alert('Please enter UTR / transaction reference before recording this payment.');
      return;
    }

    if (paymentMode === 'UPI') {
      await handleStartQrPayment();
      return;
    }
    if (paymentMode === 'Card') {
      await handleRazorpayCardPayment();
      return;
    }

    const payload = buildPaymentPayload();
    if (!payload) return;

    if (paymentMode === 'Cash') {
      setCashConfirmPayload(payload);
      setQrStatus('Confirm cash received before creating receipt.');
      return;
    }

    await submitPaymentPayload(payload);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hospital Payment Collection Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Receive cash, card, UPI, or bank transfer payments against patient bills and generate immediate official receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Payment Entry Form (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs self-start">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Process New Payment
          </h3>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {/* Bill Search */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Search Pending / Unpaid Bill</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={billSearch}
                  onChange={(e) => {
                    setBillSearch(e.target.value);
                    setSelectedBillNo('');
                    setAmountInput(0);
                  }}
                  placeholder="Search bill no, patient name, UHID, appointment ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                {filteredPendingBills.length > 0 && !selectedBill && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-20">
                    {filteredPendingBills.map((b) => (
                      <button
                        type="button"
                        key={b.bill_number}
                        onClick={() => handleBillSelect(b.bill_number)}
                        className="w-full text-left p-3 hover:bg-emerald-50/70 border-b border-slate-100 last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-extrabold text-blue-700 truncate">{b.bill_number}</p>
                            <p className="text-[10px] text-slate-600 font-bold truncate">
                              {b.patient_name} | {b.uhid}
                            </p>
                            {b.appointment_id && (
                              <p className="text-[10px] text-slate-400 truncate">Appt: {b.appointment_id}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">
                            Due Rs.{b.pending_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {billSearch.trim() && filteredPendingBills.length === 0 && !selectedBill && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-slate-500 font-bold z-20">
                    No pending bills found.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Bill Info Card */}
            {selectedBill && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedBill.patient_name} ({selectedBill.uhid})</p>
                <p className="text-slate-600">Total Net Bill: ₹{selectedBill.net_amount.toLocaleString('en-IN')}</p>
                <p className="text-slate-600">Previously Paid: ₹{selectedBill.paid_amount.toLocaleString('en-IN')}</p>
                <p className="font-extrabold text-rose-700">Outstanding Balance: ₹{selectedBill.pending_amount.toLocaleString('en-IN')}</p>
              </div>
            )}

            {/* Payment Mode */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e: any) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe QR</option>
                <option value="Card">Debit / Credit Card (Razorpay Test)</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
              </select>
            </div>

            {/* Amount Receiving */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Current Amount Being Received (₹)</label>
              <input
                type="number"
                min="1"
                max={selectedBill ? selectedBill.pending_amount : 999999}
                value={amountInput}
                onChange={(e) => setAmountInput(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-emerald-700 text-sm"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {paymentMode === 'UPI' || paymentMode === 'Card'
                  ? 'Transaction Ref (Auto after Razorpay payment)'
                  : 'Transaction Ref / Cheque / UTR No'}
              </label>
              <input
                type="text"
                placeholder={paymentMode === 'UPI' || paymentMode === 'Card' ? 'Leave empty. Razorpay payment id will be saved automatically.' : paymentMode === 'Bank Transfer' ? 'Required: UTR / bank reference no' : 'e.g. CASH-COUNTER-01'}
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              />
              {paymentMode === 'Card' && (
                <p className="mt-1 text-[10px] font-bold text-emerald-700">
                  Razorpay test checkout will open for debit/credit card payment.
                </p>
              )}
              {paymentMode === 'Bank Transfer' && (
                <p className="mt-1 text-[10px] font-bold text-amber-700">
                  This records an already approved bank payment. Bank gateway auto-collection needs provider integration.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={qrLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : paymentMode === 'UPI' ? <QrCode className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {paymentMode === 'UPI'
                ? 'Generate Razorpay QR'
                : paymentMode === 'Card'
                  ? 'Pay with Razorpay Test Card'
                  : paymentMode === 'Cash'
                    ? 'Collect Cash & Print Receipt'
                    : 'Record Approved Payment'}
            </button>
            {qrStatus && !qrTransaction && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">
                {qrStatus}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: History of Recent Payment Collections (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Today's Collected Receipts</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {collections.length} Receipts Issued
            </span>
          </div>

          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
            {historyTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all ${
                  historyFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Bill No</th>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Paid By</th>
                  <th className="px-4 py-3">Payment ID / VPA / Ref</th>
                  <th className="px-4 py-3 text-right">Amount Collected</th>
                  <th className="px-4 py-3 text-center">Payment Mode</th>
                  <th className="px-4 py-3">Collected By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visibleCollections.map((rc) => (
                  <tr key={rc.receipt_number} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-emerald-700">{rc.receipt_number}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">{rc.bill_number}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{rc.patient_name}</td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-slate-900">{rc.payer_name || rc.patient_name}</p>
                      {(rc.payer_contact || rc.payer_email) && (
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {[rc.payer_contact, rc.payer_email].filter(Boolean).join(' | ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-bold text-slate-700 truncate">{rc.gateway_payment_id || rc.transaction_ref || 'N/A'}</p>
                      {rc.payer_identifier && (
                        <p className="text-[10px] text-blue-700 font-bold truncate">{rc.payer_identifier}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-800 text-sm">
                      ₹{rc.current_payment.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">
                        {rc.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rc.collected_by}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReceiptForModal(rc)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer mx-auto"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleCollections.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-bold">
                      No payment history found for this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {qrTransaction && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Razorpay QR Payment
              </h3>
              <button
                type="button"
                onClick={() => {
                  setQrTransaction(null);
                  setQrStatus('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
              <p className="font-extrabold text-slate-900">{selectedBill.patient_name}</p>
              <p className="text-slate-600 font-semibold">
                {selectedBill.bill_number} | UHID: {selectedBill.uhid}
              </p>
              <p className="text-emerald-800 font-black mt-1">
                Pay Rs.{Number(qrTransaction.amount || amountInput).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {qrTransaction.qr_image_url ? (
                <img
                  src={qrTransaction.qr_image_url}
                  alt="Razorpay QR"
                  className="w-56 h-56 rounded-xl bg-white object-contain border border-slate-200"
                />
              ) : (
                <div className="w-56 h-56 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                  QR not available
                </div>
              )}
              {qrTransaction.qr_short_url && !qrTransaction.qr_short_url.startsWith('razorpay-test://') && (
                <a
                  href={qrTransaction.qr_short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                >
                  Open Razorpay payment link
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {qrStatus && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] font-bold text-blue-700">
                {qrStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setQrTransaction(null);
                  setQrStatus('');
                }}
                className="py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckRazorpayStatus}
                disabled={qrLoading}
                className="py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Check Status
              </button>
              <button
                type="button"
                onClick={handleConfirmQrPayment}
                disabled={qrLoading}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Test Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {cashConfirmPayload && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Confirm Cash Collection
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCashConfirmPayload(null);
                  setQrStatus('Cash payment was not confirmed; amount remains due.');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs space-y-1">
              <p className="font-extrabold text-slate-900">{selectedBill.patient_name}</p>
              <p className="text-slate-600 font-semibold">
                {selectedBill.bill_number} | UHID: {selectedBill.uhid}
              </p>
              <p className="text-emerald-800 font-black">
                Cash Received: Rs.{Number(cashConfirmPayload.current_payment || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800">
              Confirm only after physical cash is received at the counter.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCashConfirmPayload(null);
                  setQrStatus('Cash payment was not confirmed; amount remains due.');
                }}
                className="py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Keep Pending
              </button>
              <button
                type="button"
                onClick={() => submitPaymentPayload(cashConfirmPayload)}
                disabled={qrLoading}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Cash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
