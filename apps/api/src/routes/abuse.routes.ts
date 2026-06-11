import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { abuseReportLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { submitAbuseReportSchema } from '../validations/abuse.validation';
import { abuseController } from '../controllers/abuse.controller';

const router = Router();

router.use(authenticate);

router.post('/', abuseReportLimiter, validate(submitAbuseReportSchema), abuseController.submitReport);
router.get('/my', abuseController.getMyReports);

export default router;
