'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Flag, Search, Loader2, User, Calendar, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface AbuseReport {
  id: number;
  reportedUser: { id: number; name: string; phone: string };
  reportedByUser: { name: string } | null;
  abuseType: string;
  description: string;
  status: string;
  permanentlyBanned: boolean;
  suspendedUntil: string | null;
  createdAt: string;
}

const ABUSE_TYPES: Record<string, { label: string; color: string; category: 'parker' | 'owner' }> = {
  FAKER_BOOKING: { label: 'Fake Booking', color: 'bg-orange-100 text-orange-700', category: 'parker' },
  DAMAGING_PROPERTY: { label: 'Property Damage', color: 'bg-red-100 text-red-700', category: 'parker' },
  REPEATED_CANCELLATION: { label: 'Repeated Cancellation', color: 'bg-yellow-100 text-yellow-700', category: 'parker' },
  ILLEGAL_PARKING: { label: 'Illegal Parking', color: 'bg-red-100 text-red-700', category: 'parker' },
  HARASSMENT: { label: 'Harassment', color: 'bg-purple-100 text-purple-700', category: 'parker' },
  FAKE_SPACE: { label: 'Fake Space Listing', color: 'bg-red-100 text-red-700', category: 'owner' },
  UNSAFE_AREA: { label: 'Unsafe Area', color: 'bg-red-100 text-red-700', category: 'owner' },
  OFFLINE_PAYMENT_DEMAND: { label: 'Offline Payment Demand', color: 'bg-orange-100 text-orange-700', category: 'owner' },
  MISLEADING_LISTING: { label: 'Misleading Listing', color: 'bg-yellow-100 text-yellow-700', category: 'owner' },
  OTHER: { label: 'Other Abuse', color: 'bg-gray-100 text-gray-700', category: 'parker' },
};

const STATUS_COLOR: Record<string, string> = {
  REPORTED: 'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  WARNING_ISSUED: 'bg-yellow-100 text-yellow-700',
  SUSPENDED_TEMP: 'bg-orange-100 text-orange-700',
  BANNED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

export default function AbuseReportsPage() {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      // For now, return empty — endpoint needs to be created on backend
      setReports([]);
    } catch (e: any) {
      console.error('Error loading abuse reports:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const bannedCount = reports.filter(r => r.permanentlyBanned).length;
  const suspendedCount = reports.filter(r => r.suspendedUntil && new Date(r.suspendedUntil) > new Date()).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Abuse Reports & Moderation</h1>
          <p className="text-gray-500 mt-1">Track user misconduct, fake listings, and enforce platform policies.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{reports.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total Reports</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{suspendedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Suspended</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{bannedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Banned</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="Search by user name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option>All Types</option>
          {Object.entries(ABUSE_TYPES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option>All Statuses</option>
          <option>REPORTED</option>
          <option>INVESTIGATING</option>
          <option>WARNING_ISSUED</option>
          <option>SUSPENDED_TEMP</option>
          <option>BANNED</option>
          <option>RESOLVED</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <Flag className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500 text-sm">No abuse reports. Platform is clean!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5 font-semibold">Reported User</th>
                  <th className="px-5 py-3.5 font-semibold">Abuse Type</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${report.permanentlyBanned ? 'bg-red-600' : report.suspendedUntil ? 'bg-orange-600' : 'bg-gray-400'}`}>
                          {report.reportedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{report.reportedUser.name}</p>
                          <p className="text-xs text-gray-500">{report.reportedUser.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ABUSE_TYPES[report.abuseType]?.color || 'bg-gray-100'}`}>
                        {ABUSE_TYPES[report.abuseType]?.label || report.abuseType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[report.status]}`}>
                          {report.status}
                        </span>
                        {report.permanentlyBanned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <AlertCircle size={12} /> BANNED
                          </span>
                        )}
                        {report.suspendedUntil && new Date(report.suspendedUntil) > new Date() && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            <Calendar size={12} /> {new Date(report.suspendedUntil).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                        Review
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{formatDate(report.createdAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
