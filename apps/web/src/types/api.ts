/**
 * API response types — single source of truth for what the backend returns.
 * Use these in `adminApi.*` calls and page state instead of `any`.
 */

// ─── Common ───────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  pages?: number;
  limit?: number;
  // Domain-specific list key (e.g. users, spaces) lives on the concrete response
  // Subtypes below extend this and add the key.
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    status: number;
    details?: Array<{ field: string; message: string }>;
  };
}

// ─── Users ────────────────────────────────────────────────────────────
export interface AdminUserListItem {
  id: number;
  usrId: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  rawStatus: string;
  rating: number | null;
  joined: string;
}

export interface AdminUserListResponse extends PaginatedResponse<AdminUserListItem> {
  users: AdminUserListItem[];
}

export interface AdminUserDetails {
  id: number;
  usrId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
  photoUrl: string | null;
  role: string;
  type: string;
  status: string;
  suspendReason: string | null;
  suspendedAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  bannedAt: string | null;
  deletedAt: string | null;
  deletedReason: string | null;
  isProfileComplete: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  billing?: {
    billingName: string | null;
    billingEmail: string | null;
    billingAddress: string | null;
    gstin: string | null;
    upiId: string | null;
  } | null;
  stats: {
    totalBookings: number;
    totalSpaces: number;
    totalVehicles: number;
    averageRating: number;
    ratingCount: number;
    totalSpent: number;
  };
  spaces: Array<{ id: number; name: string; status: string; hourlyRate: number }>;
  vehicles: Array<{ id: number; brandModel: string; licensePlate: string; vehicleType: string }>;
  recentBookings: Array<{ id: string; space: string; status: string; amount: number; duration?: number; date: string }>;
  recentTransactions?: Array<{ id: number; txnNumber: string; type: string; amount: number; status: string; description: string | null; date: string }>;
  subscriptions: Array<{ id: number; planName: string | null; price: number; status: string; renewalDate: string }>;
}

// ─── Spaces ───────────────────────────────────────────────────────────
export interface AdminSpaceListItem {
  id: number;
  name: string;
  spaceType: string;
  address: string;
  landmark: string | null;
  capacity: number;
  hourlyRate: number;
  status: string;
  bookingsCount: number;
  ratingAvg: number;
  ratingCount: number;
  owner: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
  } | null;
  createdAt: string;
  requiresAdminReview?: boolean;
}

export interface AdminSpaceListResponse extends PaginatedResponse<AdminSpaceListItem> {
  spaces: AdminSpaceListItem[];
  tally: {
    all: number;
    pending: number;
    verified: number;
    rejected: number;
    blocked: number;
  };
}

// ─── Bookings ─────────────────────────────────────────────────────────
export interface AdminBookingListItem {
  id: string;
  rawId: string;
  status: string;
  parker: { id: number; name: string; phone?: string } | null;
  owner: { id: number; name: string; phone?: string } | null;
  space: { id?: number; name: string; address?: string } | null;
  vehicle: { licensePlate: string } | null;
  amount: string;
  date: string;
  duration?: number;
  createdAt?: string;
}

export interface AdminBookingListResponse extends PaginatedResponse<AdminBookingListItem> {
  bookings: AdminBookingListItem[];
}

// ─── Transactions / Subscriptions ─────────────────────────────────────
export interface AdminTransactionListItem {
  id: string;
  rawId: number;
  type: string;
  description: string;
  user: string;
  userId: number | null;
  amount: number;
  amountDisplay: string;
  isInflow: boolean;
  method: string;
  status: string;
  date: string;
  rawDate: string;
}

export interface AdminTransactionListResponse extends PaginatedResponse<AdminTransactionListItem> {
  transactions: AdminTransactionListItem[];
}

export interface AdminSubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number | null;
  billingCycle?: string;
  features: string[];
  iconKey: string;
  colorKey: string;
  isActive?: boolean;
  sortOrder?: number;
  activeSubscribers: number;
}

// ─── Case evidence ────────────────────────────────────────────────────
export interface CaseListItem {
  bookingId: string;
  shortId: string;
  status: string;
  createdAt: string;
  parker: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  owner: { firstName: string | null; lastName: string | null } | null;
  space: { name: string | null; address: string | null };
  vehicle: { licensePlate: string | null } | null;
  flags: {
    flagged: boolean;
    incidentCount: number;
    abuseCount: number;
    roadsideAcks: number;
  };
}

export interface CaseListResponse extends PaginatedResponse<CaseListItem> {
  cases: CaseListItem[];
}

// ─── Sidebar counts ───────────────────────────────────────────────────
export interface SidebarCountsResponse {
  success: boolean;
  counts: {
    pendingSpaces: number;
    openSupportTickets: number;
    expiringSubscriptions: number;
    openAbuseReports: number;
  };
}
