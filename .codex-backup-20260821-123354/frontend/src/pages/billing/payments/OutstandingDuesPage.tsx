import React, { useState } from 'react';
import { useBilling } from '../../../context/BillingContext';
import { useHMS } from '../../../context/HMSContext';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Search,
  Filter,
  CreditCard,
  Eye,
  Send,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const OutstandingDuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { bills, setSelectedBillForModal } = useBilling();
  const { patients } = useHMS();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [reminderBill, setReminderBill] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [reminderStatus, setReminderStatus] = useState('');

  const outstandingBills = bills.filter((b) => {
    const isUnpaid = b.pending_amount > 0 && b.payment_status !== 'Cancelled';
    const matchesSearch =
      !search.trim() ||
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      b.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      b.uhid.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || b.bill_type === filterType;

    return isUnpaid && matchesSearch && matchesType;
  });

  const totalOutstandingSum = outstandingBills.reduce((acc, b) => acc + b.pending_amount, 0);

  const buildReminderMessage = (bill: any) =>
    [
      `Dear ${bill.patient_name},`,
      '',
      `This is a payment reminder from AegisCare HMS for your pending hospital bill ${bill.bill_number}.`,
      `Outstanding amount: Rs.${bill.pending_amount.toLocaleString('en-IN')}`,
      `Total bill: Rs.${bill.net_amount.toLocaleString('en-IN')}`,
      `Paid amount: Rs.${bill.paid_amount.toLocaleString('en-IN')}`,
      '',
      'Please clear the pending balance at the billing counter or contact the hospital billing desk for assistance.',
      '',
      'Regards,',
      'AegisCare HMS Billing Team',
    ].join('\n');

  const handleOpenReminder = (bill: any) => {
    const patient = patients.find((p: any) => p.uhid === bill.uhid || p.id === bill.patient_id);
    const email = patient?.email || '';

    setReminderBill(bill);
    setRecipientEmail(email);
    setEmailSubject(`Payment Reminder - ${bill.bill_number}`);
    setEmailMessage(buildReminderMessage(bill));
    setReminderStatus('');
  };

  const handleSendReminder = () => {
    if (!reminderBill) return;
    if (!recipientEmail.trim()) {
      setReminderStatus('Please enter patient email address.');
      return;
    }

    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailMessage)}`;
    window.location.href = mailtoUrl;
    setReminderStatus(`Payment reminder email prepared for ${reminderBill.patient_name}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Outstanding & Pending Patient Dues</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track uncollected balances, send payment reminders, and initiate direct payment collection.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
          <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Total Pending Dues</p>
          <p className="text-lg font-black text-rose-600">₹{totalOutstandingSum.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pending bills by patient, UHID, bill no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Filter Category:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="OPD">OPD</option>
            <option value="IPD">IPD</option>
            <option value="Lab">Lab</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Procedure">Procedure</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Unpaid Bills Count: <span className="text-slate-900 font-extrabold">{outstandingBills.length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Bill Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">UHID</th>
                <th className="px-4 py-3">Bill Category</th>
                <th className="px-4 py-3">Bill Date</th>
                <th className="px-4 py-3 text-right">Total Net Bill</th>
                <th className="px-4 py-3 text-right">Paid Amount</th>
                <th className="px-4 py-3 text-right">Outstanding Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {outstandingBills.map((bill) => (
                <tr key={bill.id || bill.bill_number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-extrabold text-blue-700">{bill.bill_number}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{bill.patient_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-semibold">{bill.uhid}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                      {bill.bill_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{bill.bill_date}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    ₹{bill.net_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                    ₹{bill.paid_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                    ₹{bill.pending_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => navigate(`/billing/payments?bill=${encodeURIComponent(bill.bill_number)}`)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Collect
                      </button>
                      <button
                        onClick={() => setSelectedBillForModal(bill)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                        title="View Bill"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenReminder(bill)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md cursor-pointer"
                        title="Send Email Reminder"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {reminderBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-600" />
                Send Payment Reminder
              </h3>
              <button
                type="button"
                onClick={() => setReminderBill(null)}
                className="text-slate-400 hover:text-slate-700 font-black"
              >
                X
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs">
              <p className="font-extrabold text-slate-900">{reminderBill.patient_name}</p>
              <p className="text-slate-600 font-semibold">
                {reminderBill.bill_number} | UHID: {reminderBill.uhid}
              </p>
              <p className="text-rose-700 font-black mt-1">
                Outstanding: Rs.{reminderBill.pending_amount.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Patient Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Message</label>
                <textarea
                  rows={8}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              {reminderStatus && (
                <div
                  className={`rounded-xl px-3 py-2 font-bold ${
                    reminderStatus.startsWith('Please')
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}
                >
                  {reminderStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderBill(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
