'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Search, MoreVertical, MapPin, Phone,
  CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Loader2, Car,
  FileText, ShieldCheck, AlertTriangle, ExternalLink, X, Eye, MapPinIcon, Users, Zap, DollarSign, Star, Pencil,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { API_BASE, SOCKET_URL } from '@/lib/config';
import { useToast } from '@/components/Toast';
import { Badge } from '@/components/ui/Badge';
import { RISK_STYLES, SPACE_STATUS_STYLES } from '@/lib/statusStyles';

import { SpaceEditModal } from './_components/SpaceEditModal';
import { fmtCount, SPACE_TYPE_RISK, tabs } from './_components/constants';
import type { AdminSpace, SpaceDocument, DocCompliance, Tally } from './_components/types';

export default function SpacesPage() {
  const toast = useToast();
  const { user: authUser } = useAuthStore();
  const canMutate = authUser?.adminRole !== 'SUPPORT_AGENT';
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>(tabs[0]);
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [tally, setTally] = useState<Tally>({ all: 0, pending: 0, verified: 0, rejected: 0, blocked: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);
  const limit = 20;

  // Document viewer state
  const [docPanelSpaceId, setDocPanelSpaceId] = useState<number | null>(null);
  const [docPanelSpaceName, setDocPanelSpaceName] = useState('');
  const [documents, setDocuments] = useState<SpaceDocument[]>([]);
  const [docCompliance, setDocCompliance] = useState<DocCompliance | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDocId, setRejectDocId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [detailsSpaceId, setDetailsSpaceId] = useState<number | null>(null);
  const [detailsSpace, setDetailsSpace] = useState<AdminSpace | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingSpace, setEditingSpace] = useState<AdminSpace | null>(null);

  // Rejection modal state
  const [rejectingSpaceId, setRejectingSpaceId] = useState<number | null>(null);
  const [spaceRejectReason, setSpaceRejectReason] = useState('');
  const [rejectingSpace, setRejectingSpace] = useState<AdminSpace | null>(null);
  // "Request document" (soft ask) modal state.
  const [requestDocSpace, setRequestDocSpace] = useState<AdminSpace | null>(null);
  const [requestDocLabel, setRequestDocLabel] = useState('');
  const [requestDocMessage, setRequestDocMessage] = useState('');

  const fetchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listSpaces({
        status: activeTab.status,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setSpaces(res.spaces || []);
      setTotal(res.total || 0);
      if (res.tally) setTally(res.tally);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page]);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('space:new', fetchSpaces);
    socket.on('space:updated', fetchSpaces);
    return () => { socket.disconnect(); };
  }, [fetchSpaces]);

  const openDocPanel = async (space: AdminSpace) => {
    setDocPanelSpaceId(space.id);
    setDocPanelSpaceName(space.name);
    setDocsLoading(true);
    setDocuments([]);
    setDocCompliance(null);
    try {
      const token = useAuthStore.getState().token;
      const [docsRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/admin/spaces/${space.id}/documents`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/spaces/${space.id}/document-compliance`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const docsJson = await docsRes.json();
      const compJson = await compRes.json();
      if (docsJson.success) setDocuments(docsJson.documents || []);
      if (compJson.success) setDocCompliance({ compliant: compJson.compliant, missingDocs: compJson.missingDocs, rule: compJson.rule });
      if (!docsJson.success && !compJson.success) {
        setError(docsJson.error || compJson.error || 'Failed to load documents');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  };

  const openDetailsModal = async (space: AdminSpace) => {
    setDetailsSpaceId(space.id);
    setDetailsLoading(true);
    // Seed from the already-correct list row so the modal shows owner/coords/count
    // instantly, then enrich with the admin detail endpoint.
    setDetailsSpace(space);
    try {
      const json = await adminApi.getSpaceForAdmin(space.id);
      if (json.success) setDetailsSpace(json.space);
      else setError(json.error || 'Failed to load space details');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load space details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifyDoc = async (docId: number, action: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      setVerifyingDocId(docId);
      setError('');
      const token = useAuthStore.getState().token;
      const verifyRes = await fetch(`${API_BASE}/admin/spaces/${docPanelSpaceId}/documents/${docId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, rejectionReason }),
      });
      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to ${action === 'VERIFIED' ? 'verify' : 'reject'} document`);
      }
      // Refresh docs
      if (docPanelSpaceId) {
        const docsRes = await fetch(`${API_BASE}/admin/spaces/${docPanelSpaceId}/documents`, { headers: { Authorization: `Bearer ${token}` } });
        const docsJson = await docsRes.json();
        if (docsJson.success) setDocuments(docsJson.documents || []);
      }
      setRejectDocId(null);
      setRejectReason('');
    } catch (e: any) {
      setError(e?.message || 'Failed to update document');
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleApprove = async (spaceId: number) => {
    try {
      setActionId(spaceId);
      setError('');
      await adminApi.approveSpace(spaceId);
      await fetchSpaces();
      toast.success('Space approved');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to approve';
      setError(msg); toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (space: AdminSpace) => {
    setRejectingSpaceId(space.id);
    setRejectingSpace(space);
    setSpaceRejectReason('');
  };

  const handleBlock = async (spaceId: number) => {
    if (!window.confirm('Block this space? Pending bookings will be cancelled and it will be removed from the map.')) return;
    try {
      setActionId(spaceId);
      setError('');
      await adminApi.blockSpace(spaceId);
      await fetchSpaces();
      toast.success('Space blocked');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to block';
      setError(msg); toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const handleUnblock = async (spaceId: number) => {
    try {
      setActionId(spaceId);
      setError('');
      await adminApi.unblockSpace(spaceId);
      await fetchSpaces();
      toast.success('Space unblocked');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to unblock';
      setError(msg); toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectingSpaceId) return;
    try {
      setActionId(rejectingSpaceId);
      setError('');
      await adminApi.rejectSpace(rejectingSpaceId, spaceRejectReason || undefined);
      setRejectingSpaceId(null);
      setSpaceRejectReason('');
      setRejectingSpace(null);
      await fetchSpaces();
      toast.success('Space rejected');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to reject';
      setError(msg); toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const handleRequestDoc = (space: AdminSpace) => {
    setRequestDocSpace(space);
    setRequestDocLabel('');
    setRequestDocMessage('');
  };

  const closeRequestDoc = () => {
    setRequestDocSpace(null);
    setRequestDocLabel('');
    setRequestDocMessage('');
  };

  const submitRequestDoc = async () => {
    if (!requestDocSpace || !requestDocLabel.trim()) return;
    try {
      setActionId(requestDocSpace.id);
      setError('');
      await adminApi.requestSpaceDocument(requestDocSpace.id, requestDocLabel.trim(), requestDocMessage.trim() || undefined);
      closeRequestDoc();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to send request');
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const countForTab = (status?: string) => {
    if (!status) return tally.all;
    if (status === 'PENDING') return tally.pending;
    if (status === 'VERIFIED') return tally.verified;
    if (status === 'REJECTED') return tally.rejected;
    if (status === 'BLOCKED') return tally.blocked;
    return 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Spaces Management</h1>
          <p className="text-gray-500 mt-1">Review and approve parking space listings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab.key === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.key}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab.key === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {countForTab(tab.status)}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden"
      >
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-end gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search spaces..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => fetchSpaces()} className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0">Try Again</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : spaces.length === 0 ? (
          <div className="py-20 px-6">
            <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-pink-50 rounded-2xl border-2 border-dashed border-indigo-200">
              <p className="text-6xl mb-4">🚗</p>
              <p className="text-gray-900 font-bold text-xl">No spaces found</p>
              <p className="text-gray-500 text-sm mt-2">
                Spaces will appear here when owners submit them for verification.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Space</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Owner</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Rate</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Bookings</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Rating</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {spaces.map((space) => (
                  <tr key={space.id} className="hover:bg-gray-50/50 transition-colors group align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Car size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Address intentionally omitted here — it made rows very tall.
                              Full address is shown in the space details modal (Eye icon). */}
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm leading-snug">{space.name}</p>
                            {space.requiresAdminReview && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded border border-rose-200 flex-shrink-0 whitespace-nowrap">
                                Review Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {space.owner ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-gray-900">{space.owner.name}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={11} /> {space.owner.phone}
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm text-gray-700 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                          {space.spaceType}
                        </span>
                        {SPACE_TYPE_RISK[space.spaceType] && (
                          <Badge map={RISK_STYLES} statusKey={SPACE_TYPE_RISK[space.spaceType]}>
                            {SPACE_TYPE_RISK[space.spaceType]} RISK
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">₹{space.hourlyRate}/hr</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700">{space.bookingsCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      {space.ratingCount > 0 ? (
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          space.ratingAvg >= 4.0 ? 'bg-emerald-50 text-emerald-700' :
                          space.ratingAvg >= 3.0 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          <Star size={11} className="fill-current" />
                          {space.ratingAvg.toFixed(1)}
                          <span className="font-medium opacity-70">({fmtCount(space.ratingCount)})</span>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">New</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        map={SPACE_STATUS_STYLES}
                        statusKey={space.status}
                        icon={
                          space.status === 'VERIFIED' ? <CheckCircle2 size={12} /> :
                          (space.status === 'REJECTED' || space.status === 'BLOCKED') ? <XCircle size={12} /> :
                          space.status === 'PENDING' ? <Clock size={12} /> : undefined
                        }
                      >
                        {space.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {/* Eye icon - View Details */}
                        <button
                          onClick={() => openDetailsModal(space)}
                          className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Document icon - View Documents */}
                        <button
                          onClick={() => openDocPanel(space)}
                          className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Documents"
                        >
                          <FileText size={16} />
                        </button>

                        {/* Three-dot menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === space.id ? null : space.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown menu */}
                          {openMenuId === space.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                            >
                              {/* Soft "please upload this document" request — available for
                                  any space that isn't blocked, without changing its status. */}
                              {space.status !== 'BLOCKED' && (
                                <button
                                  onClick={() => { handleRequestDoc(space); setOpenMenuId(null); }}
                                  disabled={actionId === space.id}
                                  className="w-full text-left px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center gap-2 border-b border-gray-100"
                                >
                                  <FileText size={14} /> Request document
                                </button>
                              )}
                              {canMutate && space.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => {
                                      handleApprove(space.id);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={actionId === space.id}
                                    className="w-full text-left px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-2 border-b border-gray-100"
                                  >
                                    <CheckCircle2 size={14} /> Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleReject(space);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={actionId === space.id}
                                    className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                  >
                                    <XCircle size={14} /> Reject
                                  </button>
                                </>
                              )}
                              {canMutate && space.status === 'VERIFIED' && (
                                <button
                                  onClick={() => { handleBlock(space.id); setOpenMenuId(null); }}
                                  disabled={actionId === space.id}
                                  className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                  <XCircle size={14} /> Block space
                                </button>
                              )}
                              {canMutate && space.status === 'BLOCKED' && (
                                <button
                                  onClick={() => { handleUnblock(space.id); setOpenMenuId(null); }}
                                  disabled={actionId === space.id}
                                  className="w-full text-left px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                  <ShieldCheck size={14} /> Unblock space
                                </button>
                              )}
                              {canMutate && space.status === 'REJECTED' && (
                                <button
                                  onClick={() => { handleApprove(space.id); setOpenMenuId(null); }}
                                  disabled={actionId === space.id}
                                  className="w-full text-left px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                  <CheckCircle2 size={14} /> Approve anyway
                                </button>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && spaces.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {from} to {to} of {total.toLocaleString('en-IN')} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Space Details Modal ─────────────────────────── */}
      <AnimatePresence>
        {detailsSpaceId !== null && detailsSpace && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDetailsSpaceId(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{detailsSpace.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin size={14} /> {detailsSpace.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingSpace(detailsSpace)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-white bg-white hover:bg-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={() => setDetailsSpaceId(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {detailsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Step 1: Basic Details */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Car size={18} /> Basic Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Space Type</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.spaceType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Parking For</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.parkingFor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Capacity</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.capacity} slots</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Location */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPinIcon size={18} /> Location</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Address</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.address}</p>
                        </div>
                        {detailsSpace.landmark && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Landmark</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.landmark}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Latitude</p>
                            <p className="text-sm font-mono text-gray-900 mt-1">{detailsSpace.latitude}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Longitude</p>
                            <p className="text-sm font-mono text-gray-900 mt-1">{detailsSpace.longitude}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Pricing & Availability */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={18} /> Pricing & Availability</h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Hourly Rate</p>
                          <p className="text-sm font-bold text-indigo-600 mt-1">₹{detailsSpace.hourlyRate}/hr</p>
                        </div>
                        {detailsSpace.dailyRate && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Daily Rate</p>
                            <p className="text-sm font-bold text-indigo-600 mt-1">₹{detailsSpace.dailyRate}/day</p>
                          </div>
                        )}
                        {detailsSpace.monthlyRate && (
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Monthly Rate</p>
                            <p className="text-sm font-bold text-indigo-600 mt-1">₹{detailsSpace.monthlyRate}/mo</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Availability</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.availability}</p>
                      </div>
                      {detailsSpace.startTime && detailsSpace.endTime && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-semibold uppercase">Hours</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.startTime} - {detailsSpace.endTime}</p>
                        </div>
                      )}
                    </div>

                    {/* Step 3b: Amenities */}
                    {detailsSpace.amenities && detailsSpace.amenities.length > 0 && (
                      <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Zap size={18} /> Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {detailsSpace.amenities.map((amenity, i) => (
                            <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 4: Photos & Video */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <h3 className="font-bold text-gray-900 mb-4">Photos & Video</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Front Photo</p>
                          {(detailsSpace as any).frontPhotoUrl ? (
                            <img src={(detailsSpace as any).frontPhotoUrl} alt="Front" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                          ) : (
                            <p className="text-sm font-semibold text-gray-400">— Not uploaded</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Area Photo</p>
                          {(detailsSpace as any).areaPhotoUrl ? (
                            <img src={(detailsSpace as any).areaPhotoUrl} alt="Area" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                          ) : (
                            <p className="text-sm font-semibold text-gray-400">— Not uploaded</p>
                          )}
                        </div>
                        {(detailsSpace as any).videoUrl && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Walkthrough Video</p>
                            <video
                              src={(detailsSpace as any).videoUrl}
                              controls
                              className="w-full rounded-xl border border-gray-200 max-h-48"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Visibility</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.visibility || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Document Type</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.docType || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Owner Info */}
                    {detailsSpace.owner && (
                      <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={18} /> Owner Information</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Name</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.owner.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Phone</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.owner.phone}</p>
                          </div>
                          {detailsSpace.owner.email && (
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                              <p className="text-sm font-semibold text-gray-900 mt-1">{detailsSpace.owner.email}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Status</p>
                          <div className="mt-1">
                            <Badge
                              map={SPACE_STATUS_STYLES}
                              statusKey={detailsSpace.status}
                              icon={
                                detailsSpace.status === 'VERIFIED' ? <CheckCircle2 size={12} /> :
                                detailsSpace.status === 'REJECTED' ? <XCircle size={12} /> :
                                detailsSpace.status === 'PENDING' ? <Clock size={12} /> : undefined
                              }
                            >
                              {detailsSpace.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Bookings: <span className="font-bold text-gray-600">{detailsSpace.bookingsCount}</span></p>
                      </div>
                      {detailsSpace.status === 'REJECTED' && (detailsSpace as any).rejectionReason && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                          <p className="text-xs text-rose-600 font-semibold uppercase mb-1">Rejection Reason</p>
                          <p className="text-sm text-rose-800 font-medium">{(detailsSpace as any).rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Document Review Panel (slide-over) ─────────────────────────── */}
      <AnimatePresence>
        {docPanelSpaceId !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDocPanelSpaceId(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <h2 className="font-bold text-gray-900">Documents — {docPanelSpaceName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Review and verify uploaded compliance documents</p>
                </div>
                <button onClick={() => setDocPanelSpaceId(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Compliance Status Banner */}
              {docCompliance && (
                <div className={`mx-4 mt-4 p-3 rounded-xl border flex items-start gap-3 ${docCompliance.compliant ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  {docCompliance.compliant
                    ? <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-bold ${docCompliance.compliant ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {docCompliance.compliant ? 'Documents compliant' : 'Missing required documents'}
                    </p>
                    {!docCompliance.compliant && docCompliance.missingDocs.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {docCompliance.missingDocs.map((m, i) => (
                          <li key={i} className="text-xs text-rose-600">• {m}</li>
                        ))}
                      </ul>
                    )}
                    {docCompliance.rule && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge map={RISK_STYLES} statusKey={docCompliance.rule.riskLevel}>
                          {docCompliance.rule.riskLevel} RISK
                        </Badge>
                        {docCompliance.rule.requiresAdminReview && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs font-bold">Admin Review Required</span>
                        )}
                      </div>
                    )}
                    {docCompliance.rule?.note && (
                      <p className="text-xs text-gray-500 mt-1">{docCompliance.rule.note}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Document list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-900 font-semibold">No documents uploaded</p>
                    <p className="text-gray-400 text-sm mt-1">Owner hasn't uploaded any documents yet</p>
                  </div>
                ) : documents.map((doc) => (
                  <div key={doc.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        doc.status === 'VERIFIED' ? 'bg-emerald-100' :
                        doc.status === 'REJECTED' ? 'bg-rose-100' : 'bg-indigo-100'
                      }`}>
                        <FileText size={18} className={
                          doc.status === 'VERIFIED' ? 'text-emerald-600' :
                          doc.status === 'REJECTED' ? 'text-rose-600' : 'text-indigo-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{doc.documentLabel}</p>
                          <Badge map={SPACE_STATUS_STYLES} statusKey={doc.status}>
                            {doc.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{doc.fileType} • {doc.fileSizeBytes ? `${Math.round(doc.fileSizeBytes / 1024)} KB` : '—'}</p>
                        {doc.rejectionReason && (
                          <p className="text-xs text-rose-600 mt-1">Reason: {doc.rejectionReason}</p>
                        )}
                        {(() => {
                          // fileUrl is a full signed Supabase URL (legacy relative paths get the SOCKET_URL prefix).
                          const href = /^https?:\/\//.test(doc.fileUrl) ? doc.fileUrl : `${SOCKET_URL}${doc.fileUrl}`;
                          // Decide if the uploaded file is an image / PDF we can preview inline.
                          const isImage = /^image\//i.test(doc.fileType || '') || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(doc.fileUrl || '');
                          const isPdf = /pdf/i.test(doc.fileType || '') || /\.pdf(\?|$)/i.test(doc.fileUrl || '');
                          return (
                            <>
                              {/* Show the actual uploaded file inline so the admin SEES what
                                  was submitted without leaving the panel. */}
                              {isImage && (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                  <img
                                    src={href}
                                    alt={doc.documentLabel}
                                    className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-white"
                                  />
                                </a>
                              )}
                              {isPdf && (
                                <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                                  <iframe
                                    src={`${href}#toolbar=0`}
                                    title={doc.documentLabel}
                                    className="w-full h-[420px] bg-white"
                                  />
                                </div>
                              )}
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-2 hover:text-indigo-800"
                              >
                                <ExternalLink size={11} /> {(isImage || isPdf) ? 'Open full screen' : 'View File'}
                              </a>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Reject reason input */}
                    {rejectDocId === doc.id && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Rejection reason..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    {doc.status !== 'VERIFIED' && canMutate && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleVerifyDoc(doc.id, 'VERIFIED')}
                          disabled={verifyingDocId === doc.id}
                          className="flex-1 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {verifyingDocId === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Verify
                        </button>
                        {rejectDocId === doc.id ? (
                          <>
                            <button
                              onClick={() => handleVerifyDoc(doc.id, 'REJECTED', rejectReason)}
                              disabled={verifyingDocId === doc.id}
                              className="flex-1 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors"
                            >
                              Confirm Reject
                            </button>
                            <button onClick={() => setRejectDocId(null)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setRejectDocId(doc.id); setRejectReason(''); }}
                            className="flex-1 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                      </div>
                    )}
                    {doc.status === 'VERIFIED' && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Verified {doc.verifiedAt ? new Date(doc.verifiedAt).toLocaleDateString('en-IN') : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Space Rejection Modal ─────────────────────────── */}
      <AnimatePresence>
        {rejectingSpaceId !== null && rejectingSpace && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => {
                setRejectingSpaceId(null);
                setSpaceRejectReason('');
                setRejectingSpace(null);
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-orange-50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <XCircle size={20} className="text-rose-600" /> Reject Space
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Provide a reason for rejection</p>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Space: {rejectingSpace.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rejection Reason <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      value={spaceRejectReason}
                      onChange={(e) => setSpaceRejectReason(e.target.value.slice(0, 500))}
                      placeholder="Explain why this space is being rejected..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {spaceRejectReason.length}/500 characters
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50">
                  <button
                    onClick={() => {
                      setRejectingSpaceId(null);
                      setSpaceRejectReason('');
                      setRejectingSpace(null);
                    }}
                    className="flex-1 py-2.5 text-sm font-semibold bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReject}
                    disabled={actionId === rejectingSpaceId || !spaceRejectReason.trim()}
                    className="flex-1 py-2.5 text-sm font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {actionId === rejectingSpaceId ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle size={14} /> Reject Space
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── Request-document modal (soft ask, no status change) ───────────── */}
        {requestDocSpace && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeRequestDoc}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-indigo-600" /> Request a document
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Ask the owner to upload a document. The space stays as-is.</p>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Space: {requestDocSpace.name}</p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Which document? <span className="text-rose-600">*</span>
                    </label>
                    {/* Quick-pick chips for the common proof documents. */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['Maintenance Bill', 'Parking Allocation Photo', 'Rental Agreement', 'EB Bill', 'Property Tax', 'Owner Permission'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRequestDocLabel(d)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            requestDocLabel === d
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={requestDocLabel}
                      onChange={(e) => setRequestDocLabel(e.target.value.slice(0, 80))}
                      placeholder="e.g. Maintenance Bill"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Message to owner <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={requestDocMessage}
                      onChange={(e) => setRequestDocMessage(e.target.value.slice(0, 300))}
                      placeholder="e.g. The bill you uploaded is unclear — please re-upload a readable copy."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">{requestDocMessage.length}/300 characters</p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50">
                  <button
                    onClick={closeRequestDoc}
                    className="flex-1 py-2.5 text-sm font-semibold bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRequestDoc}
                    disabled={actionId === requestDocSpace.id || !requestDocLabel.trim()}
                    className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {actionId === requestDocSpace.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <FileText size={14} /> Send request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {editingSpace && (
        <SpaceEditModal
          space={editingSpace}
          onClose={() => setEditingSpace(null)}
          onSaved={() => { toast.success('Space updated'); setEditingSpace(null); setDetailsSpaceId(null); fetchSpaces(); }}
        />
      )}
    </div>
  );
}

