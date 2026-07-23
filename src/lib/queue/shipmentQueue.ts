import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import { createLogger, LogMessages } from '@/lib/utils/logger';
import { emailService } from '@/lib/notifications/email';
import { whatsappService } from '@/lib/notifications/whatsapp';

/**
 * Queued shipment item
 */
interface QueuedShipment {
  orderId: string;
  attempts: number;
  lastAttempt: Date;
  nextAttempt: Date;
  error?: string;
  createdAt: Date;
}

/**
 * Shipment Queue Configuration
 */
interface QueueConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  processingInterval: number; // milliseconds
}

const DEFAULT_CONFIG: QueueConfig = {
  maxAttempts: 10,
  initialDelay: 60000, // 1 minute
  maxDelay: 3600000, // 1 hour
  backoffMultiplier: 2,
  processingInterval: 30000, // Process queue every 30 seconds
};

/**
 * Shipment Queue for graceful degradation
 * Handles retry of failed shipment creation when Delhivery service is down
 */
export class ShipmentQueue {
  private queue = new Map<string, QueuedShipment>();
  private processing = false;
  private processingTimer?: NodeJS.Timeout;
  private config: QueueConfig;
  private logger = createLogger({ component: 'ShipmentQueue' });

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add order to shipment queue
   */
  async add(orderId: string, error?: string): Promise<void> {
    const existing = this.queue.get(orderId);

    if (existing) {
      // Update existing item
      existing.attempts++;
      existing.lastAttempt = new Date();
      existing.nextAttempt = this.calculateNextAttempt(existing.attempts);
      existing.error = error;

      this.logger.info(`Shipment queue: Updated ${orderId}`, {
        orderId,
        attempts: existing.attempts,
        nextAttempt: existing.nextAttempt,
      });
    } else {
      // Add new item
      const item: QueuedShipment = {
        orderId,
        attempts: 1,
        lastAttempt: new Date(),
        nextAttempt: this.calculateNextAttempt(1),
        error,
        createdAt: new Date(),
      };

      this.queue.set(orderId, item);

      this.logger.info(`Shipment queue: Added ${orderId}`, {
        orderId,
        nextAttempt: item.nextAttempt,
      });
    }

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  /**
   * Calculate next attempt time with exponential backoff
   */
  private calculateNextAttempt(attempts: number): Date {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempts - 1),
      this.config.maxDelay
    );

    return new Date(Date.now() + delay);
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.logger.info('Shipment queue: Started processing');

    this.processingTimer = setInterval(() => {
      this.processQueue().catch((error) => {
        this.logger.error('Shipment queue: Processing error', error);
      });
    }, this.config.processingInterval);
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
    this.processing = false;
    this.logger.info('Shipment queue: Stopped processing');
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.size === 0) {
      this.stopProcessing();
      return;
    }

    const now = new Date();
    const itemsToProcess: string[] = [];

    // Find items ready to process
    for (const [orderId, item] of this.queue.entries()) {
      if (item.nextAttempt <= now) {
        if (item.attempts >= this.config.maxAttempts) {
          // Max attempts reached, remove and notify admin
          this.logger.error(
            `Shipment queue: Max attempts reached for ${orderId}`,
            null,
            {
              orderId,
              attempts: item.attempts,
              lastError: item.error,
            }
          );

          this.queue.delete(orderId);
          await this.notifyAdminFailure(orderId, item);
        } else {
          itemsToProcess.push(orderId);
        }
      }
    }

    // Process items
    for (const orderId of itemsToProcess) {
      await this.processItem(orderId);
    }
  }

  /**
   * Process a single item
   */
  private async processItem(orderId: string): Promise<void> {
    const item = this.queue.get(orderId);
    if (!item) return;

    this.logger.info(`Shipment queue: Processing ${orderId}`, {
      orderId,
      attempt: item.attempts,
    });

    try {
      // Attempt to create shipment
      const success = await this.createShipment(orderId);

      if (success) {
        this.logger.info(`Shipment queue: Success ${orderId}`, { orderId });
        this.queue.delete(orderId);
      } else {
        // Failed, will retry later
        await this.add(orderId, 'Shipment creation returned false');
      }
    } catch (error: any) {
      this.logger.warn(`Shipment queue: Failed ${orderId}`, {
        orderId,
        error: error.message,
        attempt: item.attempts,
      });

      // Add back to queue with incremented attempts
      await this.add(orderId, error.message);
    }
  }

  /**
   * Create shipment via API
   */
  private async createShipment(orderId: string): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/shipping/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
        },
        body: JSON.stringify({
          orderId,
          isRetry: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shipment API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.success === true;
    } catch (error: any) {
      this.logger.error(`Shipment creation API call failed for ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Notify admin of permanent failure
   */
  private async notifyAdminFailure(orderId: string, item: QueuedShipment): Promise<void> {
    try {
      // Update order with failure note
      await connectDB();
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          shipmentCreationFailed: true,
          shipmentFailureReason: `Failed after ${item.attempts} attempts: ${item.error}`,
          lastStatusUpdate: new Date(),
        },
      });

      // Notify admin of permanent failure
      const order = await Order.findById(orderId).populate('userId').populate('shippingAddressId');
      if (order) {
        const customerName = (order.userId as any)?.name || 'Unknown';
        whatsappService.notifyPaymentFailed({
          orderNumber: order.orderNumber,
          customerName,
          totalAmount: order.totalAmount,
        }).catch(() => {});
        emailService.notifyAdminNewOrder({
          orderNumber: order.orderNumber,
          customerName,
          customerEmail: (order.userId as any)?.email || '',
          totalAmount: order.totalAmount,
          itemCount: 0,
          paymentMethod: `SHIPMENT FAILED after ${item.attempts} attempts: ${item.error}`,
        }).catch(() => {});
      }

      this.logger.error('Shipment queue: Permanent failure notification', null, {
        orderId,
        attempts: item.attempts,
        error: item.error,
        duration: Date.now() - item.createdAt.getTime(),
      });
    } catch (error) {
      this.logger.error('Failed to notify admin of shipment failure', error, {
        orderId,
      });
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueSize: number;
    processing: boolean;
    items: Array<{
      orderId: string;
      attempts: number;
      nextAttempt: Date;
      error?: string;
    }>;
  } {
    return {
      queueSize: this.queue.size,
      processing: this.processing,
      items: Array.from(this.queue.values()).map((item) => ({
        orderId: item.orderId,
        attempts: item.attempts,
        nextAttempt: item.nextAttempt,
        error: item.error,
      })),
    };
  }

  /**
   * Remove an item from the queue (manual intervention)
   */
  remove(orderId: string): boolean {
    const existed = this.queue.has(orderId);
    this.queue.delete(orderId);

    if (existed) {
      this.logger.info(`Shipment queue: Manually removed ${orderId}`, { orderId });
    }

    return existed;
  }

  /**
   * Clear the entire queue
   */
  clear(): void {
    const size = this.queue.size;
    this.queue.clear();
    this.stopProcessing();
    this.logger.info(`Shipment queue: Cleared ${size} items`);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }
}

// Export singleton instance
export const shipmentQueue = new ShipmentQueue();

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    shipmentQueue.stopProcessing();
  });

  process.on('SIGINT', () => {
    shipmentQueue.stopProcessing();
  });
}
