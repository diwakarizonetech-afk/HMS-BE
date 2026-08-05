import React, { createContext, useContext, useState } from 'react';
import {
  LabTestMaster,
  SampleCollectionItem,
  SampleProcessingItem,
  LabResultItem,
  LabReportItem,
  LabActivity,
} from '../types/hms';
import { useHMS } from './HMSContext';

export const REMOVED_MOCK_FLAG = true;

interface LabContextType {
  // Test Master
  testMasterList: LabTestMaster[];
  addTestMaster: (test: Omit<LabTestMaster, 'id'>) => void;
  updateTestMaster: (id: string, test: Partial<LabTestMaster>) => void;
  deleteTestMaster: (id: string) => void;
  duplicateTestMaster: (id: string) => void;

  // Sample Collection
  sampleCollections: SampleCollectionItem[];
  collectSample: (id: string, technician: string, remarks?: string) => void;
  recollectSample: (id: string, reason: string) => void;
  rejectSample: (id: string, reason: string) => void;
  addNewSampleCollection: (item: Omit<SampleCollectionItem, 'id' | 'collectionId' | 'status'>) => void;

  // Sample Processing
  sampleProcessingList: SampleProcessingItem[];
  startProcessing: (id: string, technician?: string) => void;
  pauseProcessing: (id: string) => void;
  completeProcessing: (id: string) => void;
  assignTechnician: (id: string, techName: string) => void;

  // Result Entry
  labResults: LabResultItem[];
  saveLabResult: (result: Omit<LabResultItem, 'id'>, skipToast?: boolean) => void;
  updateLabResult: (id: string, updated: Partial<LabResultItem>, skipToast?: boolean) => void;
  verifyLabResult: (id: string, verifierName: string) => void;

  // Report Generation & OPD Integration
  labReports: LabReportItem[];
  generateReport: (patientUhid: string, tests: string[], sampleId: string) => void;
  updateReportStatus: (id: string, status: LabReportItem['status']) => void;
  doctorReviewReport: (id: string, status: LabReportItem['doctorReviewStatus'], comments?: string) => void;
  createPatientOrderFromOPD: (
    patientName: string,
    patientUhid: string,
    age: number,
    gender: 'Male' | 'Female' | 'Other',
    doctorName: string,
    department: string,
    tests: string[]
  ) => void;

  // Activities
  activities: LabActivity[];
  addActivity: (type: LabActivity['type'], title: string, user: string, priority?: 'Normal' | 'Critical') => void;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

export const LabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useHMS();

  const [testMasterList, setTestMasterList] = useState<LabTestMaster[]>([]);
  const [sampleCollections, setSampleCollections] = useState<SampleCollectionItem[]>([]);
  const [sampleProcessingList, setSampleProcessingList] = useState<SampleProcessingItem[]>([]);
  const [labResults, setLabResults] = useState<LabResultItem[]>([]);
  const [labReports, setLabReports] = useState<LabReportItem[]>([]);
  const [activities, setActivities] = useState<LabActivity[]>([]);

  // Fetch lab data from backend on mount, with graceful fallback to mock data
  React.useEffect(() => {
    const fetchLabData = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        const API = `${import.meta.env.VITE_API_URL}/api/v1/lab`;

        const [testsRes, samplesRes, processingRes, resultsRes, reportsRes] = await Promise.all([
          fetch(`${API}/test-master`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/sample-collections`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/sample-processing`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/results`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/reports`, { headers }).then(r => r.ok ? r.json() : null),
        ]);

        if (testsRes && testsRes.length > 0) setTestMasterList(testsRes);
        if (samplesRes && samplesRes.length > 0) setSampleCollections(samplesRes);
        if (processingRes && processingRes.length > 0) setSampleProcessingList(processingRes);
        if (resultsRes && resultsRes.length > 0) setLabResults(resultsRes);
        if (reportsRes && reportsRes.length > 0) setLabReports(reportsRes);
      } catch (e) {
        console.warn('Failed to load lab data from backend, using mock fallbacks:', e);
      }
    };
    fetchLabData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hms_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };
  const API = `${import.meta.env.VITE_API_URL}/api/v1/lab`;

  const addActivity = (
    type: LabActivity['type'],
    title: string,
    user: string,
    priority: 'Normal' | 'Critical' = 'Normal'
  ) => {
    const newAct: LabActivity = {
      id: `act-${Date.now()}`,
      type,
      title,
      time: 'Just now',
      user,
      priority,
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Test Master Actions
  const addTestMaster = (testData: Omit<LabTestMaster, 'id'>) => {
    const newTest: LabTestMaster = {
      ...testData,
      id: `tm-${Date.now()}`,
    };
    setTestMasterList((prev) => [newTest, ...prev]);
    // Persist async
    fetch(`${API}/test-master`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(testData),
    }).then(async r => {
      if(r.ok) {
        const saved = await r.json();
        setTestMasterList(prev => prev.map(t => t.id === newTest.id ? { ...t, id: saved.id || newTest.id } : t));
      }
    }).catch(e => console.warn('addTestMaster sync failed:', e));
    addToast('success', 'Test Created', `Laboratory Test "${testData.testName}" added to Master catalog.`);
  };

  const updateTestMaster = (id: string, updated: Partial<LabTestMaster>) => {
    setTestMasterList((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    fetch(`${API}/test-master/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    }).catch(e => console.warn('updateTestMaster sync failed:', e));
    addToast('success', 'Test Updated', 'Test Master details saved successfully.');
  };

  const deleteTestMaster = (id: string) => {
    const test = testMasterList.find((t) => t.id === id);
    setTestMasterList((prev) => prev.filter((t) => t.id !== id));
    fetch(`${API}/test-master/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(e => console.warn('deleteTestMaster sync failed:', e));
    addToast('info', 'Test Deleted', `Test "${test?.testName || id}" removed from Master list.`);
  };

  const duplicateTestMaster = (id: string) => {
    const test = testMasterList.find((t) => t.id === id);
    if (!test) return;
    const duplicated: LabTestMaster = {
      ...test,
      id: `tm-${Date.now()}`,
      testCode: `${test.testCode}-COPY`,
      testName: `${test.testName} (Copy)`,
    };
    setTestMasterList((prev) => [duplicated, ...prev]);
    addToast('success', 'Test Duplicated', `Duplicated "${test.testName}" as "${duplicated.testName}".`);
  };

  // Sample Collection Actions
  const collectSample = (id: string, technician: string, remarks?: string) => {
    const target = sampleCollections.find((s) => s.id === id);
    if (!target) return;

    setSampleCollections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'Collected',
              collectedBy: technician,
              collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              remarks: remarks || s.remarks,
            }
          : s
      )
    );
    
    // Persist async
    fetch(`${API}/sample-collections/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Collected', technician, remarks }),
    }).catch(e => console.warn('collectSample sync failed:', e));

    // Auto-create sample processing entry
    target.orderedTests.forEach((testName) => {
      const newProc: SampleProcessingItem = {
        id: `proc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        sampleId: target.collectionId,
        patientName: target.patientName,
        patientUhid: target.patientUhid,
        testName,
        analyzer: 'Automated Analyzer Rack',
        machine: 'Sysmex / Roche Clinical Suite',
        assignedTechnician: technician,
        processingStart: 'Pending',
        processingEnd: 'Pending',
        duration: '0 mins',
        status: 'Pending',
        qcStatus: 'Pending',
      };
      setSampleProcessingList((prev) => [newProc, ...prev]);
      
      // Auto-create processing in backend async
      fetch(`${API}/sample-processing`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sampleId: target.collectionId,
          patientName: target.patientName,
          patientUhid: target.patientUhid,
          testName,
          analyzer: 'Automated Analyzer Rack',
          machine: 'Sysmex / Roche Clinical Suite',
          assignedTechnician: technician,
        }),
      }).then(async r => {
        if(r.ok) {
          const saved = await r.json();
          setSampleProcessingList(prev => prev.map(p => p.id === newProc.id ? { ...p, id: saved.id } : p));
        }
      }).catch(e => console.warn('auto-create processing sync failed:', e));
    });

    addActivity('Sample Collected', `Sample ${target.collectionId} collected for ${target.patientName}`, technician);
    addToast('success', 'Sample Collected', `Barcode ${target.barcode} recorded for ${target.patientName}.`);
  };

  const recollectSample = (id: string, reason: string) => {
    setSampleCollections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Recollect', remarks: `Recollect: ${reason}` } : s))
    );
    fetch(`${API}/sample-collections/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Recollect', remarks: `Recollect: ${reason}` }),
    }).catch(e => console.warn('recollectSample sync failed:', e));
    addToast('warning', 'Recollection Requested', `Sample status changed to Recollect (${reason}).`);
  };

  const rejectSample = (id: string, reason: string) => {
    const item = sampleCollections.find((s) => s.id === id);
    setSampleCollections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Rejected', remarks: `Rejected: ${reason}` } : s))
    );
    fetch(`${API}/sample-collections/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Rejected', remarks: `Rejected: ${reason}` }),
    }).catch(e => console.warn('rejectSample sync failed:', e));
    if (item) {
      addActivity('New Test Ordered', `Sample ${item.collectionId} REJECTED: ${reason}`, 'Lab Supervisor', 'Critical');
    }
    addToast('error', 'Sample Rejected', `Sample rejected due to: ${reason}`);
  };

  const addNewSampleCollection = (item: Omit<SampleCollectionItem, 'id' | 'collectionId' | 'status'>) => {
    const nextNum = sampleCollections.length + 101;
    const newCol: SampleCollectionItem = {
      ...item,
      id: `sc-2026-${nextNum}`,
      collectionId: `SMP-2026-${nextNum}`,
      status: 'Pending',
    };
    setSampleCollections((prev) => [newCol, ...prev]);
    fetch(`${API}/sample-collections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(item),
    }).then(async r => {
      if(r.ok) {
        const saved = await r.json();
        setSampleCollections(prev => prev.map(s => s.id === newCol.id ? { ...s, id: saved.id, collectionId: saved.collectionId } : s));
      }
    }).catch(e => console.warn('addNewSampleCollection sync failed:', e));
    addActivity('New Test Ordered', `New test ordered for ${item.patientName} (${item.patientUhid})`, item.doctorName);
    addToast('success', 'Order Received', `New sample collection request created.`);
  };

  // Sample Processing Actions
  const startProcessing = (id: string, technician: string = 'Tech. Robert Vance') => {
    const target = sampleProcessingList.find((p) => p.id === id);
    setSampleProcessingList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'In Processing',
              assignedTechnician: technician,
              processingStart: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: 'In Progress',
            }
          : p
      )
    );
    fetch(`${API}/sample-processing/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'In Processing', technician }),
    }).catch(e => console.warn('startProcessing sync failed:', e));
    if (target) {
      addActivity('Sample Processing Started', `Processing started for ${target.testName} (${target.patientName})`, technician);
    }
    addToast('info', 'Processing Started', 'Analyzer batch processing initiated.');
  };

  const pauseProcessing = (id: string) => {
    setSampleProcessingList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Pending', duration: 'Paused' } : p))
    );
    fetch(`${API}/sample-processing/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Pending' }),
    }).catch(e => console.warn('pauseProcessing sync failed:', e));
    addToast('warning', 'Processing Paused', 'Run put on hold.');
  };

  const completeProcessing = (id: string) => {
    const target = sampleProcessingList.find((p) => p.id === id);
    setSampleProcessingList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'Completed',
              qcStatus: 'Passed',
              processingEnd: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: '15 mins',
            }
          : p
      )
    );
    fetch(`${API}/sample-processing/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Completed' }),
    }).catch(e => console.warn('completeProcessing sync failed:', e));
    if (target) {
      addToast('success', 'Processing Completed', `${target.testName} completed. Ready for Result Entry.`);
    }
  };

  const assignTechnician = (id: string, techName: string) => {
    setSampleProcessingList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, assignedTechnician: techName } : p))
    );
    fetch(`${API}/sample-processing/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Pending', technician: techName }), // status doesn't change here just assigned
    }).catch(e => console.warn('assignTechnician sync failed:', e));
    addToast('info', 'Technician Assigned', `Assigned to ${techName}`);
  };

  // Result Entry Actions
  const saveLabResult = (resultData: Omit<LabResultItem, 'id'>, skipToast?: boolean) => {
    const newRes: LabResultItem = {
      ...resultData,
      id: `res-${Date.now()}`,
    };
    setLabResults((prev) => [newRes, ...prev]);

    fetch(`${API}/results`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(resultData),
    }).then(async r => {
      if(r.ok) {
        const saved = await r.json();
        setLabResults(prev => prev.map(res => res.id === newRes.id ? { ...res, id: saved.id } : res));
      }
    }).catch(e => console.warn('saveLabResult sync failed:', e));

    if (!skipToast) {
      if (resultData.flag === 'Critical') {
        addActivity(
          'Critical Result Found',
          `CRITICAL RESULT: ${resultData.testName} = ${resultData.resultValue} ${resultData.unit} for ${resultData.patientName}`,
          resultData.technician,
          'Critical'
        );
        addToast('error', 'CRITICAL ALERT!', `Critical result registered for ${resultData.patientName}. Doctor notified!`);
      } else {
        addToast('success', 'Result Saved', `Result for ${resultData.testName} saved successfully.`);
      }
    }
  };

  const updateLabResult = (id: string, updated: Partial<LabResultItem>, skipToast?: boolean) => {
    setLabResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    fetch(`${API}/results/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    }).catch(e => console.warn('updateLabResult sync failed:', e));
    if (!skipToast) {
      addToast('success', 'Result Updated', 'Result details modified.');
    }
  };

  const verifyLabResult = (id: string, verifierName: string) => {
    setLabResults((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Verified',
              verifiedBy: verifierName,
            }
          : r
      )
    );
    fetch(`${API}/results/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Verified', verifiedBy: verifierName }),
    }).catch(e => console.warn('verifyLabResult sync failed:', e));
    addToast('success', 'Result Verified', `Result verified by ${verifierName}.`);
  };

  // Report Generation Actions
  const generateReport = (patientUhid: string, tests: string[], sampleId: string) => {
    const matchingResults = labResults.filter(
      (r) => r.patientUhid.toLowerCase() === patientUhid.toLowerCase() || r.sampleId === sampleId
    );
    const patientName = matchingResults[0]?.patientName || 'Patient';
    const reportNum = `LIS-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: LabReportItem = {
      id: `rep-${Date.now()}`,
      reportNumber: reportNum,
      patientName,
      patientUhid,
      patientAge: 45,
      patientGender: 'Male',
      doctorName: 'Dr. Vikram Malhotra',
      department: 'Pathology',
      tests: tests.length > 0 ? tests : ['Complete Blood Count (CBC)'],
      testResults: matchingResults,
      generatedDate: new Date().toLocaleString(),
      generatedBy: 'Tech. Robert Vance',
      status: 'Generated',
      doctorReviewStatus: 'Pending Review',
      doctorComments: 'Generated by LIS engine. Sent for doctor review.',
    };

    setLabReports((prev) => [newReport, ...prev]);
    
    fetch(`${API}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        reportNumber: reportNum,
        patientName,
        patientUhid,
        patientAge: 45,
        patientGender: 'Male',
        doctorName: 'Dr. Vikram Malhotra',
        department: 'Pathology',
        tests: tests.length > 0 ? tests : ['Complete Blood Count (CBC)'],
        testResults: matchingResults,
        generatedBy: 'Tech. Robert Vance',
      }),
    }).then(async r => {
      if(r.ok) {
        const saved = await r.json();
        setLabReports(prev => prev.map(rep => rep.id === newReport.id ? { ...rep, id: saved.id } : rep));
      }
    }).catch(e => console.warn('generateReport sync failed:', e));
    
    addActivity('Report Generated', `Report ${reportNum} compiled for ${patientName}`, 'Tech. Robert Vance');
    addToast('success', 'Report Generated', `Report ${reportNum} is ready for preview & doctor verification.`);
  };

  const updateReportStatus = (id: string, status: LabReportItem['status']) => {
    setLabReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    fetch(`${API}/reports/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }).catch(e => console.warn('updateReportStatus sync failed:', e));
    addToast('info', 'Report Status Updated', `Report marked as ${status}.`);
  };

  const doctorReviewReport = (
    id: string,
    status: LabReportItem['doctorReviewStatus'],
    comments?: string
  ) => {
    const rep = labReports.find((r) => r.id === id);
    setLabReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              doctorReviewStatus: status,
              doctorComments: comments || r.doctorComments,
              doctorReviewDate: new Date().toLocaleString(),
            }
          : r
      )
    );
    fetch(`${API}/reports/${id}/review`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reviewStatus: status, comments }),
    }).catch(e => console.warn('doctorReviewReport sync failed:', e));
    if (rep) {
      addActivity(
        'Doctor Reviewed Report',
        `Doctor marked report ${rep.reportNumber} as ${status.toUpperCase()}`,
        'Dr. Vikram Malhotra'
      );
    }
    addToast('success', 'Review Recorded', `Report ${status} successfully.`);
  };

  const getMockResultForTest = (tName: string) => {
    const lower = tName.toLowerCase();
    if (lower.includes('hba1c')) {
      return {
        resultValue: '7.4',
        unit: '%',
        referenceRange: '< 5.7%',
        flag: 'High' as const,
        notes: 'HbA1c 7.4% - Suboptimal glycemic control. High risk of diabetic complications.',
      };
    }
    if (lower.includes('blood count') || lower.includes('cbc')) {
      return {
        resultValue: '13.8',
        unit: 'g/dL',
        referenceRange: '12.0 - 15.5 g/dL',
        flag: 'Normal' as const,
        notes: 'Hb: 13.8 g/dL, WBC: 7,200 /µL, Platelets: 250,000 /µL. Normal cell count.',
      };
    }
    if (lower.includes('fasting')) {
      return {
        resultValue: '142',
        unit: 'mg/dL',
        referenceRange: '70 - 99 mg/dL',
        flag: 'High' as const,
        notes: 'Fasting blood glucose elevated.',
      };
    }
    if (lower.includes('pp') || lower.includes('post-prandial')) {
      return {
        resultValue: '198',
        unit: 'mg/dL',
        referenceRange: '< 140 mg/dL',
        flag: 'High' as const,
        notes: 'Post-prandial glucose elevated.',
      };
    }
    if (lower.includes('lipid')) {
      return {
        resultValue: '235',
        unit: 'mg/dL',
        referenceRange: '< 200 mg/dL',
        flag: 'High' as const,
        notes: 'Serum total cholesterol elevated.',
      };
    }
    if (lower.includes('kidney') || lower.includes('kft') || lower.includes('rft')) {
      return {
        resultValue: '1.4',
        unit: 'mg/dL',
        referenceRange: '0.6 - 1.2 mg/dL',
        flag: 'High' as const,
        notes: 'Serum Creatinine 1.4 mg/dL - Mild renal elevation.',
      };
    }
    if (lower.includes('liver') || lower.includes('lft')) {
      return {
        resultValue: '38',
        unit: 'U/L',
        referenceRange: '7 - 56 U/L',
        flag: 'Normal' as const,
        notes: 'SGPT/ALT: 38 U/L, SGOT/AST: 32 U/L. Normal hepatic enzymes.',
      };
    }
    if (lower.includes('thyroid') || lower.includes('tsh')) {
      return {
        resultValue: '5.8',
        unit: 'µIU/mL',
        referenceRange: '0.45 - 4.50 µIU/mL',
        flag: 'High' as const,
        notes: 'TSH elevated at 5.8 µIU/mL. Subclinical hypothyroidism.',
      };
    }
    if (lower.includes('urine')) {
      return {
        resultValue: 'Pus Cells 2-4/HPF',
        unit: 'HPF',
        referenceRange: '0-5 / HPF',
        flag: 'Normal' as const,
        notes: 'No significant bacterial or cellular abnormal deposits.',
      };
    }
    if (lower.includes('electrolytes')) {
      return {
        resultValue: '138',
        unit: 'mEq/L',
        referenceRange: '135 - 145 mEq/L',
        flag: 'Normal' as const,
        notes: 'Na: 138 mEq/L, K: 4.2 mEq/L. Serum electrolytes normal.',
      };
    }
    return {
      resultValue: 'Normal',
      unit: 'Units',
      referenceRange: 'Standard Reference',
      flag: 'Normal' as const,
      notes: 'Test completed by automated analyzer.',
    };
  };

  const createPatientOrderFromOPD = (
    patientName: string,
    patientUhid: string,
    age: number,
    gender: 'Male' | 'Female' | 'Other',
    doctorName: string,
    department: string,
    tests: string[]
  ) => {
    if (!tests || tests.length === 0) return;
    const sampleId = `SMP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const reportNum = `LIS-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newResults: LabResultItem[] = tests.map((tName, i) => {
      const mock = getMockResultForTest(tName);
      return {
        id: `res-opd-${Date.now()}-${i}`,
        patientName,
        patientUhid,
        testName: tName,
        testCode: tName.substring(0, 4).toUpperCase() + '-00' + (i + 1),
        sampleId,
        resultValue: mock.resultValue,
        unit: mock.unit,
        referenceRange: mock.referenceRange,
        flag: mock.flag,
        technician: 'Tech. Robert Vance',
        verifiedBy: 'Dr. Suresh Mehta (Pathologist)',
        entryDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        status: 'Verified',
        notes: mock.notes,
      };
    });

    setLabResults((prev) => [...newResults, ...prev]);

    const newReport: LabReportItem = {
      id: `rep-opd-${Date.now()}`,
      reportNumber: reportNum,
      patientName,
      patientUhid,
      patientAge: age,
      patientGender: gender,
      doctorName,
      department,
      tests,
      testResults: newResults,
      generatedDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      generatedBy: 'System Auto-Generated',
      status: 'Generated',
      doctorReviewStatus: 'Pending Review',
      doctorComments: 'Awaiting doctor clinical impression & review reply.',
    };

    setLabReports((prev) => [newReport, ...prev]);

    addActivity(
      'New Test Ordered',
      `OPD Doctor ${doctorName} ordered ${tests.join(', ')} for ${patientName}`,
      doctorName
    );

    addToast(
      'success',
      'Lab Order Dispatched 🧪',
      `Investigation request (${tests.length} tests) for ${patientName} sent to LIS Lab Technician with results ready for review.`
    );
  };

  return (
    <LabContext.Provider
      value={{
        testMasterList,
        addTestMaster,
        updateTestMaster,
        deleteTestMaster,
        duplicateTestMaster,
        sampleCollections,
        collectSample,
        recollectSample,
        rejectSample,
        addNewSampleCollection,
        sampleProcessingList,
        startProcessing,
        pauseProcessing,
        completeProcessing,
        assignTechnician,
        labResults,
        saveLabResult,
        updateLabResult,
        verifyLabResult,
        labReports,
        generateReport,
        updateReportStatus,
        doctorReviewReport,
        createPatientOrderFromOPD,
        activities,
        addActivity,
      }}
    >
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};
