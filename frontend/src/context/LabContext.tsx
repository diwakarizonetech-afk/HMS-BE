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
import { createOpdLabOrderApi } from '../services/api';

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
  updateLabReport: (id: string, updated: Partial<LabReportItem>) => Promise<void>;
  doctorReviewReport: (id: string, status: LabReportItem['doctorReviewStatus'], comments?: string) => void;
  createPatientOrderFromOPD: (
    patientName: string,
    patientUhid: string,
    age: number,
    gender: 'Male' | 'Female' | 'Other',
    doctorName: string,
    department: string,
    tests: string[]
  ) => Promise<void>;

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
        if (!token) return;
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
        const API = rawApiUrl.endsWith('/api/v1') ? `${rawApiUrl}/lab` : `${rawApiUrl}/api/v1/lab`;

        let userBranch: string | undefined = undefined;
        try {
          const u = JSON.parse(localStorage.getItem('hms_user') || '{}');
          const role = (u.role || '').toLowerCase().replace('userrole.', '').trim();
          if (role !== 'super_admin' && role !== 'admin') {
            userBranch = u.branch;
          }
        } catch {}
        const branchParam = userBranch ? `?branch=${encodeURIComponent(userBranch)}` : '';

        const [testsRes, samplesRes, processingRes, resultsRes, reportsRes] = await Promise.all([
          fetch(`${API}/test-master`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/sample-collections${branchParam}`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/sample-processing${branchParam}`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/results${branchParam}`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API}/reports${branchParam}`, { headers }).then(r => r.ok ? r.json() : null),
        ]);

        if (testsRes && Array.isArray(testsRes)) setTestMasterList(testsRes);
        if (samplesRes && Array.isArray(samplesRes)) setSampleCollections(samplesRes);
        if (processingRes && Array.isArray(processingRes)) setSampleProcessingList(processingRes);
        if (resultsRes && Array.isArray(resultsRes)) setLabResults(resultsRes);
        if (reportsRes && Array.isArray(reportsRes)) setLabReports(reportsRes);
      } catch (e) {
        console.warn('Failed to load lab data from backend API:', e);
      }
    };
    fetchLabData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hms_token');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    };
  };
  const getLabApiUrl = () => {
    const raw = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    return `${raw}/api/v1/lab`;
  };
  const API = getLabApiUrl();

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
    }).catch(e => { console.warn('addTestMaster sync failed:', e); addToast('error', 'Sync Failed', 'Adding the lab test failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    addToast('success', 'Test Created', `Laboratory Test "${testData.testName}" added to Master catalog.`);
  };

  const updateTestMaster = (id: string, updated: Partial<LabTestMaster>) => {
    setTestMasterList((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    fetch(`${API}/test-master/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updated),
    }).catch(e => { console.warn('updateTestMaster sync failed:', e); addToast('error', 'Sync Failed', 'Updating the lab test failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    addToast('success', 'Test Updated', 'Test Master details saved successfully.');
  };

  const deleteTestMaster = (id: string) => {
    const test = testMasterList.find((t) => t.id === id);
    setTestMasterList((prev) => prev.filter((t) => t.id !== id));
    fetch(`${API}/test-master/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(e => { console.warn('deleteTestMaster sync failed:', e); addToast('error', 'Sync Failed', 'Deleting the lab test failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('collectSample sync failed:', e); addToast('error', 'Sync Failed', 'Recording sample collection failed to save to the server. Please retry -- your on-screen change may not persist.'); });

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
      }).catch(e => { console.warn('auto-create processing sync failed:', e); addToast('error', 'Sync Failed', 'Creating the processing record failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('recollectSample sync failed:', e); addToast('error', 'Sync Failed', 'Requesting sample recollection failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('rejectSample sync failed:', e); addToast('error', 'Sync Failed', 'Rejecting the sample failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('addNewSampleCollection sync failed:', e); addToast('error', 'Sync Failed', 'Saving the new sample collection failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('startProcessing sync failed:', e); addToast('error', 'Sync Failed', 'Starting sample processing failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('pauseProcessing sync failed:', e); addToast('error', 'Sync Failed', 'Pausing sample processing failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('completeProcessing sync failed:', e); addToast('error', 'Sync Failed', 'Completing sample processing failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('assignTechnician sync failed:', e); addToast('error', 'Sync Failed', 'Assigning the technician failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('saveLabResult sync failed:', e); addToast('error', 'Sync Failed', 'Saving the lab result failed to save to the server. Please retry -- your on-screen change may not persist.'); });

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
    }).catch(e => { console.warn('updateLabResult sync failed:', e); addToast('error', 'Sync Failed', 'Updating the lab result failed to save to the server. Please retry -- your on-screen change may not persist.'); });
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
    }).catch(e => { console.warn('verifyLabResult sync failed:', e); addToast('error', 'Sync Failed', 'Verifying the lab result failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    addToast('success', 'Result Verified', `Result verified by ${verifierName}.`);
  };

  // Report Generation Actions
  const generateReport = (patientUhid: string, tests: string[], sampleId: string) => {
    const matchingResults = labResults.filter(
      (r) => r.patientUhid.toLowerCase() === patientUhid.toLowerCase() || r.sampleId === sampleId
    );
    const firstRes = matchingResults[0];
    const patientName = firstRes?.patientName || 'OPD Patient';
    const doctorName = firstRes?.verifiedBy || 'Attending Doctor';
    const department = firstRes?.testName ? (testMasterList.find(m => m.testName === firstRes.testName)?.department || 'Pathology') : 'Pathology';
    const reportNum = `LIS-REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: LabReportItem = {
      id: `rep-${Date.now()}`,
      reportNumber: reportNum,
      patientName,
      patientUhid,
      patientAge: 30,
      patientGender: 'Male',
      doctorName,
      department,
      tests: tests.length > 0 ? tests : ['Routine Lab Test'],
      testResults: matchingResults,
      generatedDate: new Date().toLocaleString(),
      generatedBy: 'Lab Technician',
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
        patientAge: 30,
        patientGender: 'Male',
        doctorName,
        department,
        tests: tests.length > 0 ? tests : ['Routine Lab Test'],
        testResults: matchingResults,
        generatedBy: 'Lab Technician',
      }),
    }).then(async r => {
      if(r.ok) {
        const saved = await r.json();
        setLabReports(prev => prev.map(rep => rep.id === newReport.id ? { ...rep, id: saved.id } : rep));
      }
    }).catch(e => { console.warn('generateReport sync failed:', e); addToast('error', 'Sync Failed', 'Generating the report failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    
    addActivity('Report Generated', `Report ${reportNum} compiled for ${patientName}`, 'Lab Technician');
    addToast('success', 'Report Generated', `Report ${reportNum} is ready for preview & doctor verification.`);
  };

  const updateReportStatus = (id: string, status: LabReportItem['status']) => {
    setLabReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    fetch(`${API}/reports/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }).catch(e => { console.warn('updateReportStatus sync failed:', e); addToast('error', 'Sync Failed', 'Updating the report status failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    addToast('info', 'Report Status Updated', `Report marked as ${status}.`);
  };

  const updateLabReport = async (id: string, updatedFields: Partial<LabReportItem>) => {
    setLabReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updatedFields } : r))
    );

    try {
      const payload: any = {};
      if (updatedFields.testResults !== undefined) payload.testResults = updatedFields.testResults;
      if (updatedFields.doctorComments !== undefined) payload.doctorComments = updatedFields.doctorComments;
      if (updatedFields.status !== undefined) payload.status = updatedFields.status;
      if (updatedFields.doctorReviewStatus !== undefined) payload.doctorReviewStatus = updatedFields.doctorReviewStatus;
      if (updatedFields.tests !== undefined) payload.tests = updatedFields.tests;

      const res = await fetch(`${API}/reports/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setLabReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...saved } : r)));
      }
    } catch (e) {
      console.warn('updateLabReport sync failed:', e);
    }
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
    }).catch(e => { console.warn('doctorReviewReport sync failed:', e); addToast('error', 'Sync Failed', 'Saving the doctor review failed to save to the server. Please retry -- your on-screen change may not persist.'); });
    if (rep) {
      addActivity(
        'Doctor Reviewed Report',
        `Doctor marked report ${rep.reportNumber} as ${status.toUpperCase()}`,
        'Dr. Vikram Malhotra'
      );
    }
    addToast('success', 'Review Recorded', `Report ${status} successfully.`);
  };

  const createPatientOrderFromOPD = async (
    patientName: string,
    patientUhid: string,
    age: number,
    gender: 'Male' | 'Female' | 'Other',
    doctorName: string,
    department: string,
    tests: string[]
  ) => {
    if (!tests || tests.length === 0) return;

    try {
      // Places a real, pending sample-collection order via the backend --
      // this used to fabricate a complete "Verified" fake report locally
      // (and the backend endpoint itself used to do the same thing server
      // side) instead of actually entering the real Sample Collection ->
      // Processing -> Result Entry -> Doctor Review pipeline. See
      // backend/app/routers/lab.py's create_opd_order for the fix.
      const created = await createOpdLabOrderApi({
        patientName,
        patientUhid,
        age,
        gender,
        doctorName,
        department,
        tests,
      });

      const newCollection: SampleCollectionItem = {
        id: created.id,
        collectionId: created.collectionId,
        patientUhid: created.patientUhid,
        patientName: created.patientName,
        age: created.age,
        gender: created.gender,
        doctorName: created.doctorName,
        department: created.department,
        orderedTests: created.orderedTests || tests,
        sampleType: created.sampleType,
        container: created.container,
        barcode: created.barcode,
        collectionDate: created.collectionDate || '',
        collectionTime: created.collectionTime || '',
        collectedBy: created.collectedBy || '',
        priority: created.priority || 'Normal',
        status: created.status || 'Pending',
        remarks: created.remarks,
      };
      setSampleCollections((prev) => [newCollection, ...prev]);

      // Generate corresponding LabReport for Doctor Report Verification Console & OPD preview
      const reportNum = `LIS-REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const testResults: LabResultItem[] = tests.map((tName, idx) => {
        const master = testMasterList.find((m) => m.testName.toLowerCase().trim() === tName.toLowerCase().trim());
        const labRes = labResults.find((lr) => lr.testName.toLowerCase().trim() === tName.toLowerCase().trim());
        return {
          id: `tr-${Date.now()}-${idx}`,
          patientName: patientName || 'OPD Patient',
          patientUhid: patientUhid || 'UHID-2026-9999',
          testName: tName,
          testCode: master?.testCode || 'LAB-TEST',
          category: master?.category || 'Biochemistry',
          sampleId: created.collectionId || created.id || `SMP-${Date.now()}`,
          resultValue: labRes?.resultValue || '',
          unit: master?.unit || labRes?.unit || 'mg/dL',
          referenceRange: master?.normalRange || master?.criticalRange || labRes?.referenceRange || '70 - 140',
          flag: (labRes?.flag as any) || 'Normal',
          technician: labRes?.technician || doctorName || 'Lab Technician',
          verifiedBy: labRes?.verifiedBy || 'Pending Verification',
          entryDate: labRes?.entryDate || new Date().toISOString().split('T')[0],
          status: labRes?.status || 'Pending',
        };
      });

      const newReport: LabReportItem = {
        id: `rep-opd-${Date.now()}`,
        reportNumber: reportNum,
        patientName: patientName || 'OPD Patient',
        patientUhid: patientUhid || 'UHID-2026-9999',
        patientAge: age || 30,
        patientGender: gender || 'Male',
        doctorName: doctorName || 'Attending Doctor',
        department: department || 'OPD',
        tests: tests.length > 0 ? tests : ['Routine Lab Test'],
        testResults,
        generatedDate: new Date().toLocaleString(),
        generatedBy: doctorName || 'OPD Doctor Request',
        status: 'Generated',
        doctorReviewStatus: 'Pending Review',
        doctorComments: 'Investigation request submitted from OPD Doctor Consultation.',
      };

      setLabReports((prev) => [newReport, ...prev]);

      fetch(`${API}/reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reportNumber: reportNum,
          patientName: patientName || 'OPD Patient',
          patientUhid: patientUhid || 'UHID-2026-9999',
          patientAge: age || 30,
          patientGender: gender || 'Male',
          doctorName: doctorName || 'Attending Doctor',
          department: department || 'OPD',
          tests: tests.length > 0 ? tests : ['Routine Lab Test'],
          testResults,
          generatedBy: doctorName || 'OPD Doctor Request',
          status: 'Generated',
          doctorReviewStatus: 'Pending Review',
          doctorComments: 'Investigation request submitted from OPD Doctor Consultation.',
        }),
      })
        .then(async (r) => {
          if (r.ok) {
            const saved = await r.json();
            setLabReports((prev) =>
              prev.map((rep) => (rep.id === newReport.id ? { ...rep, id: saved.id } : rep))
            );
          }
        })
        .catch((e) => console.warn('OPD LabReport sync failed:', e));

      addActivity(
        'New Test Ordered',
        `OPD Doctor ${doctorName} ordered ${tests.join(', ')} for ${patientName}`,
        doctorName
      );

      addToast(
        'success',
        'Lab Order Sent 🧪',
        `Investigation request (${tests.length} tests) for ${patientName} sent to Lab Sample Collection & Doctor Review console.`
      );
    } catch (err) {
      console.error('createPatientOrderFromOPD failed:', err);
      addToast('error', 'Lab Order Failed', 'Could not send the lab order to the server. Please try again.');
      throw err;
    }
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
        updateLabReport,
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
