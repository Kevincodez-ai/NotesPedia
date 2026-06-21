// In-memory rate limiter for API routes
// For production with multiple instances, use Redis-backed rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        if (now > entry.resetTime) {
          this.limits.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @param key - Identifier (IP address, user ID, etc.)
   * @param limit - Max requests per window
   * @param windowMs - Time window in milliseconds
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configured rate limit presets
// Pre-configured rate limit presets (lenient for academic platform)
export const RateLimits = {
  // Auth endpoints: 20 requests per 15 minutes
  auth: { limit: 20, windowMs: 15 * 60 * 1000 },
  // General API: 120 requests per minute
  api: { limit: 120, windowMs: 60 * 1000 },
  // Upload: 20 uploads per hour
  upload: { limit: 20, windowMs: 60 * 60 * 1000 },
  // Download: 60 downloads per hour
  download: { limit: 60, windowMs: 60 * 60 * 1000 },
  // AI processing: 15 per hour
  ai: { limit: 15, windowMs: 60 * 60 * 1000 },
  // Search: 60 per minute
  search: { limit: 60, windowMs: 60 * 1000 },
  // Password reset: 5 per hour
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * Get client identifier from request
 * Uses user ID if authenticated, otherwise IP address
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  // Try various headers for IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ip:${ip}`;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
  };
}
