import { Router } from 'express';
import { helpController } from '../controllers/help.controller';

const router = Router();

// All help endpoints are public (no auth needed)
router.get('/faq', helpController.getFaq);
router.get('/articles', helpController.getArticles);

export default router;
