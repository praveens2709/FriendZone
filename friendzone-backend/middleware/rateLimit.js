const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000).unref();

export const rateLimit = ({ windowMs, max, keyFn, name }) => (req, res, next) => {
  const identity = keyFn ? keyFn(req) : req.ip;
  const key = `${name}:${identity}`;
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > max) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }

  next();
};

const emailKey = (req) =>
  `${req.ip}:${String(req.body?.email || '').toLowerCase().trim()}`;

export const apiLimiter = rateLimit({ name: 'api', windowMs: 60 * 1000, max: 300 });

export const loginLimiter = rateLimit({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: emailKey,
});

export const otpRequestLimiter = rateLimit({
  name: 'otp-request',
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyFn: emailKey,
});

export const otpVerifyLimiter = rateLimit({
  name: 'otp-verify',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: emailKey,
});

export const refreshLimiter = rateLimit({
  name: 'refresh',
  windowMs: 15 * 60 * 1000,
  max: 60,
});

export const uploadLimiter = rateLimit({
  name: 'upload',
  windowMs: 10 * 60 * 1000,
  max: 60,
  keyFn: (req) => req.user?.id || req.ip,
});

export const reportLimiter = rateLimit({
  name: 'report',
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.user?.id || req.ip,
});
