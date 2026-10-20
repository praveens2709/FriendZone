import { Router } from 'express';
const router = Router();
import { imageUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { protect } from '../middleware/authMiddleware.js';
import * as profileController from '../controllers/profileController.js';

router.get('/', protect, profileController.getProfile);
router.put('/privacy', protect, profileController.toggleUserPrivacy);
router.put('/phone', protect, profileController.updatePhone);
router.get('/close-friends', protect, profileController.getCloseFriends);
router.put('/close-friends', protect, profileController.updateCloseFriends);
router.put('/', protect, uploadLimiter, imageUpload.single('profileImage'), profileController.updateProfile);
router.get('/:userId', protect, profileController.getProfileById);

export default router;
