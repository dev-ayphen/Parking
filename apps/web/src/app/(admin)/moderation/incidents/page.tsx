'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Search, Filter, Eye, Clock, CheckCircle2, XCircle, Loader2, MapPin, User,
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface Incident {
  id: number;
  bookingId: string;
  reportType: string;
  description: string;
  status: string;
  reportedByUser: { name: string; phone: string } | null;
  createdAt: string;
}

const REPORT_TYPES: Record<string, { label: string; color: string }> = {
  TOWING: { label: 'Vehicle Towed', color: 'bg-red-100 text-red-700' },
  VEHICLE_DAMAGE: { label: 'Vehicle Damaged', color: 'bg-orange-100 text-orange-700' },
  UNSAFE_SPACE: { label: 'Unsafe Space', color: 'bg-yellow-100 text-yellow-700' },
  DISPUTE: { label: 'Booking Dispute', color: 'bg-blue-100 text-blue-700' },
  PROPERTY_DAMAGE: { label: 'Property Damage', color: 'bg-red-100 text-red-700' },
  HARASSMENT: { label: 'Harassment', color: 'bg-purple-100 text-purple-700' },
  ILLEGAL_PARKING: { label: 'Illegal Parking', color: 'bg-orange-100 text-orange-700' },
  THEFT: { label: 'Theft', color: 'bg-red-100 text-red-700' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

const STATUS_COLOR: Record<string, string> = {
  REPORTED: 'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      // For now, return empty — endpoint needs to be created on backend
      setIncidents([]);
    } catch (e: any) {
      console.error('Error loading incidents:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Incident Reports</h1>
          <p className="text-gray-500 mt-1">Track and manage parking-related incidents and complaints.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-red-600">{incidents.length}</div>
          <p className="text-xs text-gray-500 mt-1">Open Incidents</p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by booking ID or parker name..."
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
          {Object.entries(REPORT_TYPES).map(([key, val]) => (
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
          <option>RESOLVED</option>
          <option>CLOSED</option>
        </select>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500 text-sm">No incident reports yet. This is a good sign!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5 font-semibold">Incident</th>
                  <th className="px-5 py-3.5 font-semibold">Reported By</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">#{incident.bookingId}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{incident.description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{incident.reportedByUser?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{incident.reportedByUser?.phone || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${REPORT_TYPES[incident.reportType]?.color || 'bg-gray-100'}`}>
                        {REPORT_TYPES[incident.reportType]?.label || incident.reportType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[incident.status]}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{formatDate(incident.createdAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1">
                        <Eye size={14} /> View
                      </button>
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
