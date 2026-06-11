'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, MapPin,
  Calendar, Download, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4'];

interface OverviewStat {
  value: string;
  change: string;
  isPositive: boolean;
}

interface AnalyticsOverview {
  stats?: {
    totalUsers?: OverviewStat;
    activeSpaces?: OverviewStat;
    monthlyRevenue?: OverviewStat;
    liveSessions?: OverviewStat;
  };
  revenueChart?: Array<{ day: string; value: number }>;
  topSpaces?: Array<{ rank: number; id: number; name: string; location: string; bookings: number }>;
  recentActivity?: Array<{ id: number; type: string; title: string; user: string; time: string }>;
  revenueByMonth?: Array<{ name: string; value: number }>;
  spaceTypeDistribution?: Array<{ name: string; value: number }>;
  bookingsByHour?: Array<{ time: string; value: number }>;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setError('');
      const res = await adminApi.getOverview();
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('admin:join'));
    socket.on('booking:new', fetchOverview);
    socket.on('booking:update', fetchOverview);
    return () => { socket.disconnect(); };
  }, [fetchOverview]);

  const revenueChart = data?.revenueByMonth || data?.revenueChart?.map((r) => ({ name: r.day, value: r.value })) || [];
  const spaceTypeData = data?.spaceTypeDistribution || [];
  const hourlyBookings = data?.bookingsByHour || [];

  const kpis = [
    {
      label: 'Total Users',
      value: data?.stats?.totalUsers?.value ?? '—',
      change: data?.stats?.totalUsers?.change ?? '',
      positive: data?.stats?.totalUsers?.isPositive ?? true,
      icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50',
    },
    {
      label: 'Monthly Revenue',
      value: data?.stats?.monthlyRevenue?.value ?? '—',
      change: data?.stats?.monthlyRevenue?.change ?? '',
      positive: data?.stats?.monthlyRevenue?.isPositive ?? true,
      icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50',
    },
    {
      label: 'Active Spaces',
      value: data?.stats?.activeSpaces?.value ?? '—',
      change: data?.stats?.activeSpaces?.change ?? '',
      positive: data?.stats?.activeSpaces?.isPositive ?? true,
      icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-50',
    },
    {
      label: 'Live Sessions',
      value: data?.stats?.liveSessions?.value ?? '—',
      change: data?.stats?.liveSessions?.change ?? '',
      positive: data?.stats?.liveSessions?.isPositive ?? true,
      icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Deep dive into platform performance and metrics.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={18} />
            Export
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg}`}>
                    <stat.icon size={22} className={stat.color} />
                  </div>
                  {stat.change && (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${stat.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stat.positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {stat.change}
                    </span>
                  )}
                </div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.label}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Revenue Trends</h2>
              </div>
              <div className="h-[300px] w-full">
                {revenueChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(v: number) => [`₹${v}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={3} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-6">Space Distribution</h2>
              <div className="h-[220px] w-full">
                {spaceTypeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No distribution data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spaceTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {spaceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {spaceTypeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-medium text-gray-600 truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-6">Peak Booking Hours</h2>
              <div className="h-[250px] w-full">
                {hourlyBookings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hourly booking data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyBookings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="time" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(v: number) => [v, 'Bookings']}
                      />
                      <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
