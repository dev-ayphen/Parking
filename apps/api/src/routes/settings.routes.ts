import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';

const router = Router();

// Public — mobile + web fetch on app startup
router.get('/public', settingsController.getPublicSettings);

export default router;
