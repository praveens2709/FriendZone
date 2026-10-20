import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as vibeController from '../controllers/vibeController.js';

const router = Router();

router.use(protect);

router.get('/', vibeController.getCircleVibes);
router.put('/', vibeController.setVibe);
router.delete('/', vibeController.clearVibe);

export default router;
