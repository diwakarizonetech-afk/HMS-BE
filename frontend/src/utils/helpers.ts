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
