import { Router } from 'express';
import { configController } from '../controllers/config.controller';

const router = Router();

// All config endpoints are public (no auth needed)
router.get('/space-types', configController.getSpaceTypes);
router.get('/support-config', configController.getSupportConfig);
router.get('/booking-statuses', configController.getBookingStatusConfig);
router.get('/space-risk-levels', configController.getSpaceRiskLevels);

export default router;
