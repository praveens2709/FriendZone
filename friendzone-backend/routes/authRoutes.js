// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  signup,
  verifyOTP,
  login,
  updateTheme,
  refreshToken,
  forgetPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.put('/update-theme', protect, updateTheme);
router.post('/refresh-token', refreshToken);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);

module.exports = router;