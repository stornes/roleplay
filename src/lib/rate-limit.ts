/**
 * Simple in-memory rate limiter.
 * Limits per user ID with configurable window and max requests.
 * For production, replace with Redis or Supabase-based limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(opts: {
  key: string;
  maxRequests: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const { key, maxRequests, windowMs } = opts;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Presets
export function rateLimitSession(userId: string) {
  return checkRateLimit({
    key: `session:${userId}`,
    maxRequests: 10,    // 10 sessions per hour
    windowMs: 60 * 60 * 1000,
  });
}

export function rateLimitToken(userId: string) {
  return checkRateLimit({
    key: `token:${userId}`,
    maxRequests: 60,    // 60 token requests per hour
    windowMs: 60 * 60 * 1000,
  });
}
