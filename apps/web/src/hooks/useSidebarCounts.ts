import { useEffect, useState, useCallback } from 'react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export interface SidebarCounts {
  pendingSpaces: number;
  openSupportTickets: number;
  expiringSubscriptions: number;
  openAbuseReports: number;
}

const ZERO: SidebarCounts = {
  pendingSpaces: 0,
  openSupportTickets: 0,
  expiringSubscriptions: 0,
  openAbuseReports: 0,
};

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

/**
 * Fetches sidebar "needs action" counts (pending spaces, open tickets,
 * expiring subscriptions, abuse reports) and keeps them fresh via socket
 * events. Used to show red badges in the navigation.
 */
export function useSidebarCounts(): SidebarCounts {
  const [counts, setCounts] = useState<SidebarCounts>(ZERO);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await adminApi.getSidebarCounts();
      if (res?.success && res.counts) setCounts(res.counts);
    } catch {
      // Silent — badges are non-critical; stale values are fine
    }
  }, []);

  useEffect(() => {
    fetchCounts();

    const token = useAuthStore.getState().token;
    if (!token) return;
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token } });
    socket.on('connect', () => socket.emit('admin:join'));
    // Any of these events implies a count may have changed — refetch
    const refresh = () => fetchCounts();
    socket.on('space:new', refresh);
    socket.on('space:updated', refresh);
    socket.on('support:new', refresh);
    socket.on('support:updated', refresh);
    socket.on('subscription:updated', refresh);
    socket.on('abuse:new', refresh);
    socket.on('abuse:updated', refresh);

    // Light polling fallback in case socket misses
    const t = setInterval(fetchCounts, 60_000);

    return () => {
      socket.disconnect();
      clearInterval(t);
    };
  }, [fetchCounts]);

  return counts;
}
