import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/plans', subscriptionController.getAvailablePlans);
router.get('/me', authenticate, subscriptionController.getSubscription);
router.get('/me/transactions', authenticate, subscriptionController.getMyTransactions);
router.post('/', authenticate, subscriptionController.subscribe);
router.put('/:id/cancel', authenticate, subscriptionController.cancelSubscription);

export default router;
