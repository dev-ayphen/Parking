'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Loader2, Search, TrendingUp, TrendingDown, Banknote, RefreshCw, Download,
  ChevronLeft, ChevronRight, X, Check, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import type { AdminTransactionListItem } from '@/types/api';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const TYPE_FILTERS = ['All Transactions', 'User Payments', 'Owner Earnings', 'Refunds'];

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-rose-50 text-rose-700',
};

interface Overview {
  totalRevenue30d: { value: string; trend: string; isPositive: boolean };
  pendingPayouts: { value: string; trend: string };
  refundsProcessed: { value: string; trend: string };
}

export default function PaymentsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [txns, setTxns] = useState<AdminTransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All Transactions');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const [payingOut, setPayingOut] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Refund modal
  const [refundTxn, setRefundTxn] = useState<AdminTransactionListItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const pages = Math.max(1, Math.ceil(total / limit));

  const fetchOverview = useCallback(async () => {
    try {
      const res = await adminApi.getPaymentsOverview();
      if (res.success) setOverview(res.stats);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Overview:', e);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.listTransactions({
        type: typeFilter === 'All Transactions' ? undefined : typeFilter,
        search: search || undefined,
        page,
        limit,
      });
      if (res.success) {
        setTxns(res.transactions || []);
        setTotal(res.total || 0);
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, page, limit]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => {
    const t = setTimeout(fetchTransactions, 250);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  // Live-refresh when a payout/refund/status change happens server-side
  // (server emits payments:updated to the payments admin room).
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('payments:updated', () => { fetchOverview(); fetchTransactions(); });
    return () => { socket.disconnect(); };
  }, [fetchOverview, fetchTransactions]);

  const handleProcessPayouts = async () => {
    try {
      setPayingOut(true);
      await adminApi.processPayouts();
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Payouts:', e);
    } finally {
      setPayingOut(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await adminApi.exportTransactionsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parkswift-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Export:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTxn) return;
    try {
      setRefunding(true);
      await adminApi.refundTransaction(refundTxn.rawId, { reason: refundReason || undefined });
      setRefundTxn(null);
      setRefundReason('');
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Refund:', e);
    } finally {
      setRefunding(false);
    }
  };

  const markStatus = async (txn: AdminTransactionListItem, status: 'SUCCESS' | 'FAILED') => {
    try {
      await adminApi.updateTransactionStatus(txn.rawId, status);
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Status:', e);
    }
  };

  const STAT_CARDS = overview
    ? [
        { label: 'Revenue (30d)', data: overview.totalRevenue30d, icon: overview.totalRevenue30d.isPositive ? TrendingUp : TrendingDown, accent: 'text-emerald-600' },
        { label: 'Pending Payouts', data: overview.pendingPayouts, icon: Banknote, accent: 'text-amber-600' },
        { label: 'Refunds Processed', data: overview.refundsProcessed, icon: RefreshCw, accent: 'text-rose-600' },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payments & Billing</h1>
          <p className="text-gray-500 mt-1">Transactions, refunds, and owner payouts.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export CSV
          </button>
          <button onClick={handleProcessPayouts} disabled={payingOut}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {payingOut ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />} Process Payouts
          </button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAT_CARDS.length === 0
          ? [0, 1, 2].map((i) => <div key={i} className="h-28 bg-gray-50 rounded-2xl animate-pulse" />)
          : STAT_CARDS.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">{c.label}</p>
                  <c.icon size={18} className={c.accent} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{c.data.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.data.trend}</p>
              </div>
            ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <button key={f} onClick={() => { setTypeFilter(f); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by txn ID, user, or description..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : txns.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5 font-semibold">Transaction</th>
                  <th className="px-5 py-3.5 font-semibold">User</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.map((t) => (
                  <tr key={t.rawId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.isInflow ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                          {t.isInflow ? <ArrowDownLeft size={14} className="text-emerald-600" /> : <ArrowUpRight size={14} className="text-rose-600" />}
                        </div>
                        <div>
                          <p className="text-xs font-mono text-gray-500">{t.id}</p>
                          <p className="text-sm text-gray-700 line-clamp-1">{t.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{t.user}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${t.isInflow ? 'text-emerald-700' : 'text-rose-700'}`}>{t.amountDisplay}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{t.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Refund only inflows that succeeded */}
                        {t.isInflow && t.status === 'SUCCESS' && (
                          <button onClick={() => { setRefundTxn(t); setRefundReason(''); }}
                            className="text-rose-600 hover:text-rose-700 text-xs font-semibold">Refund</button>
                        )}
                        {/* Pending → mark success/failed */}
                        {t.status === 'PENDING' && (
                          <>
                            <button onClick={() => markStatus(t, 'SUCCESS')}
                              className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold">Mark Paid</button>
                            <button onClick={() => markStatus(t, 'FAILED')}
                              className="text-gray-500 hover:text-gray-700 text-xs font-semibold">Fail</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={16} /></button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={16} /></button>
        </div>
      )}

      {/* Refund modal */}
      {refundTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Issue Refund</h2>
              <button onClick={() => setRefundTxn(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-900">{refundTxn.id} · {refundTxn.amountDisplay}</p>
              <p className="text-gray-500 text-xs mt-0.5">{refundTxn.user} · {refundTxn.description}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Reason</label>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3}
                placeholder="Reason for the refund (visible in logs)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            <button onClick={handleRefund} disabled={refunding}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
              {refunding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Confirm Refund
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
