import dns from 'dns/promises';

const cache = new Map();
const CACHE_MS = 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 3000;

const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), LOOKUP_TIMEOUT_MS)),
  ]);

const DEFINITELY_MISSING = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);

export const hasMailServer = async (email) => {
  const domain = String(email).split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const cached = cache.get(domain);
  if (cached && cached.expires > Date.now()) return cached.ok;

  let ok = true;
  try {
    const records = await withTimeout(dns.resolveMx(domain));
    ok = records.length > 0;
  } catch (mxError) {
    if (DEFINITELY_MISSING.has(mxError.code)) {
      try {
        const addresses = await withTimeout(dns.resolve4(domain));
        ok = addresses.length > 0;
      } catch (aError) {
        ok = !DEFINITELY_MISSING.has(aError.code);
      }
    }
  }

  cache.set(domain, { ok, expires: Date.now() + CACHE_MS });
  return ok;
};
