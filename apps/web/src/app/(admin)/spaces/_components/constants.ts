export const fmtCount = (n: number) => {
  if (n < 1000) return String(n);
  if (n < 1_000_000) { const v = n / 1000; return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`; }
  const v = n / 1_000_000; return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
};

export const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const SPACE_TYPE_RISK: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
  'Independent House': 'LOW',
  'Rented House': 'LOW',
  'Apartment Owner Slot': 'LOW',
  'Apartment Tenant Slot': 'MEDIUM',
  'Gated Villa': 'LOW',
  'Shop Front Parking': 'MEDIUM',
  'Office Parking': 'LOW',
  'Vacant Private Land': 'MEDIUM',
  'Inside Compound': 'LOW',
  'Open Frontage Area': 'HIGH',
};

export const tabs = [
  { key: 'All Spaces', status: undefined },
  { key: 'Pending Review', status: 'PENDING' },
  { key: 'Approved', status: 'VERIFIED' },
  { key: 'Rejected', status: 'REJECTED' },
  { key: 'Blocked', status: 'BLOCKED' },
] as const;
