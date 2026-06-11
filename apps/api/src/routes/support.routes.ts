import { Router } from 'express';
import { supportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', supportController.createTicket);
router.get('/my', supportController.listMyTickets);
router.get('/:id', supportController.getMyTicket);
router.post('/:id/reply', supportController.addUserReply);
router.post('/:id/reopen', supportController.reopenTicket);
router.post('/:id/rate', supportController.rateTicket);

export default router;
