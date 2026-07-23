interface SMSResult {
  success: boolean;
  error?: unknown;
}

class SMSService {
  private apiKey: string | null = null;
  private adminPhone: string | null = null;

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || null;
    this.adminPhone = process.env.ADMIN_PHONE || null;
    if (!this.apiKey) {
      console.warn('SMS service not configured. Set FAST2SMS_API_KEY in .env.local');
    } else {
      console.log('SMS service initialized (Fast2SMS)');
    }
    if (!this.adminPhone) {
      console.warn('Admin phone not configured. Admin SMS notifications disabled. Set ADMIN_PHONE in .env.local');
    }
  }

  private async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.apiKey) {
      console.warn('SMS service not configured. Skipping SMS send.');
      return { success: false, error: 'SMS service not configured' };
    }

    // Strip +91 prefix if present — Fast2SMS expects 10-digit number
    const phone = to.replace(/^\+91/, '').replace(/^91/, '').trim();

    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message,
          language: 'english',
          flash: 0,
          numbers: phone,
        }),
      });

      const data = await res.json();

      if (data.return === true) {
        console.log('SMS sent via Fast2SMS:', data.request_id);
        return { success: true };
      } else {
        console.error('Fast2SMS error:', data);
        return { success: false, error: data.message || 'Fast2SMS send failed' };
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error };
    }
  }

  private async sendOtp(phone: string, otp: string): Promise<SMSResult> {
    const message = `${otp} is your PMStore Spices verification code. Valid for 5 minutes. Do not share this with anyone.`;
    return this.sendSMS(phone, message);
  }

  async sendOrderConfirmationSMS(phone: string, orderNumber: string, amount: number): Promise<SMSResult> {
    const message = `Your order ${orderNumber} has been confirmed! Amount: Rs.${amount.toFixed(2)}. Track at ${process.env.NEXT_PUBLIC_APP_URL}/orders - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendShipmentSMS(phone: string, orderNumber: string, trackingNumber: string): Promise<SMSResult> {
    const message = `Your order ${orderNumber} has been shipped! Tracking: ${trackingNumber}. Track at ${process.env.NEXT_PUBLIC_APP_URL}/orders - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendDeliverySMS(phone: string, orderNumber: string): Promise<SMSResult> {
    const message = `Your order ${orderNumber} has been delivered! Thank you for shopping with PMStore Spices.`;
    return this.sendSMS(phone, message);
  }

  async sendPaymentFailedSMS(phone: string, orderNumber: string): Promise<SMSResult> {
    const message = `Payment failed for order ${orderNumber}. Please retry at ${process.env.NEXT_PUBLIC_APP_URL}/orders - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendOrderCancelledSMS(phone: string, orderNumber: string, refundAmount?: number): Promise<SMSResult> {
    const refundText = refundAmount ? ` Refund of Rs.${refundAmount.toFixed(2)} will be processed in 5-7 days.` : '';
    const message = `Your order ${orderNumber} has been cancelled.${refundText} - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendOutForDeliverySMS(phone: string, orderNumber: string): Promise<SMSResult> {
    const message = `Your order ${orderNumber} is out for delivery and will reach you soon! - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendOtpSMS(phone: string, otp: string): Promise<SMSResult> {
    return this.sendOtp(phone, otp);
  }

  async sendReturnRequestSMS(phone: string, orderNumber: string): Promise<SMSResult> {
    const message = `Return request for order ${orderNumber} received. We'll review within 2-3 business days. - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  async sendFeedbackRequestSMS(phone: string, orderNumber: string, reviewUrl: string): Promise<SMSResult> {
    const message = `Thank you for your PMStore order ${orderNumber}! Share your experience: ${reviewUrl} - PMStore Spices`;
    return this.sendSMS(phone, message);
  }

  // ── Admin notification helpers ──────────────────────────────────────────────

  private async sendAdminSMS(message: string): Promise<SMSResult> {
    if (!this.adminPhone) return { success: false, error: 'Admin phone not configured' };
    return this.sendSMS(this.adminPhone, message);
  }

  async notifyAdminOrderConfirmed(orderNumber: string, customerName: string, amount: number, paymentMethod: string): Promise<SMSResult> {
    const method = paymentMethod === 'cod' ? 'COD' : 'Online';
    const message = `[PMStore] Order ${orderNumber} confirmed. Customer: ${customerName}. Amount: Rs.${amount.toFixed(2)}. Method: ${method}.`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminPaymentFailed(orderNumber: string, customerName: string, amount: number): Promise<SMSResult> {
    const message = `[PMStore] Payment FAILED for order ${orderNumber}. Customer: ${customerName}. Amount: Rs.${amount.toFixed(2)}.`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminShipmentCreated(orderNumber: string, trackingNumber: string, customerName: string): Promise<SMSResult> {
    const message = `[PMStore] Order ${orderNumber} shipped. Tracking: ${trackingNumber}. Customer: ${customerName}.`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminOutForDelivery(orderNumber: string, customerName: string): Promise<SMSResult> {
    const message = `[PMStore] Order ${orderNumber} out for delivery. Customer: ${customerName}.`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminOrderDelivered(orderNumber: string, customerName: string): Promise<SMSResult> {
    const message = `[PMStore] Order ${orderNumber} DELIVERED. Customer: ${customerName}.`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminOrderCancelled(orderNumber: string, customerName: string, refundAmount?: number): Promise<SMSResult> {
    const refundText = refundAmount ? ` Refund: Rs.${refundAmount.toFixed(2)}.` : '';
    const message = `[PMStore] Order ${orderNumber} CANCELLED. Customer: ${customerName}.${refundText}`;
    return this.sendAdminSMS(message);
  }

  async notifyAdminReturnRequest(orderNumber: string, customerName: string): Promise<SMSResult> {
    const message = `[PMStore] Return request for order ${orderNumber}. Customer: ${customerName}.`;
    return this.sendAdminSMS(message);
  }
}

export const smsService = new SMSService();
