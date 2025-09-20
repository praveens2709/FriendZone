import { Router } from 'express';
const router = Router();
import {
  signup,
  verifyOTP,
  login,
  updateTheme,
  refreshToken,
  forgetPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.put('/update-theme', protect, updateTheme);
router.post('/refresh-token', refreshToken);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);

export default router;