'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Loader2, Search, TrendingUp, TrendingDown, Banknote, RefreshCw, Download,
  ChevronLeft, ChevronRight, X, Check, ArrowDownLeft, ArrowUpRight, Plus, Eye, Filter,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import type { AdminTransactionListItem } from '@/types/api';
import { ExportRangeModal } from '@/components/ExportRangeModal';
import { Badge } from '@/components/ui/Badge';
import { PAYMENT_STATUS_STYLES } from '@/lib/statusStyles';

const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.error || e?.message || fallback;

const TYPE_FILTERS = ['All Transactions', 'User Payments', 'Owner Earnings', 'Refunds'];

interface Overview {
  totalRevenue30d: { value: string; trend: string; isPositive: boolean };
  pendingPayouts: { value: string; trend: string };
  refundsProcessed: { value: string; trend: string };
}

export default function PaymentsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [txns, setTxns] = useState<AdminTransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All Transactions');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const [payingOut, setPayingOut] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // User-visible error for failed mutating actions (payouts/refund/status/export).
  const [actionError, setActionError] = useState('');

  // Refund modal
  const [refundTxn, setRefundTxn] = useState<AdminTransactionListItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Manual payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutUserId, setPayoutUserId] = useState('');
  const [payoutEntityLabel, setPayoutEntityLabel] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [creatingPayout, setCreatingPayout] = useState(false);

  // Transaction details modal
  const [detailsTxn, setDetailsTxn] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('payments:updated', () => { fetchOverview(); fetchTransactions(); });
    return () => { socket.disconnect(); };
  }, [fetchOverview, fetchTransactions]);

  const handleProcessPayouts = async () => {
    if (!window.confirm('Process all pending owner payouts now? This will move money to owners and cannot be undone.')) return;
    try {
      setPayingOut(true);
      setActionError('');
      await adminApi.processPayouts();
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      setActionError(errMsg(e, 'Failed to process payouts.'));
    } finally {
      setPayingOut(false);
    }
  };


  const handleRefund = async () => {
    if (!refundTxn) return;
    try {
      setRefunding(true);
      setActionError('');
      const payload: any = { reason: refundReason || undefined };
      if (refundAmount) {
        payload.amount = Number(refundAmount);
      }
      await adminApi.refundTransaction(refundTxn.rawId, payload);
      setRefundTxn(null);
      setRefundReason('');
      setRefundAmount('');
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      setActionError(errMsg(e, 'Failed to issue refund.'));
    } finally {
      setRefunding(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!payoutAmount) {
      setActionError('Amount is required.');
      return;
    }
    if (!payoutUserId && !payoutEntityLabel) {
      setActionError('User ID or Entity Label is required.');
      return;
    }
    try {
      setCreatingPayout(true);
      setActionError('');
      await adminApi.createPayout({
        userId: payoutUserId ? Number(payoutUserId) : undefined,
        entityLabel: payoutEntityLabel || undefined,
        amount: Number(payoutAmount),
      });
      setShowPayoutModal(false);
      setPayoutUserId('');
      setPayoutEntityLabel('');
      setPayoutAmount('');
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      setActionError(errMsg(e, 'Failed to create payout.'));
    } finally {
      setCreatingPayout(false);
    }
  };

  const handleViewDetails = async (txn: AdminTransactionListItem) => {
    try {
      setLoadingDetails(true);
      const res = await adminApi.getTransactionDetails(txn.rawId);
      if (res.success) {
        setDetailsTxn(res.transaction);
      }
    } catch (e) {
      setActionError(errMsg(e, 'Failed to load transaction details.'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRevertToPending = async (txn: AdminTransactionListItem) => {
    if (!window.confirm(`Revert transaction ${txn.id} to PENDING status? This allows re-processing.`)) return;
    try {
      setActionError('');
      await adminApi.updateTransactionStatus(txn.rawId, 'PENDING');
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      setActionError(errMsg(e, 'Failed to update transaction status.'));
    }
  };

  const markStatus = async (txn: AdminTransactionListItem, status: 'SUCCESS' | 'FAILED') => {
    const label = status === 'SUCCESS' ? 'mark as PAID' : 'mark as FAILED';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} transaction ${txn.id} (${txn.amountDisplay})? This alters the transaction record.`)) return;
    try {
      setActionError('');
      await adminApi.updateTransactionStatus(txn.rawId, status);
      await Promise.all([fetchOverview(), fetchTransactions()]);
    } catch (e) {
      setActionError(errMsg(e, 'Failed to update transaction status.'));
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payments & Billing</h1>
          <p className="text-gray-500 mt-1">Transactions, refunds, and owner payouts.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowPayoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Plus size={15} /> Manual Payout
          </button>
          <button onClick={handleProcessPayouts} disabled={payingOut}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {payingOut ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />} Process Payouts
          </button>
        </div>
      </motion.div>

      {/* Action error banner */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <span className="text-sm">{actionError}</span>
          <button onClick={() => setActionError('')} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
        </div>
      )}

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
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {TYPE_FILTERS.map((f) => (
            <button key={f} onClick={() => { setTypeFilter(f); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by txn ID, user, amount, method..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All Statuses</option>
            <option value="SUCCESS">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select value={paymentMethodFilter} onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All Methods</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Wallet">Wallet</option>
          </select>
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
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">User</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Method</th>
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
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">{t.type}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{t.user}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${t.isInflow ? 'text-emerald-700' : 'text-rose-700'}`}>{t.amountDisplay}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{t.method || '—'}</td>
                    <td className="px-5 py-4">
                      <Badge map={PAYMENT_STATUS_STYLES} statusKey={t.status}>{t.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{t.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(t)} disabled={loadingDetails}
                          className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold disabled:opacity-50">
                          <Eye size={14} />
                        </button>
                        {/* Refund only inflows that succeeded */}
                        {t.isInflow && t.status === 'SUCCESS' && (
                          <button onClick={() => { setRefundTxn(t); setRefundReason(''); setRefundAmount(''); }}
                            className="text-rose-600 hover:text-rose-700 text-xs font-semibold">Refund</button>
                        )}
                        {/* Pending → mark success/failed */}
                        {t.status === 'PENDING' && (
                          <>
                            <button onClick={() => markStatus(t, 'SUCCESS')}
                              className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold">Paid</button>
                            <button onClick={() => markStatus(t, 'FAILED')}
                              className="text-gray-500 hover:text-gray-700 text-xs font-semibold">Fail</button>
                          </>
                        )}
                        {/* Revert FAILED to PENDING */}
                        {t.status === 'FAILED' && (
                          <button onClick={() => handleRevertToPending(t)}
                            className="text-amber-600 hover:text-amber-700 text-xs font-semibold">Retry</button>
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
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Amount (Optional - defaults to full)</label>
              <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Full amount: ₹${Math.abs(refundTxn.amount).toLocaleString('en-IN')}`}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
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

      {/* Manual payout modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create Manual Payout</h2>
              <button onClick={() => setShowPayoutModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">User ID (Optional)</label>
              <input type="number" value={payoutUserId} onChange={(e) => setPayoutUserId(e.target.value)}
                placeholder="Numeric user ID..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Entity Label (Optional)</label>
              <input type="text" value={payoutEntityLabel} onChange={(e) => setPayoutEntityLabel(e.target.value)}
                placeholder="Business name or identifier..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Amount (Required)</label>
              <input type="number" step="0.01" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Amount in rupees..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            </div>
            <button onClick={handleCreatePayout} disabled={creatingPayout}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
              {creatingPayout ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Payout
            </button>
          </div>
        </div>
      )}

      {/* Transaction details modal */}
      {detailsTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
              <button onClick={() => setDetailsTxn(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Transaction ID</p>
                    <p className="text-sm font-mono text-gray-900">{detailsTxn.txnNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Type</p>
                    <p className="text-sm text-gray-900">{detailsTxn.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Amount</p>
                    <p className="text-sm font-bold text-gray-900">₹{Math.abs(detailsTxn.amount).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                    <p className="text-sm text-gray-900">{detailsTxn.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Payment Method</p>
                    <p className="text-sm text-gray-900">{detailsTxn.paymentMethod || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                    <p className="text-sm text-gray-900">{new Date(detailsTxn.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Description</p>
                  <p className="text-sm text-gray-700 break-words">{detailsTxn.description || '—'}</p>
                </div>
                {detailsTxn.bookingId && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Booking</p>
                    <button
                      onClick={() => { setDetailsTxn(null); router.push(`/admin/bookings?focus=${detailsTxn.bookingId}`); }}
                      className="text-sm font-mono text-indigo-600 underline hover:text-indigo-700 break-words"
                    >
                      {detailsTxn.bookingId}
                    </button>
                  </div>
                )}
                {detailsTxn.user && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">User Info</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Name:</span> {detailsTxn.user.name}</p>
                      <p><span className="text-gray-500">Phone:</span> {detailsTxn.user.phone}</p>
                      <p><span className="text-gray-500">Email:</span> {detailsTxn.user.email}</p>
                      <p><span className="text-gray-500">Role:</span> {detailsTxn.user.role}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showExport && (
        <ExportRangeModal
          title="Export Transactions"
          filenamePrefix="parkswift-transactions"
          onExport={(startDate, endDate) => adminApi.exportTransactionsCsv({ startDate, endDate })}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
