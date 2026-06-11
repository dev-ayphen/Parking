'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, MoreVertical, MessageSquare, X,
  Loader2, ChevronLeft, ChevronRight, AlertCircle,
  Clock, CheckCircle2, Pause, XCircle, Send,
  AlertTriangle, Flame, ArrowUpRight,
} from 'lucide-react';
import { io as createSocket, Socket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  user: { id: number; name: string; phone: string } | null;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetails extends SupportTicket {
  resolutionNote: string | null;
  closedAt: string | null;
  attachmentUrls: string[];
  user: { id: number; name: string; phone: string; email: string | null; role: string } | null;
  replies: { id: number; message: string; isAdmin: boolean; authorId: number | null; createdAt: string }[];
}

interface Stats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

const tabs = [
  { key: 'All', status: undefined },
  { key: 'Open', status: 'OPEN' },
  { key: 'In Progress', status: 'IN_PROGRESS' },
  { key: 'Resolved', status: 'RESOLVED' },
  { key: 'Closed', status: 'CLOSED' },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  OPEN: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle, label: 'Open' },
  IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Clock, label: 'In Progress' },
  RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, label: 'Resolved' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle, label: 'Closed' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600', icon: ArrowUpRight, label: 'Low' },
  NORMAL: { bg: 'bg-blue-50', text: 'text-blue-700', icon: ArrowUpRight, label: 'Normal' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', icon: AlertTriangle, label: 'High' },
  URGENT: { bg: 'bg-rose-50', text: 'text-rose-700', icon: Flame, label: 'Urgent' },
};

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: 'Technical',
  PAYMENT: 'Payment',
  ACCOUNT: 'Account',
  SPACE: 'Space',
  COMPLAINT: 'Complaint',
  FEEDBACK: 'Feedback',
  OTHER: 'Other',
};

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>(tabs[0]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Stats>({ open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [viewingTicket, setViewingTicket] = useState<TicketDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const limit = 20;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listSupportTickets({
        status: activeTab.status,
        priority: priorityFilter || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setTickets(res.tickets || []);
      setTotal(res.total || 0);
      if (res.stats) setStats(res.stats);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [activeTab, priorityFilter, search, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchTickets(), 250);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  // Real-time admin socket: refresh when new tickets/replies arrive.
  // The socket server requires a JWT in the handshake AND admin:join only joins
  // the admin room if that JWT's role is ADMIN — so the token is mandatory here.
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token } });
    socket.on('connect', () => socket.emit('admin:join'));
    const refresh = () => fetchTickets();
    socket.on('support:new', refresh);
    socket.on('support:new-reply', refresh);
    socket.on('support:reopened', refresh);
    return () => { socket.disconnect(); };
  }, [fetchTickets]);

  useEffect(() => {
    const onClick = () => setMenuOpenFor(null);
    if (menuOpenFor !== null) {
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [menuOpenFor]);

  const handleView = async (ticket: SupportTicket) => {
    setMenuOpenFor(null);
    setLoadingDetails(true);
    try {
      const res = await adminApi.getSupportTicket(ticket.id);
      setViewingTicket(res.ticket);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to load ticket');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleQuickStatus = async (ticket: SupportTicket, newStatus: string) => {
    setMenuOpenFor(null);
    try {
      await adminApi.updateSupportTicket(ticket.id, { status: newStatus });
      await fetchTickets();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to update');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Support & Issues</h1>
          <p className="text-gray-500 mt-1">Manage user tickets, complaints, and bug reports.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={stats.open} icon={AlertCircle} color="bg-amber-50 text-amber-600 border-amber-100" />
        <StatCard label="In Progress" value={stats.in_progress} icon={Clock} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <StatCard label="Closed" value={stats.closed} icon={XCircle} color="bg-gray-50 text-gray-600 border-gray-100" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-visible"
      >
        {/* Tabs + filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit border border-gray-200/60 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
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
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto overflow-y-visible">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Ticket</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">User</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Category</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Replies</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Created</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-400">No tickets found</td></tr>
                ) : tickets.map((ticket) => {
                  const status = STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN;
                  const priority = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.NORMAL;
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => handleView(ticket)}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-sm">
                          <p className="font-bold text-gray-900 text-sm truncate">{ticket.subject}</p>
                          <p className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-gray-900">{ticket.user?.name || '—'}</span>
                          <span className="text-xs text-gray-500">{ticket.user?.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${priority.bg} ${priority.text}`}>
                          <priority.icon size={12} />
                          {priority.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                          <status.icon size={12} />
                          {status.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <MessageSquare size={12} className="text-gray-400" />
                          {ticket.replyCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenFor(menuOpenFor === ticket.id ? null : ticket.id);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {menuOpenFor === ticket.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-2 top-full mt-1 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                          >
                            <button onClick={() => handleView(ticket)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                              <MessageSquare size={14} className="text-gray-500" /> View & Reply
                            </button>
                            {ticket.status !== 'IN_PROGRESS' && (
                              <button onClick={() => handleQuickStatus(ticket, 'IN_PROGRESS')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50">
                                <Pause size={14} /> Mark In Progress
                              </button>
                            )}
                            {ticket.status !== 'RESOLVED' && (
                              <button onClick={() => handleQuickStatus(ticket, 'RESOLVED')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">
                                <CheckCircle2 size={14} /> Mark Resolved
                              </button>
                            )}
                            {ticket.status !== 'CLOSED' && (
                              <button onClick={() => handleQuickStatus(ticket, 'CLOSED')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <XCircle size={14} /> Close
                              </button>
                            )}
                            {ticket.status === 'CLOSED' && (
                              <button onClick={() => handleQuickStatus(ticket, 'OPEN')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50">
                                <AlertCircle size={14} /> Reopen
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing {from} to {to} of {total.toLocaleString('en-IN')} entries</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm">{page}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Loading overlay */}
      {loadingDetails && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <Loader2 size={48} className="animate-spin text-white" />
        </div>
      )}

      {/* Details modal */}
      <AnimatePresence>
        {viewingTicket && (
          <TicketDetailsModal
            ticket={viewingTicket}
            onClose={() => setViewingTicket(null)}
            onChanged={() => fetchTickets()}
            onTicketUpdate={(t) => setViewingTicket(t)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────── Stat Card ────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className={`p-5 rounded-2xl border ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold opacity-80">{label}</p>
        <Icon size={18} className="opacity-60" />
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

// ──────────────────── Ticket Details Modal ────────────────────
function TicketDetailsModal({ ticket, onClose, onChanged, onTicketUpdate }: {
  ticket: TicketDetails;
  onClose: () => void;
  onChanged: () => void;
  onTicketUpdate: (t: TicketDetails) => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.replies.length]);

  // Real-time: listen for user replies on this ticket (token required by the server)
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token } });
    socket.on('connect', () => socket.emit('support:join', ticket.id));
    socket.on('support:reply', (payload: any) => {
      if (payload?.ticketId !== ticket.id) return;
      // Skip own admin replies (already added optimistically by handleSendReply)
      if (payload?.reply?.isAdmin) return;
      onTicketUpdate({ ...ticket, replies: [...ticket.replies, payload.reply] });
      onChanged();
    });
    socket.on('support:status', (payload: any) => {
      if (payload?.ticketId !== ticket.id) return;
      onTicketUpdate({ ...ticket, status: payload.status, priority: payload.priority ?? ticket.priority });
      onChanged();
    });
    return () => {
      socket.emit('support:leave', ticket.id);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      setSending(true);
      setError('');
      await adminApi.replyToSupportTicket(ticket.id, replyText.trim());
      const res = await adminApi.getSupportTicket(ticket.id);
      onTicketUpdate(res.ticket);
      onChanged();
      setReplyText('');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await adminApi.updateSupportTicket(ticket.id, { status: newStatus });
      const res = await adminApi.getSupportTicket(ticket.id);
      onTicketUpdate(res.ticket);
      onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      setUpdatingPriority(true);
      await adminApi.updateSupportTicket(ticket.id, { priority: newPriority });
      const res = await adminApi.getSupportTicket(ticket.id);
      onTicketUpdate(res.ticket);
      onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const status = STATUS_STYLES[ticket.status];
  const priority = PRIORITY_STYLES[ticket.priority];

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 rounded-t-3xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</p>
              <span className="text-sm text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                {CATEGORY_LABELS[ticket.category] || ticket.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 truncate">{ticket.subject}</h2>
            <p className="text-xs text-gray-500 mt-1">
              Opened by {ticket.user?.name || 'Unknown'} · {formatDate(ticket.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Status + Priority controls */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase text-gray-500">Status:</span>
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => {
              const active = ticket.status === s;
              const st = STATUS_STYLES[s];
              return (
                <button
                  key={s}
                  onClick={() => !active && handleStatusChange(s)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                    active ? `${st.bg} ${st.text}` : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <st.icon size={12} /> {st.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-gray-500">Priority:</span>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              disabled={updatingPriority}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border-0 outline-none cursor-pointer ${priority.bg} ${priority.text}`}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/40">
          {/* Original message bubble */}
          <MessageBubble
            isAdmin={false}
            name={ticket.user?.name || 'User'}
            time={formatDate(ticket.createdAt)}
            message={ticket.description}
            opening
          />

          {/* Attachments (photos uploaded with the ticket) */}
          {ticket.attachmentUrls && ticket.attachmentUrls.length > 0 && (
            <div className="mb-4 bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Attachments ({ticket.attachmentUrls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.attachmentUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block group">
                    <img
                      src={url}
                      alt={`Attachment ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 group-hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {ticket.replies.map((r) => (
            <MessageBubble
              key={r.id}
              isAdmin={r.isAdmin}
              name={r.isAdmin ? 'Support Team' : ticket.user?.name || 'User'}
              time={formatDate(r.createdAt)}
              message={r.message}
            />
          ))}

          {ticket.status === 'RESOLVED' && ticket.resolutionNote && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-bold text-emerald-800 mb-1">RESOLUTION NOTE</p>
              <p className="text-sm text-emerald-700">{ticket.resolutionNote}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply box */}
        <div className="px-6 py-4 border-t border-gray-100 rounded-b-3xl">
          {error && <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{error}</div>}
          {ticket.status === 'CLOSED' ? (
            <div className="text-center text-sm text-gray-400 py-2">
              This ticket is closed. Reopen it to send a reply.
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Type a reply… (Cmd/Ctrl + Enter to send)"
                rows={2}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-primaryDark text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────── Message Bubble ────────────────────
function MessageBubble({ isAdmin, name, time, message, opening }: { isAdmin: boolean; name: string; time: string; message: string; opening?: boolean }) {
  const initials = name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  if (opening) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">{time} · Original message</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-4 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      {!isAdmin && (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{initials}</div>
      )}
      <div className={`max-w-[75%] ${isAdmin ? 'order-1' : ''}`}>
        <div className={`px-4 py-2.5 rounded-2xl ${isAdmin ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
          <p className="text-sm whitespace-pre-line">{message}</p>
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isAdmin ? 'text-right' : ''}`}>
          {isAdmin ? 'Support Team' : name} · {time}
        </p>
      </div>
      {isAdmin && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">SK</div>
      )}
    </div>
  );
}
