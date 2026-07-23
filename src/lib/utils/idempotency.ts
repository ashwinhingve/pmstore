import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import IdempotencyKey from '@/models/IdempotencyKey';
import { createLogger } from './logger';

/**
 * Idempotency service for preventing duplicate request processing
 */
export class IdempotencyService {
  private processing = new Set<string>();
  private logger = createLogger({ component: 'IdempotencyService' });

  /**
   * Execute a function with idempotency protection
   *
   * @param key Unique idempotency key
   * @param fn Function to execute
   * @param ttl Time-to-live in milliseconds (default: 24 hours)
   * @returns Object with result and cached flag
   */
  async executeOnce<T>(
    key: string,
    fn: () => Promise<{ response: T; statusCode: number }>,
    ttl: number = 86400000 // 24 hours
  ): Promise<{ response: T; statusCode: number; cached: boolean }> {
    // Check if already processing this key
    if (this.processing.has(key)) {
      this.logger.warn('Request already in progress', { key });
      throw new Error('Request already in progress. Please wait.');
    }

    await connectDB();

    // Check if already processed
    const existing = await IdempotencyKey.findOne({ key });

    if (existing) {
      this.logger.info('Idempotency: Returning cached response', { key });
      return {
        response: existing.response,
        statusCode: existing.statusCode,
        cached: true,
      };
    }

    // Mark as processing
    this.processing.add(key);
    this.logger.debug('Idempotency: Processing new request', { key });

    try {
      // Execute the function
      const result = await fn();

      // Store the result
      const expiresAt = new Date(Date.now() + ttl);

      await IdempotencyKey.create({
        key,
        response: result.response,
        statusCode: result.statusCode,
        expiresAt,
      });

      this.logger.info('Idempotency: Stored new result', {
        key,
        statusCode: result.statusCode,
        expiresAt,
      });

      return {
        ...result,
        cached: false,
      };
    } finally {
      // Remove from processing set
      this.processing.delete(key);
    }
  }

  /**
   * Execute a Next.js API handler with idempotency protection
   *
   * @param key Unique idempotency key
   * @param handler Handler function that returns NextResponse
   * @param ttl Time-to-live in milliseconds
   * @returns NextResponse with appropriate headers
   */
  async executeHandler(
    key: string,
    handler: () => Promise<NextResponse>,
    ttl: number = 86400000
  ): Promise<NextResponse> {
    const result = await this.executeOnce(
      key,
      async () => {
        const response = await handler();
        const body = await response.json();

        return {
          response: body,
          statusCode: response.status,
        };
      },
      ttl
    );

    const headers = new Headers();
    headers.set('X-Idempotency-Key', key);
    headers.set('X-Idempotency-Cached', result.cached.toString());

    if (result.cached) {
      headers.set('X-Idempotency-Cache-Hit', 'true');
      this.logger.info('Idempotency: Cache hit', { key });
    }

    return NextResponse.json(result.response, {
      status: result.statusCode,
      headers,
    });
  }

  /**
   * Check if a key exists in the idempotency store
   */
  async exists(key: string): Promise<boolean> {
    await connectDB();
    const existing = await IdempotencyKey.findOne({ key });
    return !!existing;
  }

  /**
   * Manually invalidate an idempotency key
   */
  async invalidate(key: string): Promise<boolean> {
    await connectDB();
    const result = await IdempotencyKey.deleteOne({ key });
    const deleted = result.deletedCount > 0;

    if (deleted) {
      this.logger.info('Idempotency: Key invalidated', { key });
    }

    return deleted;
  }

  /**
   * Clean up expired keys (manual cleanup)
   */
  async cleanup(): Promise<number> {
    await connectDB();
    const now = new Date();
    const result = await IdempotencyKey.deleteMany({
      expiresAt: { $lt: now },
    });

    const count = result.deletedCount;
    if (count > 0) {
      this.logger.info('Idempotency: Cleaned up expired keys', { count });
    }

    return count;
  }
}

// Export singleton instance
export const idempotencyService = new IdempotencyService();

/**
 * Generate idempotency key from request parameters
 */
export function generateIdempotencyKey(
  endpoint: string,
  uniqueParams: Record<string, any>
): string {
  const params = Object.entries(uniqueParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  return `${endpoint}:${params}`;
}

/**
 * Payment callback idempotency key generator
 */
export function generatePaymentIdempotencyKey(
  orderNumber: string,
  transactionId: string
): string {
  return generateIdempotencyKey('payment:callback', {
    orderNumber,
    transactionId,
  });
}

/**
 * Shipment creation idempotency key generator
 */
export function generateShipmentIdempotencyKey(orderId: string): string {
  return generateIdempotencyKey('shipment:create', { orderId });
}
