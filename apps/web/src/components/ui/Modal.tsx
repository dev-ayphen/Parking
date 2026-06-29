import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  /** Wider layout for detail views (max-w-3xl vs max-w-md). */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Shared admin modal shell — backdrop, animated card, sticky header with close.
 * Promoted from the per-page `ModalShell` copies (users, spaces, bookings, …)
 * so every modal looks and behaves identically.
 *
 * Wrap usages in <AnimatePresence> at the call site for exit animations.
 */
export function Modal({ title, icon, onClose, wide, children }: ModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/** Right-aligned action row for modal footers. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
      {children}
    </div>
  );
}
