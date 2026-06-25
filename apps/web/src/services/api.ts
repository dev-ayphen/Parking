import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE } from '@/lib/config';
import type {
  AdminUserListResponse,
  AdminUserDetails,
  AdminSpaceListResponse,
  AdminBookingListResponse,
  AdminTransactionListResponse,
  CaseListResponse,
  SidebarCountsResponse,
} from '@/types/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  try {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Error getting token from auth store:', e);
  }
  return config;
});

// Add error interceptor for debugging + connectivity signal
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    // A request with no HTTP response is a connectivity failure (server
    // unreachable / dropped wifi). Broadcast it so the OfflineBanner can show,
    // even when the browser's navigator.onLine hasn't flipped yet.
    if (typeof window !== 'undefined' && !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      window.dispatchEvent(new CustomEvent('api:network-error'));
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  getOverview: async (range?: string) => {
    const res = await apiClient.get('/admin/analytics/overview', { params: range ? { range } : undefined });
    return res.data;
  },

  listUsers: async (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<AdminUserListResponse> => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },

  getUserDetails: async (userId: number): Promise<{ success: boolean; user: AdminUserDetails }> => {
    const res = await apiClient.get(`/admin/users/${userId}`);
    return res.data;
  },

  suspendUser: async (userId: number, payload?: { reason?: string; durationDays?: number | null }) => {
    const res = await apiClient.put(`/admin/users/${userId}/suspend`, payload || {});
    return res.data;
  },

  unsuspendUser: async (userId: number) => {
    const res = await apiClient.put(`/admin/users/${userId}/unsuspend`);
    return res.data;
  },

  banUser: async (userId: number, payload?: { reason?: string }) => {
    const res = await apiClient.put(`/admin/users/${userId}/ban`, payload || {});
    return res.data;
  },

  deleteUser: async (userId: number) => {
    const res = await apiClient.delete(`/admin/users/${userId}`);
    return res.data;
  },

  // Direct push message to a single user.
  notifyUser: async (userId: number, payload: { title: string; body: string }) => {
    const res = await apiClient.post(`/admin/users/${userId}/notify`, payload);
    return res.data;
  },

  listSpaces: async (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<AdminSpaceListResponse> => {
    const res = await apiClient.get('/admin/spaces', { params });
    return res.data;
  },

  approveSpace: async (spaceId: number) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/approve`);
    return res.data;
  },

  rejectSpace: async (spaceId: number, reason?: string) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/reject`, { reason });
    return res.data;
  },

  // Soft request: ask the owner to upload a specific document (no status change).
  requestSpaceDocument: async (spaceId: number, documentLabel: string, message?: string) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/request-document`, { documentLabel, message });
    return res.data;
  },

  getSpaceForAdmin: async (spaceId: number) => {
    const res = await apiClient.get(`/admin/spaces/${spaceId}`);
    return res.data;
  },

  blockSpace: async (spaceId: number) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/block`);
    return res.data;
  },

  unblockSpace: async (spaceId: number) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/unblock`);
    return res.data;
  },

  updateSpace: async (spaceId: number, fields: { name?: string; address?: string; hourlyRate?: number; description?: string; capacity?: number }) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}`, fields);
    return res.data;
  },

  listBookings: async (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<AdminBookingListResponse> => {
    const res = await apiClient.get('/admin/bookings', { params });
    return res.data;
  },

  getBookingDetails: async (bookingId: string) => {
    const res = await apiClient.get(`/admin/bookings/${bookingId}`);
    return res.data;
  },

  // Booking consent snapshot — keyed on the booking's cuid (Booking.id), via the
  // authenticated client so the request carries the admin token.
  getBookingConsent: async (bookingId: string) => {
    const res = await apiClient.get(`/bookings/${bookingId}/consent`);
    return res.data;
  },

  listTransactions: async (params?: { type?: string; search?: string; page?: number; limit?: number }): Promise<AdminTransactionListResponse> => {
    const res = await apiClient.get('/admin/transactions', { params });
    return res.data;
  },

  getTransactionDetails: async (id: number) => {
    const res = await apiClient.get(`/admin/transactions/${id}`);
    return res.data;
  },

  refundTransaction: async (id: number, payload: { reason?: string; amount?: number }) => {
    const res = await apiClient.post(`/admin/transactions/${id}/refund`, payload);
    return res.data;
  },

  updateTransactionStatus: async (id: number, status: 'SUCCESS' | 'PENDING' | 'FAILED') => {
    const res = await apiClient.put(`/admin/transactions/${id}/status`, { status });
    return res.data;
  },

  sendBroadcast: async (payload: { title: string; message: string; audience?: 'ALL' | 'PARKERS' | 'OWNERS'; category?: string }) => {
    const res = await apiClient.post('/admin/communications/notify', payload);
    return res.data;
  },
  listBroadcastHistory: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get('/admin/communications/history', { params });
    return res.data;
  },

  listSystemLogs: async (params?: { level?: string; source?: string; search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/admin/system-logs', { params });
    return res.data;
  },

  listLegalDocuments: async () => {
    const res = await apiClient.get('/admin/legal/documents');
    return res.data;
  },
  upsertLegalDocument: async (slug: string, payload: { title?: string; content?: string; version?: string; isActive?: boolean }) => {
    const res = await apiClient.put(`/admin/legal/documents/${slug}`, payload);
    return res.data;
  },
  listComplianceLogs: async (params?: { type?: string; search?: string; userId?: number; page?: number; limit?: number }) => {
    const res = await apiClient.get('/admin/legal/compliance', { params });
    return res.data;
  },
  updateComplianceLog: async (id: number, payload: { status?: string; notes?: string }) => {
    const res = await apiClient.put(`/admin/legal/compliance/${id}`, payload);
    return res.data;
  },

  getPaymentsOverview: async () => {
    const res = await apiClient.get('/admin/payments/overview');
    return res.data;
  },

  processPayouts: async () => {
    const res = await apiClient.post('/admin/payments/process-payouts');
    return res.data;
  },

  createPayout: async (data: { userId?: number; entityLabel?: string; amount: number; description?: string }) => {
    const res = await apiClient.post('/admin/payments/payout', data);
    return res.data;
  },

  exportTransactionsCsv: async (params?: { startDate?: string; endDate?: string }) => {
    const res = await apiClient.get('/admin/payments/export', { params, responseType: 'blob' });
    return res.data as Blob;
  },
  exportUsersCsv: async () => {
    const res = await apiClient.get('/admin/users/export', { responseType: 'blob' });
    return res.data as Blob;
  },
  exportBookingsCsv: async (params?: { startDate?: string; endDate?: string }) => {
    const res = await apiClient.get('/admin/bookings/export', { params, responseType: 'blob' });
    return res.data as Blob;
  },
  exportLogsCsv: async (params?: { level?: string; source?: string; search?: string }) => {
    const res = await apiClient.get('/admin/system-logs/export', { params, responseType: 'blob' });
    return res.data as Blob;
  },

  listAuditLogs: async (params?: {
    action?: string;
    targetType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return res.data;
  },
  exportAuditLogsCsv: async (params?: {
    action?: string;
    targetType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get('/admin/audit-logs/export', { params, responseType: 'blob' });
    return res.data as Blob;
  },

  getSettings: async () => {
    const res = await apiClient.get('/admin/settings');
    return res.data;
  },

  updateSettings: async (data: any) => {
    const res = await apiClient.put('/admin/settings', data);
    return res.data;
  },

  listSubscriptions: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/admin/subscriptions', { params });
    return res.data;
  },

  getSubscriptionAnalytics: async () => (await apiClient.get('/admin/subscriptions/analytics')).data,
  getSubscriptionDetail: async (id: number) => (await apiClient.get(`/admin/subscriptions/${id}`)).data,
  suspendSubscription: async (id: number, reason?: string) => (await apiClient.put(`/admin/subscriptions/${id}/suspend`, { reason })).data,
  reactivateSubscription: async (id: number) => (await apiClient.put(`/admin/subscriptions/${id}/reactivate`)).data,
  extendSubscription: async (id: number, days: number) => (await apiClient.put(`/admin/subscriptions/${id}/extend`, { days })).data,
  forceCancelSubscription: async (id: number, reason?: string) => (await apiClient.put(`/admin/subscriptions/${id}/force-cancel`, { reason })).data,

  listSubscriptionPlans: async () => {
    const res = await apiClient.get('/admin/subscription-plans');
    return res.data;
  },

  updateSubscriptionPlan: async (planId: number, data: {
    name?: string;
    description?: string;
    price?: number;
    yearlyPrice?: number | null;
    features?: string[];
    iconKey?: string;
    colorKey?: string;
    isActive?: boolean;
    maxSpaces?: number;
    hasAnalytics?: boolean;
    hasFeaturedListing?: boolean;
    hasCsvExport?: boolean;
    hasPrioritySupport?: boolean;
  }) => {
    const res = await apiClient.put(`/admin/subscription-plans/${planId}`, data);
    return res.data;
  },

  createSubscriptionPlan: async (data: any) => {
    const res = await apiClient.post('/admin/subscription-plans', data);
    return res.data;
  },

  listSupportTickets: async (params?: { status?: string; priority?: string; category?: string; search?: string; page?: number; limit?: number; assigned?: 'mine' | 'unassigned' }) => {
    const res = await apiClient.get('/admin/support', { params });
    return res.data;
  },

  getSupportTicket: async (ticketId: number) => {
    const res = await apiClient.get(`/admin/support/${ticketId}`);
    return res.data;
  },

  updateSupportTicket: async (ticketId: number, data: { status?: string; priority?: string; resolutionNote?: string }) => {
    const res = await apiClient.put(`/admin/support/${ticketId}`, data);
    return res.data;
  },

  replyToSupportTicket: async (ticketId: number, message: string) => {
    const res = await apiClient.post(`/admin/support/${ticketId}/reply`, { message });
    return res.data;
  },

  assignSupportTicket: async (ticketId: number, adminId: 'me' | number | null) => {
    const res = await apiClient.put(`/admin/support/${ticketId}/assign`, { adminId });
    return res.data;
  },

  // Sidebar badge counts — fetched on mount + refreshed via socket events
  getSidebarCounts: async (): Promise<SidebarCountsResponse> => {
    const res = await apiClient.get('/admin/sidebar-counts');
    return res.data;
  },

  // Abuse reports — moderation / disputes
  listAbuseReports: async (params?: { status?: string; page?: number; search?: string }) => {
    const res = await apiClient.get('/admin/abuse-reports', { params });
    return res.data;
  },

  getAbuseReport: async (id: number) => {
    const res = await apiClient.get(`/admin/abuse-reports/${id}`);
    return res.data;
  },

  actionAbuseReport: async (id: number, data: { action: string; adminAction: string; suspendedUntil?: string }) => {
    const res = await apiClient.put(`/admin/abuse-reports/${id}/action`, data);
    return res.data;
  },

  // Review moderation — list + soft hide/unhide
  listReviews: async (params?: { status?: string; search?: string; page?: number }) => {
    const res = await apiClient.get('/admin/reviews', { params });
    return res.data;
  },
  hideReview: async (id: number) => {
    const res = await apiClient.put(`/admin/reviews/${id}/hide`);
    return res.data;
  },
  unhideReview: async (id: number) => {
    const res = await apiClient.put(`/admin/reviews/${id}/unhide`);
    return res.data;
  },

  // Force cancel a booking (admin only — uses the shared /bookings/:id/cancel route
  // which grants admin authority via req.user.role === 'ADMIN').
  forceCancelBooking: async (bookingId: string, reason: string) => {
    const res = await apiClient.put(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { reason });
    return res.data;
  },

  // Open a dispute resolution action against a booking
  // Creates or updates an abuse report tied to this booking.
  createBookingDispute: async (bookingId: string, data: {
    issueType: string;
    adminNotes: string;
    action: 'warn_parker' | 'warn_owner' | 'refund' | 'escalate';
  }) => {
    const res = await apiClient.post(`/admin/bookings/${encodeURIComponent(bookingId)}/dispute`, data);
    return res.data;
  },

  // Case evidence — full legal-evidence bundle for a single booking
  getCaseEvidence: async (bookingId: string) => {
    const res = await apiClient.get(`/admin/cases/${encodeURIComponent(bookingId)}/evidence`);
    return res.data;
  },

  // Searchable list of all cases (bookings) with flag indicators
  listCases: async (params?: {
    search?: string;
    from?: string;
    to?: string;
    flagged?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<CaseListResponse> => {
    const res = await apiClient.get('/admin/cases', { params });
    return res.data;
  },

  // Incident reports — parker-reported parking incidents
  listIncidents: async (params?: { status?: string; search?: string; page?: number; reportType?: string }) => {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },

  updateIncidentStatus: async (id: number, data: { status: string; adminNotes?: string }) => {
    const res = await apiClient.put(`/incidents/${id}/status`, data);
    return res.data;
  },

  // Signed URL for a vehicle's RC-book document (admin user detail view).
  getVehicleRcBookUrl: async (vehicleId: number) => {
    const res = await apiClient.get(`/admin/vehicles/${vehicleId}/rcbook-url`);
    return res.data;
  },
};

export default apiClient;
