import nodemailer from 'nodemailer';
import type { IOrder } from '@/models/Order';
import type { IShipment } from '@/models/Shipment';
import Discount from '@/models/Discount';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check if email configuration is available
      const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword) {
        console.warn('Email service not configured. Emails will not be sent.');
        return;
      }

      this.config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword,
        },
        from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'PMStore Spices <noreply@pratigyamedicalstore.com>',
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
      });

      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send order confirmation email after successful payment
   */
  async sendOrderConfirmation(order: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const subject = `Order Confirmed - ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f97316; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .order-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Thank you for your order! We're excited to confirm that your payment has been received successfully.</p>

              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> ₹${order.totalAmount.toFixed(2)}</p>
                <p><strong>Payment Status:</strong> Paid</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod?.toUpperCase()}</p>
              </div>

              <div class="order-details">
                <h3>Delivery Address</h3>
                <p>
                  ${order.shippingAddressId?.fullName}<br>
                  ${order.shippingAddressId?.addressLine1}<br>
                  ${order.shippingAddressId?.addressLine2 ? order.shippingAddressId.addressLine2 + '<br>' : ''}
                  ${order.shippingAddressId?.city}, ${order.shippingAddressId?.state} - ${order.shippingAddressId?.postalCode}<br>
                  Phone: ${order.shippingAddressId?.phoneNumber}
                </p>
              </div>

              <p>Your order is being processed and will be shipped soon. You'll receive another email with tracking details once your order is dispatched.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${order._id}" class="button">Track Your Order</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Send shipment created notification
   */
  async sendShipmentCreated(order: any, shipment: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const subject = `Your Order is on the Way - ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .tracking-box { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; }
            .tracking-number { font-size: 24px; font-weight: bold; color: #f97316; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Order Shipped!</h1>
            </div>
            <div class="content">
              <p>Great news! Your order has been shipped and is on its way to you.</p>

              <div class="tracking-box">
                <p><strong>Tracking Number:</strong></p>
                <div class="tracking-number">${shipment.waybill}</div>
                <p><strong>Courier:</strong> ${shipment.courierName || 'Delhivery'}</p>
                ${shipment.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(shipment.estimatedDelivery).toLocaleDateString()}</p>` : ''}
              </div>

              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p>You can track your shipment in real-time using the tracking number above.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${order._id}" class="button">Track Shipment</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Send order delivered notification
   */
  async sendOrderDelivered(order: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const subject = `Order Delivered - ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Delivered!</h1>
            </div>
            <div class="content">
              <p>Your order has been successfully delivered!</p>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Delivered On:</strong> ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>

              <p>We hope you enjoy your products! If you have any questions or concerns about your order, please don't hesitate to contact us.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${order._id}" class="button">View Order</a>
              </div>

              <p style="margin-top: 20px;">Thank you for shopping with PMStore Spices!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(order: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const subject = `Payment Failed - ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>We're sorry, but your payment for order <strong>${order.orderNumber}</strong> could not be processed.</p>

              <p><strong>Order Amount:</strong> ₹${order.totalAmount.toFixed(2)}</p>

              <p>This could happen due to various reasons:</p>
              <ul>
                <li>Insufficient funds in your account</li>
                <li>Payment gateway timeout</li>
                <li>Incorrect payment details</li>
                <li>Bank declined the transaction</li>
              </ul>

              <p>Your order is still pending. You can retry the payment to complete your purchase.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${order._id}" class="button">Retry Payment</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
              <p>Need help? Contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Notify admin when a new order is placed (online or COD).
   */
  async notifyAdminNewOrder(order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    itemCount: number;
    paymentMethod: string;
    shippingAddress?: any;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const method = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';

    const subject = `New Order: ${order.orderNumber} — Rs.${order.totalAmount.toFixed(2)}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #f97316; }
            .label { color: #666; font-size: 13px; margin: 0; }
            .value { font-size: 16px; font-weight: bold; margin: 2px 0 10px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Order Received!</h1>
            </div>
            <div class="content">
              <div class="box">
                <p class="label">Order Number</p>
                <p class="value">${order.orderNumber}</p>
                <p class="label">Customer</p>
                <p class="value">${order.customerName} (${order.customerEmail})</p>
                <p class="label">Amount</p>
                <p class="value">Rs.${order.totalAmount.toFixed(2)}</p>
                <p class="label">Items</p>
                <p class="value">${order.itemCount} item${order.itemCount !== 1 ? 's' : ''}</p>
                <p class="label">Payment Method</p>
                <p class="value">${method}</p>
                ${order.shippingAddress ? `
                <p class="label">Ship To</p>
                <p class="value" style="font-weight: normal;">
                  ${order.shippingAddress.fullName || order.customerName}<br>
                  ${order.shippingAddress.addressLine1 || ''}<br>
                  ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} - ${order.shippingAddress.postalCode || ''}<br>
                  Phone: ${order.shippingAddress.phoneNumber || ''}
                </p>` : ''}
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${appUrl}/admin/orders" class="button">View in Admin Panel</a>
              </div>
            </div>
            <div class="footer">
              <p>PMStorefs Admin Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(adminEmail, subject, html);
  }

  async notifyAdminPaymentFailed(order: { orderNumber: string; customerName: string; customerEmail: string; totalAmount: number }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
    const subject = `Payment Failed: ${order.orderNumber} — Rs.${order.totalAmount.toFixed(2)}`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background-color:#dc2626;color:white;padding:20px;text-align:center}
        .content{padding:20px;background-color:#f9f9f9}
        .box{background-color:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #dc2626}
        .label{color:#666;font-size:13px;margin:0}
        .value{font-size:16px;font-weight:bold;margin:2px 0 10px}
        .button{display:inline-block;padding:12px 24px;background-color:#f97316;color:white;text-decoration:none;border-radius:5px;margin:10px 0;font-weight:bold}
        .footer{text-align:center;padding:20px;font-size:12px;color:#666}
      </style></head><body>
        <div class="container">
          <div class="header"><h1>Payment Failed</h1></div>
          <div class="content">
            <div class="box">
              <p class="label">Order Number</p><p class="value">${order.orderNumber}</p>
              <p class="label">Customer</p><p class="value">${order.customerName} (${order.customerEmail})</p>
              <p class="label">Amount</p><p class="value">Rs.${order.totalAmount.toFixed(2)}</p>
            </div>
            <div style="text-align:center;margin-top:20px">
              <a href="${appUrl}/admin/orders" class="button">View in Admin Panel</a>
            </div>
          </div>
          <div class="footer"><p>PMStorefs Admin Notification</p></div>
        </div>
      </body></html>`;
    await this.sendEmail(adminEmail, subject, html);
  }

  async notifyAdminShipmentCreated(order: { orderNumber: string; customerName: string; customerEmail: string }, shipment: { waybill?: string; provider?: string; trackingUrl?: string }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
    const subject = `Order Shipped: ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background-color:#2563eb;color:white;padding:20px;text-align:center}
        .content{padding:20px;background-color:#f9f9f9}
        .box{background-color:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #f97316}
        .label{color:#666;font-size:13px;margin:0}
        .value{font-size:16px;font-weight:bold;margin:2px 0 10px}
        .button{display:inline-block;padding:12px 24px;background-color:#f97316;color:white;text-decoration:none;border-radius:5px;margin:10px 0;font-weight:bold}
        .footer{text-align:center;padding:20px;font-size:12px;color:#666}
      </style></head><body>
        <div class="container">
          <div class="header"><h1>Order Shipped</h1></div>
          <div class="content">
            <div class="box">
              <p class="label">Order Number</p><p class="value">${order.orderNumber}</p>
              <p class="label">Customer</p><p class="value">${order.customerName} (${order.customerEmail})</p>
              ${shipment.waybill ? `<p class="label">Tracking / AWB</p><p class="value">${shipment.waybill}</p>` : ''}
              ${shipment.provider ? `<p class="label">Courier</p><p class="value">${shipment.provider}</p>` : ''}
              ${shipment.trackingUrl ? `<p class="label">Tracking URL</p><p class="value" style="font-weight:normal"><a href="${shipment.trackingUrl}">${shipment.trackingUrl}</a></p>` : ''}
            </div>
            <div style="text-align:center;margin-top:20px">
              <a href="${appUrl}/admin/orders" class="button">View in Admin Panel</a>
            </div>
          </div>
          <div class="footer"><p>PMStorefs Admin Notification</p></div>
        </div>
      </body></html>`;
    await this.sendEmail(adminEmail, subject, html);
  }

  async notifyAdminOrderDelivered(order: { orderNumber: string; customerName: string; customerEmail: string }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
    const subject = `Order Delivered: ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background-color:#16a34a;color:white;padding:20px;text-align:center}
        .content{padding:20px;background-color:#f9f9f9}
        .box{background-color:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #16a34a}
        .label{color:#666;font-size:13px;margin:0}
        .value{font-size:16px;font-weight:bold;margin:2px 0 10px}
        .button{display:inline-block;padding:12px 24px;background-color:#f97316;color:white;text-decoration:none;border-radius:5px;margin:10px 0;font-weight:bold}
        .footer{text-align:center;padding:20px;font-size:12px;color:#666}
      </style></head><body>
        <div class="container">
          <div class="header"><h1>Order Delivered</h1></div>
          <div class="content">
            <div class="box">
              <p class="label">Order Number</p><p class="value">${order.orderNumber}</p>
              <p class="label">Customer</p><p class="value">${order.customerName} (${order.customerEmail})</p>
            </div>
            <div style="text-align:center;margin-top:20px">
              <a href="${appUrl}/admin/orders" class="button">View in Admin Panel</a>
            </div>
          </div>
          <div class="footer"><p>PMStorefs Admin Notification</p></div>
        </div>
      </body></html>`;
    await this.sendEmail(adminEmail, subject, html);
  }

  async notifyAdminOrderCancelled(order: { orderNumber: string; customerName: string; customerEmail: string; totalAmount: number; refundAmount?: number }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
    const subject = `Order Cancelled: ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background-color:#9333ea;color:white;padding:20px;text-align:center}
        .content{padding:20px;background-color:#f9f9f9}
        .box{background-color:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #9333ea}
        .label{color:#666;font-size:13px;margin:0}
        .value{font-size:16px;font-weight:bold;margin:2px 0 10px}
        .button{display:inline-block;padding:12px 24px;background-color:#f97316;color:white;text-decoration:none;border-radius:5px;margin:10px 0;font-weight:bold}
        .footer{text-align:center;padding:20px;font-size:12px;color:#666}
      </style></head><body>
        <div class="container">
          <div class="header"><h1>Order Cancelled</h1></div>
          <div class="content">
            <div class="box">
              <p class="label">Order Number</p><p class="value">${order.orderNumber}</p>
              <p class="label">Customer</p><p class="value">${order.customerName} (${order.customerEmail})</p>
              <p class="label">Order Amount</p><p class="value">Rs.${order.totalAmount.toFixed(2)}</p>
              ${order.refundAmount ? `<p class="label">Refund Amount</p><p class="value">Rs.${order.refundAmount.toFixed(2)}</p>` : ''}
            </div>
            <div style="text-align:center;margin-top:20px">
              <a href="${appUrl}/admin/orders" class="button">View in Admin Panel</a>
            </div>
          </div>
          <div class="footer"><p>PMStorefs Admin Notification</p></div>
        </div>
      </body></html>`;
    await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Send OTP for email login
   */
  async sendOtp(email: string, otp: string) {
    const subject = `Your Login Code - ${otp}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f97316; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f97316; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Login Verification</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Use the following code to sign in to your PMStore Spices account:</p>

              <div class="otp-box">
                <p><strong>Your verification code:</strong></p>
                <div class="otp-code">${otp}</div>
                <p style="color: #666; font-size: 14px;">This code expires in 5 minutes.</p>
              </div>

              <p>If you did not request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }

  /**
   * Send post-delivery thank-you and feedback request (combined)
   */
  async sendDeliveryFeedbackRequest(order: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';
    const reviewUrl = `${appUrl}/orders/${order._id}#reviews`;
    const subject = `Thank you for your order ${order.orderNumber} - Share your experience!`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f97316; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .stars { font-size: 32px; text-align: center; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 28px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Order!</h1>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Your order <strong>${order.orderNumber}</strong> has been delivered. We hope you're enjoying your PMStore Spices products!</p>

              <div class="stars">&#11088;&#11088;&#11088;&#11088;&#11088;</div>

              <p style="text-align:center;">We'd love to hear what you think. Your feedback helps us serve you better and helps other customers make informed choices.</p>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${reviewUrl}" class="button">Leave a Review</a>
              </div>

              <p>Thank you for choosing PMStore Spices. We look forward to serving you again!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Notify admin when a return request is submitted
   */
  async notifyAdminReturnRequest(order: any, returnRequest: any) {
    const adminEmail = process.env.ADMIN_EMAIL || 'pmstoremedicine@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratigyamedicalstore.com';

    const subject = `Return Request: Order ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc2626; }
            .label { color: #666; font-size: 13px; margin: 0; }
            .value { font-size: 15px; font-weight: bold; margin: 2px 0 10px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Return Request Submitted</h1>
            </div>
            <div class="content">
              <div class="box">
                <p class="label">Order Number</p>
                <p class="value">${order.orderNumber}</p>
                <p class="label">Customer</p>
                <p class="value">${order.userId?.name || order.shippingAddress?.fullName || 'N/A'} (${order.userId?.email || 'N/A'})</p>
                <p class="label">Return Reason</p>
                <p class="value">${returnRequest.reason || 'Not specified'}</p>
                ${returnRequest.description ? `<p class="label">Description</p><p class="value" style="font-weight:normal;">${returnRequest.description}</p>` : ''}
                <p class="label">Order Amount</p>
                <p class="value">Rs.${order.totalAmount?.toFixed(2)}</p>
                <p class="label">Requested On</p>
                <p class="value">${new Date().toLocaleDateString()}</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${appUrl}/admin/orders/${order._id}" class="button">Review in Admin Panel</a>
              </div>
            </div>
            <div class="footer">
              <p>PMStorefs Admin Notification</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Send order cancelled notification
   */
  async sendOrderCancelled(order: any) {
    const customerEmail = order.userId?.email || order.shippingAddressId?.email;
    if (!customerEmail) {
      console.warn('No email address found for order:', order.orderNumber);
      return;
    }

    const subject = `Order Cancelled - ${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6b7280; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Cancelled</h1>
            </div>
            <div class="content">
              <p>Your order <strong>${order.orderNumber}</strong> has been cancelled successfully.</p>

              <p><strong>Order Amount:</strong> ₹${order.totalAmount.toFixed(2)}</p>
              <p><strong>Cancelled On:</strong> ${order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>

              ${order.paymentStatus === 'paid' ? `
                <p><strong>Refund Information:</strong></p>
                <p>Your refund of ₹${(order.refundAmount || order.totalAmount).toFixed(2)} will be processed within 5-7 business days.</p>
                <p>The amount will be credited to your original payment method.</p>
              ` : ''}

              ${order.cancelReason ? `<p><strong>Reason:</strong> ${order.cancelReason}</p>` : ''}

              <p>We're sorry to see you cancel this order. If you have any concerns or feedback, please let us know.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/shop" class="button">Continue Shopping</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(customerEmail, subject, html);
  }

  /**
   * Send welcome email to a newly registered user.
   * Fetches the active welcome/promo discount from the DB so the code is never hardcoded.
   */
  async sendWelcomeEmail(email: string, name?: string | null) {
    if (!email) return;

    // Look up an active coupon to include — prefer code='WELCOME10', fall back to any active coupon
    let promoBlock = '';
    try {
      const promo = await Discount.findOne({ code: 'WELCOME10', isActive: true }).lean() as any;
      if (promo) {
        const valueLabel =
          promo.discountType === 'percentage'
            ? `${promo.discountValue}% off`
            : `₹${promo.discountValue} off`;
        const minLabel = promo.minOrderValue > 0 ? ` on orders above ₹${promo.minOrderValue}` : '';
        promoBlock = `
          <div style="background:#fffbeb;border:2px dashed #d97706;border-radius:10px;padding:20px;margin:20px 0;text-align:center;">
            <p style="margin:0 0 6px;color:#92400e;font-size:14px;">Your exclusive welcome gift</p>
            <p style="margin:0;font-size:22px;font-weight:bold;color:#d97706;letter-spacing:2px;">${promo.code}</p>
            <p style="margin:6px 0 0;color:#78350f;font-size:13px;">${valueLabel}${minLabel}</p>
          </div>`;
      }
    } catch {
      // DB lookup failed — send email without promo code
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://pmstore.in';
    const greeting = name ? `Hi ${name},` : 'Hello,';

    const subject = 'Welcome to PMStore!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
          .container{max-width:600px;margin:0 auto}
          .header{background:linear-gradient(135deg,#d97706 0%,#dc2626 100%);padding:40px;text-align:center;border-radius:8px 8px 0 0}
          .content{background:#fff;padding:36px;border-radius:0 0 8px 8px}
          .footer{text-align:center;padding:20px;font-size:12px;color:#9ca3af}
        </style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color:#fff;margin:0;font-size:28px;">Welcome to PMSTORE!</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">The Taste of Purity</p>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>Thank you for joining PMStore Food &amp; Spices — your destination for 100% adulteration-free spices, oils, and superfoods sourced straight from trusted farms.</p>
              ${promoBlock}
              <p>Start exploring our collection and taste the difference of pure, farm-fresh quality.</p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${siteUrl}/products" style="background:linear-gradient(135deg,#d97706 0%,#dc2626 100%);color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;font-size:15px;">
                  Shop Now
                </a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PMStore Food &amp; Spices. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    return this.sendEmail(email, subject, html);
  }
}

// Export singleton instance
export const emailService = new EmailService();
