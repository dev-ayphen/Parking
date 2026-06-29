'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, RotateCw, Loader2, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [show, setShow] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const goOnline = useCallback(() => {
    setOnline(true);
    setJustReconnected(true);
    setRetryCountdown(0);
    // Auto-refresh the page data by reloading after a short "Back online" flash
    setTimeout(() => {
      window.location.reload();
    }, 1800);
  }, []);

  const goOffline = useCallback(() => {
    setOnline(false);
    setShow(true);
    setJustReconnected(false);
  }, []);

  // Auto-retry countdown when offline
  useEffect(() => {
    if (online || justReconnected) return;
    setRetryCountdown(30);
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [online, justReconnected]);

  // When countdown hits 0, auto-ping
  useEffect(() => {
    if (retryCountdown === 0 && !online && !justReconnected) {
      // silent auto-retry
      fetch('/', { method: 'HEAD', cache: 'no-store' })
        .then(() => { if (navigator.onLine) goOnline(); })
        .catch(() => setRetryCountdown(30));
    }
  }, [retryCountdown, online, justReconnected, goOnline]);

  useEffect(() => {
    setOnline(navigator.onLine);
    if (!navigator.onLine) setShow(true);

    const handleOffline = () => goOffline();
    const handleOnline = () => goOnline();

    const apiNetworkError = () => {
      if (!navigator.onLine) { goOffline(); return; }
      setShow(true);
      setJustReconnected(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('api:network-error', apiNetworkError);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('api:network-error', apiNetworkError);
    };
  }, [goOffline, goOnline]);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await fetch('/', { method: 'HEAD', cache: 'no-store' });
      if (navigator.onLine) {
        goOnline();
      }
    } catch {
      /* still offline */
      setRetryCountdown(30);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Top banner */}
      <div
        className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${
          justReconnected ? 'bg-emerald-600' : 'bg-rose-600'
        }`}
        role="status"
        aria-live="polite"
      >
        {justReconnected ? (
          <>
            <Wifi size={16} />
            <span>Back online — reloading…</span>
            <Loader2 size={14} className="animate-spin" />
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>No internet connection — read-only mode</span>
            <button
              onClick={retry}
              disabled={checking}
              className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-white/50 px-3 py-0.5 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
            >
              {checking ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCw size={13} />
              )}
              {checking ? 'Checking…' : retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry'}
            </button>
          </>
        )}
      </div>

      {/* Full-page read-only overlay — blocks all clicks while offline */}
      {!online && !justReconnected && (
        <div
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          aria-modal="true"
          role="alertdialog"
          aria-label="You are offline"
        >
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4 text-center">
            {/* Animated wifi-off icon */}
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-1">
              <WifiOff size={32} className="text-rose-500" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">You're offline</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Check your internet connection. Your data is preserved — nothing was lost.
              </p>
            </div>

            <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-2">
              <button
                onClick={retry}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                {checking ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RotateCw size={15} />
                )}
                {checking ? 'Checking connection…' : 'Try again'}
              </button>
              {retryCountdown > 0 && (
                <p className="text-xs text-gray-400">
                  Auto-retrying in {retryCountdown}s
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
