'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CreditCard,
  ArrowRight,
  Info,
  Crown,
  Sparkles,
  ShieldCheck,
  Star,
  FileText,
  Receipt,
  RefreshCw,
  Banknote,
} from 'lucide-react';

const REVENUE_STREAMS = [
  {
    icon: Crown,
    title: 'Space owner subscriptions',
    desc: 'Monthly / yearly Pro plans for parking-space owners.',
    color: 'amber',
  },
  {
    icon: Sparkles,
    title: 'Premium listing boosts',
    desc: 'Owners pay to promote their space to the top of search.',
    color: 'indigo',
  },
  {
    icon: ShieldCheck,
    title: 'Verification badges',
    desc: 'One-time fee for verified-owner / verified-space badges.',
    color: 'emerald',
  },
  {
    icon: Star,
    title: 'Featured placement',
    desc: 'Homepage and category-page featured slots.',
    color: 'rose',
  },
] as const;

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
};

const COMING_SOON = [
  { icon: Receipt, label: 'Subscription invoice ledger' },
  { icon: RefreshCw, label: 'Refund processing & logs' },
  { icon: Banknote, label: 'Razorpay / Stripe gateway reconciliation' },
  { icon: FileText, label: 'GST reports & finance audit exports' },
];

export default function PaymentsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payments & Billing</h1>
        <p className="text-gray-500 mt-1">
          Manage subscription billing, invoices, and future payment integrations.
        </p>
      </div>

      {/* ─── Disclaimer card ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 max-w-4xl shadow-sm mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-blue-600" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 mb-1.5">
              Booking money is not handled by ParkSwift
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Parkers pay owners directly at the space (cash, UPI, Paytm). ParkSwift earns only from
              <span className="font-semibold text-gray-900"> subscription revenue</span> — the streams listed below.
              This page tracks ParkSwift's own income, never the money flowing between users.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── Current Platform Revenue Model ──────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 max-w-4xl shadow-sm mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Current Platform Revenue Model</h2>
            <p className="text-sm text-gray-500 mt-0.5">How ParkSwift earns today</p>
          </div>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#DC0159] hover:text-[#A8003F] transition-colors"
          >
            Manage plans
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REVENUE_STREAMS.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_MAP[color]}`}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ─── Coming soon ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 max-w-4xl shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Coming once payment gateway is live</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              These tools activate when Razorpay / Stripe is wired for subscription checkout.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            Planned
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMING_SOON.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100"
            >
              <Icon size={16} className="text-gray-400" strokeWidth={2} />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#DC0159] hover:bg-[#A8003F] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <CreditCard size={16} />
            Go to Subscriptions
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
