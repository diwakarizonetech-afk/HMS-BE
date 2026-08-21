import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../../../context/BillingContext';
import { useHMS } from '../../../context/HMSContext';
import { useAuth } from '../../../context/AuthContext';
import {
  confirmRazorpayTestPaymentApi,
  createRazorpayCheckoutOrderApi,
  createRazorpayQrPaymentApi,
  fetchAppointmentsApi,
  fetchConsultationsApi,
  fetchLabReportsApi,
  fetchLabResultsApi,
  fetchLabSampleCollectionsApi,
  fetchVitalsApi,
  syncRazorpayPaymentApi,
  verifyRazorpayCheckoutPaymentApi,
} from '../../../services/api';
import { Bill, BillItem, BillType, PaymentMode } from '../../../types/billing';
import {
  PlusCircle,
  Trash2,
  Search,
  User,
  CheckCircle2,
  FileText,
  Percent,
  Calculator,
  ArrowLeft,
  Building2,
  Stethoscope,
  QrCode,
  Loader2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

const createEmptyBillItem = (): BillItem => ({
  service_name: '',
  category: 'General',
  description: '',
  quantity: 1,
  unit_price: 0,
  gross_amount: 0,
  discount: 0,
  tax: 0,
  net_amount: 0,
});

export const CreateBillPage: React.FC = () => {
  const navigate = useNavigate();
  const { createNewBill, collectPayment, refreshBillingData, setSelectedReceiptForModal } = useBilling();
  const { patients, appointments, doctors } = useHMS();
  const { user } = useAuth();

  // Patient Search & Selection
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Form Fields
  const [billType, setBillType] = useState<BillType>('OPD');
  const [department, setDepartment] = useState('General OPD');
  const [doctorName, setDoctorName] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [ipdNumber, setIpdNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [labAutoStatus, setLabAutoStatus] = useState('');
  const [createdBillForPayment, setCreatedBillForPayment] = useState<Bill | null>(null);
  const [qrTransaction, setQrTransaction] = useState<any>(null);
  const [cashConfirmBill, setCashConfirmBill] = useState<Bill | null>(null);

  // Line Items
  const [items, setItems] = useState<BillItem[]>([createEmptyBillItem()]);

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

  const findLatestPatientAppointment = (patient: any) => {
    const patientUhid = String(patient?.uhid || '').toLowerCase();
    if (!patientUhid) return null;

    const activeMatches = appointments
      .filter((apt) => {
        const aptUhid = String(apt.patientUhid || '').toLowerCase();
        const status = String(apt.status || '').toLowerCase();
        return aptUhid === patientUhid && status !== 'cancelled';
      })
      .sort((a, b) => {
        const aTime = Date.parse(`${a.date || a.createdDate || ''} ${a.timeSlot || ''}`) || 0;
        const bTime = Date.parse(`${b.date || b.createdDate || ''} ${b.timeSlot || ''}`) || 0;
        return bTime - aTime;
      });

    return activeMatches[0] || null;
  };

  const sameText = (value: any) => String(value || '').trim().toLowerCase();

  const createServiceItem = (serviceName: string, category: string, description = ''): BillItem => ({
    service_name: serviceName,
    category,
    description,
    quantity: 1,
    unit_price: 0,
    gross_amount: 0,
    discount: 0,
    tax: 0,
    net_amount: 0,
  });

  const testNamesFromLabRow = (row: any): string[] => {
    const directNames = [row?.testName, row?.test_name, row?.serviceName, row?.service_name, row?.name].filter(Boolean);
    const orderedTests = Array.isArray(row?.orderedTests) ? row.orderedTests : Array.isArray(row?.ordered_tests) ? row.ordered_tests : [];
    const reportTests = Array.isArray(row?.tests) ? row.tests : [];
    const resultTests = Array.isArray(row?.testResults)
      ? row.testResults.map((test: any) => test?.testName || test?.test_name || test?.name).filter(Boolean)
      : [];
    return [...directNames, ...orderedTests, ...reportTests, ...resultTests]
      .map((name) => String(name || '').trim())
      .filter(Boolean);
  };

  const buildLabBillItems = (rows: any[]): BillItem[] => {
    const seen = new Set<string>();
    const billItems: BillItem[] = [];

    rows.forEach((row) => {
      const sourceId = row?.reportNumber || row?.report_number || row?.collectionId || row?.collection_id || row?.sampleId || row?.sample_id || '';
      const sourceLabel = row?.reportNumber || row?.report_number ? 'Lab report' : row?.collectionId || row?.collection_id ? 'Lab sample order' : 'Lab result';
      testNamesFromLabRow(row).forEach((testName) => {
        const key = sameText(testName);
        if (!key || seen.has(key)) return;
        seen.add(key);
        billItems.push(createServiceItem(testName, 'Lab', `${sourceLabel}${sourceId ? ` ${sourceId}` : ''}`));
      });
    });

    return billItems;
  };

  const medicineNameFromItem = (item: any) => {
    if (typeof item === 'string') return item;
    return item?.medicineName || item?.medicine_name || item?.drugName || item?.drug_name || item?.name || item?.itemName || item?.item_name || '';
  };

  const procedureNamesFromRow = (row: any): string[] => {
    const record = row?.record || row || {};
    const rawGroups = [
      record.procedures,
      record.orderedProcedures,
      record.ordered_procedures,
      record.diagnosticOrders,
      record.diagnostic_orders,
      record.investigationRequests,
      record.investigation_requests,
      row?.procedures,
    ];
    return rawGroups
      .flatMap((group) => Array.isArray(group) ? group : typeof group === 'string' ? group.split(',') : [])
      .map((item: any) => typeof item === 'string' ? item : item?.procedureName || item?.procedure_name || item?.name || item?.testName || item?.test_name || '')
      .map((name: string) => String(name || '').trim())
      .filter(Boolean);
  };

  const applyAutoLoadedItems = (autoItems: BillItem[], message: string) => {
    if (autoItems.length === 0) {
      setLabAutoStatus('No linked services found for this patient and category.');
      setItems([createEmptyBillItem()]);
      return;
    }

    const seen = new Set<string>();
    const uniqueItems = autoItems.filter((item) => {
      const key = `${sameText(item.category)}:${sameText(item.service_name)}`;
      if (!item.service_name.trim() || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setItems(uniqueItems.length > 0 ? uniqueItems : [createEmptyBillItem()]);
    setLabAutoStatus(`${uniqueItems.length} ${message} loaded. Enter unit price before generating the bill.`);
  };

  const autoLoadPatientBillServices = async (patient: any, targetBillType: BillType) => {
    const patientUhid = String(patient?.uhid || '').trim();
    if (!patientUhid) {
      setLabAutoStatus('');
      return;
    }

    setLabAutoStatus(`Checking linked ${targetBillType} services...`);
    try {
      const branch = patient?.branch || user?.branch || undefined;
      const patientKey = sameText(patientUhid);
      const history = await fetchPatientHistoryApi(patientUhid).catch(() => null);

      if (targetBillType === 'Lab') {
        const [reports, results, sampleCollections] = await Promise.all([
          fetchLabReportsApi(patientUhid, branch),
          fetchLabResultsApi(patientUhid, branch),
          fetchLabSampleCollectionsApi(branch),
        ]);
        const matchedSamples = (sampleCollections || []).filter(
          (row: any) => sameText(row.patientUhid || row.patient_uhid || row.uhid) === patientKey
        );
        const labRows = [...(reports || []), ...(results || []), ...matchedSamples, ...(history?.labReports || [])];
        const labDepartment = labRows.find((row: any) => row?.department)?.department || '';
        const labDoctor = labRows.find((row: any) => row?.doctorName || row?.doctor_name);
        if (labDoctor?.doctorName || labDoctor?.doctor_name) setDoctorName((prev) => prev || labDoctor.doctorName || labDoctor.doctor_name);
        if (labDepartment) setDepartment((prev) => (prev && prev !== 'General OPD' ? prev : labDepartment));
        applyAutoLoadedItems(buildLabBillItems(labRows), 'lab service');
        return;
      }

      if (targetBillType === 'OPD') {
        const appointmentRows = history?.appointments?.length ? history.appointments : await fetchAppointmentsApi('all', patientUhid);
        const latestAppointment = [...(appointmentRows || [])]
          .filter((apt: any) => String(apt.status || '').toLowerCase() !== 'cancelled')
          .sort((a: any, b: any) => (Date.parse(`${b.date || b.createdDate || ''} ${b.timeSlot || ''}`) || 0) - (Date.parse(`${a.date || a.createdDate || ''} ${a.timeSlot || ''}`) || 0))[0];
        if (latestAppointment) {
          setDoctorName(latestAppointment.doctorName || latestAppointment.doctor_name || '');
          setAppointmentId(latestAppointment.id || '');
          setDepartment(latestAppointment.department || 'General OPD');
        }
        applyAutoLoadedItems([
          createServiceItem(
            latestAppointment?.doctorName || latestAppointment?.doctor_name
              ? `OPD Consultation - ${latestAppointment.doctorName || latestAppointment.doctor_name}`
              : 'OPD Consultation',
            'OPD',
            latestAppointment?.id ? `Appointment ${latestAppointment.id}` : 'Patient OPD consultation'
          ),
        ], 'OPD service');
        return;
      }

      if (targetBillType === 'IPD') {
        const admissionRows = history?.admissions?.length ? history.admissions : await fetchIpdAdmissionsApi(branch, patientUhid);
        const activeAdmissions = (admissionRows || []).filter((adm: any) => !['discharged', 'cancelled'].includes(sameText(adm.status)));
        const source = activeAdmissions.length ? activeAdmissions : admissionRows || [];
        const latestAdmission = source[0];
        if (latestAdmission) {
          setIpdNumber(latestAdmission.id || '');
          setDoctorName(latestAdmission.attendingDoctor || latestAdmission.attending_doctor || doctorName);
          setDepartment(latestAdmission.ward || latestAdmission.department || 'IPD');
        }
        applyAutoLoadedItems(
          source.flatMap((adm: any) => [
            createServiceItem(`IPD Admission - ${adm.ward || 'Ward'}`, 'IPD', adm.id ? `Admission ${adm.id}` : 'Inpatient admission'),
            createServiceItem(`Room / Bed Charge - ${adm.bedNumber || adm.bed_number || adm.roomNumber || adm.room_number || 'Bed'}`, 'IPD', adm.admissionDate || adm.admission_date || ''),
          ]),
          'IPD service'
        );
        return;
      }

      if (targetBillType === 'Pharmacy') {
        const prescriptionRows = history?.prescriptions?.length
          ? history.prescriptions
          : (await fetchPrescriptionsApi(branch)).filter((rx: any) => sameText(rx.patientUhid || rx.patient_uhid || rx.uhid) === patientKey);
        const pharmacyItems = (prescriptionRows || []).flatMap((rx: any) => {
          const meds = rx.items || rx.medicines || rx.prescriptionItems || rx.prescription_items || [];
          if (!Array.isArray(meds) || meds.length === 0) return [createServiceItem(`Prescription Medicines - ${rx.prescriptionNumber || rx.prescription_number || ''}`.trim(), 'Pharmacy', rx.doctorName || rx.doctor_name || '')];
          return meds.map((med: any) => createServiceItem(medicineNameFromItem(med), 'Pharmacy', rx.prescriptionNumber || rx.prescription_number || 'Prescription'));
        });
        const latestRx = prescriptionRows?.[0];
        if (latestRx?.doctorName || latestRx?.doctor_name) setDoctorName(latestRx.doctorName || latestRx.doctor_name);
        if (latestRx?.department) setDepartment(latestRx.department);
        applyAutoLoadedItems(pharmacyItems, 'pharmacy service');
        return;
      }

      if (targetBillType === 'Procedure') {
        const consultations = await fetchConsultationsApi().catch(() => []);
        const patientConsultations = (consultations || []).filter(
          (row: any) => sameText(row.patientUhid || row.patient_uhid || row.uhid) === patientKey
        );
        const erEncounters = (await fetchEREncountersApi(branch).catch(() => [])).filter(
          (row: any) => sameText(row.patient_uhid || row.patientUhid || row.uhid) === patientKey
        );
        const erProcedureRows = (await Promise.all(
          erEncounters.map((enc: any) => fetchERProceduresApi(enc.id).catch(() => []))
        )).flat();
        const names = [...patientConsultations, ...erProcedureRows].flatMap(procedureNamesFromRow);
        applyAutoLoadedItems(names.map((name) => createServiceItem(name, 'Procedure', 'Doctor advised procedure / diagnostic')), 'procedure service');
        return;
      }

      applyAutoLoadedItems([createServiceItem('Other Hospital Service', 'Other', 'Manual billing service')], 'service');
    } catch (err) {
      console.warn('Failed to auto-load bill services:', err);
      setLabAutoStatus('Could not load linked services now. You can still add services manually.');
    }
  };
  const handlePatientSelect = async (patient: any) => {
    const matchedAppointment = findLatestPatientAppointment(patient);

    setSelectedPatient(patient);
    setPatientSearch('');
    setLabAutoStatus('');
    setDoctorName(matchedAppointment?.doctorName || '');
    setAppointmentId(matchedAppointment?.id || '');
    setDepartment(matchedAppointment?.department || 'General OPD');

    if (!matchedAppointment && patient?.uhid) {
      try {
        const patientAppointments = await fetchAppointmentsApi('all', patient.uhid);
        const latestAppointment = patientAppointments
          .filter((apt) => String(apt.status || '').toLowerCase() !== 'cancelled')
          .sort((a, b) => {
            const aTime = Date.parse(`${a.date || a.createdDate || ''} ${a.timeSlot || ''}`) || 0;
            const bTime = Date.parse(`${b.date || b.createdDate || ''} ${b.timeSlot || ''}`) || 0;
            return bTime - aTime;
          })[0];

        if (latestAppointment) {
          setDoctorName(latestAppointment.doctorName || '');
          setAppointmentId(latestAppointment.id || '');
          setDepartment(latestAppointment.department || 'General OPD');
        }
      } catch (err) {
        console.warn('Failed to auto-fill appointment details for billing:', err);
      }
    }

    if (!matchedAppointment && patient?.uhid) {
      try {
        const consultations = await fetchConsultationsApi();
        const latestConsultation = consultations.find(
          (row: any) => String(row.patientUhid || row.patient_uhid || '').toLowerCase() === String(patient.uhid).toLowerCase()
        );

        if (latestConsultation) {
          const doctor = doctors.find((d) => d.id === latestConsultation.doctorId || d.id === latestConsultation.doctor_id);
          setAppointmentId(latestConsultation.appointmentId || latestConsultation.appointment_id || '');
          if (doctor?.name) setDoctorName(doctor.name);
          if (doctor?.department) setDepartment(doctor.department);
        }
      } catch (err) {
        console.warn('Failed to auto-fill consultation details for billing:', err);
      }
    }

    if (!matchedAppointment && patient?.uhid) {
      try {
        const vitals = await fetchVitalsApi(patient.uhid);
        const latestVital = Array.isArray(vitals) ? vitals[0] : null;
        const vitalDoctorName = latestVital?.doctor_name || latestVital?.doctorName || latestVital?.recorded_by || latestVital?.recordedBy;
        if (vitalDoctorName) setDoctorName(vitalDoctorName);
      } catch (err) {
        console.warn('Failed to auto-fill doctor from vitals for billing:', err);
      }
    }

    await autoLoadPatientBillServices(patient, billType);
  };

  const handlePatientChange = () => {
    setSelectedPatient(null);
    setDoctorName('');
    setAppointmentId('');
    setDepartment('General OPD');
    setLabAutoStatus('');
  };

  const filteredPatients = patientSearch.trim()
    ? patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.lastName.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.uhid.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.mobile.includes(patientSearch)
      )
    : [];

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyBillItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? [createEmptyBillItem()] : prev.filter((_, idx) => idx !== index)));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, [field]: value };
          const qty = Number(updated.quantity) || 1;
          const rate = Number(updated.unit_price) || 0;
          const disc = Number(updated.discount) || 0;
          const tax = Number(updated.tax) || 0;
          const gross = qty * rate;
          const net = Math.max(0, gross - disc + tax);
          return {
            ...updated,
            gross_amount: gross,
            net_amount: net,
          };
        }
        return item;
      })
    );
  };

  const totalGross = items.reduce((acc, item) => acc + (item.gross_amount || 0), 0);
  const totalDiscount = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  const totalTax = items.reduce((acc, item) => acc + (item.tax || 0), 0);
  const totalNet = Math.max(0, totalGross - totalDiscount + totalTax);
  const cappedInitialPayment = Math.min(initialPayment, totalNet);
  const pendingAmount = Math.max(0, totalNet - cappedInitialPayment);

  useEffect(() => {
    if (initialPayment > totalNet) {
      setInitialPayment(totalNet);
    }
  }, [initialPayment, totalNet]);

  const buildPaymentPayload = (bill: Bill, ref?: string) => ({
    bill_id: bill.id,
    bill_number: bill.bill_number,
    patient_name: bill.patient_name,
    uhid: bill.uhid,
    service_type: bill.bill_type,
    total_bill: bill.net_amount,
    previously_paid: bill.paid_amount,
    current_payment: cappedInitialPayment,
    remaining_due: Math.max(0, bill.pending_amount - cappedInitialPayment),
    payment_mode: paymentMode,
    transaction_ref: ref || transactionRef || undefined,
    payment_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    payer_name: bill.patient_name,
    payer_identifier: ref || transactionRef || undefined,
    collected_by: user?.name || '',
    branch: bill.branch || user?.branch || '',
    notes: notes || 'Initial payment collected during bill creation',
  });

  const resetBillForm = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setDoctorName('');
    setAppointmentId('');
    setDepartment('General OPD');
    setIpdNumber('');
    setPaymentMode('Cash');
    setInitialPayment(0);
    setTransactionRef('');
    setNotes('');
    setItems([createEmptyBillItem()]);
    setLabAutoStatus('');
    setCreatedBillForPayment(null);
    setQrTransaction(null);
    setCashConfirmBill(null);
  };

  const collectInitialManualPayment = async (bill: Bill, ref?: string) => {
    setPaymentLoading(true);
    try {
      const receipt = await collectPayment(buildPaymentPayload(bill, ref) as any);
      setSelectedReceiptForModal(receipt);
      setPaymentStatus('Payment collected. Receipt is ready to print.');
      resetBillForm();
    } finally {
      setPaymentLoading(false);
    }
  };

  const startInitialQrPayment = async (bill: Bill) => {
    setPaymentLoading(true);
    setPaymentStatus('Creating Razorpay QR for the new bill...');
    try {
      const tx = await createRazorpayQrPaymentApi({
        bill_number: bill.bill_number,
        amount: cappedInitialPayment,
        payment_mode: 'UPI',
        collected_by: user?.name || '',
        branch: bill.branch || user?.branch || '',
        notes,
      });
      setCreatedBillForPayment(bill);
      setQrTransaction(tx);
      setPaymentStatus(tx.provider_reference?.startsWith('mock_') ? 'Test QR ready. Use confirm button after scan simulation.' : 'Razorpay QR ready. Waiting for payment confirmation.');
    } catch (err: any) {
      setPaymentStatus(err?.message || 'Could not create Razorpay QR payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const confirmInitialQrPayment = async () => {
    if (!qrTransaction || !createdBillForPayment) return;

    setPaymentLoading(true);
    setPaymentStatus('Confirming QR payment...');
    try {
      const result = await confirmRazorpayTestPaymentApi(qrTransaction.id, {
        provider_payment_id: transactionRef || qrTransaction.provider_reference,
        collected_by: user?.name || '',
        notes: notes || 'Razorpay QR test payment confirmed during bill creation',
      });
      await refreshBillingData();
      if (result.receipt) setSelectedReceiptForModal(result.receipt);
      setPaymentStatus('Payment successful. Receipt is ready to print.');
      resetBillForm();
    } catch (err: any) {
      setPaymentStatus(err?.message || 'Could not confirm QR payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkInitialQrPayment = async () => {
    if (!qrTransaction) return;

    setPaymentLoading(true);
    setPaymentStatus('Checking Razorpay payment status...');
    try {
      const result = await syncRazorpayPaymentApi(qrTransaction.id);
      if (result.receipt) {
        await refreshBillingData();
        setSelectedReceiptForModal(result.receipt);
        setPaymentStatus('Razorpay payment captured. Receipt is ready to print.');
        resetBillForm();
      } else {
        setPaymentStatus('Payment not captured yet. Complete UPI payment, then check again.');
      }
    } catch (err: any) {
      setPaymentStatus(err?.message || 'Could not check Razorpay payment status.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const startInitialCardPayment = async (bill: Bill) => {
    setPaymentLoading(true);
    setPaymentStatus('Creating Razorpay checkout order...');
    try {
      const checkoutReady = await loadRazorpayCheckout();
      if (!checkoutReady) {
        setPaymentStatus('Could not load Razorpay Checkout. Please check internet connection.');
        return;
      }
      const order = await createRazorpayCheckoutOrderApi({
        bill_number: bill.bill_number,
        amount: cappedInitialPayment,
        payment_mode: 'Card',
        collected_by: user?.name || '',
        branch: bill.branch || user?.branch || '',
        notes,
      });
      const Razorpay = (window as any).Razorpay;
      const checkout = new Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: { name: bill.patient_name },
        notes: { bill_number: bill.bill_number, uhid: bill.uhid },
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          setPaymentLoading(true);
          setPaymentStatus('Verifying Razorpay payment...');
          try {
            const result = await verifyRazorpayCheckoutPaymentApi({
              transaction_id: order.transaction.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              collected_by: user?.name || '',
              notes: notes || 'Razorpay checkout initial payment verified',
            });
            await refreshBillingData();
            if (result.receipt) setSelectedReceiptForModal(result.receipt);
            setPaymentStatus(`Payment successful. Transaction ID: ${response.razorpay_payment_id}`);
            resetBillForm();
          } catch (err: any) {
            setPaymentStatus(err?.message || 'Payment verification failed.');
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('Razorpay checkout closed before payment completion. Bill remains pending.');
            setPaymentLoading(false);
          },
        },
      });
      checkout.open();
    } catch (err: any) {
      setPaymentStatus(err?.message || 'Could not start Razorpay checkout payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!selectedPatient) {
      alert('Please search and select a patient to generate the bill.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one billable line item.');
      return;
    }
    if (totalNet <= 0) {
      alert('Please enter a billable item amount before generating the bill.');
      return;
    }
    if (initialPayment > totalNet) {
      alert('Initial payment cannot exceed the grand total net amount.');
      setInitialPayment(totalNet);
      return;
    }
    if (cappedInitialPayment > 0 && paymentMode === 'Bank Transfer' && !transactionRef.trim()) {
      alert('Please enter UTR / bank transaction reference for bank transfer payment.');
      return;
    }

    const payload = {
      patient_id: selectedPatient.id,
      patient_name: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      uhid: selectedPatient.uhid,
      appointment_id: appointmentId || undefined,
      ipd_number: ipdNumber || undefined,
      bill_type: billType,
      department,
      doctor_name: doctorName,
      gross_amount: totalGross,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      net_amount: totalNet,
      paid_amount: 0,
      pending_amount: totalNet,
      payment_mode: cappedInitialPayment > 0 ? paymentMode : 'Cash',
      payment_status: 'Pending',
      bill_date: new Date().toISOString().split('T')[0],
      billing_staff: user?.name || '',
      branch: selectedPatient.branch || user?.branch || '',
      notes,
      items,
    };

    try {
      setPaymentLoading(true);
      setPaymentStatus('Creating bill...');
      const bill = await createNewBill(payload as any);

      if (cappedInitialPayment <= 0) {
        setPaymentStatus('Bill generated with pending due.');
        resetBillForm();
        navigate('/billing/invoices');
        return;
      }

      if (paymentMode === 'UPI') {
        await startInitialQrPayment(bill);
        return;
      }
      if (paymentMode === 'Card') {
        await startInitialCardPayment(bill);
        return;
      }

      if (paymentMode === 'Cash') {
        setCashConfirmBill(bill);
        setPaymentStatus('Bill generated. Confirm cash received before creating receipt.');
        return;
      }

      await collectInitialManualPayment(bill, transactionRef);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate bill. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Create New Hospital Bill</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select patient, specify bill category, add service items, and calculate totals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/billing/invoices')}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateBill}
            disabled={paymentLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {cappedInitialPayment > 0 ? 'Generate Bill & Collect Payment' : 'Generate Bill'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Search & Metadata (1 col) */}
        <div className="space-y-6">
          {/* Patient Lookup Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Patient Selection
            </h3>

            {/* Patient Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Patient Name, UHID, Mobile..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {filteredPatients.length > 0 && !selectedPatient && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-20">
                  {filteredPatients.map((p) => {
                    const patientAppointment = findLatestPatientAppointment(p);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePatientSelect(p)}
                        className="w-full text-left p-3 hover:bg-blue-50/60 border-b border-slate-100 text-xs cursor-pointer"
                      >
                        <p className="font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                        <p className="text-[10px] text-slate-500">UHID: {p.uhid} | {p.mobile}</p>
                        {patientAppointment && (
                          <p className="text-[10px] text-blue-700 font-bold mt-0.5">
                            {patientAppointment.doctorName} | Appt: {patientAppointment.id}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Patient Banner */}
            {selectedPatient ? (
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </span>
                  <button
                    onClick={handlePatientChange}
                    className="text-[10px] text-blue-600 underline font-bold"
                  >
                    Change
                  </button>
                </div>
                <p className="text-slate-600 font-medium">
                  UHID: <span className="font-bold text-blue-700">{selectedPatient.uhid}</span>
                </p>
                <p className="text-slate-600 font-medium">Gender/Age: {selectedPatient.gender}, {selectedPatient.age}y</p>
                <p className="text-slate-600 font-medium">Mobile: {selectedPatient.mobile}</p>
                <div className="mt-2 rounded-lg border border-blue-100 bg-white/70 p-2 space-y-1">
                  <p className="text-slate-600 font-medium">
                    Consulting Doctor: <span className="font-bold text-slate-900">{doctorName || 'No linked appointment found'}</span>
                  </p>
                  <p className="text-slate-600 font-medium">
                    Appointment ID: <span className="font-bold text-blue-700">{appointmentId || 'N/A'}</span>
                  </p>
                </div>
                {labAutoStatus && (
                  <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                    {labAutoStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                Please search and select a registered patient to attach to this financial bill.
              </div>
            )}
          </div>

          {/* Bill Category & Department Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Bill Metadata & Type
            </h3>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bill Service Category</label>
                <select
                  value={billType}
                  onChange={(e: any) => {
                    const nextBillType = e.target.value as BillType;
                    setBillType(nextBillType);
                    setItems([createEmptyBillItem()]);
                    if (selectedPatient) autoLoadPatientBillServices(selectedPatient, nextBillType);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="OPD">OPD Consultation Billing</option>
                  <option value="IPD">IPD Admission Billing</option>
                  <option value="Lab">Laboratory Test Billing</option>
                  <option value="Pharmacy">Pharmacy Sales Billing</option>
                  <option value="Procedure">Procedure / Diagnostic Billing</option>
                  <option value="Other">Other Billable Hospital Service</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hospital Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Consulting Doctor</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              {billType === 'OPD' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Appointment ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. APT-2026-001"
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
              )}

              {billType === 'IPD' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">IPD Admission No (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. IPD-2026-088"
                    value={ipdNumber}
                    onChange={(e) => setIpdNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Line Items & Calculation Summary (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Billable Items Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Billable Line Items</h3>
                {labAutoStatus && selectedPatient && (
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">{labAutoStatus}</p>
                )}
              </div>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Service Name</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Unit Price (₹)</th>
                    <th className="px-3 py-2.5 text-right">Discount (₹)</th>
                    <th className="px-3 py-2.5 text-right">Net Amount (₹)</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="e.g. ECG Test / Consultation / Room Charge"
                          value={item.service_name}
                          onChange={(e) => handleItemChange(index, 'service_name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-2 text-right font-bold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                          className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-2 text-right font-bold text-emerald-600"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-black text-slate-900 text-sm">
                        ₹{item.net_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
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

          {/* Payment Collection & Calculation Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              Bill Summary & Payment Collection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Payment Details Form */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e: any) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                  >
                    <option value="Cash">Cash Collection</option>
                    <option value="UPI">UPI / GPay / PhonePe QR</option>
                    <option value="Card">Debit / Credit Card (Razorpay Test)</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Payment Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalNet}
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Math.min(Number(e.target.value), totalNet))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {paymentMode === 'UPI' || paymentMode === 'Card'
                      ? 'Transaction Ref (Auto after Razorpay payment)'
                      : 'Transaction Ref / Cheque / UTR No'}
                  </label>
                  <input
                    type="text"
                    placeholder={paymentMode === 'UPI' || paymentMode === 'Card' ? 'Leave empty. Razorpay payment id will be saved automatically.' : paymentMode === 'Bank Transfer' ? 'Required for bank transfer' : 'Optional cash counter reference'}
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                  {paymentMode === 'Card' && (
                    <p className="mt-1 text-[10px] font-bold text-emerald-700">
                      Razorpay test checkout will open after bill generation.
                    </p>
                  )}
                  {paymentMode === 'UPI' && (
                    <p className="mt-1 text-[10px] font-bold text-blue-700">
                      QR payment applies only to this newly generated pending bill.
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Billing Notes / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Enter any billing concessions or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
                {paymentStatus && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">
                    {paymentStatus}
                  </div>
                )}
              </div>

              {/* Calculation Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Gross Amount:</span>
                  <span className="font-bold text-slate-800">₹{totalGross.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-bold">- ₹{totalDiscount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tax:</span>
                  <span className="font-bold">₹{totalTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2">
                  <span>Grand Total Net Amount:</span>
                  <span className="text-blue-700">₹{totalNet.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-100/70 p-2 rounded-lg">
                  <span>Amount Collected Now:</span>
                  <span>₹{cappedInitialPayment.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold bg-rose-100/70 p-2 rounded-lg">
                  <span>Balance Outstanding Due:</span>
                  <span>₹{pendingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {qrTransaction && createdBillForPayment && (
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
                  setCreatedBillForPayment(null);
                  setPaymentStatus('Bill generated. QR payment was cancelled; amount remains due.');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
              <p className="font-extrabold text-slate-900">{createdBillForPayment.patient_name}</p>
              <p className="text-slate-600 font-semibold">
                {createdBillForPayment.bill_number} | UHID: {createdBillForPayment.uhid}
              </p>
              <p className="text-emerald-800 font-black mt-1">
                Pay Rs.{Number(qrTransaction.amount || cappedInitialPayment).toLocaleString('en-IN')}
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

            {paymentStatus && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] font-bold text-blue-700">
                {paymentStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setQrTransaction(null);
                  setCreatedBillForPayment(null);
                  setPaymentStatus('Bill generated. QR payment was cancelled; amount remains due.');
                }}
                className="py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={checkInitialQrPayment}
                disabled={paymentLoading}
                className="py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Check Status
              </button>
              <button
                type="button"
                onClick={confirmInitialQrPayment}
                disabled={paymentLoading}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Test
              </button>
            </div>
          </div>
        </div>
      )}

      {cashConfirmBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Confirm Cash Collection
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCashConfirmBill(null);
                  setPaymentStatus('Bill generated. Cash payment was not confirmed; amount remains due.');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs space-y-1">
              <p className="font-extrabold text-slate-900">{cashConfirmBill.patient_name}</p>
              <p className="text-slate-600 font-semibold">
                {cashConfirmBill.bill_number} | UHID: {cashConfirmBill.uhid}
              </p>
              <p className="text-emerald-800 font-black">
                Cash Received: Rs.{cappedInitialPayment.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800">
              Confirm only after physical cash is received at the counter.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCashConfirmBill(null);
                  setPaymentStatus('Bill generated. Cash payment was not confirmed; amount remains due.');
                }}
                className="py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Keep Pending
              </button>
              <button
                type="button"
                onClick={() => collectInitialManualPayment(cashConfirmBill)}
                disabled={paymentLoading}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Cash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
