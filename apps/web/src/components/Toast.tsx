'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Show a toast. `type` defaults to 'success'. */
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastType, { border: string; icon: ReactNode; bar: string }> = {
  success: { border: 'border-emerald-200', bar: 'bg-emerald-500', icon: <CheckCircle2 size={18} className="text-emerald-600" /> },
  error: { border: 'border-rose-200', bar: 'bg-rose-500', icon: <XCircle size={18} className="text-rose-600" /> },
  info: { border: 'border-indigo-200', bar: 'bg-indigo-500', icon: <Info size={18} className="text-indigo-600" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const success = useCallback((m: string) => toast(m, 'success'), [toast]);
  const error = useCallback((m: string) => toast(m, 'error'), [toast]);
  const info = useCallback((m: string) => toast(m, 'info'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast stack — fixed, top-right, above modals (z-[100]) */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => {
          const tone = TONE[t.type];
          return (
            <div
              key={t.id}
              className={`relative flex items-start gap-3 bg-white border ${tone.border} rounded-xl shadow-lg p-3 pr-9 overflow-hidden animate-[slideIn_0.2s_ease-out]`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${tone.bar}`} />
              <span className="shrink-0 mt-0.5">{tone.icon}</span>
              <p className="text-sm text-gray-800 font-medium leading-snug">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/**
 * Access the toast API from any admin page.
 * Safe no-op fallback if used outside the provider (won't crash a page).
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    const noop = () => {};
    return { toast: noop, success: noop, error: noop, info: noop };
  }
  return ctx;
}
