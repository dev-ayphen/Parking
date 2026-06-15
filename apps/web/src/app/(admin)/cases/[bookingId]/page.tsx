'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Car,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Calendar,
  Globe,
  Smartphone,
  Lock,
  Download,
  Activity,
} from 'lucide-react';
import { adminApi } from '@/services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'consent', label: 'Consent & Acknowledgments', icon: CheckCircle2 },
  { id: 'timeline', label: 'Timeline', icon: Activity },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'incidents', label: 'Incidents & Abuse', icon: AlertTriangle },
] as const;

type TabId = typeof TABS[number]['id'];

const fmtDate = (d?: string | Date | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const fmtName = (u?: { firstName?: string | null; lastName?: string | null } | null) => {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
};

export default function CaseEvidencePage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.getCaseEvidence(bookingId);
        setEvidence(res);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Failed to load case evidence');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="p-8">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium">Could not load case evidence</p>
          <p className="text-red-600 text-sm mt-1">{error || 'Booking not found'}</p>
        </div>
      </div>
    );
  }

  const ev = evidence.evidence;
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evidence.caseRef}_evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {/* Top bar */}
      <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> Back to bookings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded">Case File</span>
            <span className="text-xs text-gray-400 font-mono">{evidence.caseRef}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Booking Evidence — {ev.space.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Generated {fmtDate(evidence.generatedAt)} · Booking {ev.booking.id.slice(0, 12)}…
          </p>
        </div>
        <button
          onClick={downloadJson}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Download size={14} /> Export JSON
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Audit events', value: evidence.counts.bookingAuditEntries, icon: Activity, color: 'indigo' },
          { label: 'Roadside ack', value: evidence.counts.roadsideAcks, icon: AlertTriangle, color: 'rose' },
          { label: 'Documents', value: evidence.counts.documents, icon: FileText, color: 'emerald' },
          { label: 'Notifications', value: evidence.counts.notifications, icon: Phone, color: 'blue' },
          { label: 'Abuse reports', value: evidence.counts.abuseReports, icon: AlertTriangle, color: 'orange' },
          { label: 'Incidents', value: evidence.counts.incidents, icon: AlertTriangle, color: 'red' },
          { label: 'Admin actions', value: evidence.counts.adminActions, icon: Shield, color: 'purple' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  active
                    ? 'border-[#DC0159] text-[#DC0159]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'overview' && <OverviewTab ev={ev} />}
        {activeTab === 'consent' && <ConsentTab ev={ev} />}
        {activeTab === 'timeline' && <TimelineTab timeline={evidence.timeline} />}
        {activeTab === 'documents' && <DocumentsTab docs={ev.documents} />}
        {activeTab === 'incidents' && <IncidentsTab ev={ev} />}
      </motion.div>
    </div>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────────────

const OverviewTab = ({ ev }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card title="Booking">
      <Field icon={Lock} label="Status" value={ev.booking.status} />
      <Field icon={Calendar} label="Created" value={fmtDate(ev.booking.createdAt)} />
      <Field icon={Calendar} label="ETA" value={fmtDate(ev.booking.eta)} />
      <Field icon={Clock} label="Duration" value={`${ev.booking.duration} hr`} />
      <Field icon={Calendar} label="Session started" value={fmtDate(ev.booking.sessionStartedAt)} />
      <Field icon={Calendar} label="Session ended" value={fmtDate(ev.booking.sessionEndedAt)} />
      <Field icon={Lock} label="Payment mode" value={ev.booking.paymentMode} />
      <Field icon={Lock} label="Total" value={`₹${ev.booking.totalAmount}`} />
    </Card>

    <Card title="Parker">
      <Field icon={User} label="Name" value={fmtName(ev.parker)} />
      <Field icon={Phone} label="Phone" value={ev.parker?.phone} />
      <Field icon={Mail} label="Email" value={ev.parker?.email} />
      <Field icon={Calendar} label="Joined" value={fmtDate(ev.parker?.createdAt)} />
      <Field icon={Lock} label="Account status" value={ev.parker?.status} />
      {ev.parker?.deletedAt && <Field icon={AlertTriangle} label="Deleted at" value={fmtDate(ev.parker.deletedAt)} />}

      <div className="border-t border-gray-100 my-3" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle</p>
      <Field icon={Car} label="Plate" value={ev.vehicle?.licensePlate} />
      <Field icon={Car} label="Type" value={ev.vehicle?.vehicleType} />
      <Field icon={Car} label="Model" value={ev.vehicle?.brandModel} />
      <Field icon={Car} label="Capacity" value={ev.vehicle?.capacity} />
    </Card>

    <Card title="Owner & Space">
      <Field icon={User} label="Owner" value={fmtName(ev.owner)} />
      <Field icon={Phone} label="Phone" value={ev.owner?.phone} />
      <Field icon={Mail} label="Email" value={ev.owner?.email} />

      <div className="border-t border-gray-100 my-3" />
      <Field icon={MapPin} label="Space name" value={ev.space.name} />
      <Field icon={MapPin} label="Address" value={ev.space.address} />
      <Field icon={MapPin} label="Landmark" value={ev.space.landmark} />
      <Field icon={Lock} label="Type" value={ev.space.spaceType} />
      <Field icon={Lock} label="Visibility" value={ev.space.visibility} />
      <Field icon={Lock} label="Status" value={ev.space.status} />
      {ev.space.requiresAdminReview && <Field icon={AlertTriangle} label="Risk flag" value="Requires admin review" />}
    </Card>
  </div>
);

// ─── Tab: Consent & Acknowledgments ────────────────────────────────────────

const ConsentTab = ({ ev }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card title="Booking consent (Parker)">
      {ev.bookingConsent ? (
        <>
          <Field icon={CheckCircle2} label="Verified surroundings" value={ev.bookingConsent.verifiedSurroundings ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept local parking rules" value={ev.bookingConsent.acceptLocalParkingRules ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept fine responsibility" value={ev.bookingConsent.acceptFineResponsibility ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept platform disclaimer" value={ev.bookingConsent.acceptPlatformDisclaimer ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept parking terms" value={ev.bookingConsent.acceptParkingTerms ? 'Yes' : 'No'} />
          <div className="border-t border-gray-100 my-3" />
          <Field icon={Calendar} label="Accepted at" value={fmtDate(ev.bookingConsent.acceptedAt)} />
          <Field icon={Globe} label="IP address" value={ev.bookingConsent.ipAddress} />
          <Field icon={Smartphone} label="Device" value={ev.bookingConsent.userAgent} />
          <Field icon={Lock} label="T&C version" value={ev.bookingConsent.tcVersion} />
          <Field icon={Lock} label="Platform" value={ev.bookingConsent.platform} />
          <Field icon={Lock} label="App version" value={ev.bookingConsent.appVersion} />
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">No booking consent recorded.</p>
      )}
    </Card>

    <Card title="Owner consent (Space submission)">
      {ev.ownerConsent ? (
        <>
          <Field icon={CheckCircle2} label="Accept owner responsibility" value={ev.ownerConsent.acceptOwnerResponsibility ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept legal compliance" value={ev.ownerConsent.acceptLegalCompliance ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Accept public obstruction rules" value={ev.ownerConsent.acceptPublicObstructionRules ? 'Yes' : 'No'} />
          <Field icon={CheckCircle2} label="Non-violation declaration" value={ev.ownerConsent.acceptNonViolationDeclaration ? 'Yes' : 'No'} />
          {ev.ownerConsent.nonViolationDeclarationText && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">Declaration text</p>
              <p className="text-xs text-amber-900 leading-relaxed">{ev.ownerConsent.nonViolationDeclarationText}</p>
            </div>
          )}
          <div className="border-t border-gray-100 my-3" />
          <Field icon={Calendar} label="Accepted at" value={fmtDate(ev.ownerConsent.acceptedAt)} />
          <Field icon={Globe} label="IP address" value={ev.ownerConsent.ipAddress} />
          <Field icon={Smartphone} label="Device" value={ev.ownerConsent.userAgent} />
          <Field icon={Lock} label="T&C version" value={ev.ownerConsent.tcVersion} />
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">No owner consent recorded.</p>
      )}
    </Card>

    <Card title="Roadside acknowledgments" cols={2}>
      {ev.roadsideAcknowledgments?.length ? (
        <div className="space-y-3">
          {ev.roadsideAcknowledgments.map((ack: any) => (
            <div key={ack.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-800">Acknowledgment #{ack.id}</span>
                <span className="text-xs text-rose-600">{fmtDate(ack.acceptedAt)}</span>
              </div>
              <p className="text-xs text-rose-900 leading-relaxed mb-2">{ack.warningText}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-rose-700">
                <span><Globe size={10} className="inline" /> {ack.ipAddress || '—'}</span>
                <span><Smartphone size={10} className="inline" /> {ack.platform || '—'} {ack.appVersion ? `v${ack.appVersion}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No roadside acknowledgments. (Space may not be roadside type.)</p>
      )}
    </Card>
  </div>
);

// ─── Tab: Timeline ──────────────────────────────────────────────────────────

const TimelineTab = ({ timeline }: { timeline: any[] }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="relative">
      {timeline.map((entry, i) => (
        <div key={i} className="flex gap-4 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            </div>
            {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">{entry.kind}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-xs text-gray-500">{fmtDate(entry.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-900 font-medium capitalize">{entry.summary}</p>
            {entry.actor && (
              <p className="text-xs text-gray-500 mt-0.5">
                <User size={10} className="inline mr-1" />
                {entry.actor}
              </p>
            )}
            {entry.payload && Object.keys(entry.payload).length > 0 && (
              <pre className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-[10px] text-gray-600 overflow-x-auto font-mono">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
      {timeline.length === 0 && <p className="text-sm text-gray-400 italic">No events recorded.</p>}
    </div>
  </div>
);

// ─── Tab: Documents ─────────────────────────────────────────────────────────

const DocumentsTab = ({ docs }: { docs: any[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {docs?.length ? (
      docs.map((d) => (
        <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="font-bold text-gray-900">{d.documentType.replace(/_/g, ' ')}</p>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
              d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
              d.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {d.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">Uploaded {fmtDate(d.createdAt)}</p>
          {d.verifiedAt && <p className="text-xs text-gray-500">Verified {fmtDate(d.verifiedAt)} by admin #{d.verifiedById}</p>}
          {d.rejectionReason && <p className="text-xs text-red-600 mt-1">Rejection: {d.rejectionReason}</p>}
          {d.fileUrl && (
            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <FileText size={12} /> View document
            </a>
          )}
        </div>
      ))
    ) : (
      <p className="text-sm text-gray-400 italic col-span-2">No documents on file.</p>
    )}
  </div>
);

// ─── Tab: Incidents & Abuse ─────────────────────────────────────────────────

const IncidentsTab = ({ ev }: any) => {
  const cv = ev.conditionVerification;
  // All photos the parker attached across their incident reports.
  const complaintPhotos: string[] = (ev.incidentReports || []).flatMap((i: any) => i.evidenceUrls || []);
  const conditionPhotos: string[] = cv?.mediaUrls || [];
  const showComparison = conditionPhotos.length > 0 || complaintPhotos.length > 0;

  return (
  <div className="space-y-4">
    {/* Side-by-side: owner's pre-parking condition vs parker's complaint photos */}
    {showComparison && (
      <Card title="Condition vs Complaint — Photo Comparison">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT — owner recorded BEFORE parking */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Owner — Before Parking</p>
              {cv && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  cv.parkerAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {cv.parkerAccepted ? 'Parker accepted' : 'Not accepted'}
                </span>
              )}
            </div>
            {cv ? (
              <>
                {cv.type === 'PHOTO_VIDEO' && conditionPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {conditionPhotos.map((url, k) => (
                      <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`condition ${k + 1}`} className="w-full h-20 object-cover rounded-lg border border-blue-200 hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700 italic">Owner reported no existing damage.</p>
                )}
                {/* Timeline proof: recorded → accepted, both before the session. */}
                <div className="mt-2.5 pt-2.5 border-t border-blue-200 space-y-1">
                  {cv.recordedAt && (
                    <p className="text-[11px] text-blue-700">
                      <span className="font-semibold">Recorded by owner:</span> {fmtDate(cv.recordedAt)}
                    </p>
                  )}
                  <p className="text-[11px] text-blue-700">
                    <span className="font-semibold">Parker accepted:</span>{' '}
                    {cv.parkerAccepted && cv.acceptedAt ? fmtDate(cv.acceptedAt) : <span className="text-amber-600">Not yet accepted</span>}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">No condition record.</p>
            )}
          </div>

          {/* RIGHT — parker complained AFTER parking */}
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-3">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Parker — Complaint Photos</p>
            {complaintPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {complaintPhotos.map((url, k) => (
                  <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt={`complaint ${k + 1}`} className="w-full h-20 object-cover rounded-lg border border-red-200 hover:opacity-80 transition" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No complaint photos attached.</p>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Compare the owner&apos;s pre-parking record (left) against the parker&apos;s complaint (right) to assess responsibility for the damage.
        </p>
      </Card>
    )}

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card title={`Incidents (${ev.incidentReports?.length || 0})`}>
      {ev.incidentReports?.length ? (
        <div className="space-y-3">
          {ev.incidentReports.map((i: any) => (
            <div key={i.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-red-800">{i.reportType}</span>
                <span className="text-[10px] text-red-600">{fmtDate(i.createdAt)}</span>
              </div>
              <p className="text-xs text-red-900">{i.description}</p>
              {i.evidenceUrls?.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {i.evidenceUrls.map((url: string, k: number) => (
                    <a key={k} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] underline text-red-700">Evidence {k + 1}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No incident reports.</p>
      )}
    </Card>

    <Card title={`Abuse reports (${ev.abuseReports?.length || 0})`}>
      {ev.abuseReports?.length ? (
        <div className="space-y-3">
          {ev.abuseReports.map((r: any) => (
            <div key={r.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-orange-800">{r.abuseType}</span>
                <span className="text-[10px] text-orange-600">{r.status} · {fmtDate(r.createdAt)}</span>
              </div>
              <p className="text-xs text-orange-900 mb-1">{r.description}</p>
              <p className="text-[10px] text-orange-700">
                Reported by {fmtName(r.reportedByUser)} → about {fmtName(r.reportedUser)}
              </p>
              {r.adminAction && <p className="text-[10px] text-orange-700 mt-1">Admin: {r.adminAction}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No abuse reports.</p>
      )}
    </Card>
  </div>
  </div>
  );
};

// ─── Shared bits ────────────────────────────────────────────────────────────

const Card = ({ title, children, cols }: { title: string; children: React.ReactNode; cols?: number }) => (
  <div className={`bg-white border border-gray-200 rounded-xl p-5 ${cols === 2 ? 'lg:col-span-2' : ''}`}>
    <h3 className="text-sm font-bold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="flex items-start gap-2 py-1.5 text-sm">
    <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
    <span className="text-gray-500 w-32 flex-shrink-0 text-xs">{label}</span>
    <span className="text-gray-900 font-medium break-all flex-1">{value || '—'}</span>
  </div>
);
