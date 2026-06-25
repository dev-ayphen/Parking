'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings2, Shield, Bell, DollarSign,
  Globe, Save, Lock, Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff,
} from 'lucide-react';
import { adminApi } from '@/services/api';

interface PlatformSettings {
  // General
  platformName: string;
  supportEmail: string;
  supportPhone: string | null;
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  // Pricing & Fees
  minHourlyRate: number;
  maxHourlyRate: number;
  platformFeePercent: number;
  cancellationFeePercent: number;
  cancellationPolicy: string;
  refundPolicy: string;
  discountCodesEnabled: boolean;
  gstRate: number;
  // Security
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requirePhoneVerification: boolean;
  requireEmailVerification: boolean;
  passwordMinLength: number;
  // Notifications
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
  bookingNotifications: boolean;
  paymentNotifications: boolean;
  supportTicketNotifications: boolean;
  systemAlerts: boolean;
  // API
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  msg91Enabled: boolean;
  fcmEnabled: boolean;
  fcmServerKey: string | null;
  googleMapsApiKey: string | null;
  webhookUrl: string | null;
  apiRateLimit: number;
}

const tabs = [
  { name: 'General', icon: Settings2 },
  { name: 'Security', icon: Shield },
  { name: 'Notifications', icon: Bell },
  { name: 'Pricing & Fees', icon: DollarSign },
  { name: 'API & Integrations', icon: Globe },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['name']>('General');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [original, setOriginal] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSettings();
      setSettings(res.settings);
      setOriginal(res.settings);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const isDirty = settings && original && JSON.stringify(settings) !== JSON.stringify(original);

  const updateField = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    setSuccess('');
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError('');
      const res = await adminApi.updateSettings(settings);
      setSettings(res.settings);
      setOriginal(res.settings);
      setSuccess('Settings saved. Changes are now live for all users.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Platform Settings</h1>
          <p className="text-gray-500 mt-1">Configure your ParkSwift environment.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-pink-600/20 flex items-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 mt-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === tab.name
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.name ? 'text-indigo-600' : 'text-gray-400'} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-6">
          {/* ============ GENERAL ============ */}
          {activeTab === 'General' && (
            <Card title="Application Details" icon={<Settings2 size={20} className="text-indigo-500" />}>
              <FormGrid>
                <Field label="Platform Name">
                  <TextInput value={settings.platformName} onChange={(v) => updateField('platformName', v)} />
                </Field>
                <Field label="Support Email">
                  <TextInput type="email" value={settings.supportEmail} onChange={(v) => updateField('supportEmail', v)} />
                </Field>
                <Field label="Support Phone">
                  <TextInput value={settings.supportPhone ?? ''} onChange={(v) => updateField('supportPhone', v || null)} placeholder="+91 ..." />
                </Field>
                <Field label="Default Currency">
                  <Select value={settings.defaultCurrency} onChange={(v) => updateField('defaultCurrency', v)} options={['INR', 'USD', 'EUR', 'GBP']} />
                </Field>
                <Field label="Default Locale">
                  <Select value={settings.defaultLocale} onChange={(v) => updateField('defaultLocale', v)} options={['en-IN', 'en-US', 'hi-IN']} />
                </Field>
                <Field label="Timezone">
                  <Select
                    value={settings.timezone ?? 'Asia/Kolkata'}
                    onChange={(v) => updateField('timezone', v)}
                    options={[
                      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
                      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
                      { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
                      { value: 'Europe/London', label: 'Europe/London (GMT, UTC+0)' },
                      { value: 'Europe/Paris', label: 'Europe/Paris (CET, UTC+1)' },
                      { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
                      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST, UTC-8)' },
                      { value: 'UTC', label: 'UTC (UTC+0)' },
                    ]}
                  />
                </Field>
              </FormGrid>

              <SectionDivider />
              <ToggleRow
                title="Maintenance Mode"
                description="Block all users from accessing the platform."
                value={settings.maintenanceMode}
                onChange={(v) => updateField('maintenanceMode', v)}
                accent="amber"
              />
              {settings.maintenanceMode && (
                <Field label="Maintenance Message">
                  <Textarea
                    value={settings.maintenanceMessage ?? ''}
                    onChange={(v) => updateField('maintenanceMessage', v || null)}
                    placeholder="We're improving ParkSwift. Back soon!"
                  />
                </Field>
              )}
            </Card>
          )}

          {/* ============ SECURITY ============ */}
          {activeTab === 'Security' && (
            <Card title="Admin Access" icon={<Lock size={20} className="text-indigo-500" />}>
              <ToggleRow
                title="Two-Factor Authentication"
                description="Require 2FA for all admin accounts."
                value={settings.twoFactorEnabled}
                onChange={(v) => updateField('twoFactorEnabled', v)}
              />
              <ToggleRow
                title="Require Phone Verification"
                description="New users must verify phone via OTP before booking."
                value={settings.requirePhoneVerification}
                onChange={(v) => updateField('requirePhoneVerification', v)}
              />
              <ToggleRow
                title="Require Email Verification"
                description="New users must verify email before unlocking features."
                value={settings.requireEmailVerification}
                onChange={(v) => updateField('requireEmailVerification', v)}
              />

              <SectionDivider />

              <FormGrid>
                <Field label="Session Timeout">
                  <Select
                    value={String(settings.sessionTimeoutMinutes)}
                    onChange={(v) => updateField('sessionTimeoutMinutes', Number(v))}
                    options={[
                      { value: '15', label: '15 Minutes' },
                      { value: '30', label: '30 Minutes' },
                      { value: '60', label: '1 Hour' },
                      { value: '1440', label: '1 Day' },
                      { value: '10080', label: '7 Days' },
                      { value: '43200', label: '30 Days' },
                    ]}
                  />
                </Field>
                <Field label="Max Login Attempts">
                  <NumberInput value={settings.maxLoginAttempts} onChange={(v) => updateField('maxLoginAttempts', v)} min={3} max={10} />
                </Field>
                <Field label="Password Min Length">
                  <NumberInput value={settings.passwordMinLength} onChange={(v) => updateField('passwordMinLength', v)} min={6} max={32} />
                </Field>
              </FormGrid>
            </Card>
          )}

          {/* ============ NOTIFICATIONS ============ */}
          {activeTab === 'Notifications' && (
            <Card title="Notification Channels" icon={<Bell size={20} className="text-indigo-500" />}>
              <ToggleRow
                title="Email Notifications"
                description="Send transactional emails (bookings, receipts, alerts)."
                value={settings.emailNotificationsEnabled}
                onChange={(v) => updateField('emailNotificationsEnabled', v)}
              />
              <ToggleRow
                title="SMS Notifications"
                description="Send SMS alerts via MSG91 for OTP and bookings."
                value={settings.smsNotificationsEnabled}
                onChange={(v) => updateField('smsNotificationsEnabled', v)}
              />
              <ToggleRow
                title="Push Notifications"
                description="Send mobile push via FCM/APNS."
                value={settings.pushNotificationsEnabled}
                onChange={(v) => updateField('pushNotificationsEnabled', v)}
              />
              <ToggleRow
                title="Marketing Emails"
                description="Promotional emails to opted-in users."
                value={settings.marketingEmailsEnabled}
                onChange={(v) => updateField('marketingEmailsEnabled', v)}
              />

              <SectionDivider />

              <ToggleRow
                title="Booking Notifications"
                description="Notify users about booking lifecycle events."
                value={settings.bookingNotifications}
                onChange={(v) => updateField('bookingNotifications', v)}
              />
              <ToggleRow
                title="Payment Notifications"
                description="Notify users about subscription / refund / payout events."
                value={settings.paymentNotifications}
                onChange={(v) => updateField('paymentNotifications', v)}
              />
              <ToggleRow
                title="Support Ticket Notifications"
                description="Notify users and admins when a support ticket is opened, updated, or resolved."
                value={settings.supportTicketNotifications ?? false}
                onChange={(v) => updateField('supportTicketNotifications', v)}
              />
              <ToggleRow
                title="System Alerts"
                description="Send critical system/security alerts to admins."
                value={settings.systemAlerts}
                onChange={(v) => updateField('systemAlerts', v)}
              />
            </Card>
          )}

          {/* ============ PRICING & FEES ============ */}
          {activeTab === 'Pricing & Fees' && (
            <Card title="Subscription Fees & Policies" icon={<DollarSign size={20} className="text-emerald-500" />}>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-900 font-medium">ℹ️ Platform Model</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  ParkSwift is a coordination-only platform. Booking payments happen directly between parker and owner.
                  Fees below apply only to subscription plans and platform services.
                </p>
              </div>

              <InlineRow
                title="Platform Fee (%)"
                description="Percentage charged by ParkSwift on subscription plan revenue."
              >
                <div className="relative">
                  <NumberInput value={settings.platformFeePercent ?? 0} onChange={(v) => updateField('platformFeePercent', v)} step={0.5} min={0} max={50} className="w-24 text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">%</span>
                </div>
              </InlineRow>

              <InlineRow
                title="GST Rate (%)"
                description="Tax applied to subscription plans and platform services."
              >
                <div className="relative">
                  <NumberInput value={settings.gstRate} onChange={(v) => updateField('gstRate', v)} step={0.5} min={0} max={100} className="w-24 text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">%</span>
                </div>
              </InlineRow>

              <InlineRow
                title="Cancellation Fee (%)"
                description="Fee retained when a subscription is cancelled within the restricted window."
              >
                <div className="relative">
                  <NumberInput value={settings.cancellationFeePercent ?? 0} onChange={(v) => updateField('cancellationFeePercent', v)} step={0.5} min={0} max={100} className="w-24 text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">%</span>
                </div>
              </InlineRow>

              <InlineRow
                title="Min/Max Parking Rates"
                description="Allowed hourly rate bounds for space owners — keeps marketplace balanced (₹)."
              >
                <div className="flex items-center gap-2">
                  <PrefixedInput prefix="₹" value={settings.minHourlyRate} onChange={(v) => updateField('minHourlyRate', v)} />
                  <span className="text-gray-400">-</span>
                  <PrefixedInput prefix="₹" value={settings.maxHourlyRate} onChange={(v) => updateField('maxHourlyRate', v)} />
                </div>
              </InlineRow>

              <SectionDivider />

              <FormGrid>
                <Field label="Subscription Cancellation Policy">
                  <Select
                    value={settings.cancellationPolicy}
                    onChange={(v) => updateField('cancellationPolicy', v)}
                    options={[
                      { value: 'FLEXIBLE', label: 'Flexible (Full refund up to 24h)' },
                      { value: 'MODERATE', label: 'Moderate (50% refund up to 24h)' },
                      { value: 'STRICT', label: 'Strict (No refund within 48h)' },
                    ]}
                  />
                </Field>
                <Field label="Subscription Refund Policy">
                  <Select
                    value={settings.refundPolicy}
                    onChange={(v) => updateField('refundPolicy', v)}
                    options={[
                      { value: 'AUTO_REFUND', label: 'Auto-refund to original source' },
                      { value: 'WALLET', label: 'Refund to ParkSwift Wallet' },
                      { value: 'MANUAL', label: 'Manual Review Required' },
                    ]}
                  />
                </Field>
              </FormGrid>

              <SectionDivider />

              <ToggleRow
                title="Discount Codes"
                description="Allow users to apply promo codes on subscription plans."
                value={settings.discountCodesEnabled}
                onChange={(v) => updateField('discountCodesEnabled', v)}
                accent="emerald"
              />
            </Card>
          )}

          {/* ============ API & INTEGRATIONS ============ */}
          {activeTab === 'API & Integrations' && (
            <Card title="External Services" icon={<Globe size={20} className="text-indigo-500" />}>
              <div className="mb-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm text-amber-900 font-medium">API keys are sensitive credentials</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Keys are masked by default. Click Reveal to view the full key. Changes are encrypted at rest.
                </p>
              </div>

              <ToggleRow
                title="Razorpay (Subscriptions)"
                description="Enable Razorpay for subscription payments."
                value={settings.razorpayEnabled}
                onChange={(v) => updateField('razorpayEnabled', v)}
              />
              <Field label="Razorpay Key ID">
                <MaskedKeyInput
                  value={settings.razorpayKeyId ?? ''}
                  onChange={(v) => updateField('razorpayKeyId', v || null)}
                  placeholder="rzp_live_XXXXXXXXXXXXXXXX"
                />
              </Field>

              <SectionDivider />

              <ToggleRow
                title="MSG91 (SMS / OTP)"
                description="Enable MSG91 SMS gateway."
                value={settings.msg91Enabled}
                onChange={(v) => updateField('msg91Enabled', v)}
              />

              <ToggleRow
                title="FCM (Push Notifications)"
                description="Enable Firebase Cloud Messaging for mobile push."
                value={settings.fcmEnabled}
                onChange={(v) => updateField('fcmEnabled', v)}
              />
              <Field label="FCM Server Key">
                <MaskedKeyInput
                  value={settings.fcmServerKey ?? ''}
                  onChange={(v) => updateField('fcmServerKey', v || null)}
                  placeholder="AAAA....:APA91b..."
                />
              </Field>

              <SectionDivider />

              <Field label="Google Maps API Key">
                <MaskedKeyInput
                  value={settings.googleMapsApiKey ?? ''}
                  onChange={(v) => updateField('googleMapsApiKey', v || null)}
                  placeholder="AIzaSy..."
                />
              </Field>
              <Field label="Webhook URL">
                <TextInput
                  value={settings.webhookUrl ?? ''}
                  onChange={(v) => updateField('webhookUrl', v || null)}
                  placeholder="https://example.com/webhook"
                />
              </Field>
              <Field label="API Rate Limit (requests / min per user)">
                <NumberInput value={settings.apiRateLimit} onChange={(v) => updateField('apiRateLimit', v)} min={10} max={1000} />
              </Field>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ──────────────────── Reusable form pieces ────────────────────
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">{icon} {title}</h2>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InlineRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50/50 gap-4">
      <div className="flex-1">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-gray-100 pt-2" />;
}

function ToggleRow({ title, description, value, onChange, accent = 'indigo' }: {
  title: string; description: string; value: boolean; onChange: (v: boolean) => void;
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const accentClass = {
    indigo: 'peer-checked:bg-indigo-600',
    emerald: 'peer-checked:bg-emerald-500',
    amber: 'peer-checked:bg-amber-500',
    rose: 'peer-checked:bg-rose-500',
  }[accent];
  return (
    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full ${accentClass}`} />
      </label>
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
    />
  );
}

function NumberInput({ value, onChange, min, max, step, className = '' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium ${className || 'w-full'}`}
    />
  );
}

function PrefixedInput({ prefix, value, onChange }: { prefix: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{prefix}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 pl-7 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
      />
    </div>
  );
}

function MaskedKeyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [revealed, setRevealed] = useState(false);

  const maskedDisplay = value
    ? '••••••••••••••••' + value.slice(-4)
    : '';

  if (!revealed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-mono text-sm tracking-widest select-none">
          {value ? maskedDisplay : <span className="text-gray-300 tracking-normal font-sans">{placeholder ?? 'Not set'}</span>}
        </div>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap"
        >
          <Eye size={15} /> Reveal
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className="flex-1 px-4 py-2.5 bg-gray-50 border border-indigo-300 rounded-xl text-gray-900 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
      />
      <button
        type="button"
        onClick={() => setRevealed(false)}
        className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap"
      >
        <EyeOff size={15} /> Hide
      </button>
    </div>
  );
}

type SelectOption = string | { value: string; label: string };
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
    >
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const l = typeof opt === 'string' ? opt : opt.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}
