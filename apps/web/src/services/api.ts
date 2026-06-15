import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import type {
  AdminUserListResponse,
  AdminUserDetails,
  AdminSpaceListResponse,
  AdminBookingListResponse,
  AdminTransactionListResponse,
  CaseListResponse,
  SidebarCountsResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// Add error interceptor for debugging
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
    return Promise.reject(error);
  }
);

export const spaceApi = {
  // Get all spaces with filters
  getAllSpaces: async (filters?: { status?: string; search?: string }) => {
    const response = await apiClient.get('/spaces', {
      params: filters,
    });
    // Return formatted spaces with all required fields
    const spaces = response.data.data || [];
    return spaces.map((space: any) => ({
      id: space.id,
      name: space.name,
      spaceType: space.spaceType,
      parkingFor: space.parkingFor,
      capacity: space.capacity,
      address: space.address,
      landmark: space.landmark,
      latitude: space.lat,
      longitude: space.lng,
      hourlyRate: space.hourlyRate,
      availability: space.availability,
      amenities: space.amenities || [],
      visibility: space.visibility,
      docType: space.docType,
      frontPhoto: !!space.frontPhotoUrl,
      areaPhoto: !!space.areaPhotoUrl,
      frontPhotoUrl: space.frontPhotoUrl || null,
      areaPhotoUrl: space.areaPhotoUrl || null,
      status: space.status,
      rejectionReason: space.rejectionReason,
      owner: space.owner || {},
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    }));
  },

  // Approve a space
  approveSpace: async (spaceId: number) => {
    const response = await apiClient.patch(`/spaces/${spaceId}/approve`);
    return response.data;
  },

  // Reject a space
  rejectSpace: async (spaceId: number, reason: string) => {
    const response = await apiClient.patch(`/spaces/${spaceId}/reject`, { reason });
    return response.data;
  },

  // Get single space with full details
  getSpace: async (spaceId: number) => {
    const response = await apiClient.get(`/spaces/${spaceId}`);
    const space = response.data;
    return {
      id: space.id,
      name: space.name,
      spaceType: space.spaceType,
      parkingFor: space.parkingFor,
      capacity: space.capacity,
      address: space.address,
      landmark: space.landmark,
      latitude: space.lat,
      longitude: space.lng,
      hourlyRate: space.hourlyRate,
      availability: space.availability,
      amenities: space.amenities || [],
      visibility: space.visibility,
      docType: space.docType,
      frontPhoto: !!space.frontPhotoUrl,
      areaPhoto: !!space.areaPhotoUrl,
      frontPhotoUrl: space.frontPhotoUrl || null,
      areaPhotoUrl: space.areaPhotoUrl || null,
      status: space.status,
      rejectionReason: space.rejectionReason,
      owner: space.owner || {},
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    };
  },
};

export const adminApi = {
  getOverview: async () => {
    const res = await apiClient.get('/admin/analytics/overview');
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

  blockSpace: async (spaceId: number) => {
    const res = await apiClient.put(`/admin/spaces/${spaceId}/block`);
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

  exportTransactionsCsv: async () => {
    const res = await apiClient.get('/admin/payments/export', { responseType: 'blob' });
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
  }) => {
    const res = await apiClient.put(`/admin/subscription-plans/${planId}`, data);
    return res.data;
  },

  createSubscriptionPlan: async (data: any) => {
    const res = await apiClient.post('/admin/subscription-plans', data);
    return res.data;
  },

  listSupportTickets: async (params?: { status?: string; priority?: string; category?: string; search?: string; page?: number; limit?: number }) => {
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

  // Sidebar badge counts — fetched on mount + refreshed via socket events
  getSidebarCounts: async (): Promise<SidebarCountsResponse> => {
    const res = await apiClient.get('/admin/sidebar-counts');
    return res.data;
  },

  // Abuse reports — moderation / disputes
  listAbuseReports: async (params?: { status?: string; page?: number }) => {
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
  listIncidents: async (params?: { status?: string; search?: string; page?: number }) => {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },

  updateIncidentStatus: async (id: number, data: { status: string; resolution?: string }) => {
    const res = await apiClient.put(`/incidents/${id}/status`, data);
    return res.data;
  },
};

export default apiClient;
