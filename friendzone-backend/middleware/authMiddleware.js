import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { authCache } from '../services/cacheInvalidation.js';

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const cacheKey = String(decoded.id);
    let plain = authCache.get(cacheKey);
    if (!plain) {
      plain = await User.findById(decoded.id)
        .select('-password -otp -otpPurpose -otpExpires -otpAttempts -otpLockedUntil -lastOtpSentAt -tokenVersion')
        .lean();
      if (plain) authCache.set(cacheKey, plain);
    }
    const user = plain ? User.hydrate(plain) : null;

    if (!user || !user.isVerified) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
