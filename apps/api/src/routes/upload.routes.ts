import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadEvidence, verifyUploadSignature } from '../middleware/upload';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

router.use(authenticate);

// Generic evidence upload for support / incident / abuse reports.
router.post('/evidence', uploadEvidence, verifyUploadSignature, uploadController.evidence);

export default router;
