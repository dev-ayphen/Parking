'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Shield,
  AlertTriangle,
  Calendar,
  User,
  Car,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Filter,
  Flag,
  FileText,
} from 'lucide-react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

interface CaseRow {
  bookingId: string;
  shortId: string;
  status: string;
  createdAt: string;
  parker: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  owner: { firstName: string | null; lastName: string | null } | null;
  space: { name: string | null; address: string | null };
  vehicle: { licensePlate: string | null } | null;
  flags: { flagged: boolean; incidentCount: number; abuseCount: number; roadsideAcks: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const fmtName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || '—' : '—';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    APPROVED: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    PENDING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-800' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
  };
  const style = map[status] ?? map.COMPLETED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${style.bg} ${style.text}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default function CasesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const [status, setStatus] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listCases({
        search: debouncedSearch || undefined,
        status: status || undefined,
        flagged: flagged || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 20,
      });
      setCases(res.cases || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, flagged, from, to, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Live-refresh — a new incident or abuse report creates/flags a case.
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('incident:new', () => fetchCases());
    socket.on('abuse:new', () => fetchCases());
    return () => { socket.disconnect(); };
  }, [fetchCases]);

  // Stats from current page
  const flaggedCount = cases.filter((c) => c.flags.flagged).length;
  const totalIncidents = cases.reduce((sum, c) => sum + c.flags.incidentCount, 0);
  const totalAbuse = cases.reduce((sum, c) => sum + c.flags.abuseCount, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded">Legal</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cases & Evidence</h1>
          <p className="text-gray-500 mt-1">
            Search any booking to open its full legal evidence bundle.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={FileText} color="indigo" label="Total cases" value={total.toLocaleString('en-IN')} />
        <StatCard icon={Flag} color="amber" label="Flagged (this page)" value={flaggedCount} />
        <StatCard icon={AlertTriangle} color="red" label="Incidents (this page)" value={totalIncidents} />
        <StatCard icon={AlertTriangle} color="orange" label="Abuse (this page)" value={totalAbuse} />
      </div>

      {/* Search + filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by booking ID, parker name, phone, plate, space..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC0159]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="md:col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC0159]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="md:col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC0159]"
            placeholder="From"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="md:col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#DC0159]"
            placeholder="To"
          />
          <button
            onClick={() => { setFlagged(!flagged); setPage(1); }}
            className={`md:col-span-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              flagged
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Show only cases with incidents or abuse reports"
          >
            <Flag size={14} />
            {flagged ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No matching cases</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or clear filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cases.map((c, i) => (
              <motion.div
                key={c.bookingId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.01 }}
                className="p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Top row: flag + booking id + status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {c.flags.flagged && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          <Flag size={10} />
                          FLAGGED
                        </span>
                      )}
                      <code className="text-xs font-mono text-gray-500">{c.shortId}…</code>
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={11} />
                        {fmtDate(c.createdAt)}
                      </span>
                    </div>

                    {/* Parties */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{fmtName(c.parker)}</span>
                      <span className="text-xs text-gray-400">(P)</span>
                      <ArrowRight size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{fmtName(c.owner)}</span>
                      <span className="text-xs text-gray-400">(O)</span>
                    </div>

                    {/* Space + Vehicle */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {c.space.name || '—'}
                      </span>
                      {c.vehicle?.licensePlate && (
                        <span className="flex items-center gap-1">
                          <Car size={11} />
                          {c.vehicle.licensePlate}
                        </span>
                      )}
                    </div>

                    {/* Flag chips */}
                    {(c.flags.incidentCount > 0 || c.flags.abuseCount > 0 || c.flags.roadsideAcks > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {c.flags.incidentCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-200">
                            <AlertTriangle size={10} />
                            {c.flags.incidentCount} incident{c.flags.incidentCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {c.flags.abuseCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded border border-orange-200">
                            <AlertTriangle size={10} />
                            {c.flags.abuseCount} abuse report{c.flags.abuseCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {c.flags.roadsideAcks > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-200">
                            {c.flags.roadsideAcks} roadside ack
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/cases/${c.bookingId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DC0159] hover:bg-[#A8003F] text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    <Shield size={14} />
                    View Case
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && cases.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {pages} · {total.toLocaleString('en-IN')} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#DC0159] text-white font-semibold text-sm">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: any }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};
