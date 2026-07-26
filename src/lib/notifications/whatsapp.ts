/**
 * Admin Order Notification Service — Telegram Bot (100% Free)
 *
 * No WhatsApp Business, no Twilio, no cost ever.
 *
 * ONE-TIME SETUP:
 *   1. Open Telegram, search for @BotFather and send /newbot
 *   2. Follow prompts — give it a name like "PM Store Orders"
 *   3. BotFather sends you a bot token like: 123456789:AAFxxx...
 *   4. Search for your new bot in Telegram and press Start
 *   5. Open: https://api.telegram.org/bot<TOKEN>/getUpdates
 *      Look for "chat":{"id": 123456789} — that's your chat ID
 *   6. Add to .env.local:
 *        TELEGRAM_BOT_TOKEN=123456789:AAFxxx...
 *        TELEGRAM_CHAT_ID=123456789
 */

class WhatsAppService {
  // Env vars are read per-call (not at module init) so serverless cold-starts
  // never permanently disable the service if vars are injected after first load.
  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get chatId(): string {
    return process.env.TELEGRAM_CHAT_ID || '';
  }

  private get enabled(): boolean {
    return !!(this.botToken && this.chatId);
  }

  private async send(message: string): Promise<void> {
    if (!this.enabled) {
      console.warn('Telegram notifications not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
        signal: controller.signal,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        console.error('Telegram error:', body);
      } else {
        console.log('Telegram notification sent to admin');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('Telegram send timed out');
      } else {
        console.error('Telegram send failed:', err?.message || err);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Notify admin when a new order is confirmed (online or COD).
   */
  async notifyNewOrder(order: {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    itemCount: number;
    paymentMethod: string;
  }): Promise<void> {
    const method = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';

    const message =
      `<b>New Order Received!</b>\n\n` +
      `Order: <code>${order.orderNumber}</code>\n` +
      `Customer: ${order.customerName}\n` +
      `Amount: Rs.${order.totalAmount.toFixed(2)}\n` +
      `Items: ${order.itemCount} item${order.itemCount !== 1 ? 's' : ''}\n` +
      `Payment: ${method}\n\n` +
      `<a href="${appUrl}/admin/orders">View Orders</a>`;

    await this.send(message);
  }

  /**
   * Notify admin when a payment fails.
   */
  async notifyPaymentFailed(order: {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
  }): Promise<void> {
    const message =
      `<b>Payment Failed!</b>\n\n` +
      `Order: <code>${order.orderNumber}</code>\n` +
      `Customer: ${order.customerName}\n` +
      `Amount: Rs.${order.totalAmount.toFixed(2)}\n\n` +
      `Customer may need help retrying.`;

    await this.send(message);
  }
}

export const whatsappService = new WhatsAppService();
