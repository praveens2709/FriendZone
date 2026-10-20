import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as callController from '../controllers/callController.js';

const router = Router();

const callLimiter = rateLimit({
  name: 'calls',
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.user?.id || req.ip,
});

router.use(protect);

router.post('/', callLimiter, callController.startCall);
router.post('/:meetingId/cancel', callController.cancelCall);
router.post('/:meetingId/decline', callController.declineCall);

export default router;
