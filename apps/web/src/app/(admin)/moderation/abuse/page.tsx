'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import { Flag, Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface AbuseReport {
  id: number;
  reportedUser: { id: number; firstName: string; lastName: string; phone: string };
  reportedByUser: { firstName: string; lastName: string } | null;
  abuseType: string;
  description: string;
  status: string;
  adminAction: string | null;
  permanentlyBanned: boolean;
  suspendedUntil: string | null;
  createdAt: string;
}

interface AbuseReportDetail extends AbuseReport {
  reportedUser: { id: number; firstName: string; lastName: string; phone: string; role?: string };
  reportedByUser: { id?: number; firstName: string; lastName: string; phone?: string } | null;
  evidenceUrls?: string[];
  updatedAt?: string;
}

const ABUSE_TYPES: Record<string, { label: string; color: string }> = {
  FAKER_BOOKING:           { label: 'Fake Booking',            color: 'bg-orange-100 text-orange-700' },
  DAMAGING_PROPERTY:       { label: 'Property Damage',          color: 'bg-red-100 text-red-700' },
  REPEATED_CANCELLATION:   { label: 'Repeated Cancellation',    color: 'bg-yellow-100 text-yellow-700' },
  ILLEGAL_PARKING:         { label: 'Illegal Parking',          color: 'bg-red-100 text-red-700' },
  HARASSMENT:              { label: 'Harassment',               color: 'bg-purple-100 text-purple-700' },
  FAKE_SPACE:              { label: 'Fake Space Listing',       color: 'bg-red-100 text-red-700' },
  UNSAFE_AREA:             { label: 'Unsafe Area',              color: 'bg-red-100 text-red-700' },
  OFFLINE_PAYMENT_DEMAND:  { label: 'Asked for Extra Money',    color: 'bg-orange-100 text-orange-700' },
  MISLEADING_LISTING:      { label: 'Misleading Listing',       color: 'bg-yellow-100 text-yellow-700' },
  UPI_NOT_WORKING:         { label: 'QR / UPI Not Working',     color: 'bg-orange-100 text-orange-700' },
  PAYMENT_NOT_RECEIVED:    { label: 'Payment Not Received',     color: 'bg-orange-100 text-orange-700' },
  LEFT_WITHOUT_PAYING:     { label: 'Left Without Paying',      color: 'bg-red-100 text-red-700' },
  OTHER:                   { label: 'Other Abuse',              color: 'bg-gray-100 text-gray-700' },
};

const STATUS_COLOR: Record<string, string> = {
  REPORTED:       'bg-blue-100 text-blue-700',
  INVESTIGATING:  'bg-amber-100 text-amber-700',
  WARNING_ISSUED: 'bg-yellow-100 text-yellow-700',
  SUSPENDED_TEMP: 'bg-orange-100 text-orange-700',
  BANNED:         'bg-red-100 text-red-700',
  RESOLVED:       'bg-emerald-100 text-emerald-700',
  DISMISSED:      'bg-gray-100 text-gray-700',
};

const ACTIONS = [
  { value: 'WARNING_ISSUED',  label: 'Issue Warning' },
  { value: 'SUSPENDED_TEMP',  label: 'Suspend Temporarily' },
  { value: 'BANNED',          label: 'Permanently Ban' },
  { value: 'RESOLVED',        label: 'Mark Resolved' },
  { value: 'DISMISSED',       label: 'Dismiss Report' },
];

export default function AbuseReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Detail modal
  const [detailReport, setDetailReport] = useState<AbuseReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const openDetail = async (reportId: number) => {
    setDetailLoading(true);
    setDetailError('');
    setDetailReport(null);
    // open modal skeleton immediately
    setDetailReport({ id: reportId } as AbuseReportDetail);
    try {
      const data = await adminApi.getAbuseReport(reportId);
      if (data.success) setDetailReport(data.report);
    } catch (e: any) {
      setDetailError(e?.response?.data?.error || e?.message || 'Failed to load report details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Action modal
  const [actionReport, setActionReport] = useState<AbuseReport | null>(null);
  const [actionValue, setActionValue] = useState('WARNING_ISSUED');
  const [adminNote, setAdminNote] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');
  const [banConfirm, setBanConfirm] = useState('');
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listAbuseReports({ status: statusFilter || undefined, search: debouncedSearch || undefined, page });
      if (data.success) {
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') console.error('Abuse reports:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Live-refresh when a new abuse report comes in.
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('abuse:new', () => fetchReports());
    return () => { socket.disconnect(); };
  }, [fetchReports]);

  const handleAction = async () => {
    if (!actionReport) return;
    // Permanent ban needs an explicit typed confirmation (mirrors the Users-page Ban modal).
    if (actionValue === 'BANNED' && banConfirm !== 'BAN') {
      setActionError('Type BAN to confirm the permanent ban.');
      return;
    }
    // Temp suspension must have a future end date — never indefinite (mirrors the
    // Suspend modal friction on the Users page).
    if (actionValue === 'SUSPENDED_TEMP') {
      const today = new Date().toISOString().slice(0, 10);
      if (!suspendUntil || suspendUntil <= today) {
        setActionError('Choose a future "suspended until" date — suspension cannot be indefinite.');
        return;
      }
    }
    try {
      setActioning(true);
      setActionError('');
      await adminApi.actionAbuseReport(actionReport.id, {
        action: actionValue,
        adminAction: adminNote,
        suspendedUntil: actionValue === 'SUSPENDED_TEMP' ? suspendUntil : undefined,
      });
      setActionReport(null);
      setAdminNote('');
      setSuspendUntil('');
      setBanConfirm('');
      fetchReports();
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || 'Failed to apply action');
    } finally {
      setActioning(false);
    }
  };

  const bannedCount = reports.filter(r => r.permanentlyBanned).length;
  const suspendedCount = reports.filter(r => r.suspendedUntil && new Date(r.suspendedUntil) > new Date()).length;

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Abuse Reports & Moderation</h1>
          <p className="text-gray-500 mt-1">Track user misconduct, fake listings, and enforce platform policies.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-bold text-red-600">{total}</div><p className="text-xs text-gray-500 mt-1">Total</p></div>
          <div><div className="text-2xl font-bold text-orange-600">{suspendedCount}</div><p className="text-xs text-gray-500 mt-1">Suspended</p></div>
          <div><div className="text-2xl font-bold text-purple-600">{bannedCount}</div><p className="text-xs text-gray-500 mt-1">Banned</p></div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name or phone..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[220px] px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <Flag className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500 text-sm">No abuse reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5 font-semibold">Reported User</th>
                  <th className="px-5 py-3.5 font-semibold">Reported By</th>
                  <th className="px-5 py-3.5 font-semibold">Abuse Type</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id} onClick={() => openDetail(r.id)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${r.permanentlyBanned ? 'bg-red-600' : r.suspendedUntil ? 'bg-orange-500' : 'bg-gray-400'}`}>
                          {r.reportedUser.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.reportedUser.firstName} {r.reportedUser.lastName}</p>
                          <p className="text-xs text-gray-500">{r.reportedUser.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{r.reportedByUser ? `${r.reportedByUser.firstName} ${r.reportedByUser.lastName}` : '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ABUSE_TYPES[r.abuseType]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {ABUSE_TYPES[r.abuseType]?.label || r.abuseType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] || 'bg-gray-100'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                        {r.permanentlyBanned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <AlertCircle size={10} /> BANNED
                          </span>
                        )}
                        {r.suspendedUntil && new Date(r.suspendedUntil) > new Date() && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            <Calendar size={10} /> {new Date(r.suspendedUntil).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{fmt(r.createdAt)}</td>
                    <td className="px-5 py-4">
                      {!['RESOLVED', 'DISMISSED', 'BANNED'].includes(r.status) && (
                        <button onClick={(e) => { e.stopPropagation(); setActionReport(r); setActionValue('WARNING_ISSUED'); setAdminNote(''); setSuspendUntil(''); setBanConfirm(''); setActionError(''); }}
                          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
                          Take Action
                        </button>
                      )}
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setDetailReport(null); setDetailError(''); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Abuse Report #{detailReport.id}</h2>
              <button onClick={() => { setDetailReport(null); setDetailError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-red-600" size={28} />
              </div>
            ) : detailError ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">{detailError}</div>
            ) : detailReport.abuseType ? (
              <div className="space-y-5">
                {/* Report type + status */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${ABUSE_TYPES[detailReport.abuseType]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {ABUSE_TYPES[detailReport.abuseType]?.label || detailReport.abuseType}
                  </span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[detailReport.status] || 'bg-gray-100'}`}>
                    {detailReport.status.replace(/_/g, ' ')}
                  </span>
                  {detailReport.permanentlyBanned && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      <AlertCircle size={11} /> Permanently Banned
                    </span>
                  )}
                </div>

                {/* Reported user */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reported User</p>
                  {detailReport.reportedUser.id ? (
                    <button
                      onClick={() => { setDetailReport(null); setDetailError(''); router.push(`/admin/users?focus=${detailReport.reportedUser.id}`); }}
                      className="font-semibold text-indigo-600 underline hover:text-indigo-700"
                    >
                      {detailReport.reportedUser.firstName} {detailReport.reportedUser.lastName}
                    </button>
                  ) : (
                    <p className="font-semibold text-gray-900">{detailReport.reportedUser.firstName} {detailReport.reportedUser.lastName}</p>
                  )}
                  <p className="text-sm text-gray-600">{detailReport.reportedUser.phone}</p>
                  {detailReport.reportedUser.role && (
                    <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">{detailReport.reportedUser.role}</span>
                  )}
                  {detailReport.suspendedUntil && new Date(detailReport.suspendedUntil) > new Date() && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      Suspended until {new Date(detailReport.suspendedUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Reporter info */}
                {detailReport.reportedByUser && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reported By</p>
                    <p className="font-semibold text-gray-900">{detailReport.reportedByUser.firstName} {detailReport.reportedByUser.lastName}</p>
                    {detailReport.reportedByUser.phone && (
                      <p className="text-sm text-gray-600">{detailReport.reportedByUser.phone}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{detailReport.description || '—'}</p>
                </div>

                {/* Evidence URLs */}
                {detailReport.evidenceUrls && detailReport.evidenceUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evidence ({detailReport.evidenceUrls.length})</p>
                    <div className="grid grid-cols-2 gap-3">
                      {detailReport.evidenceUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="block bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors">
                          {/\.(jpe?g|png|gif|webp)$/i.test(url) ? (
                            <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="p-3 flex items-center gap-2 text-sm text-indigo-600 font-medium">
                              <Flag size={14} /> Evidence {i + 1}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin action history */}
                {detailReport.adminAction && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Admin Action Note</p>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{detailReport.adminAction}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span>Reported: {fmt(detailReport.createdAt)}</span>
                  {detailReport.updatedAt && detailReport.updatedAt !== detailReport.createdAt && (
                    <span>Updated: {fmt(detailReport.updatedAt)}</span>
                  )}
                </div>

                {/* Quick action shortcut */}
                {!['RESOLVED', 'DISMISSED', 'BANNED'].includes(detailReport.status) && (
                  <button
                    onClick={() => {
                      const r = reports.find(rep => rep.id === detailReport.id);
                      if (r) {
                        setDetailReport(null);
                        setActionReport(r);
                        setActionValue('WARNING_ISSUED');
                        setAdminNote('');
                        setSuspendUntil('');
                        setBanConfirm('');
                        setActionError('');
                      }
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Take Action on this Report
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Take Action</h2>
              <button onClick={() => { setActionReport(null); setBanConfirm(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
              <p className="font-semibold">{actionReport.reportedUser.firstName} {actionReport.reportedUser.lastName}</p>
              <p className="text-gray-500 text-xs mt-0.5">{ABUSE_TYPES[actionReport.abuseType]?.label} · {actionReport.description}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Action</label>
              <select value={actionValue} onChange={e => { setActionValue(e.target.value); setBanConfirm(''); setActionError(''); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {actionValue === 'BANNED' && (
              <>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">
                    <span className="font-bold">Permanent action.</span> {actionReport.reportedUser.firstName} {actionReport.reportedUser.lastName} will be locked out of the platform indefinitely.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                    Type <span className="text-rose-600 font-mono">BAN</span> to confirm
                  </label>
                  <input type="text" value={banConfirm} onChange={e => setBanConfirm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
                </div>
              </>
            )}
            {actionValue === 'SUSPENDED_TEMP' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Suspend Until</label>
                <input type="date" value={suspendUntil} onChange={e => setSuspendUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Admin Note</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                placeholder="Describe the action taken..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none" />
            </div>
            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-sm">{actionError}</div>
            )}
            <button onClick={handleAction}
              disabled={actioning || !adminNote.trim() || (actionValue === 'BANNED' && banConfirm !== 'BAN')}
              className={`w-full py-2.5 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 ${
                actionValue === 'BANNED' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}>
              {actioning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {actionValue === 'BANNED' ? 'Ban Permanently' : 'Confirm Action'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
