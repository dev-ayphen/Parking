import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { spaceCreationLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { searchSpacesQuerySchema } from '../validations/space.validation';
import { uploadDoc, uploadSpaceMedia, verifyUploadSignature } from '../middleware/upload';
import { spaceController } from '../controllers/space.controller';
import { documentController } from '../controllers/document.controller';

const router = Router();

// Public routes (static paths must come before /:id)
router.get('/document-rules', documentController.getAllRules);
router.get('/search', validate(searchSpacesQuerySchema, 'query'), spaceController.searchSpaces);

// Owner: my spaces (must be before /:id or Express matches 'my' as an id param)
router.get('/my', authenticate, spaceController.getMySpaces);

router.get('/:id', spaceController.getSpace);

// Public — reviews list for a space (read by the "See All Reviews" screen)
router.get('/:id/reviews', spaceController.getSpaceReviews);

// Admin: all spaces
router.get('/', authenticate, requireRole('ADMIN'), spaceController.getAllSpaces);

// Space creation — authenticated + rate-limited (anti-spam for fake listings)
router.post('/', authenticate, spaceCreationLimiter, spaceController.createSpace);

// Space media (photos + video) — uploaded after creation, owner-only
router.post('/:id/media', authenticate, uploadSpaceMedia, verifyUploadSignature, spaceController.uploadMedia);

// Space mutation — authenticated + ownership enforced in service layer
router.put('/:id', authenticate, spaceController.updateSpace);
router.delete('/:id', authenticate, spaceController.deleteSpace);

// Owner-only: bookings and analytics for own spaces
router.get('/:id/bookings', authenticate, spaceController.getSpaceBookings);
router.get('/:id/analytics', authenticate, spaceController.getSpaceAnalytics);

// "Notify me when available" — parker subscribes to a full space (authenticated)
router.get('/:id/availability-alert', authenticate, spaceController.getAvailabilityAlertStatus);
router.post('/:id/availability-alert', authenticate, spaceController.subscribeAvailabilityAlert);
router.delete('/:id/availability-alert', authenticate, spaceController.unsubscribeAvailabilityAlert);

// Admin-only: approve/reject
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), spaceController.approveSpace);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), spaceController.rejectSpace);

// Document routes — KYC documents are PRIVATE (rental agreements, GST, EB bills
// with names/addresses). Only the space owner or an admin may list them.
router.get('/:id/documents', authenticate, documentController.list);
router.post(
  '/:id/documents',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    uploadDoc(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, error: 'File upload failed. Check file type and size.' });
      next();
    });
  },
  verifyUploadSignature,
  documentController.upload,
);
router.delete('/:id/documents/:docId', authenticate, documentController.remove);
router.get('/:id/document-compliance', documentController.compliance);

// Owner consent routes
router.post('/:id/owner-consent', authenticate, spaceController.recordOwnerConsent);
router.get('/:id/owner-consent', authenticate, spaceController.getOwnerConsent);

// Roadside / Open Frontage risk acknowledgment (parker side)
router.post('/:id/roadside-acknowledgment', authenticate, spaceController.recordRoadsideAcknowledgment);

export default router;
