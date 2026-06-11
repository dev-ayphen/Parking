'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MoreVertical,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Crown, Zap, Shield, Pencil, X, Loader2, Plus,
} from 'lucide-react';
import { adminApi } from '@/services/api';

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
}

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

const tabs = [
  { key: 'Active Plans', status: 'ACTIVE' },
  { key: 'Expired', status: 'EXPIRED' },
  { key: 'Cancelled', status: 'CANCELLED' },
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

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => {
    const t = setTimeout(() => fetchSubs(), 250);
    return () => clearTimeout(t);
  }, [fetchSubs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">Action</th>
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
                  <tr key={sub.rawId} className="hover:bg-gray-50/50 transition-colors group">
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
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        sub.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                        sub.status === 'Expired' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {sub.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {sub.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{sub.renewal}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        sub.autoRenew ? 'bg-gray-100 text-gray-700' : 'text-gray-400 border border-gray-200'
                      }`}>
                        {sub.autoRenew ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical size={16} />
                      </button>
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
    </div>
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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setErr('');
    if (!name.trim()) { setErr('Name is required'); return; }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) { setErr('Valid price is required'); return; }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      yearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
      features: featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
      iconKey,
      colorKey,
      isActive,
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
