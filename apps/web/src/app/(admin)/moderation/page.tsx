'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  ShieldAlert, UserCheck, Ban, MessageSquareWarning,
  Search, Filter, CheckCircle2, AlertTriangle,
  Shield, FileText, Loader2, Star, Eye, EyeOff,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { Badge } from '@/components/ui/Badge';

interface ModerationUser {
  id: number;
  usrId: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  rawStatus: string;
  joined: string;
}

interface BlockedSpace {
  id: number;
  name: string;
  ownerName: string;
  status: string;
  createdAt: string;
}

const TABS = [
  { id: 'verification', label: 'User Verification', icon: UserCheck },
  { id: 'suspensions', label: 'Suspensions & Bans', icon: Ban },
  { id: 'spaces', label: 'Blocked Spaces', icon: ShieldAlert },
  { id: 'reviews', label: 'Reviews', icon: MessageSquareWarning },
];

interface AdminReview {
  id: number;
  reference: string;
  rating: number;
  review: string | null;
  createdAt: string;
  isHidden: boolean;
  reviewerName: string;
  rateeName: string;
  direction: 'PARKER_RATED_OWNER' | 'OWNER_RATED_PARKER';
  space: { id: number; name: string } | null;
}

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingUsers, setPendingUsers] = useState<ModerationUser[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<ModerationUser[]>([]);
  const [blockedSpaces, setBlockedSpaces] = useState<BlockedSpace[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPages, setReviewsPages] = useState(1);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pending, suspended, banned, spaces] = await Promise.all([
        adminApi.listUsers({ status: 'Inactive', search: searchQuery || undefined, limit: 50 }),
        adminApi.listUsers({ status: 'Suspended', search: searchQuery || undefined, limit: 50 }),
        adminApi.listUsers({ status: 'Banned', search: searchQuery || undefined, limit: 50 }),
        adminApi.listSpaces({ status: 'BLOCKED', limit: 50 }),
      ]);
      setPendingUsers(pending.users || []);
      setSuspendedUsers([...(suspended.users || []), ...(banned.users || [])]);
      setBlockedSpaces((spaces.spaces || []).map((s) => ({
        id: s.id, name: s.name, ownerName: s.owner?.name || '—', status: s.status, createdAt: s.createdAt,
      })));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await adminApi.listReviews({
        status: reviewFilter === 'all' ? undefined : reviewFilter,
        search: searchQuery || undefined,
        page: reviewsPage,
      });
      setReviews(res.reviews || []);
      setHiddenCount(res.hiddenCount || 0);
      setReviewsTotal(res.total || 0);
      setReviewsPages(Math.max(1, res.pages || 1));
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') console.error('Reviews:', e);
    }
  }, [reviewFilter, searchQuery, reviewsPage]);

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab, fetchReviews]);

  // Reset to page 1 whenever the reviews tab is opened or a review filter/search changes
  useEffect(() => {
    setReviewsPage(1);
  }, [activeTab, reviewFilter, searchQuery]);

  const toggleReviewVisibility = async (review: AdminReview) => {
    try {
      setActioningId(review.id);
      setError('');
      if (review.isHidden) await adminApi.unhideReview(review.id);
      else await adminApi.hideReview(review.id);
      await fetchReviews();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update review visibility');
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchAll, 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Real-time: refresh on any user/space update
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('user:updated', fetchAll);
    socket.on('user:deleted', fetchAll);
    socket.on('space:updated', fetchAll);
    socket.on('space:new', fetchAll);
    return () => { socket.disconnect(); };
  }, [fetchAll]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleVerifyUser = async (userId: number) => {
    if (!window.confirm('Verify and activate this user? They will be able to log in and use the platform.')) return;
    try {
      setError('');
      await adminApi.unsuspendUser(userId);
      showSuccess('User verified and activated successfully.');
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to verify user');
    }
  };

  const handleReinstate = async (userId: number) => {
    if (!window.confirm('Reinstate this user? They will be able to log in and use the platform again.')) return;
    try {
      setError('');
      await adminApi.unsuspendUser(userId);
      showSuccess('User reinstated successfully.');
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to reinstate');
    }
  };

  const handleUnblockSpace = async (spaceId: number) => {
    if (!window.confirm('Are you sure you want to unblock this space?')) return;
    try {
      setError('');
      await adminApi.unblockSpace(spaceId);
      showSuccess('Space unblocked successfully.');
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to unblock space');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Moderation & Security</h1>
          <p className="text-gray-500 mt-1">Manage user verifications, suspensions, and flagged content.</p>
        </div>
        <a href="/logs" className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium border border-indigo-100 hover:bg-indigo-100 transition-colors">
          <Shield size={18} /> Audit Logs
        </a>
      </motion.div>

      <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />{tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users, IDs, or reasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
          <Filter size={18} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0" />{successMsg}
        </div>
      )}

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : (
          <>
            {activeTab === 'verification' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900">Pending Verifications</h2>
                  <Badge className="bg-amber-100 text-amber-700">{pendingUsers.length} Pending</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="p-4 font-semibold">User</th>
                        <th className="p-4 font-semibold">Type</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Joined</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-400">No pending verifications</td></tr>
                      ) : pendingUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">{user.name.charAt(0)}</div>
                              <div>
                                <div className="font-semibold text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.usrId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{user.type}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle size={14} />Inactive
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{user.joined}</td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <a href={`/users?focus=${user.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Profile">
                                <FileText size={18} />
                              </a>
                              <button
                                onClick={() => handleVerifyUser(user.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                title="Verify & Activate"
                              >
                                <CheckCircle2 size={14} /> Verify
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'suspensions' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900">Suspended & Banned Users</h2>
                  <Badge className="bg-rose-100 text-rose-700">{suspendedUsers.length} Active</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="p-4 font-semibold">User</th>
                        <th className="p-4 font-semibold">Contact</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Joined</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {suspendedUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-400">No suspended or banned users</td></tr>
                      ) : suspendedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.usrId}</div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{user.phone}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.rawStatus === 'BANNED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{user.rawStatus === 'BANNED' ? 'Banned' : 'Suspended'}</span>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{user.joined}</td>
                          <td className="p-4 text-right">
                            {user.rawStatus === 'SUSPENDED' && (
                              <button
                                onClick={() => handleReinstate(user.id)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                              >Reinstate</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'spaces' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900">Blocked Spaces</h2>
                  <Badge className="bg-rose-100 text-rose-700">{blockedSpaces.length}</Badge>
                </div>
                {blockedSpaces.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <ShieldAlert size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Blocked Spaces</h3>
                    <p className="text-gray-500 text-sm max-w-sm">No spaces have been blocked.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                          <th className="p-4 font-semibold">Space</th>
                          <th className="p-4 font-semibold">Owner</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {blockedSpaces.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-semibold text-gray-900">{s.name}</td>
                            <td className="p-4 text-sm text-gray-600">{s.ownerName}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleUnblockSpace(s.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                              >
                                <CheckCircle2 size={14} /> Unblock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {/* Filter pills + hidden count */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {(['all', 'visible', 'hidden'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setReviewFilter(f)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                          reviewFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {hiddenCount > 0 && (
                    <span className="text-xs text-gray-500">{hiddenCount} hidden</span>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {reviews.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquareWarning size={32} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No Reviews</h3>
                      <p className="text-gray-500 text-sm max-w-sm">
                        {reviewFilter === 'hidden' ? 'No reviews are currently hidden.' : 'Reviews submitted by parkers will appear here.'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                          <th className="px-5 py-3.5 font-semibold">Ref</th>
                          <th className="px-5 py-3.5 font-semibold">Space</th>
                          <th className="px-5 py-3.5 font-semibold">Rating</th>
                          <th className="px-5 py-3.5 font-semibold">Review</th>
                          <th className="px-5 py-3.5 font-semibold">By → To</th>
                          <th className="px-5 py-3.5 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reviews.map((r) => (
                          <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${r.isHidden ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono text-gray-500">{r.reference}</span>
                              {r.isHidden && (
                                <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600">HIDDEN</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-gray-900">{r.space?.name || '—'}</p>
                              <Badge className={`mt-1 ${r.direction === 'PARKER_RATED_OWNER' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                {r.direction === 'PARKER_RATED_OWNER' ? 'Parker → Owner' : 'Owner → Parker'}
                              </Badge>
                            </td>
                            <td className="px-5 py-4">
                              <Badge
                                className={r.rating >= 4 ? 'bg-emerald-50 text-emerald-700' : r.rating >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}
                                icon={<Star size={11} className="fill-current" />}
                              >
                                {r.rating}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 max-w-xs">
                              <p className="text-sm text-gray-700 line-clamp-2">{r.review || <span className="text-gray-400 italic">No text</span>}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium text-gray-900">{r.reviewerName}</span>
                                <span className="text-gray-400"> → </span>
                                <span className="text-gray-600">{r.rateeName}</span>
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => toggleReviewVisibility(r)}
                                disabled={actioningId === r.id}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  r.isHidden ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                {actioningId === r.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : r.isHidden ? (
                                  <><Eye size={13} /> Unhide</>
                                ) : (
                                  <><EyeOff size={13} /> Hide</>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {reviewsTotal > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Page {reviewsPage} of {reviewsPages} · {reviewsTotal.toLocaleString('en-IN')} review{reviewsTotal === 1 ? '' : 's'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                        disabled={reviewsPage <= 1}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setReviewsPage((p) => Math.min(reviewsPages, p + 1))}
                        disabled={reviewsPage >= reviewsPages}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
