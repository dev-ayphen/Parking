'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  ShieldAlert, UserCheck, Ban, MessageSquareWarning,
  Search, Filter, CheckCircle2, XCircle, AlertTriangle,
  Shield, FileText, Loader2,
} from 'lucide-react';
import { adminApi } from '@/services/api';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

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
  { id: 'reviews', label: 'Flagged Reviews', icon: MessageSquareWarning },
];

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingUsers, setPendingUsers] = useState<ModerationUser[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<ModerationUser[]>([]);
  const [blockedSpaces, setBlockedSpaces] = useState<BlockedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const t = setTimeout(fetchAll, 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Real-time: refresh on any user/space update
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('user:updated', fetchAll);
    socket.on('user:deleted', fetchAll);
    socket.on('space:updated', fetchAll);
    socket.on('space:new', fetchAll);
    return () => { socket.disconnect(); };
  }, [fetchAll]);

  const handleReinstate = async (userId: number) => {
    try {
      await adminApi.unsuspendUser(userId);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to reinstate');
    }
  };

  const handleApproveSpace = async (spaceId: number) => {
    try {
      await adminApi.approveSpace(spaceId);
      await fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to approve');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Moderation & Security</h1>
          <p className="text-gray-500 mt-1">Manage user verifications, suspensions, and flagged content.</p>
        </div>
        <a href="/system-logs" className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium border border-indigo-100 hover:bg-indigo-100 transition-colors">
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
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{pendingUsers.length} Pending</span>
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
                              <AlertTriangle size={14} />Profile Incomplete
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{user.joined}</td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <a href={`/users?focus=${user.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Profile">
                                <FileText size={18} />
                              </a>
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
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full">{suspendedUsers.length} Active</span>
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
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full">{blockedSpaces.length}</span>
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
                              <button onClick={() => handleApproveSpace(s.id)} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">
                                <CheckCircle2 size={14} className="inline mr-1" /> Unblock
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
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <MessageSquareWarning size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Flagged Reviews</h3>
                <p className="text-gray-500 text-sm max-w-sm">User-flagged reviews will appear here once the rating-report feature is enabled.</p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
