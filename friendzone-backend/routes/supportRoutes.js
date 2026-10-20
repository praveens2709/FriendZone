import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { sendFeedback } from '../controllers/supportController.js';

const router = Router();

const feedbackLimiter = rateLimit({
  name: 'feedback',
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyFn: (req) => req.user?.id || req.ip,
});

router.post('/feedback', protect, feedbackLimiter, sendFeedback);

export default router;
