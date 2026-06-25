'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';

/**
 * Date-range CSV export modal. The caller provides `onExport(startDate, endDate)`
 * which returns a Blob; both dates are optional (empty = all-time).
 */
export function ExportRangeModal({
  title = 'Export CSV',
  filenamePrefix,
  onExport,
  onClose,
}: {
  title?: string;
  filenamePrefix: string;
  onExport: (startDate?: string, endDate?: string) => Promise<Blob>;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleExport = async () => {
    if (startDate && endDate && startDate > endDate) {
      setErr('Start date must be before end date');
      return;
    }
    try {
      setBusy(true);
      setErr('');
      const blob = await onExport(startDate || undefined, endDate || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const range = startDate || endDate ? `_${startDate || 'start'}_to_${endDate || 'now'}` : '';
      a.download = `${filenamePrefix}${range}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Download size={20} className="text-indigo-600" /> {title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">Leave dates empty to export all records.</p>
          {err && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleExport} disabled={busy}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
