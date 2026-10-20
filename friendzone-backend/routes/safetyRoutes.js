import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { reportLimiter, loginLimiter } from '../middleware/rateLimit.js';
import * as safetyController from '../controllers/safetyController.js';

const router = Router();

router.use(protect);

router.get('/blocks', safetyController.getBlockedUsers);
router.post('/blocks/:userId', safetyController.blockUser);
router.delete('/blocks/:userId', safetyController.unblockUser);
router.post('/reports', reportLimiter, safetyController.reportContent);
router.post('/delete-account', loginLimiter, safetyController.deleteAccount);

export default router;
