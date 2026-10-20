import { Router } from 'express';
const router = Router();
import {
  signup,
  verifyOTP,
  resendOtp,
  login,
  logout,
  updateTheme,
  refreshToken,
  forgetPassword,
  resetPassword,
  changePassword,
  acceptTerms,
  requestEmailChange,
  confirmEmailChange,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  refreshLimiter,
} from '../middleware/rateLimit.js';

router.post('/signup', otpRequestLimiter, signup);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);
router.post('/resend-otp', otpRequestLimiter, resendOtp);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.put('/update-theme', protect, updateTheme);
router.post('/refresh-token', refreshLimiter, refreshToken);
router.post('/forget-password', otpRequestLimiter, forgetPassword);
router.post('/reset-password', otpVerifyLimiter, resetPassword);
router.post('/accept-terms', protect, acceptTerms);
router.post('/email-change/request', protect, otpRequestLimiter, requestEmailChange);
router.post('/email-change/confirm', protect, otpVerifyLimiter, confirmEmailChange);
router.put('/change-password', protect, loginLimiter, changePassword);

export default router;
