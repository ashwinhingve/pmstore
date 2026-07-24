import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstRequest: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

/**
 * In-memory rate limiter with Redis-ready interface
 * TODO: Replace with Redis for distributed rate limiting in production
 */
class RateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Check if a request should be rate limited
   * @param key Unique identifier for the rate limit (e.g., IP address, user ID)
   * @param config Rate limit configuration
   * @returns Object with { allowed: boolean, remaining: number, resetAt: number }
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    const record = this.requests.get(fullKey);

    // No record or window expired - create new window
    if (!record || now > record.resetAt) {
      const resetAt = now + config.windowMs;
      this.requests.set(fullKey, {
        count: 1,
        resetAt,
        firstRequest: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    // Within existing window
    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000); // seconds

      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
        retryAfter,
      };
    }

    // Increment count
    record.count++;
    this.requests.set(fullKey, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.requests.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    count: number;
    remaining: number;
    resetAt: number;
  }> {
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    const record = this.requests.get(fullKey);
    const now = Date.now();

    if (!record || now > record.resetAt) {
      return {
        count: 0,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }

    return {
      count: record.count,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific key (for testing or admin override)
   */
  async reset(key: string, prefix?: string): Promise<void> {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    this.requests.delete(fullKey);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware for API routes
 * @param request Next.js request object
 * @param config Rate limit configuration
 * @returns NextResponse if rate limited, null if allowed
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  // Extract identifier (IP address or user ID from session)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const result = await rateLimiter.checkLimit(ip, config);

  // Add rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

  if (!result.allowed) {
    headers.set('Retry-After', (result.retryAfter || 60).toString());

    console.warn('Rate limit exceeded', {
      ip,
      endpoint: request.nextUrl.pathname,
      limit: config.maxRequests,
      window: config.windowMs,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      { status: 429, headers }
    );
  }

  return null;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Payment endpoints - stricter limits
  PAYMENT_INITIATE: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'payment:initiate',
  } as RateLimitConfig,

  PAYMENT_CALLBACK: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'payment:callback',
  } as RateLimitConfig,

  // Webhook endpoints - more lenient for legitimate traffic
  SHIPPING_WEBHOOK: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'shipping:webhook',
  } as RateLimitConfig,

  // Order endpoints
  ORDER_CREATE: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'order:create',
  } as RateLimitConfig,

  CREATE_ORDER: {
    windowMs: 3600000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'checkout:create-order',
  } as RateLimitConfig,

  // Prescription upload - image uploads, keep modest
  PRESCRIPTION_UPLOAD: {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'prescription:upload',
  } as RateLimitConfig,

  // Admin endpoints - strict limits
  ADMIN_SETUP: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5,
    keyPrefix: 'admin:setup',
  } as RateLimitConfig,

  // General API endpoints
  API_DEFAULT: {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'api:default',
  } as RateLimitConfig,
};
