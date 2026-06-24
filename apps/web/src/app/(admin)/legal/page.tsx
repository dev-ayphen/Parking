'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Shield, Scale, Clock,
  CheckCircle2, Edit3, Save, X, Loader2, AlertCircle, ShieldCheck, Search, Smartphone, Globe, Monitor,
} from 'lucide-react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';

interface LegalDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  version: string;
  isActive: boolean;
  effectiveAt?: string;
  updatedAt: string;
}

interface ComplianceLog {
  id: number;
  type: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  documentVersion?: string | null;
  platform?: string | null;
  ipAddress?: string | null;
  appVersion?: string | null;
  user?: { id: number; firstName?: string | null; lastName?: string | null; phone: string; email?: string | null } | null;
  document?: { slug: string; title: string; version: string } | null;
}

const TYPE_LABEL: Record<string, string> = {
  T_AND_C_ACCEPTED: 'Terms & Conditions',
  PRIVACY_ACCEPTED: 'Privacy Policy',
  BOOKING_TERMS_ACCEPTED: 'Booking Terms',
  VEHICLE_OWNERSHIP_ACCEPTED: 'Vehicle Ownership',
  OWNER_TERMS_ACCEPTED: 'Owner Terms',
  DATA_EXPORT_REQUESTED: 'Data Export Request',
  DATA_DELETION_REQUESTED: 'Data Deletion Request',
};

const TYPE_BADGE: Record<string, string> = {
  T_AND_C_ACCEPTED: 'bg-indigo-50 text-indigo-700',
  PRIVACY_ACCEPTED: 'bg-violet-50 text-violet-700',
  BOOKING_TERMS_ACCEPTED: 'bg-blue-50 text-blue-700',
  VEHICLE_OWNERSHIP_ACCEPTED: 'bg-teal-50 text-teal-700',
  OWNER_TERMS_ACCEPTED: 'bg-emerald-50 text-emerald-700',
  DATA_EXPORT_REQUESTED: 'bg-amber-50 text-amber-700',
  DATA_DELETION_REQUESTED: 'bg-rose-50 text-rose-700',
};

const STATUS_OPTIONS = ['RECEIVED', 'PROCESSING', 'COMPLETED', 'DENIED'];

export default function LegalCompliancePage() {
  const [activeTab, setActiveTab] = useState('documents');

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState('');

  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('All');
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PAGE_SIZE = 50;
  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / LOGS_PAGE_SIZE));

  // Disputes tab — DISPUTE-type incident reports.
  const [disputes, setDisputes] = useState<any[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState('');
  const [disputesLoaded, setDisputesLoaded] = useState(false);

  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setDocsError('');
      const res = await adminApi.listLegalDocuments();
      setDocuments(res.documents || []);
    } catch (e: any) {
      setDocsError(e?.response?.data?.error || e?.message || 'Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (search = logSearch, type = logTypeFilter, page = logsPage) => {
    try {
      setLogsLoading(true);
      setLogsError('');
      const res = await adminApi.listComplianceLogs({ page, limit: LOGS_PAGE_SIZE, search: search || undefined, type: type !== 'All' ? type : undefined });
      setLogs(res.logs || []);
      setLogsTotal(res.total || 0);
    } catch (e: any) {
      setLogsError(e?.response?.data?.error || e?.message || 'Failed to load compliance logs');
    } finally {
      setLogsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage]);

  const fetchDisputes = useCallback(async () => {
    try {
      setDisputesLoading(true);
      setDisputesError('');
      const res = await adminApi.listIncidents({ reportType: 'DISPUTE' });
      setDisputes(res.incidents || []);
      setDisputesLoaded(true);
    } catch (e: any) {
      setDisputesError(e?.response?.data?.error || e?.message || 'Failed to load disputes');
    } finally {
      setDisputesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchLogs();
  }, [fetchDocuments, fetchLogs]);

  // Lazy-load disputes the first time that tab is opened.
  useEffect(() => {
    if (activeTab === 'disputes' && !disputesLoaded) fetchDisputes();
  }, [activeTab, disputesLoaded, fetchDisputes]);

  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('compliance:update', fetchLogs);
    socket.on('legal:update', fetchDocuments);
    return () => { socket.disconnect(); };
  }, [fetchLogs, fetchDocuments]);

  const openEditor = (doc: LegalDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditVersion(doc.version);
    setEditContent(doc.content);
    setEditActive(doc.isActive);
  };

  const closeEditor = () => setEditingDoc(null);

  const handleSaveDoc = async () => {
    if (!editingDoc) return;
    try {
      setSaving(true);
      setDocsError('');
      await adminApi.upsertLegalDocument(editingDoc.slug, {
        title: editTitle,
        content: editContent,
        version: editVersion,
        isActive: editActive,
      });
      await fetchDocuments();
      closeEditor();
    } catch (e: any) {
      setDocsError(e?.response?.data?.error || e?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const updateLogStatus = async (id: number, status: string) => {
    try {
      setLogsError('');
      await adminApi.updateComplianceLog(id, { status });
      fetchLogs();
    } catch (e: any) {
      setLogsError(e?.response?.data?.error || e?.message || 'Failed to update log');
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
    } catch {
      return iso;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      RECEIVED: 'bg-blue-100 text-blue-700',
      PROCESSING: 'bg-amber-100 text-amber-700',
      DENIED: 'bg-rose-100 text-rose-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const slugIcon = (slug: string) => {
    if (slug.toLowerCase().includes('privacy')) return Shield;
    return FileText;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Legal & Compliance</h1>
          <p className="text-gray-500 mt-1">Manage platform policies, disputes, and compliance logs.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-medium border border-emerald-100 shadow-sm">
            <ShieldCheck size={18} />
            System Compliant
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {[
          { id: 'documents', label: 'Policy Documents', icon: FileText },
          { id: 'disputes', label: 'Dispute Resolution', icon: Scale },
          { id: 'logs', label: 'Compliance Logs', icon: Clock },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'documents' && (
          <>
            {docsError && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                <AlertCircle size={18} />
                <span className="text-sm">{docsError}</span>
              </div>
            )}
            {docsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
                No legal documents found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map((doc) => {
                  const Icon = slugIcon(doc.slug);
                  return (
                    <div key={doc.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Icon size={20} className="text-indigo-600" />
                            {doc.title}
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            Current Version: v{doc.version} {doc.effectiveAt && `(Effective ${formatDate(doc.effectiveAt)})`}
                          </p>
                        </div>
                        {doc.isActive ? (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={14} /> Active
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">Inactive</span>
                        )}
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                          {doc.content || 'No content yet.'}
                        </p>
                        <p className="text-[11px] text-gray-400">Slug: <span className="font-mono">{doc.slug}</span></p>
                      </div>
                      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                        <button
                          onClick={() => openEditor(doc)}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primaryDark transition-colors"
                        >
                          <Edit3 size={16} /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'disputes' && (
          <>
            {disputesLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={28} />
              </div>
            ) : disputesError ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                <AlertCircle size={18} /> <span className="text-sm">{disputesError}</span>
              </div>
            ) : disputes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Scale size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Active Disputes</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  No dispute reports have been filed. New disputes raised by parkers or owners will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => {
                  const reporter = d.reportedByUser
                    ? [d.reportedByUser.firstName, d.reportedByUser.lastName].filter(Boolean).join(' ') || d.reportedByUser.phone
                    : 'Unknown';
                  const statusColor =
                    d.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700'
                    : d.status === 'INVESTIGATING' ? 'bg-amber-50 text-amber-700'
                    : d.status === 'REJECTED' ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-50 text-blue-700';
                  return (
                    <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <Scale size={18} className="text-rose-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-gray-500">INC-{String(d.id).padStart(5, '0')}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{d.status}</span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{d.description || 'No description provided.'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Reported by {reporter} · {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone or email..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setLogsPage(1); fetchLogs(logSearch, logTypeFilter, 1); } }}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <select
                value={logTypeFilter}
                onChange={(e) => { setLogTypeFilter(e.target.value); setLogsPage(1); fetchLogs(logSearch, e.target.value, 1); }}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">All Types</option>
                {Object.keys(TYPE_LABEL).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
              <button
                onClick={() => fetchLogs(logSearch, logTypeFilter)}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primaryDark transition-colors"
              >
                Search
              </button>
              <span className="text-sm text-gray-500 ml-auto">{logsTotal} records</span>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-indigo-500" /> User Consent Acceptance Log
                </h2>
                <button onClick={() => fetchLogs(logSearch, logTypeFilter)} className="text-indigo-600 text-sm font-medium hover:text-indigo-800">Refresh</button>
              </div>
              {logsError && (
                <div className="m-6 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
                  <AlertCircle size={18} />
                  <span className="text-sm">{logsError}</span>
                </div>
              )}
              {logsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="px-5 py-3.5 font-semibold">User</th>
                        <th className="px-5 py-3.5 font-semibold">Accepted</th>
                        <th className="px-5 py-3.5 font-semibold">Version</th>
                        <th className="px-5 py-3.5 font-semibold">Platform</th>
                        <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-400 text-sm">No consent records yet.</td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const userName = log.user
                            ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.phone
                            : 'Anonymous';
                          const PlatformIcon = log.platform === 'ios' || log.platform === 'android' ? Smartphone
                            : log.platform === 'web' ? Monitor : Globe;
                          const acceptedAt = log.createdAt ? new Date(log.createdAt) : null;
                          return (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                                  {log.user?.phone && <p className="text-xs text-gray-400 mt-0.5">{log.user.phone}</p>}
                                  {log.user?.email && <p className="text-xs text-gray-400">{log.user.email}</p>}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_BADGE[log.type] || 'bg-gray-100 text-gray-700'}`}>
                                  {TYPE_LABEL[log.type] || log.type}
                                </span>
                                {log.document && (
                                  <p className="text-xs text-gray-400 mt-1">{log.document.title}</p>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  {log.documentVersion || log.document?.version || '—'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <PlatformIcon size={13} />
                                  <span className="capitalize">{log.platform || '—'}</span>
                                </div>
                                {log.ipAddress && <p className="text-xs text-gray-400 mt-0.5 font-mono">{log.ipAddress}</p>}
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm text-gray-700">
                                  {acceptedAt ? acceptedAt.toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {acceptedAt ? acceptedAt.toLocaleTimeString('en-IN', { timeStyle: 'short' }) : ''}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <select
                                  value={log.status}
                                  onChange={(e) => updateLogStatus(log.id, e.target.value)}
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusBadge(log.status)}`}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {logsTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Page {logsPage} of {logsTotalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={logsPage <= 1}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                      disabled={logsPage >= logsTotalPages}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Document</h3>
                <p className="text-xs text-gray-500 mt-1 font-mono">{editingDoc.slug}</p>
              </div>
              <button onClick={closeEditor} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                  <input
                    type="text"
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
              {docsError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-sm">
                  <AlertCircle size={16} /> {docsError}
                </div>
              )}
              <div className="flex justify-end gap-3">
              <button
                onClick={closeEditor}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDoc}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primaryDark disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
