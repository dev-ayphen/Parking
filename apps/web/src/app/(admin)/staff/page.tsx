'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, ShieldCheck, Shield, X, Eye, EyeOff,
  Loader2, AlertCircle, CheckCircle2, Ban, RotateCcw, KeyRound,
  Clock, User as UserIcon,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface StaffMember {
  id: number;
  email: string;
  name: string;
  adminRole: 'SUPER_ADMIN' | 'SUPPORT_AGENT';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdById: number | null;
}

const ROLE_INFO = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    desc: 'Full access to everything — users, spaces, billing, settings, staff management.',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    icon: ShieldCheck,
  },
  SUPPORT_AGENT: {
    label: 'Support Agent',
    desc: 'Can view support tickets, cases, moderation, and user profiles. Cannot ban, delete, or change billing.',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: Shield,
  },
};

function fmt(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StaffPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.adminRole === 'SUPER_ADMIN';

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'SUPER_ADMIN' | 'SUPPORT_AGENT'>('SUPPORT_AGENT');
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reset-password modal
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listStaff();
      setStaff(res.staff || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreate = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword) {
      setCreateError('All fields are required.');
      return;
    }
    if (createPassword.length < 12) {
      setCreateError('Password must be at least 12 characters.');
      return;
    }
    try {
      setCreating(true);
      setCreateError('');
      await adminApi.createStaff({ email: createEmail.trim(), password: createPassword, name: createName.trim(), adminRole: createRole });
      setShowCreate(false);
      setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateRole('SUPPORT_AGENT');
      fetchStaff();
    } catch (e: any) {
      setCreateError(e?.response?.data?.error || e?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      setDeactivating(true);
      if (member.isActive) {
        await adminApi.deactivateStaff(member.id);
      } else {
        await adminApi.reactivateStaff(member.id);
      }
      setDeactivateTarget(null);
      fetchStaff();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update');
    } finally {
      setDeactivating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetPwd.length < 12) {
      setResetError('Password must be at least 12 characters.');
      return;
    }
    try {
      setResetting(true);
      setResetError('');
      await adminApi.resetStaffPassword(resetTarget.id, resetPwd);
      setResetTarget(null);
      setResetPwd('');
    } catch (e: any) {
      setResetError(e?.response?.data?.error || e?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <ShieldCheck size={24} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Super Admin Access Required</p>
            <p className="text-sm text-amber-700 mt-1">Only Super Admins can manage staff accounts.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manage Staff</h1>
          <p className="text-gray-500 mt-1">Create and manage admin accounts. Each person gets their own credentials.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primaryDark transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Add Staff Member
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(ROLE_INFO) as [string, typeof ROLE_INFO['SUPER_ADMIN']][]).map(([key, info]) => (
          <div key={key} className={`${info.bg} border border-gray-100 rounded-2xl p-4 flex items-start gap-3`}>
            <info.icon size={20} className={info.text} />
            <div>
              <p className={`font-bold text-sm ${info.text}`}>{info.label}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{info.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-indigo-500" size={28} />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center">
            <UserIcon size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No staff accounts yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first team member above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Name & Email</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Last Login</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((member) => {
                  const roleInfo = ROLE_INFO[member.adminRole] || ROLE_INFO.SUPPORT_AGENT;
                  const isCurrentUser = currentUser?.email === member.email;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${member.isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {member.name}
                              {isCurrentUser && <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">YOU</span>}
                            </p>
                            <p className="text-xs text-gray-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleInfo.bg} ${roleInfo.text}`}>
                          <roleInfo.icon size={12} />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {member.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                            <Ban size={12} /> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock size={12} />
                          {fmt(member.lastLoginAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{fmt(member.createdAt)}</td>
                      <td className="px-6 py-4">
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setResetTarget(member); setResetPwd(''); setResetError(''); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Reset password"
                            >
                              <KeyRound size={12} /> Reset PWD
                            </button>
                            {member.isActive ? (
                              <button
                                onClick={() => setDeactivateTarget(member)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              >
                                <Ban size={12} /> Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleActive(member)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              >
                                <RotateCcw size={12} /> Reactivate
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
          </div>
        )}
      </div>

      {/* Create staff modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Add Staff Member</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ravi Kumar"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="ravi@yourcompany.com"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Password <span className="text-gray-400 normal-case font-normal">(min 12 characters)</span></label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Strong password…"
                      className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    <button type="button" onClick={() => setShowPwd((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['SUPPORT_AGENT', 'SUPER_ADMIN'] as const).map((role) => {
                      const info = ROLE_INFO[role];
                      const active = createRole === role;
                      return (
                        <button key={role} type="button" onClick={() => setCreateRole(role)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            active ? `${info.bg} border-current ${info.text}` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <info.icon size={14} />
                          <span className="text-xs font-semibold">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{ROLE_INFO[createRole].desc}</p>
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-sm">
                  <AlertCircle size={14} /> {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primaryDark disabled:opacity-50">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate confirmation modal */}
      <AnimatePresence>
        {deactivateTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeactivateTarget(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            >
              <h3 className="font-bold text-gray-900">Deactivate Account?</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{deactivateTarget.name}</span> ({deactivateTarget.email}) will be immediately logged out and cannot sign in again until reactivated.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeactivateTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={() => handleToggleActive(deactivateTarget)} disabled={deactivating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50">
                  {deactivating ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  Deactivate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password modal */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setResetTarget(null)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Reset Password</h3>
                <button onClick={() => setResetTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
              </div>
              <p className="text-sm text-gray-500">Set a new password for <span className="font-semibold text-gray-800">{resetTarget.name}</span>. Their active sessions will be invalidated.</p>
              <div className="relative">
                <input type={showResetPwd ? 'text' : 'password'} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)}
                  placeholder="New password (min 12 chars)…"
                  className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                <button type="button" onClick={() => setShowResetPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showResetPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {resetError && (
                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} /> {resetError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleResetPassword} disabled={resetting || resetPwd.length < 12}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {resetting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Reset Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
