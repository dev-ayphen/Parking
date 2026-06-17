'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal, Server, Database, Activity,
  Search, Download, AlertCircle,
  CheckCircle2, XCircle, Info, DatabaseBackup, Loader2,
} from 'lucide-react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { exportCsv } from '@/lib/download';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

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

export default function SystemLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    await exportCsv(
      () => adminApi.exportLogsCsv({ level: levelFilter, source: sourceFilter, search: searchQuery || undefined }),
      'system-logs',
    );
    setExporting(false);
  };
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setError('');
      const res = await adminApi.listSystemLogs({
        level: levelFilter,
        source: sourceFilter,
        search: searchQuery || undefined,
        page: 1,
        limit: 100,
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter, searchQuery]);

  // Debounced fetch on filter/search changes
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  // Socket: debounced refetch on any event
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });

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
          <button className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium border border-indigo-100 shadow-sm">
            <DatabaseBackup size={18} />
            Manual Backup
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
          <div className="flex items-center gap-2 mt-4 text-gray-500 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Tailing live logs...
          </div>
        </div>
      </motion.div>
    </div>
  );
}
