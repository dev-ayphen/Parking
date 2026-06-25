import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { db } from '../config/database';
import { emitToAdmin, emitToUser } from '../app';
import { storageService } from '../services/storage.service';
import { BUCKETS } from '../config/supabase';
import { adminService } from '../services/admin.service';

const router = Router();

/**
 * Evidence files live in the PRIVATE bucket (PII). Stored values are keys;
 * resolve each to a short-lived signed URL before returning to a client.
 * Legacy rows holding full public URLs pass through unchanged.
 */
const resolveEvidenceUrls = async (urls: unknown): Promise<string[]> => {
  if (!Array.isArray(urls)) return [];
  return Promise.all(
    urls.map((u: string) =>
      storageService.resolveUrl(u, BUCKETS.PRIVATE).catch(() => u)
    )
  );
};

// Get my incidents (parker side — my reports)
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const incidents = await db.incidentReport.findMany({
      where: { reportedByUserId: userId },
      include: { booking: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const withSigned = await Promise.all(
      incidents.map(async (inc) => ({
        ...inc,
        evidenceUrls: await resolveEvidenceUrls(inc.evidenceUrls),
      }))
    );
    res.json({ success: true, incidents: withSigned });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Report an incident (parker side)
router.post('/', authenticate, async (req, res) => {
  try {
    const { bookingId, reportType, description, evidenceUrls } = req.body;
    if (!bookingId || !reportType) {
      return res.status(400).json({ error: 'bookingId and reportType required' });
    }

    // Idempotency guard — only ONE incident per booking (enforced by a @unique
    // column too). Repeat taps / app restarts return the existing report instead
    // of stacking INC-001…INC-005 for the same booking.
    const existing = await db.incidentReport.findUnique({ where: { bookingId } });
    if (existing) {
      return res.json({ success: true, report: existing, alreadyReported: true });
    }

    const report = await db.incidentReport.create({
      data: {
        bookingId,
        reportedByUserId: req.user?.id || 0,
        reportType,
        description: description || '',
        evidenceUrls: evidenceUrls || [],
      },
    });
    // Live-refresh the admin incidents page.
    emitToAdmin('moderation', 'incident:new', { id: report.id });
    res.json({ success: true, report });
  } catch (error) {
    // Unique-constraint race (two requests slip past the findUnique above):
    // return the row that won instead of a 500.
    if ((error as any)?.code === 'P2002') {
      const existing = await db.incidentReport.findUnique({ where: { bookingId: req.body.bookingId } });
      if (existing) return res.json({ success: true, report: existing, alreadyReported: true });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

// Admin: list all incidents with filters
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, page = '1', search, reportType } = req.query;
    const take = 20;
    const skip = (parseInt(page as string) - 1) * take;
    const where: any = {};
    if (status && status !== 'All') where.status = status;
    if (reportType && reportType !== 'All') where.reportType = reportType;
    if (search) {
      where.OR = [
        { bookingId: { contains: search as string, mode: 'insensitive' } },
        { reportedByUser: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { reportedByUser: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    const [incidents, total] = await Promise.all([
      db.incidentReport.findMany({
        where,
        include: {
          reportedByUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.incidentReport.count({ where }),
    ]);
    const withSigned = await Promise.all(
      incidents.map(async (inc) => ({
        ...inc,
        evidenceUrls: await resolveEvidenceUrls(inc.evidenceUrls),
      }))
    );
    res.json({ success: true, incidents: withSigned, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Admin: update incident status (OPEN | INVESTIGATING | RESOLVED | REJECTED)
router.put('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: OPEN, INVESTIGATING, RESOLVED, REJECTED' });
    }
    const updated = await db.incidentReport.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status,
        adminNotes: adminNotes || null,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null,
      },
    });

    // Notify the reporter in real time so their "My Incidents" updates without a
    // manual pull-to-refresh. Mobile listens for `incident:updated` and re-fetches.
    if (updated.reportedByUserId) {
      const ref = `INC-${String(updated.id).padStart(5, '0')}`;
      const STATUS_LABEL: Record<string, string> = {
        OPEN: 'Open', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', REJECTED: 'Closed',
      };
      emitToUser(updated.reportedByUserId, 'incident:updated', {
        id: updated.id,
        status: updated.status,
        adminNotes: updated.adminNotes,
      });
      // Durable notification (push + bell) so the user is told even if offline.
      await adminService.notifyUser(updated.reportedByUserId, {
        title: `Incident ${ref} ${STATUS_LABEL[status] ?? status}`,
        message: adminNotes
          ? String(adminNotes)
          : `Your incident report is now "${STATUS_LABEL[status] ?? status}".`,
        category: 'SYSTEM',
      });
    }

    res.json({ success: true, incident: updated });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get incident details — reporter, the space owner, or an admin only.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const report = await db.incidentReport.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { booking: { select: { id: true, parkerId: true, spaceId: true, space: { select: { ownerId: true } } } } },
    });
    if (!report) return res.status(404).json({ error: 'Incident not found' });
    // Authorize: the reporter, the owner of the involved space, or an admin.
    const ownerId = (report.booking as any)?.space?.ownerId;
    const isAllowed =
      report.reportedByUserId === userId ||
      ownerId === userId ||
      req.user?.role === 'ADMIN';
    if (!isAllowed) {
      return res.status(403).json({ error: 'You do not have access to this incident' });
    }
    res.json({
      success: true,
      report: { ...report, evidenceUrls: await resolveEvidenceUrls(report.evidenceUrls) },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
