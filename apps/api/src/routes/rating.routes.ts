import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ratingController } from '../controllers/rating.controller';

const router = Router();

router.post('/', authenticate, ratingController.submitRating);

export default router;
