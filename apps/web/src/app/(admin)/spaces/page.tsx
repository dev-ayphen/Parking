'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Search, Filter, MoreVertical, MapPin, Phone,
  CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Loader2, Car,
  FileText, ShieldCheck, AlertTriangle, ExternalLink, X, Eye, MapPinIcon, Users, Zap, DollarSign,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

interface AdminSpace {
  id: number;
  name: string;
  spaceType: string;
  address: string;
  landmark: string | null;
  capacity: number;
  hourlyRate: number;
  status: string;
  requiresAdminReview?: boolean;
  bookingsCount: number;
  owner: { id: number; name: string; phone: string; email: string | null } | null;
  createdAt: string;
  // Fields only present on the single-space detail response (not in the list endpoint).
  parkingFor?: string;
  dailyRate?: number | null;
  monthlyRate?: number | null;
  availability?: string;
  startTime?: string | null;
  endTime?: string | null;
  amenities?: string[];
  visibility?: string | null;
  docType?: string | null;
  latitude?: number;
  longitude?: number;
  ownerConsent?: {
    acceptOwnerResponsibility: boolean;
    acceptLegalCompliance: boolean;
    acceptNonViolationDeclaration: boolean;
    acceptedAt: string;
  } | null;
}

interface SpaceDocument {
  id: number;
  spaceId: number;
  documentType: string;
  documentLabel: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number | null;
  status: string;
  verifiedAt: string | null;
  verifiedById: number | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface DocCompliance {
  compliant: boolean;
  missingDocs: string[];
  rule: { spaceType: string; riskLevel: string; requiresAdminReview: boolean; note: string } | null;
}

interface Tally {
  all: number;
  pending: number;
  verified: number;
  rejected: number;
  blocked: number;
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SPACE_TYPE_RISK: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
  'Independent House': 'LOW',
  'Rented House': 'LOW',
  'Apartment Owner Slot': 'LOW',
  'Apartment Tenant Slot': 'MEDIUM',
  'Gated Villa': 'LOW',
  'Shop Front Parking': 'MEDIUM',
  'Office Parking': 'LOW',
  'Vacant Private Land': 'MEDIUM',
  'Inside Compound': 'LOW',
  'Open Frontage Area': 'HIGH',
};

const tabs = [
  { key: 'All Spaces', status: undefined },
  { key: 'Pending Review', status: 'PENDING' },
  { key: 'Approved', status: 'VERIFIED' },
] as const;

export default function SpacesPage() {
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

  // Rejection modal state
  const [rejectingSpaceId, setRejectingSpaceId] = useState<number | null>(null);
  const [spaceRejectReason, setSpaceRejectReason] = useState('');
  const [rejectingSpace, setRejectingSpace] = useState<AdminSpace | null>(null);

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
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const [docsRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/admin/spaces/${space.id}/documents`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/spaces/${space.id}/document-compliance`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const docsJson = await docsRes.json();
      const compJson = await compRes.json();
      if (docsJson.success) setDocuments(docsJson.documents || []);
      if (compJson.success) setDocCompliance({ compliant: compJson.compliant, missingDocs: compJson.missingDocs, rule: compJson.rule });
    } catch {
      /* ignore */
    } finally {
      setDocsLoading(false);
    }
  };

  const openDetailsModal = async (space: AdminSpace) => {
    setDetailsSpaceId(space.id);
    setDetailsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_BASE}/spaces/${space.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setDetailsSpace(json.space);
    } catch {
      /* ignore */
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifyDoc = async (docId: number, action: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      setVerifyingDocId(docId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      await fetch(`${API_BASE}/admin/spaces/${docPanelSpaceId}/documents/${docId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, rejectionReason }),
      });
      // Refresh docs
      if (docPanelSpaceId) {
        const docsRes = await fetch(`${API_BASE}/admin/spaces/${docPanelSpaceId}/documents`, { headers: { Authorization: `Bearer ${token}` } });
        const docsJson = await docsRes.json();
        if (docsJson.success) setDocuments(docsJson.documents || []);
      }
      setRejectDocId(null);
      setRejectReason('');
    } catch {
      /* ignore */
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleApprove = async (spaceId: number) => {
    try {
      setActionId(spaceId);
      await adminApi.approveSpace(spaceId);
      await fetchSpaces();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (space: AdminSpace) => {
    setRejectingSpaceId(space.id);
    setRejectingSpace(space);
    setSpaceRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectingSpaceId) return;
    try {
      setActionId(rejectingSpaceId);
      await adminApi.rejectSpace(rejectingSpaceId, spaceRejectReason || undefined);
      setRejectingSpaceId(null);
      setSpaceRejectReason('');
      setRejectingSpace(null);
      await fetchSpaces();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to reject');
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
    return 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
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
          <button className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {spaces.map((space) => (
                  <tr key={space.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Car size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <p className="font-bold text-gray-900 text-sm">{space.name}</p>
                            {space.requiresAdminReview && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded border border-rose-200 flex-shrink-0 whitespace-nowrap">
                                Review Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={11} className="flex-shrink-0" /> <span className="break-words">{space.address}</span>
                          </p>
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
                          <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-bold border ${RISK_COLORS[SPACE_TYPE_RISK[space.spaceType]]}`}>
                            {SPACE_TYPE_RISK[space.spaceType]} RISK
                          </span>
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
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        space.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                        space.status === 'REJECTED' || space.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {space.status === 'VERIFIED' && <CheckCircle2 size={12} />}
                        {(space.status === 'REJECTED' || space.status === 'BLOCKED') && <XCircle size={12} />}
                        {space.status === 'PENDING' && <Clock size={12} />}
                        {space.status}
                      </div>
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
                              className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                            >
                              {space.status === 'PENDING' && (
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
                              {space.status !== 'PENDING' && (
                                <p className="px-4 py-2 text-xs text-gray-500">No actions available</p>
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
                  <button onClick={() => setDetailsSpaceId(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
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

                    {/* Step 4: Photos & Visibility */}
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <h3 className="font-bold text-gray-900 mb-4">Photos & Visibility</h3>
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
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                            detailsSpace.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                            detailsSpace.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {detailsSpace.status === 'VERIFIED' && <CheckCircle2 size={12} />}
                            {(detailsSpace.status === 'REJECTED') && <XCircle size={12} />}
                            {detailsSpace.status === 'PENDING' && <Clock size={12} />}
                            {detailsSpace.status}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">Bookings: <span className="font-bold text-gray-600">{detailsSpace.bookingsCount}</span></p>
                      </div>
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${RISK_COLORS[docCompliance.rule.riskLevel] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {docCompliance.rule.riskLevel} RISK
                        </span>
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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            doc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                            doc.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{doc.fileType} • {doc.fileSizeBytes ? `${Math.round(doc.fileSizeBytes / 1024)} KB` : '—'}</p>
                        {doc.rejectionReason && (
                          <p className="text-xs text-rose-600 mt-1">Reason: {doc.rejectionReason}</p>
                        )}
                        {/* View file — fileUrl is now a full Supabase (signed) URL.
                            Fall back to the legacy SOCKET_URL prefix for old relative paths. */}
                        <a
                          href={/^https?:\/\//.test(doc.fileUrl) ? doc.fileUrl : `${SOCKET_URL}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-2 hover:text-indigo-800"
                        >
                          <ExternalLink size={11} /> View File
                        </a>
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
                    {doc.status !== 'VERIFIED' && (
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
      </AnimatePresence>
    </div>
  );
}
