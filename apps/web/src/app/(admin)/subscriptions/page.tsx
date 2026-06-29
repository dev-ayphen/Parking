'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as createSocket } from 'socket.io-client';
import {
  Search,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Crown, Zap, Shield, Pencil, X, Loader2, Plus,
  MoreVertical, Eye, PauseCircle, PlayCircle, CalendarPlus, Ban,
  User, Phone, Mail, Users, IndianRupee, TrendingUp, AlertTriangle,
  Building2, Wallet,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';
import { Badge } from '@/components/ui/Badge';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number | null;
  billingCycle: string;
  features: string[];
  iconKey: string;
  colorKey: string;
  isActive: boolean;
  sortOrder: number;
  activeSubscribers: number;
  maxSpaces?: number;
  hasAnalytics?: boolean;
  hasFeaturedListing?: boolean;
  hasCsvExport?: boolean;
  hasPrioritySupport?: boolean;
}

interface SubscriptionAnalytics {
  counts: { totalSubscribers: number; active: number; expired: number; cancelled: number; suspended: number };
  revenue: { mrr: number; arr: number; arpu: number; lifetimeRevenue: number };
  planDistribution: Array<{ name: string; colorKey: string; count: number }>;
  growth: Array<{ name: string; value: number }>;
}

// colorKey → hex, shared by the plan-distribution pie + legend.
const colorKeyHex: Record<string, string> = {
  blue: '#3B82F6',
  indigo: '#6366F1',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#F43F5E',
};
const hexFor = (k: string) => colorKeyHex[k] || '#6366F1';

// Reason presets for the Suspend / Force-Cancel pickers.
const SUSPEND_REASONS = ['Fraud', 'Policy Violation', 'Fake Listings', 'Other'];
const CANCEL_REASONS = ['Chargeback', 'Fraud', 'Legal Request', 'Other'];

interface SubscriptionRow {
  id: string;
  rawId: number;
  user: string;
  userId: number;
  plan: string;
  planColor: string;
  amount: string;
  status: string;
  renewal: string;
  autoRenew: boolean;
}

const iconMap: Record<string, any> = { shield: Shield, zap: Zap, crown: Crown };
const colorMap: Record<string, { text: string; bg: string }> = {
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-200' },
  indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-200' },
  amber: { text: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-200' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-200' },
  rose: { text: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-200' },
};
const planTextColor: Record<string, string> = {
  blue: 'text-blue-600',
  indigo: 'text-indigo-600',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
};

interface SubscriptionDetail {
  id: string;
  rawId: number;
  owner: { id: number; name: string; phone: string; email: string; spacesCount?: number; revenue?: number };
  plan: string;
  planColor: string;
  billingCycle: string;
  amount: string;
  status: string;
  startDate: string;
  renewalDate: string;
  autoRenewal: boolean;
}

const tabs = [
  { key: 'Active Plans', status: 'ACTIVE' },
  { key: 'Expired', status: 'EXPIRED' },
  { key: 'Cancelled', status: 'CANCELLED' },
  { key: 'Suspended', status: 'SUSPENDED' },
] as const;

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>(tabs[0]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [error, setError] = useState('');
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Per-row actions menu (rawId of the open menu, or null)
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  // rawId of the row whose action is currently running (disables the row)
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  // Owner detail modal
  const [viewDetail, setViewDetail] = useState<SubscriptionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Subscription analytics (dashboard above the plan cards)
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  // Reason picker for Suspend / Force-Cancel. `kind` chooses the preset list.
  const [reasonModal, setReasonModal] = useState<{ rawId: number; kind: 'suspend' | 'cancel' } | null>(null);
  const limit = 20;

  const fetchPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const res = await adminApi.listSubscriptionPlans();
      setPlans(res.plans || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const fetchSubs = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const res = await adminApi.listSubscriptions({
        status: activeTab.status,
        search: search || undefined,
        page,
        limit,
      });
      setSubscriptions(res.subscriptions || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load subscriptions');
    } finally {
      setLoadingSubs(false);
    }
  }, [activeTab, search, page]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await adminApi.getSubscriptionAnalytics();
      setAnalytics({
        counts: res.counts || { totalSubscribers: 0, active: 0, expired: 0, cancelled: 0, suspended: 0 },
        revenue: res.revenue || { mrr: 0, arr: 0, arpu: 0, lifetimeRevenue: 0 },
        planDistribution: res.planDistribution || [],
        growth: res.growth || [],
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load subscription analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => {
    const t = setTimeout(() => fetchSubs(), 250);
    return () => clearTimeout(t);
  }, [fetchSubs]);

  // Live-refresh: server emits subscription:updated to the payments admin room
  // whenever a subscription is suspended/reactivated/extended/cancelled.
  const fetchSubsRef = useRef(fetchSubs);
  fetchSubsRef.current = fetchSubs;
  const fetchAnalyticsRef = useRef(fetchAnalytics);
  fetchAnalyticsRef.current = fetchAnalytics;
  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('subscription:updated', () => { fetchSubsRef.current(); fetchAnalyticsRef.current(); });
    return () => { socket.disconnect(); };
  }, []);

  const openOwnerDetail = useCallback(async (rawId: number) => {
    setOpenMenu(null);
    setLoadingDetail(true);
    setViewDetail(null);
    try {
      const res = await adminApi.getSubscriptionDetail(rawId);
      setViewDetail(res.subscription || null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load subscription detail');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const runAction = useCallback(async (
    rawId: number,
    action: () => Promise<any>,
    successMsg?: string,
  ) => {
    setOpenMenu(null);
    setActionBusy(rawId);
    setError('');
    try {
      await action();
      if (successMsg) setError(successMsg);
      await fetchSubs();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Action failed');
    } finally {
      setActionBusy(null);
    }
  }, [fetchSubs]);

  // Suspend / Force-Cancel both go through a reason picker (TASK 5).
  const handleSuspend = useCallback((rawId: number) => {
    setOpenMenu(null);
    setReasonModal({ rawId, kind: 'suspend' });
  }, []);

  const handleForceCancel = useCallback((rawId: number) => {
    setOpenMenu(null);
    setReasonModal({ rawId, kind: 'cancel' });
  }, []);

  const handleReasonConfirm = useCallback((reason: string) => {
    if (!reasonModal) return;
    const { rawId, kind } = reasonModal;
    setReasonModal(null);
    if (kind === 'suspend') {
      runAction(rawId, () => adminApi.suspendSubscription(rawId, reason), 'Subscription suspended.');
    } else {
      runAction(rawId, () => adminApi.forceCancelSubscription(rawId, reason), 'Subscription cancelled.');
    }
  }, [reasonModal, runAction]);

  const handleReactivate = useCallback((rawId: number) => {
    runAction(rawId, () => adminApi.reactivateSubscription(rawId));
  }, [runAction]);

  const handleExtend = useCallback((rawId: number, days: number) => {
    runAction(rawId, async () => {
      const res = await adminApi.extendSubscription(rawId, days);
      return res;
    }, `Renewal extended by ${days} days.`);
  }, [runAction]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Subscriptions</h1>
          <p className="text-gray-500 mt-1">Manage pricing tiers and user subscriptions.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primaryDark text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 inline-flex items-center gap-2"
        >
          <Plus size={16} /> Create New Plan
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 shrink-0"><X size={16} /></button>
        </div>
      )}

      {/* ── Subscription Analytics dashboard ─────────────────────────── */}
      {loadingAnalytics ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[110px] bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : analytics && (
        <div className="space-y-6">
          {/* Stat cards (counts) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Subscribers', value: analytics.counts.totalSubscribers, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { label: 'Active', value: analytics.counts.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Expired', value: analytics.counts.expired, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Cancelled', value: analytics.counts.cancelled, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
              { label: 'Suspended', value: analytics.counts.suspended, icon: PauseCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className={`p-2.5 rounded-xl w-fit ${s.bg} mb-3`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString('en-IN')}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Revenue cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'MRR', value: analytics.revenue.mrr, icon: IndianRupee, color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { label: 'ARR', value: analytics.revenue.arr, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'ARPU', value: analytics.revenue.arpu, icon: User, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Lifetime Revenue', value: analytics.revenue.lifetimeRevenue, icon: Wallet, color: 'text-rose-500', bg: 'bg-rose-50' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className={`p-2.5 rounded-xl w-fit ${s.bg} mb-3`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-2xl font-bold text-gray-900">₹{Math.round(s.value).toLocaleString('en-IN')}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts: plan distribution pie + growth bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-6">Plan Distribution</h2>
              <div className="h-[220px] w-full">
                {analytics.planDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No subscribers yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="name"
                        stroke="none"
                      >
                        {analytics.planDistribution.map((entry) => (
                          <Cell key={entry.name} fill={hexFor(entry.colorKey)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(v: number, n: string) => [v, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {analytics.planDistribution.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {analytics.planDistribution.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hexFor(entry.colorKey) }} />
                      <span className="text-xs font-medium text-gray-600 truncate">{entry.name}</span>
                      <span className="text-xs font-bold text-gray-900 ml-auto">{entry.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-6">New Subscribers (6 months)</h2>
              <div className="h-[250px] w-full">
                {analytics.growth.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No growth data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(v: number) => [v, 'New Subscribers']}
                      />
                      <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loadingPlans ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-[220px] bg-white rounded-3xl border border-gray-100 animate-pulse" />
          ))
        ) : plans.map((plan, i) => {
          const Icon = iconMap[plan.iconKey] || Shield;
          const colors = colorMap[plan.colorKey] || colorMap.blue;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-3xl border bg-white shadow-sm flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${colors.bg}`}>
                  <Icon size={24} className={colors.text} />
                </div>
                <span className="text-sm font-bold text-gray-500">{plan.activeSubscribers} Active</span>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <button
                    onClick={() => setEditPlan(plan)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100 hover:border-indigo-100"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                <p className="text-gray-500 text-sm mt-1 mb-4 line-clamp-1">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-sm font-medium text-gray-500">/ month</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Subscriptions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden"
      >
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

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingSubs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Subscriber</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Plan & Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Renewal Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Auto-Renew</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">
                      No subscriptions found
                    </td>
                  </tr>
                ) : subscriptions.map((sub) => (
                  <tr key={sub.rawId} className={`hover:bg-gray-50/50 transition-colors group ${actionBusy === sub.rawId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900 text-sm">{sub.user}</span>
                        <span className="text-xs text-gray-500">ID: {sub.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-bold ${planTextColor[sub.planColor] || 'text-gray-700'}`}>
                          {sub.plan} Plan
                        </span>
                        <span className="text-xs font-medium text-gray-600">{sub.amount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          sub.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                          sub.status === 'Expired' ? 'bg-amber-50 text-amber-700' :
                          sub.status === 'Suspended' ? 'bg-orange-50 text-orange-700' :
                          'bg-rose-50 text-rose-700'
                        }
                        icon={
                          sub.status === 'Active' ? <CheckCircle2 size={12} /> :
                          sub.status === 'Suspended' ? <PauseCircle size={12} /> : <XCircle size={12} />
                        }
                      >
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{sub.renewal}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        sub.autoRenew ? 'bg-gray-100 text-gray-700' : 'text-gray-400 border border-gray-200'
                      }`}>
                        {sub.autoRenew ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenMenu(openMenu === sub.rawId ? null : sub.rawId)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          aria-label="Manage subscription"
                        >
                          {actionBusy === sub.rawId
                            ? <Loader2 size={16} className="animate-spin" />
                            : <MoreVertical size={16} />}
                        </button>
                        {openMenu === sub.rawId && (
                          <>
                            {/* click-away overlay */}
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1.5 text-left">
                              <button
                                onClick={() => openOwnerDetail(sub.rawId)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye size={14} className="text-gray-400" /> View Owner
                              </button>

                              {sub.status === 'Active' && (
                                <button
                                  onClick={() => handleSuspend(sub.rawId)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                >
                                  <PauseCircle size={14} /> Suspend
                                </button>
                              )}

                              {sub.status === 'Suspended' && (
                                <button
                                  onClick={() => handleReactivate(sub.rawId)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                >
                                  <PlayCircle size={14} /> Reactivate
                                </button>
                              )}

                              <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <CalendarPlus size={12} /> Extend Renewal
                              </div>
                              <div className="px-3 pb-1.5 flex items-center gap-1.5">
                                {[7, 30, 60, 90].map((d) => (
                                  <button
                                    key={d}
                                    onClick={() => handleExtend(sub.rawId, d)}
                                    className="flex-1 px-1.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                  >
                                    +{d}
                                  </button>
                                ))}
                              </div>

                              {(sub.status === 'Active' || sub.status === 'Suspended') && (
                                <>
                                  <div className="my-1 border-t border-gray-100" />
                                  <button
                                    onClick={() => handleForceCancel(sub.rawId)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                                  >
                                    <Ban size={14} /> Force Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loadingSubs && total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total.toLocaleString('en-IN')} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm">{page}</span>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {(editPlan || showCreate) && (
          <PlanEditModal
            plan={editPlan}
            isCreate={showCreate}
            onClose={() => { setEditPlan(null); setShowCreate(false); }}
            onSaved={() => { setEditPlan(null); setShowCreate(false); fetchPlans(); }}
          />
        )}
      </AnimatePresence>

      {/* Owner / subscription detail modal */}
      <AnimatePresence>
        {(loadingDetail || viewDetail) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setViewDetail(null); setLoadingDetail(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Subscription Details</h2>
                <button onClick={() => { setViewDetail(null); setLoadingDetail(false); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {loadingDetail || !viewDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-500" size={28} />
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Owner block */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Owner</p>
                    <div className="flex items-center gap-2.5 text-sm text-gray-900 font-semibold">
                      <User size={15} className="text-gray-400" /> {viewDetail.owner.name}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Phone size={15} className="text-gray-400" /> {viewDetail.owner.phone || '—'}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 break-all">
                      <Mail size={15} className="text-gray-400 shrink-0" /> {viewDetail.owner.email || '—'}
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 size={15} className="text-gray-400 shrink-0" />
                        Spaces: <span className="font-semibold text-gray-900">{viewDetail.owner.spacesCount ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Wallet size={15} className="text-gray-400 shrink-0" />
                        Revenue: <span className="font-semibold text-gray-900">₹{Math.round(viewDetail.owner.revenue ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription block */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plan</p>
                      <p className={`font-bold ${planTextColor[viewDetail.planColor] || 'text-gray-700'}`}>{viewDetail.plan}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</p>
                      <p className="font-semibold text-gray-900">{viewDetail.status}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</p>
                      <p className="font-semibold text-gray-900">{viewDetail.amount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Billing Cycle</p>
                      <p className="font-semibold text-gray-900">{viewDetail.billingCycle}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Start Date</p>
                      <p className="font-semibold text-gray-900">{viewDetail.startDate}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Renewal Date</p>
                      <p className="font-semibold text-gray-900">{viewDetail.renewalDate}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Auto-Renewal</p>
                      <p className="font-semibold text-gray-900">{viewDetail.autoRenewal ? 'ON' : 'OFF'}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suspend / Force-Cancel reason picker */}
      <AnimatePresence>
        {reasonModal && (
          <ReasonModal
            kind={reasonModal.kind}
            onClose={() => setReasonModal(null)}
            onConfirm={handleReasonConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReasonModalProps {
  kind: 'suspend' | 'cancel';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function ReasonModal({ kind, onClose, onConfirm }: ReasonModalProps) {
  const reasons = kind === 'suspend' ? SUSPEND_REASONS : CANCEL_REASONS;
  const [selected, setSelected] = useState(reasons[0]);
  const [otherText, setOtherText] = useState('');

  const isSuspend = kind === 'suspend';
  const finalReason = selected === 'Other' ? (otherText.trim() || 'Other') : selected;

  return (
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isSuspend ? 'Suspend Subscription' : 'Force Cancel Subscription'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            {isSuspend
              ? 'The owner will lose access until reactivated. Select a reason:'
              : 'This sets the subscription to CANCELLED and cannot be undone. Select a reason:'}
          </p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  selected === r ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={selected === r}
                  onChange={() => setSelected(r)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          {selected === 'Other' && (
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Describe the reason…"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(finalReason)}
            className={`px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors ${
              isSuspend ? 'bg-orange-600 hover:bg-orange-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSuspend ? 'Suspend' : 'Force Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface PlanEditModalProps {
  plan: Plan | null;
  isCreate: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function PlanEditModal({ plan, isCreate, onClose, onSaved }: PlanEditModalProps) {
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || 'Complete management for space owners.');
  const [price, setPrice] = useState<string>(plan ? String(plan.price) : '');
  const [yearlyPrice, setYearlyPrice] = useState<string>(plan?.yearlyPrice ? String(plan.yearlyPrice) : '');
  const [featuresText, setFeaturesText] = useState((plan?.features || []).join('\n'));
  const [iconKey, setIconKey] = useState(plan?.iconKey || 'shield');
  const [colorKey, setColorKey] = useState(plan?.colorKey || 'blue');
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  // Capability fields. Defaults for create: maxSpaces 2, all booleans false.
  const [maxSpaces, setMaxSpaces] = useState<string>(plan?.maxSpaces != null ? String(plan.maxSpaces) : '2');
  const [hasAnalytics, setHasAnalytics] = useState(plan?.hasAnalytics ?? false);
  const [hasFeaturedListing, setHasFeaturedListing] = useState(plan?.hasFeaturedListing ?? false);
  const [hasCsvExport, setHasCsvExport] = useState(plan?.hasCsvExport ?? false);
  const [hasPrioritySupport, setHasPrioritySupport] = useState(plan?.hasPrioritySupport ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setErr('');
    if (!name.trim()) { setErr('Name is required'); return; }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) { setErr('Valid price is required'); return; }

    const maxSpacesNum = Number(maxSpaces);
    if (isNaN(maxSpacesNum)) { setErr('Max spaces must be a number (-1 = unlimited)'); return; }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      yearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
      features: featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
      iconKey,
      colorKey,
      isActive,
      maxSpaces: maxSpacesNum,
      hasAnalytics,
      hasFeaturedListing,
      hasCsvExport,
      hasPrioritySupport,
    };

    try {
      setSaving(true);
      if (isCreate) {
        await adminApi.createSubscriptionPlan(payload);
      } else if (plan) {
        await adminApi.updateSubscriptionPlan(plan.id, payload);
      }
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-900">
            {isCreate ? 'Create New Plan' : `Edit ${plan?.name} Plan`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {err && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Plan Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pro"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Monthly Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="499"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Yearly Price (₹) <span className="font-normal text-gray-400 normal-case">— optional</span></label>
            <input
              type="number"
              value={yearlyPrice}
              onChange={(e) => setYearlyPrice(e.target.value)}
              placeholder="e.g. 4999"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Features <span className="font-normal text-gray-400 normal-case">— one per line</span></label>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={5}
              placeholder="Up to 10 spaces&#10;Advanced analytics&#10;Priority support"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Icon</label>
              <select
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="shield">Shield (Basic)</option>
                <option value="zap">Zap (Pro)</option>
                <option value="crown">Crown (Premium)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Color</label>
              <select
                value={colorKey}
                onChange={(e) => setColorKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="blue">Blue</option>
                <option value="indigo">Indigo</option>
                <option value="amber">Amber</option>
                <option value="emerald">Emerald</option>
                <option value="rose">Rose</option>
              </select>
            </div>
          </div>

          {/* Capabilities */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Capabilities</p>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Max Spaces <span className="font-normal text-gray-400 normal-case">(-1 = unlimited)</span>
              </label>
              <input
                type="number"
                value={maxSpaces}
                onChange={(e) => setMaxSpaces(e.target.value)}
                placeholder="2"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Advanced Analytics', checked: hasAnalytics, set: setHasAnalytics },
                { label: 'Featured Listing', checked: hasFeaturedListing, set: setHasFeaturedListing },
                { label: 'CSV Export', checked: hasCsvExport, set: setHasCsvExport },
                { label: 'Priority Support', checked: hasPrioritySupport, set: setHasPrioritySupport },
              ].map((c) => (
                <label
                  key={c.label}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    c.checked ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={(e) => c.set(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-primaryDark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isCreate ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
