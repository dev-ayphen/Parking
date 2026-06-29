'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserX, Ban, Trash2, X, AlertTriangle, Loader2,
  Mail, Phone, Calendar, Star, CheckCircle2, Car,
  MapPin as MapPinIcon, ShieldAlert, FileText,
  Receipt, Clock, Send, MessageSquare, LogIn, UserPlus,
} from 'lucide-react';
import { adminApi } from '@/services/api';
import type { AdminUser, UserDetails } from './types';

// ───────────────────────────────────────────────────────────────────────
// Shared shells
// ───────────────────────────────────────────────────────────────────────

function ModalShell({
  title, icon, onClose, wide, children,
}: { title: string; icon?: React.ReactNode; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-3 pt-5 border-t border-gray-100">{children}</div>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function MetaRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl px-4">{children}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Suspend
// ───────────────────────────────────────────────────────────────────────

export function SuspendUserModal({
  user, onClose, onSuccess,
}: { user: AdminUser; onClose: () => void; onSuccess: () => void }) {
  // Two-step flow: 1) fill reason + end date, 2) confirm. Mirrors the friction
  // of the Ban modal — suspension can never be indefinite and always needs a
  // documented reason.
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [reason, setReason] = useState('');
  const [endDate, setEndDate] = useState(''); // yyyy-mm-dd
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const REASON_MIN = 10;
  // Date input bounds: must be in the future (min = tomorrow).
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const reasonOk = reason.trim().length >= REASON_MIN;
  const dateOk = !!endDate && endDate > todayStr;
  const canProceed = reasonOk && dateOk;

  // Convert the chosen end date → whole days from now (the backend computes
  // suspendedUntil from durationDays). Always >= 1.
  const durationDays = endDate
    ? Math.max(1, Math.ceil((new Date(endDate + 'T23:59:59').getTime() - Date.now()) / 86400000))
    : 0;

  const prettyDate = endDate
    ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const handleConfirm = async () => {
    if (!canProceed) { setErr('Please complete all required fields'); return; }
    try {
      setSaving(true);
      setErr('');
      await adminApi.suspendUser(user.id, {
        reason: reason.trim(),
        durationDays,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to suspend');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Suspend User" icon={<UserX size={20} className="text-amber-600" />} onClose={onClose}>
      {err && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}

      {step === 'form' ? (
        <>
          <p className="text-sm text-gray-600 mb-5">
            Suspending <span className="font-semibold text-gray-900">{user.name}</span> will sign them out and prevent them from logging in until the chosen date.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this user is being suspended (min 10 characters)…"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
              <p className={`text-xs mt-1 ${reasonOk ? 'text-gray-400' : 'text-rose-500'}`}>
                {reason.trim().length}/{REASON_MIN} characters minimum
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                Suspended until <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={tomorrow}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Suspension cannot be indefinite — choose an end date. {dateOk && `(${durationDays} day${durationDays !== 1 ? 's' : ''})`}
              </p>
            </div>
          </div>
          <ModalFooter>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button
              onClick={() => { setErr(''); setStep('confirm'); }}
              disabled={!canProceed}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Review &amp; Confirm
            </button>
          </ModalFooter>
        </>
      ) : (
        <>
          <div className="p-4 mb-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                You are about to suspend <span className="font-bold">{user.name}</span>. They will lose access until <span className="font-bold">{prettyDate}</span>.
              </p>
            </div>
            <div className="text-sm text-amber-800 bg-white/60 rounded-lg p-3 border border-amber-100">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Reason</span>
              <p className="mt-1 whitespace-pre-wrap">{reason.trim()}</p>
            </div>
          </div>
          <ModalFooter>
            <button onClick={() => setStep('form')} disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">Back</button>
            <button onClick={handleConfirm} disabled={saving}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Confirm Suspension
            </button>
          </ModalFooter>
        </>
      )}
    </ModalShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Ban
// ───────────────────────────────────────────────────────────────────────

export function BanUserModal({
  user, onClose, onSuccess,
}: { user: AdminUser; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) { setErr('Reason is required'); return; }
    if (confirmText !== 'BAN') { setErr('Type BAN to confirm'); return; }
    try {
      setSaving(true);
      await adminApi.banUser(user.id, { reason: reason.trim() });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to ban');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Ban User" icon={<Ban size={20} className="text-rose-600" />} onClose={onClose}>
      <div className="p-3 mb-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
        <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-rose-700">
          <span className="font-bold">Permanent action.</span> {user.name} will be locked out of the platform indefinitely.
        </p>
      </div>
      {err && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Reason for ban</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Describe the violation..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
            Type <span className="text-rose-600 font-mono">BAN</span> to confirm
          </label>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono" />
        </div>
      </div>
      <ModalFooter>
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || confirmText !== 'BAN'}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Ban Permanently
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Delete
// ───────────────────────────────────────────────────────────────────────

export function DeleteUserModal({
  user, onClose, onSuccess,
}: { user: AdminUser; onClose: () => void; onSuccess: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (confirmText !== user.name) { setErr(`Type "${user.name}" exactly to confirm`); return; }
    try {
      setSaving(true);
      await adminApi.deleteUser(user.id);
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Delete Account" icon={<Trash2 size={20} className="text-rose-600" />} onClose={onClose}>
      <div className="p-3 mb-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
        <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-rose-700">
          <span className="font-bold">This cannot be undone.</span> All bookings, spaces, vehicles, ratings, subscriptions, and transactions belonging to <span className="font-semibold">{user.name}</span> will be permanently deleted.
        </p>
      </div>
      {err && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
        Type <span className="text-rose-600 font-mono">{user.name}</span> to confirm
      </label>
      <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={user.name}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
      <ModalFooter>
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={saving || confirmText !== user.name}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Delete Permanently
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// User Details (read-only deep view)
// ───────────────────────────────────────────────────────────────────────

function RcBookButton({ vehicleId }: { vehicleId: number }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleView = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await adminApi.getVehicleRcBookUrl(vehicleId);
      if (!data?.url) { setErr(data?.error || 'Not available'); return; }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <button
        onClick={handleView}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
        RC Book
      </button>
      {err && <span className="text-xs text-rose-500">{err}</span>}
    </div>
  );
}

export function UserDetailsModal({ user, onClose }: { user: UserDetails; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const [composing, setComposing] = useState(false);
  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <ModalShell title="User Details" onClose={onClose} wide>
      {/* Profile Header */}
      <div className="flex items-center gap-4 pb-5 border-b border-gray-100 mb-5">
        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl overflow-hidden">
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            user.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-500">ID: {user.usrId} · {user.type}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1"><Mail size={12} /> {user.email || '—'}</span>
            <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            user.deletedAt ? 'bg-red-100 text-red-700' :
            user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
            user.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-700' :
            user.status === 'BANNED' ? 'bg-gray-900 text-white' :
            'bg-gray-100 text-gray-700'
          }`}>{user.deletedAt ? 'DELETED' : user.status}</div>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <MessageSquare size={13} /> Message
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-5">
        {(['overview', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
              tab === t ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-gray-500 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {composing && (
        <MessageUserModal user={user} onClose={() => setComposing(false)} />
      )}

      {tab === 'activity' ? (
        <UserActivityView user={user} formatDate={formatDate} />
      ) : (
      <>
      {user.deletedAt ? (
        // Deletion takes precedence over the underlying BANNED status it sets.
        <div className="p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm">
          <p className="font-bold text-red-800 flex items-center gap-2"><Trash2 size={14} /> Deleted Account</p>
          <p className="text-red-700 mt-1">Reason: {user.deletedReason === 'USER_REQUESTED' ? 'User Requested' : user.deletedReason || '—'}</p>
          <p className="text-red-700">On: {formatDate(user.deletedAt)}</p>
          <p className="text-red-600 mt-1 text-xs">Retained for legal, audit, and financial records. Read-only.</p>
        </div>
      ) : (
        <>
          {user.status === 'SUSPENDED' && (
            <div className="p-3 mb-5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <p className="font-bold text-amber-800 flex items-center gap-2"><UserX size={14} /> Suspended</p>
              <p className="text-amber-700 mt-1">Reason: {user.suspendReason || '—'}</p>
              <p className="text-amber-700">
                Since: {formatDate(user.suspendedAt)}
                {user.suspendedUntil ? ` · Until: ${formatDate(user.suspendedUntil)}` : ' · Indefinite'}
              </p>
            </div>
          )}
          {user.status === 'BANNED' && (
            <div className="p-3 mb-5 bg-rose-50 border border-rose-200 rounded-xl text-sm">
              <p className="font-bold text-rose-800 flex items-center gap-2"><Ban size={14} /> Banned</p>
              <p className="text-rose-700 mt-1">Reason: {user.banReason || '—'}</p>
              <p className="text-rose-700">On: {formatDate(user.bannedAt)}</p>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Bookings" value={user.stats.totalBookings} />
        <Stat label="Spaces" value={user.stats.totalSpaces} />
        <Stat label="Vehicles" value={user.stats.totalVehicles} />
        <Stat label="Rating" value={user.stats.averageRating > 0 ? `${user.stats.averageRating} ★` : '—'} sub={`${user.stats.ratingCount} reviews`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <MetaRow label="Joined" value={formatDate(user.createdAt)} icon={<Calendar size={14} />} />
        <MetaRow label="Last Login" value={formatDate(user.lastLoginAt)} icon={<Calendar size={14} />} />
        <MetaRow label="Total Spent" value={`₹${user.stats.totalSpent.toLocaleString('en-IN')}`} icon={<Star size={14} />} />
        <MetaRow label="Profile Complete" value={user.isProfileComplete ? 'Yes' : 'No'} icon={<CheckCircle2 size={14} />} />
      </div>

      {(user.emergencyContactName || user.emergencyContactPhone) && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={16} className="text-rose-600" />
            <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wide">Emergency Contact</h4>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-xs text-rose-600 font-medium">Name:</span>{' '}
              <span className="font-semibold text-gray-900">{user.emergencyContactName || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-rose-600 font-medium">Phone:</span>{' '}
              <span className="font-semibold text-gray-900">{user.emergencyContactPhone || '—'}</span>
            </div>
          </div>
          <p className="text-xs text-rose-700 mt-2">Use only during parking-related incidents or emergencies.</p>
        </div>
      )}

      {user.billing?.upiId && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-indigo-600" />
            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Payment Details</h4>
          </div>
          <div className="text-sm">
            <span className="text-xs text-indigo-600 font-medium">UPI ID:</span>{' '}
            <span className="font-semibold text-gray-900 font-mono">{user.billing.upiId}</span>
          </div>
        </div>
      )}

      {user.vehicles.length > 0 && (
        <Section title={`Vehicles (${user.vehicles.length})`} icon={<Car size={14} className="text-gray-500" />}>
          {user.vehicles.map((v) => (
            <div key={v.id} className="py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {v.frontPhotoUrl ? (
                    <img src={v.frontPhotoUrl} alt={v.brandModel} className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Car size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{v.brandModel}</p>
                    <p className="text-xs text-gray-500">{v.vehicleType}</p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{v.licensePlate}</span>
              </div>
              {(v.frontPhotoUrl || v.sidePhotoUrl) && (
                <div className="mt-2 flex gap-2">
                  {v.frontPhotoUrl && (
                    <a href={v.frontPhotoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={v.frontPhotoUrl} alt="Front" className="w-20 h-14 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                  {v.sidePhotoUrl && (
                    <a href={v.sidePhotoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={v.sidePhotoUrl} alt="Side" className="w-20 h-14 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                </div>
              )}
              <RcBookButton vehicleId={v.id} />
            </div>
          ))}
        </Section>
      )}

      {user.spaces.length > 0 && (
        <Section title={`Spaces (${user.spaces.length})`} icon={<MapPinIcon size={14} className="text-gray-500" />}>
          {user.spaces.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">₹{s.hourlyRate}/hr</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                s.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>{s.status}</span>
            </div>
          ))}
        </Section>
      )}

      </>
      )}

      <ModalFooter>
        <button onClick={onClose} className="px-5 py-2.5 bg-indigo-600 hover:bg-primaryDark text-white text-sm font-semibold rounded-xl transition-colors">Close</button>
      </ModalFooter>
    </ModalShell>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Activity tab — bookings, transactions, account timeline
// ───────────────────────────────────────────────────────────────────────

function UserActivityView({ user, formatDate }: { user: UserDetails; formatDate: (d?: string | null) => string }) {
  const events: Array<{ icon: React.ReactNode; label: string; date: string | null; tone: string }> = [
    { icon: <UserPlus size={14} />, label: 'Account created', date: user.createdAt, tone: 'text-emerald-600' },
    { icon: <LogIn size={14} />, label: 'Last login', date: user.lastLoginAt, tone: 'text-indigo-600' },
  ];
  if (user.status === 'SUSPENDED') events.push({ icon: <UserX size={14} />, label: `Suspended — ${user.suspendReason || 'no reason'}`, date: user.suspendedAt, tone: 'text-amber-600' });
  if (user.status === 'BANNED') events.push({ icon: <Ban size={14} />, label: `Banned — ${user.banReason || 'no reason'}`, date: user.bannedAt, tone: 'text-rose-600' });

  return (
    <div>
      {/* Account timeline */}
      <Section title="Account Timeline" icon={<Clock size={14} className="text-gray-500" />}>
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <span className={e.tone}>{e.icon}</span>
            <p className="text-sm font-medium text-gray-800 flex-1">{e.label}</p>
            <span className="text-xs text-gray-400">{formatDate(e.date)}</span>
          </div>
        ))}
      </Section>

      {/* Recent bookings */}
      {user.recentBookings.length > 0 ? (
        <Section title={`Recent Bookings (last ${user.recentBookings.length})`} icon={<Calendar size={14} className="text-gray-500" />}>
          {user.recentBookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.space}</p>
                <p className="text-xs text-gray-500">{formatDate(b.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                  b.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-700' :
                  b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                  'bg-amber-50 text-amber-700'
                }`}>{b.status}</span>
                <span className="text-sm font-bold text-gray-900">₹{b.amount}</span>
              </div>
            </div>
          ))}
        </Section>
      ) : (
        <p className="text-sm text-gray-400 py-3">No bookings yet.</p>
      )}

      {/* Recent transactions */}
      {user.recentTransactions && user.recentTransactions.length > 0 && (
        <Section title={`Recent Transactions (last ${user.recentTransactions.length})`} icon={<Receipt size={14} className="text-gray-500" />}>
          {user.recentTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.description || t.type}</p>
                <p className="text-xs text-gray-500 font-mono">{t.txnNumber} · {formatDate(t.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  t.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
                  t.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                }`}>{t.status}</span>
                <span className="text-sm font-bold text-gray-900">₹{t.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Message user — push notification to a single user
// ───────────────────────────────────────────────────────────────────────

function MessageUserModal({ user, onClose }: { user: UserDetails; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setErr('Title and message are required'); return; }
    try {
      setSending(true);
      setErr('');
      await adminApi.notifyUser(user.id, { title: title.trim(), body: body.trim() });
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalShell title="Message User" icon={<Send size={20} className="text-indigo-600" />} onClose={onClose}>
      {sent ? (
        <div className="py-8 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">Notification sent to {user.name}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            To: <span className="font-semibold text-gray-900">{user.name}</span> ({user.phone})
          </div>
          {err && <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">Push Notification</button>
            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">Email (soon)</button>
            <button disabled className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed">SMS (soon)</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Title <span className="text-gray-400">({title.length}/50)</span></label>
              <input type="text" value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Message <span className="text-gray-400">({body.length}/200)</span></label>
              <textarea value={body} maxLength={200} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="Message body..."
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
            </div>
          </div>
          <ModalFooter>
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSend} disabled={sending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {sending && <Loader2 size={14} className="animate-spin" />}
              Send
            </button>
          </ModalFooter>
        </>
      )}
    </ModalShell>
  );
}
