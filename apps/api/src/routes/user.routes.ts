import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';

const router = Router();

// Protected routes - require authentication
router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.put('/me/complete-profile', authenticate, userController.completeProfile);
router.post('/me/photo', authenticate, uploadImage, userController.uploadPhoto);
router.post('/me/push-token', authenticate, userController.registerPushToken);
router.delete('/me', authenticate, userController.deleteAccount);

// Public route - no authentication needed
router.get('/:id', userController.getPublicProfile);

export default router;
