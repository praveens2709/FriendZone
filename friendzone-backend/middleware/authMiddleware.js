import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select(
      '-password -otp -otpPurpose -otpExpires -otpAttempts -otpLockedUntil -lastOtpSentAt -tokenVersion'
    );

    if (!user || !user.isVerified) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
