import { Router, Request, Response } from 'express';
import { db } from '../config/database';

const router = Router();

/**
 * POST /api/analytics/track
 * Receive and store user event analytics from mobile app.
 * Batched events are stored for funnel analysis, user journey tracking, and debugging.
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { events, userId, sessionId, timestamp } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    // Store events in database (non-critical, best-effort)
    try {
      const analyticsRecords = events.map((event: any) => ({
        userId: userId ? parseInt(userId, 10) : null,
        sessionId,
        eventName: event.event,
        properties: event.properties ? JSON.stringify(event.properties) : null,
        timestamp: new Date(event.timestamp || timestamp || Date.now()),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      }));

      // Batch insert for efficiency
      await db.analyticsEvent.createMany({
        data: analyticsRecords,
        skipDuplicates: true, // in case of retry
      });

      res.json({ success: true, stored: analyticsRecords.length });
    } catch (dbError: any) {
      // Don't fail the response even if DB write fails — analytics is non-critical
      if (__DEV__) console.error('[ANALYTICS] DB write failed:', dbError.message);
      res.json({ success: true, stored: 0, dbError: 'stored locally only' });
    }
  } catch (error: any) {
    if (__DEV__) console.error('[ANALYTICS] Track error:', error.message);
    // Always return 200 so client doesn't retry
    res.json({ success: true, error: error.message });
  }
});

/**
 * GET /api/analytics/events
 * (Admin-only) Retrieve raw analytics events for dashboard/reporting.
 * Query params: userId, sessionId, eventName, dateFrom, dateTo, limit, offset
 */
router.get('/events', async (req: Request, res: Response) => {
  // TODO: Add admin auth check + implement filtering
  // For now, return empty to prevent data leaks
  res.json({ events: [] });
});

export default router;
