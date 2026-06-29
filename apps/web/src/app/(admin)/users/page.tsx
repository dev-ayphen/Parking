'use client';

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Search, MoreVertical, Download,
  CheckCircle2, XCircle, Mail, Phone, ChevronLeft, ChevronRight, Loader2,
  Eye, Ban, Trash2, UserX, UserCheck,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { exportCsv } from '@/lib/download';
import { Badge } from '@/components/ui/Badge';
import { USER_STATUS_STYLES } from '@/lib/statusStyles';
import { TableSkeleton } from '@/components/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/components/Toast';
import {
  SuspendUserModal,
  BanUserModal,
  DeleteUserModal,
  UserDetailsModal,
} from './_components/UserModals';
import type { AdminUser, UserDetails } from './_components/types';

const tabs = ['All Users', 'Active', 'Inactive', 'Suspended', 'Banned', 'Deleted'] as const;

export default function UsersPage() {
  const toast = useToast();
  const { user: authUser } = useAuthStore();
  const canMutate = authUser?.adminRole !== 'SUPPORT_AGENT';
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');
  const focusHandledRef = useRef(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All Users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);

  // ── Bulk selection ────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleSelect = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelected((prev) =>
    prev.size === users.length ? new Set() : new Set(users.map((u) => u.id)));

  const runBulk = async (action: 'suspend' | 'ban') => {
    if (selected.size === 0) return;
    const ids = [...selected];
    let reason = '';
    let bulkDurationDays = 7;
    if (action === 'suspend') {
      // Bulk suspend keeps the same friction as the single modal: a reason
      // (min 10 chars) and an explicit end date — never indefinite.
      reason = (window.prompt(`Suspend ${ids.length} user(s).\nReason (min 10 characters):`, '') || '').trim();
      if (reason.length < 10) {
        if (reason.length > 0) toast.error('Reason must be at least 10 characters');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const defaultEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const endDate = (window.prompt(`Suspend until (YYYY-MM-DD). Must be a future date:`, defaultEnd) || '').trim();
      if (!endDate || endDate <= today) {
        if (endDate) toast.error('End date must be in the future');
        return;
      }
      bulkDurationDays = Math.max(1, Math.ceil((new Date(endDate + 'T23:59:59').getTime() - Date.now()) / 86400000));
    } else {
      if (!window.confirm(`Permanently ban ${ids.length} user(s)? This cannot be undone.`)) return;
      reason = 'Bulk admin ban';
    }
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) =>
      action === 'suspend'
        ? adminApi.suspendUser(id, { reason, durationDays: bulkDurationDays })
        : adminApi.banUser(id, { reason })));
    setBulkBusy(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    setSelected(new Set());
    await fetchUsers();
    if (failed === 0) toast.success(`${ok} user(s) ${action === 'suspend' ? 'suspended' : 'banned'}`);
    else toast.error(`${ok} succeeded, ${failed} failed`);
  };

  const handleExport = async () => {
    setExporting(true);
    await exportCsv(adminApi.exportUsersCsv, 'users');
    setExporting(false);
  };
  const [viewingUser, setViewingUser] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<AdminUser | null>(null);
  const [banningUser, setBanningUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listUsers({
        status: activeTab === 'All Users' ? undefined : activeTab,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Real-time: refresh on any user update
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('user:updated', fetchUsers);
    socket.on('user:deleted', fetchUsers);
    return () => { socket.disconnect(); };
  }, [fetchUsers]);

  // Close menu when clicking outside
  useEffect(() => {
    const onClick = () => setMenuOpenFor(null);
    if (menuOpenFor !== null) {
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [menuOpenFor]);

  const handleView = async (user: AdminUser) => {
    setMenuOpenFor(null);
    setLoadingDetails(true);
    try {
      const res = await adminApi.getUserDetails(user.id);
      setViewingUser(res.user);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to load user');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Auto-open a user's details when arriving via /users?focus=<id> (e.g. from Moderation).
  // Runs once after the list loads; falls back to seeding the search box if the user
  // isn't on the current page so the admin can still find them.
  useEffect(() => {
    if (!focusId || focusHandledRef.current || loading) return;
    const target = users.find((u) => String(u.id) === String(focusId));
    if (target) {
      focusHandledRef.current = true;
      handleView(target);
    } else if (users.length > 0) {
      // List loaded but user not present — seed the search to surface them.
      focusHandledRef.current = true;
      setSearch(String(focusId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, users]);

  const handleUnsuspend = async (user: AdminUser) => {
    setMenuOpenFor(null);
    if (!window.confirm(`Reinstate ${user.name}?`)) return;
    try {
      setActionLoading(true);
      await adminApi.unsuspendUser(user.id);
      await fetchUsers();
      toast.success(`${user.name} reinstated`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to reinstate');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const initialsOf = (name: string) =>
    name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users Management</h1>
          <p className="text-gray-500 mt-1">Manage and monitor all platform users.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primaryDark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export CSV
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-visible"
      >
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => fetchUsers()} className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shrink-0">Try Again</button>
          </div>
        )}

        {selected.size > 0 && canMutate && (
          <div className="mx-4 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-indigo-800">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={() => runBulk('suspend')} disabled={bulkBusy}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                {bulkBusy && <Loader2 size={12} className="animate-spin" />} Suspend Selected
              </button>
              <button onClick={() => runBulk('ban')} disabled={bulkBusy}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                Ban Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-visible">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-4 border-b border-gray-100 w-10">
                    <input type="checkbox" checked={users.length > 0 && selected.size === users.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">User</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Rating</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">No users found</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors group ${selected.has(user.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            initialsOf(user.name)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">ID: {user.usrId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail size={12} className="text-gray-400" /> {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={12} className="text-gray-400" /> {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-medium bg-gray-100 px-2.5 py-1 rounded-md">{user.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        map={USER_STATUS_STYLES}
                        statusKey={user.status}
                        icon={
                          user.status === 'Active' ? <CheckCircle2 size={12} /> :
                          user.status === 'Suspended' ? <UserX size={12} /> :
                          user.status === 'Banned' ? <Ban size={12} /> :
                          user.status === 'Deleted' ? <Trash2 size={12} /> :
                          user.status === 'Inactive' ? <XCircle size={12} /> :
                          undefined
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.rating ? (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">★</span>
                          <span className="text-sm font-bold text-gray-700">{user.rating}</span>
                        </div>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <ActionMenuButton
                        isOpen={menuOpenFor === user.id}
                        onToggle={() => setMenuOpenFor(menuOpenFor === user.id ? null : user.id)}
                        onClose={() => setMenuOpenFor(null)}
                        user={user}
                        canMutate={canMutate}
                        onView={() => handleView(user)}
                        onSuspend={() => { setMenuOpenFor(null); setSuspendingUser(user); }}
                        onUnsuspend={() => handleUnsuspend(user)}
                        onBan={() => { setMenuOpenFor(null); setBanningUser(user); }}
                        onDelete={() => { setMenuOpenFor(null); setDeletingUser(user); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
      </motion.div>

      {/* Loading overlay for action / details fetch */}
      {(loadingDetails || actionLoading) && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
          <Loader2 size={48} className="animate-spin text-white" />
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {viewingUser && (
          <UserDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} />
        )}
        {suspendingUser && (
          <SuspendUserModal
            user={suspendingUser}
            onClose={() => setSuspendingUser(null)}
            onSuccess={() => { toast.success(`${suspendingUser.name} suspended`); setSuspendingUser(null); fetchUsers(); }}
          />
        )}
        {banningUser && (
          <BanUserModal
            user={banningUser}
            onClose={() => setBanningUser(null)}
            onSuccess={() => { toast.success(`${banningUser.name} banned`); setBanningUser(null); fetchUsers(); }}
          />
        )}
        {deletingUser && (
          <DeleteUserModal
            user={deletingUser}
            onClose={() => setDeletingUser(null)}
            onSuccess={() => { toast.success(`${deletingUser.name} deleted`); setDeletingUser(null); fetchUsers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Action Dropdown (Portal-positioned, never clipped) ----------
function ActionMenuButton({
  isOpen, onToggle, onClose, user, canMutate, onView, onSuspend, onUnsuspend, onBan, onDelete,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  user: AdminUser;
  canMutate: boolean;
  onView: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onBan: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  const isSuspended = user.rawStatus === 'SUSPENDED';
  const isBanned = user.rawStatus === 'BANNED';
  // User-requested deletion is terminal: only "View Details" is allowed — no
  // suspend/ban/re-delete (we never accidentally mutate a retained legal record).
  const isDeleted = user.status === 'Deleted' || !!user.deletedAt;

  // Position the menu relative to the button using fixed coordinates,
  // and flip upward when there isn't enough room below.
  useLayoutEffect(() => {
    if (!isOpen || !btnRef.current) return;
    const compute = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const menuW = 200;
      const menuH = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuH + 16;
      const top = openUp ? rect.top - menuH - 6 : rect.bottom + 6;
      const left = Math.min(
        Math.max(8, rect.right - menuW),
        window.innerWidth - menuW - 8,
      );
      setPos({ top, left, openUp });
    };
    compute();
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [isOpen]);

  // Click-outside + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 200, zIndex: 1000 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onView} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Eye size={14} className="text-gray-500" /> View Details
          </button>

          {isDeleted ? (
            <div className="px-4 py-2.5 text-xs text-gray-400 border-t border-gray-100">
              Account deleted by user — retained for records only.
            </div>
          ) : canMutate ? (
            <>
              {!isBanned && (isSuspended ? (
                <button onClick={onUnsuspend} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <UserCheck size={14} /> Reinstate User
                </button>
              ) : (
                <button onClick={onSuspend} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                  <UserX size={14} /> Suspend
                </button>
              ))}

              {!isBanned && (
                <button onClick={onBan} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 transition-colors">
                  <Ban size={14} /> Ban User
                </button>
              )}

              <div className="border-t border-gray-100" />
              <button onClick={onDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 transition-colors">
                <Trash2 size={14} /> Delete Account
              </button>
            </>
          ) : (
            <div className="px-4 py-2.5 text-xs text-gray-400 border-t border-gray-100">
              Read-only access — contact a Super Admin for account actions.
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

// ---------- Suspend Modal ----------
