/**
 * FCM push notification sender for mobile app.
 *
 * IMPORTANT: This module uses a lazy dynamic import of firebase-admin to avoid
 * breaking `tsc --noEmit` if the package is not installed. At runtime, a missing
 * module degrades gracefully (logs a warning, doesn't crash).
 *
 * Required environment variables (if Firebase is configured):
 *   FIREBASE_PROJECT_ID — Firebase project ID (e.g., "my-project")
 *   FIREBASE_CLIENT_EMAIL — Service account email
 *   FIREBASE_PRIVATE_KEY — Service account private key (multiline, base64-safe)
 *
 * Never log notification payloads containing prescription data, order totals,
 * or sensitive health information.
 */

import User from '@/models/User';

interface FCMMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a notification to all of a user's registered push tokens (FCM).
 * If a token send fails with InvalidArgument (invalid token), prune it.
 * Non-blocking: fire-and-forget. Errors are logged but don't throw.
 */
export async function sendPushNotification(userId: string, message: FCMMessage): Promise<void> {
  try {
    let admin: unknown;

    try {
      // Dynamic import — will fail gracefully if firebase-admin not installed
      // The try-catch here ensures we don't crash if the module is missing
       
      // @ts-ignore intentional — firebase-admin may not be installed
      admin = require('firebase-admin');  
    } catch {
      // firebase-admin not installed; degrade gracefully
      console.warn('firebase-admin not installed; push notifications disabled');
      return;
    }

    if (!admin) {
      console.warn('firebase-admin not available');
      return;
    }

    const adminModule = admin as {
      messaging: () => { send: (msg: unknown) => Promise<string> };
    };

    const user = await User.findById(userId);
    if (!user || !Array.isArray(user.pushTokens) || user.pushTokens.length === 0) {
      return; // No tokens to send to
    }

    const tokens = user.pushTokens as string[];
    const messaging = adminModule.messaging();

    const invalidTokens: string[] = [];

    // Send to each token
    for (const token of tokens) {
      try {
        await messaging.send({
          notification: {
            title: message.title,
            body: message.body,
          },
          data: message.data,
          token,
        } as unknown);
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        // Invalid token — prune it
        if (error.code === 'messaging/invalid-argument' || error.message?.includes('Invalid')) {
          invalidTokens.push(token);
        } else {
          console.error(`FCM send error for token (retained): ${token.slice(0, 20)}...`, error);
        }
      }
    }

    // Prune invalid tokens
    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: { $in: invalidTokens } },
      });
    }
  } catch (err) {
    // User fetch failed or other error. Log and continue.
    console.warn('FCM notification error:', (err as Error)?.message);
  }
}

/**
 * Notify a user of a new order (non-blocking).
 * Typically called after order confirmation (COD or payment success).
 * Deep link the order detail screen.
 */
export async function notifyOrderConfirmed(userId: string, orderNumber: string, orderId: string): Promise<void> {
  return sendPushNotification(userId, {
    title: 'Order Confirmed',
    body: `Your order ${orderNumber} is confirmed.`,
    data: { orderId, screen: 'OrderDetail' },
  });
}

/**
 * Notify a user of a refill reminder (non-blocking).
 * Called by the refill reminder cron job.
 * Deep link the product detail screen.
 */
export async function notifyRefillReminder(
  userId: string,
  productName: string,
  productSlug: string,
): Promise<void> {
  return sendPushNotification(userId, {
    title: 'Refill Reminder',
    body: `Time to refill ${productName}?`,
    data: { productSlug, screen: 'ProductDetail' },
  });
}

/**
 * Notify a user of an order status change.
 * Called by the order status update handler.
 */
export async function notifyOrderStatus(
  userId: string,
  orderNumber: string,
  orderId: string,
  status: string,
): Promise<void> {
  const statusText = status === 'shipped' ? 'Shipped' : 'Updated';
  return sendPushNotification(userId, {
    title: `Order ${statusText}`,
    body: `Order ${orderNumber} is now ${status}.`,
    data: { orderId, screen: 'OrderDetail' },
  });
}
