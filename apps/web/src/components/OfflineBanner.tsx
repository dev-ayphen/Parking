'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RotateCw, Loader2 } from 'lucide-react';

/**
 * Global connectivity banner for the admin dashboard.
 *
 * Detection: the browser's own `navigator.onLine` + the `online`/`offline`
 * events — reliable and dependency-free. We ALSO expose a manual "Retry" that
 * pings a lightweight endpoint, because `navigator.onLine` only knows about the
 * network interface, not whether the API is actually reachable.
 *
 * Shows a red bar while offline; flashes a green "Back online" bar for 2s on
 * reconnect, then hides.
 */
export function OfflineBanner() {
  // Start optimistic (online) so SSR/first paint doesn't flash the bar.
  const [online, setOnline] = useState(true);
  const [show, setShow] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Sync with the real state on mount.
    setOnline(navigator.onLine);
    if (!navigator.onLine) setShow(true);

    const goOffline = () => {
      setOnline(false);
      setShow(true);
      setJustReconnected(false);
    };
    const goOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      // Keep the green "Back online" bar briefly, then hide.
      setTimeout(() => {
        setShow(false);
        setJustReconnected(false);
      }, 2000);
    };

    // The API interceptor fires this when a request fails with no response
    // (server unreachable) — show the bar even if navigator.onLine is still true.
    const apiNetworkError = () => {
      if (!navigator.onLine) { goOffline(); return; }
      setShow(true);
      setJustReconnected(false);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    window.addEventListener('api:network-error', apiNetworkError);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('api:network-error', apiNetworkError);
    };
  }, []);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    // navigator.onLine may already be true but the API unreachable — actually ping.
    try {
      await fetch('/', { method: 'HEAD', cache: 'no-store' });
      if (navigator.onLine) {
        setOnline(true);
        setJustReconnected(true);
        setTimeout(() => { setShow(false); setJustReconnected(false); }, 1500);
      }
    } catch {
      /* still offline — keep the bar */
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors ${
        justReconnected ? 'bg-emerald-600' : 'bg-rose-600'
      }`}
      role="status"
      aria-live="polite"
    >
      {justReconnected ? (
        <>
          <RotateCw size={16} />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>No internet connection — changes won&apos;t be saved.</span>
          <button
            onClick={retry}
            disabled={checking}
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-white/50 px-3 py-0.5 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
          >
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
            Retry
          </button>
        </>
      )}
    </div>
  );
}
