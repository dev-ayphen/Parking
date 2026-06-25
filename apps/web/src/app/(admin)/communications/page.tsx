'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, MessageSquare, Bell, Send,
  Clock, Users, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';
import { io as createSocket } from 'socket.io-client';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SOCKET_URL } from '@/lib/config';

type Audience = 'ALL' | 'PARKERS' | 'OWNERS';
type Category = 'GENERAL' | 'BOOKING' | 'PAYMENT' | 'SPACE' | 'SUPPORT' | 'SYSTEM';

interface BroadcastItem {
  title: string;
  message: string;
  category: string;
  recipients: number;
  sentAt: string;
}

const CATEGORIES: Category[] = ['GENERAL', 'BOOKING', 'PAYMENT', 'SPACE', 'SUPPORT', 'SYSTEM'];

export default function CommunicationsPage() {
  const [activeType, setActiveType] = useState('push');
  const [audience, setAudience] = useState<Audience>('ALL');
  const [category, setCategory] = useState<Category>('GENERAL');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Broadcast templates (localStorage-backed) ─────────────────────────
  type Template = { id: number; name: string; title: string; body: string; audience: Audience; category: Category };
  const TEMPLATE_KEY = 'parkswift.broadcastTemplates';
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATE_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch { /* ignore corrupt storage */ }
  }, []);

  const persistTemplates = useCallback((next: Template[]) => {
    setTemplates(next);
    try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  const saveTemplate = useCallback(() => {
    if (!messageTitle.trim() || !messageBody.trim()) { setError('Add a title and message before saving a template.'); return; }
    const name = window.prompt('Template name:', messageTitle.trim().slice(0, 40));
    if (!name) return;
    const next: Template = { id: Date.now(), name: name.trim(), title: messageTitle.trim(), body: messageBody.trim(), audience, category };
    persistTemplates([next, ...templates]);
    setSuccess('Template saved.');
  }, [messageTitle, messageBody, audience, category, templates, persistTemplates]);

  const loadTemplate = useCallback((t: Template) => {
    setMessageTitle(t.title);
    setMessageBody(t.body);
    setAudience(t.audience);
    setCategory(t.category);
  }, []);

  const deleteTemplate = useCallback((id: number) => {
    persistTemplates(templates.filter((t) => t.id !== id));
  }, [templates, persistTemplates]);

  const fetchHistory = useCallback(async () => {
    try {
      setError('');
      const res = await adminApi.listBroadcastHistory({ page: 1, limit: 20 });
      setHistory(res.history || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load broadcast history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token: useAuthStore.getState().token } });
    socket.on('connect', () => socket.emit('admin:join'));
    // 'broadcast:new' is emitted to the admin_users room (admin.controller.ts).
    // 'notification:new' is only emitted to individual user rooms, never to admins,
    // so it was removed as a dead listener.
    socket.on('broadcast:new', fetchHistory);
    return () => { socket.disconnect(); };
  }, [fetchHistory]);

  const handleSend = async () => {
    setError('');
    setSuccess('');
    if (!messageTitle.trim() || !messageBody.trim()) {
      setError('Title and message are required.');
      return;
    }
    try {
      setSending(true);
      const res = await adminApi.sendBroadcast({
        title: messageTitle.trim(),
        message: messageBody.trim(),
        audience,
        category,
      });
      setSuccess(`Broadcast sent to ${res?.sent ?? 0} recipient(s).`);
      setMessageTitle('');
      setMessageBody('');
      fetchHistory();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Communications</h1>
          <p className="text-gray-500 mt-1">Send broadcasts, emails, and push notifications to users.</p>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <CheckCircle2 size={18} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">Compose Message</h2>
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <div className="relative group">
                  <button className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                    Load Template ({templates.length})
                  </button>
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 hidden group-hover:block max-h-72 overflow-y-auto">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <button onClick={() => loadTemplate(t)} className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.title}</p>
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-rose-400 hover:text-rose-600 text-xs shrink-0">Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={saveTemplate} className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                Save as Template
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'push', label: 'Push Notification', icon: Bell, available: true },
                  { id: 'email', label: 'Email', icon: Mail, available: false },
                  { id: 'sms', label: 'SMS', icon: MessageSquare, available: false },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => type.available && setActiveType(type.id)}
                    disabled={!type.available}
                    title={type.available ? undefined : `${type.label} delivery is not yet available — coming soon`}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      !type.available
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : activeType === type.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <type.icon size={18} />
                    {type.label}
                    {!type.available && (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-500">
                        Coming soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="ALL">All Users</option>
                  <option value="OWNERS">Space Owners Only</option>
                  <option value="PARKERS">Parkers Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject / Title</label>
              <input
                type="text"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="Enter message title"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Message Body</label>
                {activeType === 'sms' && <span className="text-xs text-gray-400">{messageBody.length}/160 chars</span>}
              </div>
              <textarea
                rows={6}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your message here..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primaryDark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {sending ? 'Sending...' : 'Send Now'}
              </button>
              <button
                disabled
                title="Scheduled sending is coming soon"
                className="flex items-center justify-center gap-2 bg-white text-gray-400 border border-gray-200 px-6 py-3 rounded-xl font-semibold cursor-not-allowed"
              >
                <Clock size={18} />
                Schedule
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-500">
                  Soon
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* History Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Broadcasts</h2>
          </div>

          <div className="space-y-4 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No broadcasts yet.</p>
            ) : (
              history.map((item, idx) => (
                <div key={`${item.sentAt}-${idx}`} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-gray-50/50 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate pr-2">{item.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {item.recipients} recipients</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Delivered</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                    Sent on {formatDate(item.sentAt)}
                  </div>
                </div>
              ))
            )}
          </div>

          <button onClick={fetchHistory} className="w-full mt-6 text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors">
            Refresh History →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
