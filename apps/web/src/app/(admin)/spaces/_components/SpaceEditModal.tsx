'use client';

import { useState } from 'react';
import { Pencil, X, Loader2 } from 'lucide-react';
import { adminApi } from '@/services/api';
import type { AdminSpace } from './types';

export function SpaceEditModal({
  space, onClose, onSaved,
}: { space: AdminSpace; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(space.name);
  const [address, setAddress] = useState(space.address);
  const [hourlyRate, setHourlyRate] = useState(String(space.hourlyRate));
  const [capacity, setCapacity] = useState(String(space.capacity));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) { setErr('Name and address are required'); return; }
    try {
      setSaving(true);
      setErr('');
      await adminApi.updateSpace(space.id, {
        name: name.trim(),
        address: address.trim(),
        hourlyRate: Number(hourlyRate) || 0,
        capacity: Number(capacity) || 1,
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Pencil size={18} className="text-indigo-600" /> Edit Space</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{err}</div>}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Space Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Hourly Rate (₹)</label>
              <input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Capacity</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
