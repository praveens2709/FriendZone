import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { sendOTPEmail } from "../services/emailService.js";
import { normalizeEmail, isEmail } from "../utils/validate.js";
import { hasMailServer } from "../utils/emailDomain.js";
import { TERMS_VERSION } from "../utils/legal.js";

const OTP_TTL_MS = 3 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync("friendzone-dummy-password", 10);

const VALID_THEMES = [
  "light",
  "dark",
  "oreo",
  "yinyang",
  "ocean",
  "forest",
  "midnight",
  "candy",
  "earth",
  "desert",
  "mint",
  "steel",
  "royal",
  "lavender",
  "platinum",
  "blush",
  "rosegold",
  "coffee",
  "ice",
  "sakura",
  "fire",
  "mysticForest",
  "seafoam",
  "orchid",
  "sky",
  "aquamarine",
  "cherryBlossom",
  "graphite",
  "sunset",
];

const validatePassword = (password) => {
  if (typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 72) {
    return { valid: false, message: "Password must be at most 72 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
};

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_ACCESS_SECRET)
    .update(String(otp))
    .digest("hex");

const otpMatches = (stored, candidate) => {
  if (!stored || typeof candidate !== "string") return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hashOtp(candidate), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const issueOtp = async (user, purpose, toEmail = user.email) => {
  const now = Date.now();
  if (
    user.lastOtpSentAt &&
    now - user.lastOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return { throttled: true };
  }

  const otp = generateOtp();
  user.otp = hashOtp(otp);
  user.otpPurpose = purpose;
  user.otpExpires = new Date(now + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.lastOtpSentAt = new Date(now);
  await user.save();

  await sendOTPEmail(toEmail, otp);
  return { throttled: false };
};

const clearOtp = (user) => {
  user.otp = undefined;
  user.otpPurpose = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
};

const checkOtp = async (user, candidate, purpose) => {
  const now = Date.now();

  if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now) {
    return {
      ok: false,
      status: 429,
      message: "Too many wrong codes. Please wait 15 minutes before trying again.",
    };
  }

  if (
    !user.otp ||
    user.otpPurpose !== purpose ||
    !user.otpExpires ||
    user.otpExpires.getTime() < now
  ) {
    return {
      ok: false,
      status: 400,
      message: "This code has expired or was never requested. Request a new one.",
    };
  }

  if (!otpMatches(user.otp, String(candidate ?? ""))) {
    const attempts = (user.otpAttempts || 0) + 1;
    const attemptsLeft = Math.max(OTP_MAX_ATTEMPTS - attempts, 0);
    user.otpAttempts = attempts;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      clearOtp(user);
      user.otpLockedUntil = new Date(now + OTP_LOCK_MS);
    }
    await user.save();
    if (attemptsLeft === 0) {
      return {
        ok: false,
        status: 429,
        message: "Too many wrong codes. Please wait 15 minutes before trying again.",
      };
    }
    return {
      ok: false,
      status: 400,
      message: `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`,
    };
  }

  return { ok: true };
};

const buildTokens = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

export const signup = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password, acceptedTerms } = req.body || {};

  if (!isEmail(email)) {
    return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }

  if (!(await hasMailServer(email))) {
    return res.status(400).json({
      code: "INVALID_EMAIL",
      message: "That email domain doesn't look right. Check for typos.",
    });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ code: "WEAK_PASSWORD", message: passwordValidation.message });
  }

  if (acceptedTerms !== true) {
    return res.status(400).json({
      code: "TERMS_REQUIRED",
      message: "Please agree to the Terms and Privacy Policy to continue.",
    });
  }

  try {
    let user = await User.findOne({ email });

    if (user && user.isVerified) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "An account with this email already exists. Try logging in instead.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      user.password = hashedPassword;
    } else {
      user = new User({ email, password: hashedPassword, theme: "light" });
    }
    user.termsAcceptedAt = new Date();
    user.termsVersion = TERMS_VERSION;

    const result = await issueOtp(user, "signup");
    if (result.throttled) {
      return res
        .status(429)
        .json({ message: "Please wait a moment before requesting another code" });
    }

    res.status(201).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("[Signup] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { otp, purpose } = req.body || {};

  if (!isEmail(email) || !["signup", "forgot-password"].includes(purpose)) {
    return res.status(400).json({ message: "Enter a valid email and code." });
  }

  const storedPurpose = purpose === "signup" ? "signup" : "reset";

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        code: "ACCOUNT_NOT_FOUND",
        message: "No account found with this email. Please sign up.",
      });
    }

    const result = await checkOtp(user, otp, storedPurpose);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    if (storedPurpose === "reset") {
      return res.json({ message: "OTP verified" });
    }

    user.isVerified = true;
    clearOtp(user);
    await user.save();

    res.json({
      message: "Email verified successfully",
      tokens: buildTokens(user),
      theme: user.theme,
    });
  } catch (err) {
    console.error("[Verify OTP] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const resendOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const generic = { message: "A new code has been sent to your email." };

  if (!isEmail(email)) {
    return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        code: "ACCOUNT_NOT_FOUND",
        message: "No account found with this email. Please sign up.",
      });
    }

    const result = await issueOtp(user, user.isVerified ? "reset" : "signup");
    if (result.throttled) {
      return res
        .status(429)
        .json({ message: "Please wait a moment before requesting another code" });
    }

    res.json(generic);
  } catch (err) {
    console.error("[Resend OTP] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};
  if (!isEmail(email)) {
    return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }

  if (typeof password !== "string" || !password || password.length > 72) {
    return res.status(400).json({ code: "WRONG_PASSWORD", message: "Enter your password." });
  }

  try {
    const user = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !isMatch) {
      return res.status(400).json({
        code: "INVALID_CREDENTIALS",
        message: "Incorrect email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        code: "NOT_VERIFIED",
        message: "Your email isn't verified yet. Enter the code we sent you.",
      });
    }

    res.json({
      message: "Login successful",
      tokens: buildTokens(user),
      theme: user.theme,
    });
  } catch (err) {
    console.error("[Login] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("[Logout] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTheme = async (req, res) => {
  const { theme } = req.body || {};

  if (!VALID_THEMES.includes(theme)) {
    return res.status(400).json({ message: "Invalid theme name provided" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { theme } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Theme updated successfully", newTheme: user.theme });
  } catch (err) {
    console.error("[Update Theme] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || !user.isVerified || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    res.json({ accessToken: generateAccessToken(user) });
  } catch {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

export const forgetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isEmail(email)) {
    return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        code: "ACCOUNT_NOT_FOUND",
        message: "No account found with this email. Please sign up.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        code: "NOT_VERIFIED",
        message: "This email was never verified. Sign up again to get a new code.",
      });
    }

    const result = await issueOtp(user, "reset");
    if (result.throttled) {
      return res
        .status(429)
        .json({ message: "Please wait a moment before requesting another code" });
    }

    res.status(200).json({ message: "A reset code has been sent to your email." });
  } catch (err) {
    console.error("[Forget Password] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { otp, newPassword } = req.body || {};

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  try {
    const user = isEmail(email) ? await User.findOne({ email }) : null;
    if (!user) {
      return res.status(404).json({
        code: "ACCOUNT_NOT_FOUND",
        message: "No account found with this email. Please sign up.",
      });
    }

    const result = await checkOtp(user, otp, "reset");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    clearOtp(user);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("[Reset Password] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  if (typeof currentPassword !== "string") {
    return res.status(400).json({ message: "Invalid current password" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[Change Password] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptTerms = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION } }
    );
    res.json({ success: true, termsVersion: TERMS_VERSION });
  } catch (err) {
    console.error("[Accept Terms] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const requestEmailChange = async (req, res) => {
  const newEmail = normalizeEmail(req.body?.newEmail);
  const { password } = req.body || {};

  if (!isEmail(newEmail)) {
    return res.status(400).json({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
  }

  if (!(await hasMailServer(newEmail))) {
    return res.status(400).json({
      code: "INVALID_EMAIL",
      message: "That email domain doesn't look right. Check for typos.",
    });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ code: "WRONG_PASSWORD", message: "Incorrect password." });
    }

    if (newEmail === user.email) {
      return res.status(400).json({ message: "That is already your email address." });
    }

    const taken = await User.exists({ email: newEmail, _id: { $ne: user._id } });
    if (taken) {
      return res.status(409).json({
        code: "ACCOUNT_EXISTS",
        message: "That email is already used by another account.",
      });
    }

    user.pendingEmail = newEmail;
    const result = await issueOtp(user, "email-change", newEmail);
    if (result.throttled) {
      return res
        .status(429)
        .json({ message: "Please wait a moment before requesting another code" });
    }

    res.json({ message: `We sent a code to ${newEmail}.` });
  } catch (err) {
    console.error("[Email Change Request] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const confirmEmailChange = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.pendingEmail) {
      return res.status(400).json({ message: "No email change is in progress." });
    }

    const result = await checkOtp(user, req.body?.otp, "email-change");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    const taken = await User.exists({ email: user.pendingEmail, _id: { $ne: user._id } });
    if (taken) {
      return res.status(409).json({ message: "That email is already used by another account." });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    clearOtp(user);
    await user.save();

    res.json({ message: "Email updated.", email: user.email });
  } catch (err) {
    console.error("[Email Change Confirm] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
