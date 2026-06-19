import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { db } from '../config/database';
import { emitToAdmin } from '../app';

const router = Router();

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
    const { status, page = '1', search } = req.query;
    const take = 20;
    const skip = (parseInt(page as string) - 1) * take;
    const where: any = {};
    if (status && status !== 'All') where.status = status;
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
    res.json({ success: true, incidents, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
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
    res.json({ success: true, incident: updated });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get incident details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const report = await db.incidentReport.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { booking: { select: { id: true, parkerId: true, spaceId: true } } },
    });
    if (!report) return res.status(404).json({ error: 'Incident not found' });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
