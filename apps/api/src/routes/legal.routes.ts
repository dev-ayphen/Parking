import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { adminService } from '../services/admin.service';

const router = Router();

// Public — anyone (including unauthenticated mobile) can read legal docs
router.get('/documents', async (_req: Request, res: Response) => {
  try {
    const result = await adminService.listLegalDocuments();
    const activeDocs = result.documents.filter((d) => d.isActive);
    res.json({ success: true, documents: activeDocs });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/documents/:slug', async (req: Request, res: Response) => {
  try {
    const result = await adminService.getLegalDocument(req.params.slug);
    res.json(result);
  } catch (error) {
    const msg = (error as Error).message;
    res.status(msg === 'Document not found' ? 404 : 500).json({ success: false, message: msg });
  }
});

// Authenticated — log acceptance / compliance request
router.post('/accept', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false });
    const { slug, version, type, platform, appVersion } = req.body || {};
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const result = await adminService.recordCompliance({
      type: type || 'T_AND_C_ACCEPTED',
      userId,
      documentSlug: slug,
      documentVersion: version,
      platform,
      appVersion,
      ipAddress,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

router.post('/data-request', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false });
    const type = req.body?.type === 'DELETION' ? 'DATA_DELETION_REQUESTED' : 'DATA_EXPORT_REQUESTED';
    const result = await adminService.recordCompliance({ type, userId });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

export default router;
