export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

export function generateUHID(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `UHID-2026-${randomDigits}`;
}

export function generateTokenNumber(currentCount: number): string {
  const num = currentCount + 101;
  return `TK-${num}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getCurrentDateFormatted(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function parsePrescriptionDurationDays(durStr: string | number | undefined | null): number {
  if (!durStr) return 5;
  const str = String(durStr).toLowerCase().trim();
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    if (str.includes('ongoing') || str.includes('continuous')) return 30;
    return 5;
  }
  const val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0) return 5;

  if (str.includes('month') || str.includes('mth') || str.includes('mon')) {
    return Math.round(val * 30);
  }
  if (str.includes('week') || str.includes('wk')) {
    return Math.round(val * 7);
  }
  if (str.includes('year') || str.includes('yr')) {
    return Math.round(val * 365);
  }
  return Math.round(val);
}

export function parsePrescriptionFrequency(freqStr?: string, dosStr?: string) {
  const combined = (String(freqStr || '') + ' ' + String(dosStr || '')).toLowerCase().trim();

  // 4-dash match: e.g. 1-1-1-1
  const dash4Match = combined.match(/(\d+)\s*[-:\s]\s*(\d+)\s*[-:\s]\s*(\d+)\s*[-:\s]\s*(\d+)/);
  if (dash4Match) {
    const m = parseInt(dash4Match[1], 10) || 0;
    const a = parseInt(dash4Match[2], 10) || 0;
    const e = parseInt(dash4Match[3], 10) || 0;
    const n = parseInt(dash4Match[4], 10) || 0;
    const total = m + a + e + n;
    return {
      morning: m > 0,
      afternoon: a > 0 || e > 0,
      night: n > 0,
      dosesPerDay: total || 4,
    };
  }

  // 3-dash match: e.g. 1-0-1 or 1-1-1
  const dash3Match = combined.match(/(\d+)\s*[-:\s]\s*(\d+)\s*[-:\s]\s*(\d+)/);
  if (dash3Match) {
    const m = parseInt(dash3Match[1], 10) || 0;
    const a = parseInt(dash3Match[2], 10) || 0;
    const n = parseInt(dash3Match[3], 10) || 0;
    const total = m + a + n;
    return {
      morning: m > 0,
      afternoon: a > 0,
      night: n > 0,
      dosesPerDay: total || 2,
    };
  }

  // 2-dash match: e.g. 1-1
  const dash2Match = combined.match(/(\d+)\s*[-:\s]\s*(\d+)/);
  if (dash2Match) {
    const m = parseInt(dash2Match[1], 10) || 0;
    const n = parseInt(dash2Match[2], 10) || 0;
    return {
      morning: m > 0,
      afternoon: false,
      night: n > 0,
      dosesPerDay: m + n || 2,
    };
  }

  if (combined.includes('q4h') || combined.includes('every 4 hour') || combined.includes('every 4 hr')) {
    return { morning: true, afternoon: true, night: true, dosesPerDay: 6 };
  }
  if (combined.includes('q6h') || combined.includes('every 6 hour') || combined.includes('every 6 hr') || combined.includes('qid') || combined.includes('qds') || combined.includes('four times') || combined.includes('4 times')) {
    return { morning: true, afternoon: true, night: true, dosesPerDay: 4 };
  }
  if (combined.includes('q8h') || combined.includes('every 8 hour') || combined.includes('every 8 hr') || combined.includes('tds') || combined.includes('tid') || combined.includes('three times') || combined.includes('thrice') || combined.includes('1-1-1') || combined.includes('man')) {
    return { morning: true, afternoon: true, night: true, dosesPerDay: 3 };
  }
  if (combined.includes('q12h') || combined.includes('every 12 hour') || combined.includes('bd') || combined.includes('bid') || combined.includes('twice') || combined.includes('2 times') || combined.includes('1-0-1')) {
    return { morning: true, afternoon: false, night: true, dosesPerDay: 2 };
  }
  if (combined.includes('od') || combined.includes('qd') || combined.includes('once') || combined.includes('1-0-0') || combined.includes('hs') || combined.includes('bedtime') || combined.includes('night') || combined.includes('sos') || combined.includes('prn')) {
    return { morning: !combined.includes('hs') && !combined.includes('night'), afternoon: false, night: combined.includes('hs') || combined.includes('night'), dosesPerDay: 1 };
  }

  return { morning: true, afternoon: false, night: true, dosesPerDay: 2 };
}

export function parseTabsPerDose(dosStr?: string): number {
  if (!dosStr) return 1;
  const str = String(dosStr).toLowerCase().trim();
  const doseMatch = str.match(/(\d+(?:\.\d+)?)\s*(tab|cap|tablet|capsule|pill)?/);
  if (doseMatch) {
    const t = parseFloat(doseMatch[1]);
    if (!isNaN(t) && t > 0 && t <= 20) return t;
  }
  return 1;
}

export function normalizeBranchName(b?: string | null): string {
  if (!b) return '';
  const lower = b.toLowerCase().trim();
  if (lower === 'srg' || lower === 'ccmh-srg') return 'srirangam';
  if (lower === 'can' || lower === 'ccmh-can') return 'cantonment';
  if (lower === 'tn' || lower === 'ccmh-tn') return 'thillainagar';
  return lower
    .replace(/branch/g, '')
    .replace(/hospital/g, '')
    .replace(/cauvery/g, '')
    .replace(/care/g, '')
    .replace(/clinic/g, '')
    .trim();
}

export function matchBranch(itemBranch?: string | null, activeBranch?: string | null): boolean {
  if (!activeBranch || activeBranch === 'All' || activeBranch.toLowerCase() === 'all') {
    return true;
  }
  if (!itemBranch || itemBranch.toLowerCase() === 'all') return true;
  const sNorm = normalizeBranchName(activeBranch);
  const bNorm = normalizeBranchName(itemBranch);
  if (!sNorm || !bNorm) return true;
  return bNorm.includes(sNorm) || sNorm.includes(bNorm) || bNorm === sNorm;
}

export function isPatientAllocatedToBranch(
  patient: any,
  activeBranch?: string | null,
  contextData?: {
    appointments?: any[];
    admissions?: any[];
    beds?: any[];
    vitals?: any[];
    notes?: any[];
    medications?: any[];
    erVisits?: any[];
  }
): boolean {
  if (!activeBranch || activeBranch === 'All' || activeBranch.toLowerCase() === 'all') {
    return true;
  }
  if (matchBranch(patient?.branch, activeBranch)) {
    return true;
  }
  const normUhid = (patient?.uhid || '').toLowerCase().trim();
  if (!normUhid) return false;

  if (contextData?.appointments?.some((a) => (a.patientUhid || a.patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(a.branch, activeBranch))) {
    return true;
  }
  if (contextData?.admissions?.some((adm) => (adm.patientUhid || adm.patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(adm.branch, activeBranch))) {
    return true;
  }
  if (contextData?.beds?.some((b) => (b.currentPatientUhid || b.current_patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(b.branch, activeBranch))) {
    return true;
  }
  if (contextData?.vitals?.some((v) => (v.patientUhid || v.patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(v.branch, activeBranch))) {
    return true;
  }
  if (contextData?.notes?.some((n) => (n.patientUhid || n.patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(n.branch, activeBranch))) {
    return true;
  }
  if (contextData?.medications?.some((m) => (m.patientUhid || m.patient_uhid || '').toLowerCase().trim() === normUhid && matchBranch(m.branch, activeBranch))) {
    return true;
  }
  if (contextData?.erVisits?.some((er) => (er.patient_uhid || er.patientUhid || '').toLowerCase().trim() === normUhid && matchBranch(er.branch, activeBranch))) {
    return true;
  }

  return false;
}


