import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';

const router = Router();

// Report an incident (parker side)
router.post('/', authenticate, async (req, res) => {
  try {
    const { bookingId, reportType, description, evidenceUrls } = req.body;
    if (!bookingId || !reportType) {
      return res.status(400).json({ error: 'bookingId and reportType required' });
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
    res.json({ success: true, report });
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
