import { create } from 'zustand';
import { DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { toast } from '../utils/toast';
import { API_BASE } from '../config/api.config';

/**
 * Ground-truth reachability: actually hit OUR API. NetInfo's default
 * `isInternetReachable` probe pings Google/Apple captive-portal URLs, which are
 * slow/blocked on some networks and frequently report `false` right after a
 * reconnect even when the internet is fine. So for the manual "Retry" we trust
 * a real request to our own server instead.
 */
const canReachApi = async (timeoutMs = 4000): Promise<boolean> => {
  // /health lives at the SERVER ROOT, not under /api — strip the /api suffix.
  const healthUrl = `${API_BASE.replace(/\/api\/?$/, '')}/health`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    // Any HTTP response (even 401/404) means the server is reachable → online.
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => null);
    clearTimeout(t);
    return res != null;
  } catch {
    return false;
  }
};

// Broadcast when connectivity is restored so data screens can re-fetch.
// Screens subscribe via DeviceEventEmitter.addListener(NETWORK_RECONNECTED, ...).
export const NETWORK_RECONNECTED = 'network:reconnected';

interface NetworkStore {
  /** null until the first NetInfo event resolves; then true/false. */
  isConnected: boolean | null;
  setConnected: (connected: boolean) => void;
  /** Re-check connectivity right now (used by the banner's "Retry"). */
  refresh: () => Promise<boolean>;
  /**
   * Guard for network-critical actions. Returns true if online; if offline it
   * shows a toast and returns false, so callers can early-return.
   *   if (!requireOnline()) return;
   */
  requireOnline: (message?: string) => boolean;
}

let started = false;

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  isConnected: null,

  setConnected: (connected) => {
    const prev = get().isConnected;
    set({ isConnected: connected });
    // Fire only on a real offline→online transition (not the initial null→true).
    if (connected && prev === false) {
      DeviceEventEmitter.emit(NETWORK_RECONNECTED);
    }
  },

  refresh: async () => {
    const state = await NetInfo.fetch();
    if (__DEV__) {
      console.log('[NET] Retry → NetInfo:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    }
    // Online if there's a network interface OR our API actually answers. We do
    // NOT depend solely on NetInfo's reachability probe (it false-negatives on
    // many networks). The API ping is a positive confirmation, not a gate: if
    // NetInfo says we have an interface, that alone is enough to treat as online.
    let connected = !!state.isConnected;
    if (!connected) {
      // Interface looks down — give the API one real chance to prove otherwise.
      connected = await canReachApi();
    }
    set({ isConnected: connected });
    // ALWAYS notify on a successful manual refresh so screens reload — the
    // banner component force-hides itself separately. (Don't gate on a
    // transition: the passive listener may have already flipped us to online.)
    if (connected) {
      DeviceEventEmitter.emit(NETWORK_RECONNECTED);
    }
    return connected;
  },

  requireOnline: (message = 'Internet connection required. Please reconnect and try again.') => {
    // Treat unknown (null) as online — never block before the first check resolves.
    if (get().isConnected === false) {
      toast.error(message);
      return false;
    }
    return true;
  },
}));

/**
 * Start the single global NetInfo listener. Call once at app root.
 * Idempotent — safe to call more than once.
 */
export function startNetworkListener() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((state) => {
    // Gate ONLY on having a network interface (`isConnected`). We deliberately do
    // NOT require `isInternetReachable` here — NetInfo's reachability probe pings
    // Google/Apple captive-portal URLs that are slow/blocked on some networks and
    // wrongly report `false` (which falsely showed the "No internet" banner with
    // Wi-Fi fully working). Offline is determined by interface presence; the
    // manual "Retry" does the real API-reachability check.
    const connected = state.isConnected !== false; // true or null → online
    useNetworkStore.getState().setConnected(connected);
  });

  // Active self-heal: NetInfo's passive listener doesn't always fire on reconnect
  // (notably Android / Expo Go), so the "No internet" banner could get STUCK even
  // after the network is back — forcing the user to tap "Retry". While we're
  // offline, actively poll: re-fetch NetInfo and, if needed, ping our own API.
  // The moment connectivity is confirmed we flip back to online automatically.
  setInterval(async () => {
    if (useNetworkStore.getState().isConnected !== false) return; // only while offline
    try {
      const state = await NetInfo.fetch();
      let connected = state.isConnected !== false;
      if (!connected) connected = await canReachApi(3000);
      if (connected) useNetworkStore.getState().setConnected(true);
    } catch {
      // ignore — try again on the next tick
    }
  }, 4000);
}
