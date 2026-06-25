'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Search, Eye, Download,
  Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Car, Loader2, X, MapPin, Phone, Mail, User, Bell, Shield, AlertCircle,
  Ban, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { TableSkeleton } from '@/components/Skeleton';
import { ExportRangeModal } from '@/components/ExportRangeModal';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import Link from 'next/link';

interface AdminBooking {
  id: string;
  rawId: string;
  parker: { id: number; name: string; phone?: string } | null;
  owner: { id: number; name: string; phone?: string } | null;
  space: { id?: number; name: string; address?: string } | null;
  vehicle?: { licensePlate: string } | null;
  date: string;
  duration?: number;
  amount: string;
  status: string;
  cancelReason?: string | null;
  createdAt?: string;
}

interface BookingConsent {
  verifiedSurroundings: boolean;
  acceptLocalParkingRules: boolean;
  acceptFineResponsibility: boolean;
  acceptPlatformDisclaimer: boolean;
  acceptParkingTerms: boolean;
  acceptedAt: string;
  platform?: string;
  appVersion?: string;
}

interface BookingDetails {
  id: string; // booking cuid (Booking.id)
  displayId: string;
  status: string;
  rawStatus: string;
  parker: { id: number; name: string; phone: string; email: string | null } | null;
  owner: { id: number; name: string; phone: string; email: string | null } | null;
  space: {
    id: number;
    name: string;
    address: string;
    landmark: string | null;
    spaceType: string;
    hourlyRate: number;
    capacity: number;
  } | null;
  vehicle: {
    id: number;
    brandModel: string;
    licensePlate: string;
    vehicleType: string;
  } | null;
  duration: number;
  consent?: BookingConsent | null;
  totalAmount: number;
  paymentMode: string;
  eta: string | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Toast {
  id: number;
  message: string;
  space: string;
  type?: 'info' | 'success' | 'error';
}

const tabs = [
  { key: 'All Bookings', status: undefined },
  { key: 'Active Sessions', status: 'active' },
  { key: 'Completed', status: 'completed' },
  { key: 'Cancelled', status: 'cancelled' },
] as const;

const DISPUTE_ISSUE_TYPES = [
  { value: 'FAKER_BOOKING', label: 'Fake / Fraudulent Booking' },
  { value: 'DAMAGING_PROPERTY', label: 'Property Damage' },
  { value: 'REPEATED_CANCELLATION', label: 'Repeated Cancellations' },
  { value: 'ILLEGAL_PARKING', label: 'Illegal Parking' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'FAKE_SPACE', label: 'Fake Space Listing' },
  { value: 'UNSAFE_AREA', label: 'Unsafe Area' },
  { value: 'OFFLINE_PAYMENT_DEMAND', label: 'Offline Payment Demand' },
  { value: 'MISLEADING_LISTING', label: 'Misleading Listing' },
  { value: 'OTHER', label: 'Other' },
];

const DISPUTE_ACTIONS = [
  { value: 'warn_parker', label: 'Warn Parker', color: 'amber' },
  { value: 'warn_owner', label: 'Warn Owner', color: 'amber' },
  { value: 'refund', label: 'Issue Refund', color: 'emerald' },
  { value: 'escalate', label: 'Escalate for Review', color: 'rose' },
] as const;

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');
  const focusHandledRef = useRef(false);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>(tabs[0]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewingBooking, setViewingBooking] = useState<BookingDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const limit = 20;

  const pushToast = useCallback((message: string, space: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, space, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listBookings({
        status: activeTab.status,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setBookings(res.bookings || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Real-time booking updates via socket.io
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));

    socket.on('booking:new', (payload: any) => {
      fetchBookings();
      pushToast('New booking received!', payload?.space || 'Unknown space', 'info');
    });

    socket.on('booking:update', () => {
      fetchBookings();
    });

    return () => { socket.disconnect(); };
  }, [fetchBookings, pushToast]);

  const handleViewBooking = async (rawId: string) => {
    setLoadingDetails(true);
    setActionError('');
    try {
      const res = await adminApi.getBookingDetails(rawId);
      setViewingBooking(res.booking);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || 'Failed to load booking details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Auto-open a booking's details when arriving via /bookings?focus=<rawId>
  // (e.g. from a transaction in Payments). Runs once after the first load.
  useEffect(() => {
    if (!focusId || focusHandledRef.current || loading) return;
    focusHandledRef.current = true;
    handleViewBooking(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading]);

  const handleBookingCancelled = (bookingId: string) => {
    // Close modal and refresh list
    setViewingBooking(null);
    fetchBookings();
    pushToast('Booking cancelled successfully', bookingId, 'success');
  };

  const handleDisputeCreated = () => {
    pushToast('Dispute action recorded successfully', '', 'success');
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bookings & Sessions</h1>
          <p className="text-gray-500 mt-1">Monitor active parking sessions and historical bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Updates
          </span>
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primaryDark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <span className="text-sm">{actionError}</span>
          <button onClick={() => setActionError('')} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden"
      >
        {/* Tabs */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit border border-gray-200/60">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab.key === tab.key
                    ? 'bg-white text-primary shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
              >
                {tab.key}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Booking ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Users (Parker / Owner)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Space & Time</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">
                      No bookings found
                    </td>
                  </tr>
                ) : bookings.map((booking) => (
                  <tr
                    key={booking.rawId}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => handleViewBooking(booking.rawId)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-indigo-600 text-sm hover:underline">{booking.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-gray-900">
                          {booking.parker?.name ?? '—'} <span className="font-normal text-gray-500">(P)</span>
                        </span>
                        <span className="text-sm text-gray-600">
                          {booking.owner?.name ?? '—'} <span className="text-gray-400">(O)</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <Car size={14} className="text-gray-400" /> {booking.space?.name ?? '—'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} /> {booking.date} • {booking.duration}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{booking.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                      {booking.cancelReason && (
                        <p className="text-[11px] text-gray-400 mt-1">{booking.cancelReason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewBooking(booking.rawId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Eye size={14} /> View
                        </button>
                        <Link
                          href={`/cases/${booking.rawId}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                          title="Open full case evidence bundle"
                        >
                          <Shield size={14} /> Case
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
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
      </motion.div>

      {/* Loading overlay */}
      {loadingDetails && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <Loader2 size={48} className="animate-spin text-white" />
        </div>
      )}

      {/* Booking Details Modal */}
      <AnimatePresence>
        {viewingBooking && (
          <BookingDetailsModal
            booking={viewingBooking}
            onClose={() => setViewingBooking(null)}
            onCancelled={handleBookingCancelled}
            onDisputeCreated={handleDisputeCreated}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`flex items-center gap-3 bg-white shadow-xl rounded-2xl px-5 py-4 min-w-[320px] border ${
                toast.type === 'success'
                  ? 'border-emerald-200'
                  : toast.type === 'error'
                  ? 'border-rose-200'
                  : 'border-indigo-200'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : toast.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-indigo-100 text-indigo-600'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Bell size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{toast.message}</p>
                {toast.space && <p className="text-xs text-gray-500 truncate">{toast.space}</p>}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showExport && (
          <ExportRangeModal
            title="Export Bookings"
            filenamePrefix="bookings"
            onExport={(startDate, endDate) => adminApi.exportBookingsCsv({ startDate, endDate })}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────── Status Badge ────────────────────
function StatusBadge({ status }: { status: string }) {
  const config =
    status === 'Active' ? { bg: 'bg-indigo-50 text-indigo-700', icon: Clock } :
    status === 'Completed' ? { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 } :
    status === 'Upcoming' || status === 'Pending' ? { bg: 'bg-amber-50 text-amber-700', icon: Clock } :
    { bg: 'bg-rose-50 text-rose-700', icon: XCircle };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.bg}`}>
      <config.icon size={12} />
      {status}
    </div>
  );
}

// ──────────────────── Booking Details Modal ────────────────────
function BookingDetailsModal({
  booking,
  onClose,
  onCancelled,
  onDisputeCreated,
}: {
  booking: BookingDetails;
  onClose: () => void;
  onCancelled: (bookingId: string) => void;
  onDisputeCreated: () => void;
}) {
  const [consent, setConsent] = useState<BookingConsent | null>(booking.consent || null);
  const [loadingConsent, setLoadingConsent] = useState(!booking.consent);

  // Force cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Dispute state
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const isCancellable = ['Active', 'Upcoming', 'Pending'].includes(booking.status);

  useEffect(() => {
    if (!booking.consent && loadingConsent) {
      adminApi.getBookingConsent(String(booking.id))
        .then((d) => {
          if (d?.success && d.consent) setConsent(d.consent);
          setLoadingConsent(false);
        })
        .catch(() => setLoadingConsent(false));
    }
  }, [booking, loadingConsent]);

  const handleForceCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await adminApi.forceCancelBooking(booking.id, cancelReason.trim());
      onCancelled(booking.id);
    } catch (e: any) {
      setCancelError(e?.response?.data?.error || e?.message || 'Failed to cancel booking');
      setCancelling(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50">
                <Car size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                <p className="text-xs font-mono text-gray-400">{booking.displayId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={booking.status} />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickStat label="Amount" value={`₹${booking.totalAmount}`} />
              <QuickStat label="Duration" value={`${booking.duration} hr${booking.duration > 1 ? 's' : ''}`} />
              <QuickStat label="Payment" value={booking.paymentMode?.replace(/_/g, ' ') || '—'} />
              <QuickStat label="Booked On" value={new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
            </div>

            {/* Parker & Owner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parker */}
              <div className="border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <User size={14} />
                  </div>
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">Parker</span>
                </div>
                {booking.parker ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">{booking.parker.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone size={12} className="text-gray-400" /> {booking.parker.phone}
                    </div>
                    {booking.parker.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={12} className="text-gray-400" /> {booking.parker.email}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 font-mono">ID #{booking.parker.id}</p>
                  </div>
                ) : <p className="text-sm text-gray-400">No parker data</p>}
              </div>

              {/* Owner */}
              <div className="border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <User size={14} />
                  </div>
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">Space Owner</span>
                </div>
                {booking.owner ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-900">{booking.owner.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone size={12} className="text-gray-400" /> {booking.owner.phone}
                    </div>
                    {booking.owner.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={12} className="text-gray-400" /> {booking.owner.email}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 font-mono">ID #{booking.owner.id}</p>
                  </div>
                ) : <p className="text-sm text-gray-400">No owner data</p>}
              </div>
            </div>

            {/* Space Details */}
            {booking.space && (
              <div className="border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Space Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Space Name" value={booking.space.name} />
                  <InfoItem label="Type" value={booking.space.spaceType} />
                  <InfoItem label="Address" value={booking.space.address} full />
                  {booking.space.landmark && (
                    <InfoItem label="Landmark" value={booking.space.landmark} />
                  )}
                  <InfoItem label="Hourly Rate" value={`₹${booking.space.hourlyRate}/hr`} />
                  <InfoItem label="Capacity" value={`${booking.space.capacity} slot${booking.space.capacity > 1 ? 's' : ''}`} />
                </div>
              </div>
            )}

            {/* Vehicle Details */}
            {booking.vehicle && (
              <div className="border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Car size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Vehicle</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <InfoItem label="Brand/Model" value={booking.vehicle.brandModel} />
                  <InfoItem label="Registration" value={booking.vehicle.licensePlate} />
                  <InfoItem label="Type" value={booking.vehicle.vehicleType} />
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Timeline</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Booking Created" value={formatDate(booking.createdAt)} />
                <InfoItem label="ETA / Arrived" value={formatDate(booking.eta)} />
                <InfoItem label="Session Started" value={formatDate(booking.sessionStartedAt)} />
                <InfoItem label="Session Ended / Completed" value={formatDate(booking.sessionEndedAt)} />
                <InfoItem label="Last Updated" value={formatDate(booking.updatedAt)} />
              </div>
            </div>

            {/* Legal Consent Section */}
            <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Parker Legal Acceptance</h3>
              </div>
              {loadingConsent ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-blue-600" size={18} />
                </div>
              ) : consent ? (
                <div className="space-y-3">
                  <ConsentCheckItem label="Verified Surroundings" desc="User confirmed surrounding safety before parking" checked={consent.verifiedSurroundings} />
                  <ConsentCheckItem label="Local Parking Rules" desc="User accepts responsibility for local regulations" checked={consent.acceptLocalParkingRules} />
                  <ConsentCheckItem label="Fine/Towing Responsibility" desc="User accepts responsibility for fines and towing charges" checked={consent.acceptFineResponsibility} />
                  <ConsentCheckItem label="Platform Disclaimer" desc="User understands ParkSwift only coordinates parking" checked={consent.acceptPlatformDisclaimer} />
                  <ConsentCheckItem label="Parking Terms & Conditions" desc="User agrees to ParkSwift parking terms" checked={consent.acceptParkingTerms} />
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-start gap-3 mt-4">
                    <AlertCircle size={14} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Accepted On</p>
                      <p className="text-xs text-gray-600 mt-1">{formatDate(consent.acceptedAt)}</p>
                      {consent.platform && <p className="text-xs text-gray-500 mt-1">Platform: {consent.platform} | App: v{consent.appVersion || '—'}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="mx-auto text-gray-400 mb-2" size={20} />
                  <p className="text-sm text-gray-500">No consent record found</p>
                </div>
              )}
            </div>

            {/* Force Cancel section — only for cancellable statuses */}
            {isCancellable && (
              <div className="border border-rose-200 bg-rose-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ban size={16} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Admin Actions</h3>
                </div>

                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Ban size={14} /> Force Cancel Booking
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-rose-700 font-medium">This action is irreversible. Provide a reason:</p>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter cancellation reason (e.g., Fraudulent booking, Policy violation)..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-rose-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
                    />
                    {cancelError && (
                      <p className="text-xs text-rose-600 flex items-center gap-1.5">
                        <AlertCircle size={12} /> {cancelError}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleForceCancel}
                        disabled={cancelling}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                      >
                        {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                        {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                      </button>
                      <button
                        onClick={() => { setShowCancelConfirm(false); setCancelReason(''); setCancelError(''); }}
                        disabled={cancelling}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between rounded-b-3xl">
            <button
              onClick={() => setShowDisputeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition-colors"
            >
              <AlertTriangle size={14} /> Open Dispute
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-primaryDark text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Dispute Resolution Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <DisputeModal
            booking={booking}
            onClose={() => setShowDisputeModal(false)}
            onSuccess={() => {
              setShowDisputeModal(false);
              onDisputeCreated();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ──────────────────── Dispute Resolution Modal ────────────────────
function DisputeModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: BookingDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [issueType, setIssueType] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [action, setAction] = useState<'warn_parker' | 'warn_owner' | 'refund' | 'escalate' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!issueType) { setError('Please select an issue type.'); return; }
    if (!adminNotes.trim()) { setError('Please provide admin notes describing the issue.'); return; }
    if (!action) { setError('Please select an action to take.'); return; }

    setSubmitting(true);
    setError('');
    try {
      await adminApi.createBookingDispute(booking.id, {
        issueType,
        adminNotes: adminNotes.trim(),
        action: action as any,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to create dispute');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Dispute Resolution</h2>
              <p className="text-xs text-gray-400 font-mono">{booking.displayId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Issue type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Type</label>
            <div className="relative">
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              >
                <option value="">Select issue type...</option>
                {DISPUTE_ISSUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admin Notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Describe the issue, evidence reviewed, and recommended resolution..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition-all"
            />
          </div>

          {/* Action selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Action to Take</label>
            <div className="grid grid-cols-2 gap-2">
              {DISPUTE_ACTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAction(a.value)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all text-left ${
                    action === a.value
                      ? a.color === 'amber'
                        ? 'bg-amber-50 border-amber-400 text-amber-700'
                        : a.color === 'emerald'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'bg-rose-50 border-rose-400 text-rose-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    action === a.value
                      ? a.color === 'amber'
                        ? 'bg-amber-500'
                        : a.color === 'emerald'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                      : 'bg-gray-300'
                  }`} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
            {submitting ? 'Submitting...' : 'Submit Dispute Action'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────── Helpers ────────────────────
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function InfoItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function ConsentCheckItem({ label, desc, checked }: { label: string; desc: string; checked: boolean }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-blue-100">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${checked ? 'bg-emerald-100 border-emerald-500' : 'bg-gray-100 border-gray-300'}`}>
          {checked && <CheckCircle2 size={14} className="text-emerald-600" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
    </div>
  );
}
