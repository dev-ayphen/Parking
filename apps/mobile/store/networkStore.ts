import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { toast } from '../utils/toast';

interface NetworkStore {
  /** null until the first NetInfo event resolves; then true/false. */
  isConnected: boolean | null;
  /** Convenience: treat the unknown (null) state as online so we don't block on boot. */
  isOnline: boolean;
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
  isOnline: true,

  setConnected: (connected) => set({ isConnected: connected, isOnline: connected }),

  refresh: async () => {
    const state = await NetInfo.fetch();
    const connected = !!state.isConnected && state.isInternetReachable !== false;
    set({ isConnected: connected, isOnline: connected });
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
    const connected = !!state.isConnected && state.isInternetReachable !== false;
    useNetworkStore.getState().setConnected(connected);
  });
}
