require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { sendOTPEmail } = require('../services/emailService');

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  console.log(`[Signup Controller] Attempting signup for email: ${email}`);

  try {
    let user = await User.findOne({ email });
    if (user) {
      console.log(`[Signup Controller] User already exists for email: ${email}`);
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log(`[Signup Controller] Hashing password for email: ${email}`);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`[Signup Controller] Password hashed successfully for email: ${email}`);

    user = new User({
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 3 * 60 * 1000,
      theme: 'light',
    });

    console.log(`[Signup Controller] Saving new user to DB for email: ${email}`);
    await user.save();
    console.log(`[Signup Controller] User saved successfully for email: ${email}`);

    console.log(`[Signup Controller] Sending OTP email to: ${email}`);
    await sendOTPEmail(email, otp);
    console.log(`[Signup Controller] OTP email sent successfully to: ${email}`);

    res.status(201).json({ message: 'OTP sent to email' });
    console.log(`[Signup Controller] Signup successful, OTP sent response for email: ${email}`);
  } catch (err) {
    console.error(`[Signup Controller] Error during signup for email: ${email}`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, purpose } = req.body;

  console.log(`[Verify OTP Controller] Attempting to verify OTP for email: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Verify OTP Controller] User not found for email: ${email}`);
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      console.log(`[Verify OTP Controller] Invalid OTP. Provided: ${otp}, Expected: ${user.otp}`);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.otpExpires < Date.now()) {
      console.log(`[Verify OTP Controller] OTP expired for email: ${email}`);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;

    if (purpose === "signup") {
      user.otp = null;
      user.otpExpires = null;
    }

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Email verified successfully',
      tokens: {
        accessToken,
        refreshToken,
      },
      theme: user.theme,
    });
  } catch (err) {
    console.error(`[Verify OTP Controller] Error during OTP verification for ${email}`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 3 * 60 * 1000;
    await user.save();

    await sendOTPEmail(email, otp);
    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Error resending OTP", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log(`[Login Controller] Attempting login for email: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Login Controller] User not found during login attempt for email: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials or not verified' });
    }

    if (!user.isVerified) {
      console.log(`[Login Controller] User not verified for email: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials or not verified' });
    }

    console.log(`[Login Controller] User found and verified. Comparing passwords for email: ${email}`);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Login Controller] Password mismatch for email: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`[Login Controller] Password matched. Generating tokens for email: ${email}`);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    console.log(`[Login Controller] Tokens generated for email: ${email}`);

    res.json({
      message: 'Login successful',
      tokens: {
        accessToken,
        refreshToken,
      },
      theme: user.theme,
    });
    console.log(`[Login Controller] Login successful, response sent for email: ${email}`);
  } catch (err) {
    console.error(`[Login Controller] Error during login for email: ${email}`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTheme = async (req, res) => {
  const { theme } = req.body;

  const validThemes = [
    'light', 'dark', 'oreo', 'yinyang', 'ocean', 'sunset', 'forest',
    'midnight', 'candy', 'earth', 'desert', 'twilight', 'coral', 'mint',
    'steel', 'royal', 'lavender', 'platinum', 'blush', 'rosegold',
    'sky', 'cyberpunk', 'coffee', 'ice', 'sakura', 'fire'
  ];

  console.log(`[Update Theme Controller] Attempting to update theme to: ${theme} for user ID: ${req.user ? req.user.id : 'N/A'}`);

  if (!validThemes.includes(theme)) {
    console.log(`[Update Theme Controller] Invalid theme name provided: ${theme} for user ID: ${req.user ? req.user.id : 'N/A'}`);
    return res.status(400).json({ message: 'Invalid theme name provided' });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      console.log(`[Update Theme Controller] User not found for ID: ${req.user.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[Update Theme Controller] User found. Updating theme from ${user.theme} to ${theme} for user ID: ${user._id}`);
    user.theme = theme;
    await user.save();
    console.log(`[Update Theme Controller] Theme updated and saved successfully for user ID: ${user._id}. New theme: ${user.theme}`);

    res.status(200).json({ message: 'Theme updated successfully', newTheme: user.theme });
    console.log(`[Update Theme Controller] Theme update successful, response sent for user ID: ${user._id}`);
  } catch (err) {
    console.error(`[Update Theme Controller] Error updating theme for user ID: ${req.user ? req.user.id : 'N/A'}`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  console.log("Incoming refresh token request headers:", req.headers);
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

exports.forgetPassword = async (req, res) => {
  const { email } = req.body;
  console.log(`[Forget Password Controller] Received request for email: ${email}`);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[Forget Password Controller] No user found with email: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 3 * 60 * 1000;

    await user.save();

    console.log(`[Forget Password Controller] Sending OTP email to: ${email}`);
    await sendOTPEmail(email, otp);
    console.log(`[Forget Password Controller] OTP email sent successfully`);

    res.status(200).json({ message: 'OTP sent for password reset' });
  } catch (err) {
    console.error(`[Forget Password Controller] Error:`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  console.log("[Reset Password Controller] Payload received:", {
  email,
  otp,
  newPassword,
  len: newPassword?.length,
});


  console.log(`[Reset Password Controller] Attempting reset for email: ${email}`);

  if (!email || !otp || !newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({ message: 'Email, OTP, and valid password are required' });
  }

  try {
    const user = await User.findOne({ email });
    console.log("[Reset Password Controller] User found:", {
  email: user.email,
  storedOtp: user.otp,
  storedOtpExpires: user.otpExpires,
  currentTime: Date.now(),
});

    if (!user) {
      console.log(`[Reset Password Controller] User not found: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    console.log(`[Reset Password Controller] Password reset successful for: ${email}`);
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(`[Reset Password Controller] Error for ${email}`, err);
    res.status(500).json({ message: 'Server error' });
  }
};
