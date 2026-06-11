import { Router } from 'express';
import { userPreferencesController } from '../controllers/userPreferences.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', userPreferencesController.getPreferences);
router.put('/', userPreferencesController.updatePreferences);

export default router;
