import { useEffect, useRef, useCallback } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { io as createSocket, Socket } from 'socket.io-client';
import { getAuthToken, clearAuthData } from '../utils/secureStorage';
import { API_BASE } from '../config/api.config';

const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

const decodeJwt = (token: string): { id?: number; sub?: number } | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    // RN (Hermes) provides atob; the Buffer branch is a non-RN fallback only.
    const nodeBuffer = (globalThis as any).Buffer;
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : nodeBuffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Mounted once at the app root. Maintains the global socket connection,
 * joins the current user's room, and dispatches DeviceEvents that
 * individual screens can subscribe to for live refreshes.
 *
 * Force-logout (status-change to SUSPENDED/BANNED/DELETED) is handled here.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    const connect = async () => {
      const token = await getAuthToken();
      if (!token || !alive) return;
      const claims = decodeJwt(token);
      // JWT uses 'sub' for user ID; fall back to 'id' for compatibility
      const userId = claims?.sub ?? claims?.id;
      if (!userId) return;
      userIdRef.current = userId;

      // Send JWT in handshake so the server can authenticate the socket connection
      const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('user:join', userId);
      });

      // Force-logout on suspend/ban/delete
      socket.on('user:status-change', async (payload: any) => {
        const status = payload?.status;
        if (status === 'SUSPENDED' || status === 'BANNED' || status === 'DELETED') {
          await clearAuthData();
          const title = status === 'BANNED' ? 'Account Banned' : status === 'DELETED' ? 'Account Deleted' : 'Account Suspended';
          const message = payload?.reason
            ? `${payload.reason}`
            : status === 'BANNED'
              ? 'Your account has been banned. Contact support for assistance.'
              : status === 'DELETED'
                ? 'Your account has been deleted.'
                : 'Your account has been suspended.';
          Alert.alert(title, message, [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)'),
            },
          ]);
        } else if (status === 'ACTIVE') {
          // Reinstated — silent refresh of any open screens
          DeviceEventEmitter.emit('user:reinstated');
        }
      });

      // Broadcast events to listening screens
      socket.on('space:status', (payload: any) => DeviceEventEmitter.emit('space:status', payload));
      socket.on('space:rejected', (payload: any) => DeviceEventEmitter.emit('space:rejected', payload));
      socket.on('space:approved', (payload: any) => DeviceEventEmitter.emit('space:approved', payload));
      socket.on('booking:new', (payload: any) => DeviceEventEmitter.emit('booking:new', payload));
      // Parker-facing booking lifecycle
      socket.on('booking:approved',  (payload: any) => DeviceEventEmitter.emit('booking:approved',  payload));
      socket.on('booking:rejected',  (payload: any) => DeviceEventEmitter.emit('booking:rejected',  payload));
      socket.on('booking:expired',   (payload: any) => DeviceEventEmitter.emit('booking:expired',   payload));
      socket.on('booking:cancelled', (payload: any) => DeviceEventEmitter.emit('booking:cancelled', payload));
      // Owner-facing arrival / ETA
      socket.on('parker:arrived', (payload: any) => DeviceEventEmitter.emit('parker:arrived', payload));
      socket.on('parker:eta-update', (payload: any) => DeviceEventEmitter.emit('parker:eta-update', payload));
      // Parker-facing damage/condition record ready to acknowledge
      socket.on('verification:ready', (payload: any) => DeviceEventEmitter.emit('verification:ready', payload));
      // Both-facing session lifecycle
      socket.on('session:started', (payload: any) => DeviceEventEmitter.emit('session:started', payload));
      socket.on('session:completed', (payload: any) => DeviceEventEmitter.emit('session:completed', payload));
      socket.on('transaction:update', (payload: any) => DeviceEventEmitter.emit('transaction:update', payload));
      socket.on('notification:new', (payload: any) => DeviceEventEmitter.emit('notification:new', payload));
      socket.on('rating:new', (payload: any) => DeviceEventEmitter.emit('rating:new', payload));
    };

    connect();

    return () => {
      alive = false;
      const sock = socketRef.current;
      const uid = userIdRef.current;
      if (sock) {
        if (uid) sock.emit('user:leave', uid);
        sock.disconnect();
      }
    };
  }, [router]);

  // Session-lost handler — fires when a token refresh fails or any request 401s
  // (emitted from api.service). Independent of the socket so it works even when
  // the socket is down. One alert, then back to login.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('auth:lost', () => {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)') }],
      );
    });
    return () => sub.remove();
  }, [router]);

  return <>{children}</>;
}

/**
 * Subscribe to realtime events from any screen.
 * `onEvent(name, handler)` returns an unsubscribe function.
 * Events are dispatched by RealtimeProvider via DeviceEventEmitter, e.g.
 * 'booking:approved', 'booking:rejected', 'parker:arrived', 'parker:eta-update',
 * 'verification:ready', 'session:started', 'session:completed', 'notification:new'.
 */
export function useRealtime() {
  const onEvent = useCallback((event: string, handler: (data: any) => void) => {
    const sub = DeviceEventEmitter.addListener(event, handler);
    return () => sub.remove();
  }, []);

  return { onEvent };
}
