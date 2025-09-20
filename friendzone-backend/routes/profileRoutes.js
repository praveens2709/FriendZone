import { Router } from 'express';
const router = Router();
import upload from '../middleware/upload.js';
import { protect } from '../middleware/authMiddleware.js';
import * as profileController from '../controllers/profileController.js';

router.get('/', protect, profileController.getProfile);
router.get('/:userId', protect, profileController.getProfileById);
router.put('/', protect, upload.single('profileImage'), profileController.updateProfile);
router.put('/privacy', protect, profileController.toggleUserPrivacy);

export default router;