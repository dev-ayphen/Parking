'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Loader2, User, ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface Incident {
  id: number;
  bookingId: string;
  reportType: string;
  description: string;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  reportedByUser: { id: number; firstName: string; lastName: string; phone: string } | null;
  createdAt: string;
}

const REPORT_TYPES: Record<string, { label: string; color: string }> = {
  TOWING:           { label: 'Vehicle Towed',     color: 'bg-red-100 text-red-700' },
  VEHICLE_DAMAGE:   { label: 'Vehicle Damaged',   color: 'bg-orange-100 text-orange-700' },
  UNSAFE_SPACE:     { label: 'Unsafe Space',       color: 'bg-yellow-100 text-yellow-700' },
  DISPUTE:          { label: 'Booking Dispute',    color: 'bg-blue-100 text-blue-700' },
  PROPERTY_DAMAGE:  { label: 'Property Damage',    color: 'bg-red-100 text-red-700' },
  HARASSMENT:       { label: 'Harassment',         color: 'bg-purple-100 text-purple-700' },
  ILLEGAL_PARKING:  { label: 'Illegal Parking',    color: 'bg-orange-100 text-orange-700' },
  THEFT:            { label: 'Theft',              color: 'bg-red-100 text-red-700' },
  OTHER:            { label: 'Other',              color: 'bg-gray-100 text-gray-700' },
};

const STATUS_COLOR: Record<string, string> = {
  REPORTED:     'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  RESOLVED:     'bg-emerald-100 text-emerald-700',
  CLOSED:       'bg-gray-100 text-gray-700',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  REPORTED:      ['INVESTIGATING', 'RESOLVED', 'CLOSED'],
  INVESTIGATING: ['RESOLVED', 'CLOSED'],
  RESOLVED:      ['CLOSED'],
  CLOSED:        [],
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Status update modal
  const [updateIncident, setUpdateIncident] = useState<Incident | null>(null);
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.listIncidents({ status: statusFilter || undefined, page });
      if (data.success) {
        setIncidents(data.incidents || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') console.error('Incidents:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleUpdate = async () => {
    if (!updateIncident) return;
    try {
      setUpdating(true);
      await adminApi.updateIncidentStatus(updateIncident.id, {
        status: newStatus,
        resolution: resolution || undefined,
      });
      setUpdateIncident(null);
      setResolution('');
      fetchIncidents();
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') console.error('Update failed:', e);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = incidents.filter(i => {
    if (!search) return true;
    const name = i.reportedByUser ? `${i.reportedByUser.firstName} ${i.reportedByUser.lastName}`.toLowerCase() : '';
    return name.includes(search.toLowerCase()) || i.bookingId.toLowerCase().includes(search.toLowerCase());
  });

  const openCount = incidents.filter(i => ['REPORTED', 'INVESTIGATING'].includes(i.status)).length;

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Incident Reports</h1>
          <p className="text-gray-500 mt-1">Track and manage parking-related incidents and complaints.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div><div className="text-2xl font-bold text-red-600">{total}</div><p className="text-xs text-gray-500 mt-1">Total</p></div>
          <div><div className="text-2xl font-bold text-amber-600">{openCount}</div><p className="text-xs text-gray-500 mt-1">Open</p></div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by booking ID or reporter name..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500 text-sm">No incident reports found. This is a good sign!</p>
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
                {filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">#{inc.bookingId}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{inc.description}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inc.reportedByUser ? `${inc.reportedByUser.firstName} ${inc.reportedByUser.lastName}` : '—'}
                          </p>
                          <p className="text-xs text-gray-500">{inc.reportedByUser?.phone || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${REPORT_TYPES[inc.reportType]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {REPORT_TYPES[inc.reportType]?.label || inc.reportType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[inc.status] || 'bg-gray-100'}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{fmt(inc.createdAt)}</td>
                    <td className="px-5 py-4">
                      {STATUS_TRANSITIONS[inc.status]?.length > 0 && (
                        <button onClick={() => {
                          setUpdateIncident(inc);
                          setNewStatus(STATUS_TRANSITIONS[inc.status][0]);
                          setResolution(inc.resolution || '');
                        }} className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Status Update Modal */}
      {updateIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Update Incident Status</h2>
              <button onClick={() => setUpdateIncident(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
              <p className="font-semibold">Booking #{updateIncident.bookingId}</p>
              <p className="text-gray-500 text-xs mt-0.5">{REPORT_TYPES[updateIncident.reportType]?.label} · {updateIncident.description}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                {STATUS_TRANSITIONS[updateIncident.status].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {['RESOLVED', 'CLOSED'].includes(newStatus) && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Resolution Note</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
                  placeholder="Describe how this incident was resolved..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none" />
              </div>
            )}
            <button onClick={handleUpdate} disabled={updating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
              {updating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
