'use client';

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
import {
  Search, Filter, MoreVertical,
  CheckCircle2, XCircle, Mail, Phone, ChevronLeft, ChevronRight, Loader2,
  Eye, Ban, Trash2, UserX, UserCheck, X, AlertTriangle, Calendar,
  Car, MapPin as MapPinIcon, Star, ShieldAlert,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { TableSkeleton } from '@/components/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  SuspendUserModal,
  BanUserModal,
  DeleteUserModal,
  UserDetailsModal,
} from './_components/UserModals';
import type { AdminUser, UserDetails } from './_components/types';

const tabs = ['All Users', 'Active', 'Inactive', 'Suspended', 'Banned'] as const;

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All Users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
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
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
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
      alert(e?.response?.data?.error || e?.message || 'Failed to load user');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUnsuspend = async (user: AdminUser) => {
    setMenuOpenFor(null);
    if (!confirm(`Reinstate ${user.name}?`)) return;
    try {
      setActionLoading(true);
      await adminApi.unsuspendUser(user.id);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to reinstate');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const initialsOf = (name: string) =>
    name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const statusBadgeClass = (status: string) =>
    status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
    status === 'Suspended' ? 'bg-rose-50 text-rose-700' :
    status === 'Banned' ? 'bg-gray-900 text-white' :
    'bg-gray-100 text-gray-700';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users Management</h1>
          <p className="text-gray-500 mt-1">Manage and monitor all platform users.</p>
        </div>
        <button className="bg-primary hover:bg-primaryDark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
          + Export Data
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-visible"
      >
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit border border-gray-200/60 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
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
            <button className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
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
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">No users found</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {initialsOf(user.name)}
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
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadgeClass(user.status)}`}>
                        {user.status === 'Active' && <CheckCircle2 size={12} />}
                        {user.status === 'Suspended' && <UserX size={12} />}
                        {user.status === 'Banned' && <Ban size={12} />}
                        {user.status === 'Inactive' && <XCircle size={12} />}
                        {user.status}
                      </div>
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
            onSuccess={() => { setSuspendingUser(null); fetchUsers(); }}
          />
        )}
        {banningUser && (
          <BanUserModal
            user={banningUser}
            onClose={() => setBanningUser(null)}
            onSuccess={() => { setBanningUser(null); fetchUsers(); }}
          />
        )}
        {deletingUser && (
          <DeleteUserModal
            user={deletingUser}
            onClose={() => setDeletingUser(null)}
            onSuccess={() => { setDeletingUser(null); fetchUsers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Action Dropdown (Portal-positioned, never clipped) ----------
function ActionMenuButton({
  isOpen, onToggle, onClose, user, onView, onSuspend, onUnsuspend, onBan, onDelete,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  user: AdminUser;
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
        </div>,
        document.body,
      )}
    </>
  );
}

// ---------- Suspend Modal ----------
