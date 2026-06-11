import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes - require authentication
router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.put('/me/complete-profile', authenticate, userController.completeProfile);

// Public route - no authentication needed
router.get('/:id', userController.getPublicProfile);

export default router;
