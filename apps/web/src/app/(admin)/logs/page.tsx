'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal, Server, Database, Activity,
  Search, Download, AlertCircle,
  CheckCircle2, XCircle, Info, DatabaseBackup, Loader2,
  ShieldCheck,
} from 'lucide-react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { exportCsv } from '@/lib/download';

interface SystemLog {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata?: any;
  createdAt: string;
}

const LEVEL_OPTIONS = ['All', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];
const SOURCE_OPTIONS = ['All', 'auth', 'bookings', 'payments', 'spaces', 'admin', 'notifications', 'system'];

export default function LogsPage() {
  const [tab, setTab] = useState<'system' | 'audit'>('system');
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === 'system'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Terminal size={16} /> System Logs
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === 'audit'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShieldCheck size={16} /> Admin Actions
        </button>
      </div>
      {tab === 'system' ? <SystemLogsView /> : <AdminAuditView />}
    </div>
  );
}

function SystemLogsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const PAGE_SIZE = 100;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    await exportCsv(
      () => adminApi.exportLogsCsv({ level: levelFilter, source: sourceFilter, search: searchQuery || undefined }),
      'system-logs',
    );
    setExporting(false);
  };

  // "Manual Backup" downloads a full unfiltered snapshot of system logs as CSV.
  const handleBackup = async () => {
    setBackingUp(true);
    const ok = await exportCsv(() => adminApi.exportLogsCsv({}), 'logs-backup');
    if (!ok) setError('Backup failed. Please try again.');
    setBackingUp(false);
  };
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setError('');
      const res = await adminApi.listSystemLogs({
        level: levelFilter,
        source: sourceFilter,
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter, searchQuery, page]);

  // Reset to page 1 whenever filters/search change.
  useEffect(() => { setPage(1); }, [levelFilter, sourceFilter, searchQuery]);

  // Debounced fetch on filter/search changes
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  // Socket: debounced refetch on any event
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchLogs(), 800);
    };

    socket.on('connect', () => socket.emit('admin:join'));
    socket.onAny(debouncedRefresh);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.disconnect();
    };
  }, [fetchLogs]);

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
    } catch {
      return iso;
    }
  };

  const errorCount = logs.filter((l) => l.level === 'ERROR').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Logs</h1>
          <p className="text-gray-500 mt-1">Monitor platform health, errors, and database activity.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors disabled:opacity-60"
          >
            {backingUp ? <Loader2 size={18} className="animate-spin" /> : <DatabaseBackup size={18} />}
            {backingUp ? 'Backing up…' : 'Manual Backup'}
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Server size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Log Entries</p>
            <p className="text-lg font-bold text-gray-900">{total.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Database size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Showing</p>
            <p className="text-lg font-bold text-gray-900">{logs.length} latest</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${errorCount > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            <Activity size={24} className={errorCount > 0 ? 'text-rose-600' : 'text-emerald-600'} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Errors in view</p>
            <p className="text-lg font-bold text-gray-900">{errorCount}</p>
          </div>
        </div>
      </div>

      {/* Log Console Container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0F172A] rounded-3xl border border-gray-800 shadow-xl overflow-hidden flex flex-col h-[600px]"
      >
        {/* Console Toolbar */}
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1E293B]">
          <div className="flex items-center gap-2 text-gray-400">
            <Terminal size={18} />
            <span className="font-mono text-sm">/var/log/parkswift/app.log</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Grep logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0F172A] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 font-mono text-xs transition-colors"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-[#0F172A] border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>{l === 'All' ? 'ALL LEVELS' : l}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#0F172A] border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'ALL SOURCES' : s}</option>
              ))}
            </select>
            <button onClick={handleExport} disabled={exporting} className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50" title="Download Logs (CSV)">
              {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
          </div>
        </div>

        {/* Log Lines */}
        <div className="p-4 flex-1 overflow-auto font-mono text-[13px] leading-relaxed">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No logs match the current filter.</div>
          ) : (
            logs.map((log) => {
              let levelColor = 'text-blue-400';
              let icon = <Info size={14} className="mt-0.5" />;

              if (log.level === 'WARN') {
                levelColor = 'text-amber-400';
                icon = <AlertCircle size={14} className="mt-0.5" />;
              } else if (log.level === 'ERROR') {
                levelColor = 'text-rose-400';
                icon = <XCircle size={14} className="mt-0.5" />;
              } else if (log.level === 'SUCCESS') {
                levelColor = 'text-emerald-400';
                icon = <CheckCircle2 size={14} className="mt-0.5" />;
              }

              return (
                <div key={log.id} className="flex gap-4 mb-2 hover:bg-[#1E293B] p-1 -mx-1 rounded transition-colors group">
                  <span className="text-gray-500 whitespace-nowrap opacity-60">[{formatTimestamp(log.createdAt)}]</span>
                  <span className={`w-20 flex items-start gap-1 font-bold ${levelColor}`}>
                    {icon} {log.level}
                  </span>
                  <span className="text-purple-400 w-32 truncate flex-shrink-0" title={log.source}>
                    {log.source}
                  </span>
                  <span className="text-gray-300 flex-1 break-all">{log.message}</span>
                </div>
              );
            })
          )}

          {/* Live indicator */}
          {page === 1 && (
            <div className="flex items-center gap-2 mt-4 text-gray-500 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Tailing live logs...
            </div>
          )}
        </div>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total.toLocaleString()} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Actions (audit log) ─────────────────────────────────────────

interface AuditLog {
  id: number;
  adminId: number | null;
  adminEmail?: string | null;
  admin?: { id: number; firstName?: string; lastName?: string; email?: string } | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  metadata?: any;
  payload?: any;
  ipAddress?: string | null;
  createdAt: string;
}

const ACTION_OPTIONS = [
  'All',
  'USER_SUSPENDED', 'USER_UNSUSPENDED', 'USER_BANNED', 'USER_DELETED', 'USER_MESSAGED',
  'SPACE_APPROVED', 'SPACE_REJECTED', 'SPACE_BLOCKED', 'SPACE_UNBLOCKED', 'SPACE_DELETED',
  'SPACE_DOC_REQUESTED', 'SPACE_UPDATED', 'DOC_VERIFIED', 'DOC_REJECTED',
  'REFUND_ISSUED', 'PAYOUTS_PROCESSED', 'PAYOUT_CREATED',
  'ABUSE_ACTIONED', 'REVIEW_HIDDEN', 'REVIEW_RESTORED', 'BROADCAST_SENT',
  'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_REACTIVATED', 'SUBSCRIPTION_EXTENDED',
  'SUBSCRIPTION_FORCE_CANCELLED', 'BOOKING_FORCE_CANCELLED', 'BOOKING_DISPUTE',
];

const TARGET_OPTIONS = [
  'All', 'USER', 'SPACE', 'BOOKING', 'DOCUMENT', 'TRANSACTION', 'PAYOUT',
  'ABUSE_REPORT', 'RATING', 'SUBSCRIPTION', 'SUBSCRIPTION_PLAN', 'BROADCAST',
];

function actionTone(action: string): string {
  if (/DELETED|BANNED|REJECTED|BLOCKED|FORCE_CANCELLED|HIDDEN/.test(action)) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (/APPROVED|VERIFIED|UNSUSPENDED|UNBLOCKED|REACTIVATED|RESTORED|PROCESSED/.test(action)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/SUSPENDED|REQUESTED|DISPUTE/.test(action)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('All');
  const [targetType, setTargetType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filters = useCallback(
    () => ({
      action,
      targetType,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [action, targetType, search, startDate, endDate],
  );

  const fetchLogs = useCallback(async () => {
    try {
      setError('');
      const res = await adminApi.listAuditLogs({ ...filters(), page, limit: PAGE_SIZE });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { setPage(1); }, [action, targetType, search, startDate, endDate]);

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  // Socket: refetch when any admin event fires (new audit entries arrive live)
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchLogs(), 800);
    };
    socket.on('connect', () => socket.emit('admin:join'));
    socket.onAny(refresh);
    return () => { if (timer) clearTimeout(timer); socket.disconnect(); };
  }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    const ok = await exportCsv(() => adminApi.exportAuditLogsCsv(filters()), 'admin-audit-logs');
    if (!ok) setError('Export failed. Please try again.');
    setExporting(false);
  };

  const adminLabel = (l: AuditLog) => {
    const email = l.adminEmail || l.admin?.email;
    const name = [l.admin?.firstName, l.admin?.lastName].filter(Boolean).join(' ');
    return email || name || (l.adminId ? `Admin #${l.adminId}` : 'System');
  };

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Actions</h1>
          <p className="text-gray-500 mt-1 text-sm">Immutable audit trail of every moderation action taken by admins.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Export CSV
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Admin email, target id, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
          {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a === 'All' ? 'All actions' : a}</option>)}
        </select>
        <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
          {TARGET_OPTIONS.map((t) => <option key={t} value={t}>{t === 'All' ? 'All targets' : t}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Start date" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="End date" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Reason / Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-gray-400"><Loader2 className="animate-spin inline" size={24} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-gray-500">No admin actions match the current filters.</td></tr>
              ) : (
                logs.map((l) => {
                  const meta = l.metadata ?? l.payload;
                  return (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(l.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{adminLabel(l)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-xs font-semibold ${actionTone(l.action)}`}>{l.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <span className="text-gray-400">{l.targetType}</span> #{l.targetId}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-md">
                        {l.reason && <div className="text-gray-800">{l.reason}</div>}
                        {meta && Object.keys(meta).length > 0 && (
                          <code className="text-xs text-gray-400 break-all">{JSON.stringify(meta)}</code>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages} · {total.toLocaleString()} entries</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
