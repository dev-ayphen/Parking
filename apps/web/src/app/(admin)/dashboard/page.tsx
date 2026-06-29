'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users, MapPin, CreditCard, Activity,
  TrendingUp, Clock, AlertCircle, CheckCircle2,
  ChevronRight, BarChart3, Loader2, Download,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { adminApi } from '@/services/api';
import { exportCsv } from '@/lib/download';
import { StatCardSkeleton } from '@/components/Skeleton';

interface StatItem {
  value: string;
  change: string;
  isPositive: boolean;
}

interface OverviewData {
  stats: {
    totalUsers: StatItem;
    activeSpaces: StatItem;
    monthlyRevenue: StatItem;
    liveSessions: StatItem;
  };
  revenueChart: { day: string; value: number }[];
  topSpaces: { rank: number; id: number; name: string; location: string; bookings: number }[];
  recentActivity: { id: number; type: string; title: string; user: string; time: string }[];
}

const iconForActivity = (type: string) => {
  switch (type) {
    case 'registration': return { Icon: Users, color: 'text-blue-500' };
    case 'approval': return { Icon: CheckCircle2, color: 'text-emerald-500' };
    case 'payment': return { Icon: CreditCard, color: 'text-indigo-500' };
    case 'alert': return { Icon: AlertCircle, color: 'text-rose-500' };
    default: return { Icon: Activity, color: 'text-gray-500' };
  }
};

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [range, setRange] = useState('7d');

  // "Generate Report" → download the full platform bookings CSV.
  const handleGenerateReport = async () => {
    setReporting(true);
    await exportCsv(adminApi.exportBookingsCsv, 'platform-report');
    setReporting(false);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.getOverview(range);
        setData(res);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const statCards = data ? [
    { label: 'Total Users', stat: data.stats.totalUsers, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Active Spaces', stat: data.stats.activeSpaces, icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Monthly Revenue', stat: data.stats.monthlyRevenue, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Live Sessions', stat: data.stats.liveSessions, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 py-4 -mt-4 mb-2 flex items-center justify-between border-b border-gray-200"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-gray-500 mt-1">Here's what's happening on ParkSwift today.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Healthy
          </span>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-3 rounded-2xl ${card.bg}`}>
                    <card.icon size={22} className={card.color} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${card.stat.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {card.stat.isPositive && <TrendingUp size={14} />}
                    {card.stat.change}
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-gray-500 text-sm font-medium mb-1">{card.label}</h3>
                  <p className="text-2xl font-bold text-gray-900">{card.stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Revenue Overview</h2>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>

              {data && data.revenueChart.some((d) => d.value > 0) ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        formatter={(v: number) => [`₹${v}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] w-full bg-gray-50 rounded-2xl border border-gray-100 border-dashed flex flex-col items-center justify-center text-gray-400">
                  <BarChart3 size={40} className="mb-3 opacity-20" />
                  <p className="font-medium text-sm">No revenue data yet</p>
                  <p className="text-xs mt-1">Revenue will show as bookings complete</p>
                </div>
              )}
            </motion.div>

            {/* Top Spaces */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Top Spaces</h2>
                <Link href="/spaces" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center">
                  View All <ChevronRight size={16} />
                </Link>
              </div>
              <div className="space-y-5 flex-1">
                {data && data.topSpaces.length > 0 ? data.topSpaces.map((space) => (
                  <div key={space.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0">
                      #{space.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{space.name}</p>
                      <p className="text-xs text-gray-500 truncate">{space.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{space.bookings}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bookings</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-gray-400 text-center py-8">No spaces yet</div>
                )}
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={reporting}
                className="w-full mt-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {reporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Generate Report
              </button>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <button className="text-gray-500 hover:text-gray-900">
                <Clock size={20} />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {data && data.recentActivity.length > 0 ? data.recentActivity.map((activity) => {
                const { Icon, color } = iconForActivity(activity.type);
                return (
                  <div key={activity.id} className="py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors -mx-6 px-6">
                    <div className={`p-2 rounded-full bg-gray-50 border border-gray-100 ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{activity.user}</p>
                    </div>
                    <div className="text-xs font-medium text-gray-400 whitespace-nowrap">
                      {activity.time}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-sm text-gray-400 text-center py-8">No recent activity</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
