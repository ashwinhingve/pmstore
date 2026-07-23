import { Cashfree, CFEnvironment } from 'cashfree-pg';

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  returnUrl: string;
}

interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface CreateOrderResult {
  paymentSessionId: string;
  orderId: string;
}

interface PaymentVerificationResult {
  success: boolean;
  status: string;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  paymentMethod?: string;
  bankReference?: string;
  gatewayResponse?: any;
}

class CashfreeService {
  private config: CashfreeConfig | null = null;
  private configError: string | null = null;
  private cashfree: Cashfree | null = null;

  constructor() {
    try {
      const requiredVars = [
        'CASHFREE_APP_ID',
        'CASHFREE_SECRET_KEY',
      ];

      const missing = requiredVars.filter((v) => !process.env[v]);
      if (missing.length > 0) {
        this.configError = `Missing required Cashfree environment variables: ${missing.join(', ')}`;
        console.warn(`Cashfree not configured: ${this.configError}`);
        return;
      }

      const env = (process.env.CASHFREE_ENV || 'sandbox') as 'sandbox' | 'production';

      this.config = {
        appId: process.env.CASHFREE_APP_ID!,
        secretKey: process.env.CASHFREE_SECRET_KEY!,
        environment: env,
        returnUrl: process.env.CASHFREE_RETURN_URL || 'http://localhost:3000/api/payment/callback',
      };

      this.cashfree = new Cashfree(
        env === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
        this.config.appId,
        this.config.secretKey
      );

      console.log(`Cashfree payment gateway configured (${env})`);
    } catch (error: any) {
      this.configError = error.message;
      console.error('Error initializing Cashfree service:', error);
    }
  }

  private ensureConfigured(): void {
    if (!this.config || !this.cashfree) {
      throw new Error(
        this.configError || 'Cashfree payment gateway is not configured.'
      );
    }
  }

  /**
   * Create a Cashfree order and get payment session ID
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    this.ensureConfigured();

    const request = {
      order_amount: params.orderAmount,
      order_currency: 'INR',
      order_id: params.orderId,
      customer_details: {
        customer_id: params.orderId,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
      },
      order_meta: {
        return_url: `${this.config!.returnUrl}?order_id={order_id}`,
      },
    };

    try {
      const response = await this.cashfree!.PGCreateOrder(request);
      const data = response.data;

      if (!data?.payment_session_id) {
        throw new Error('No payment_session_id returned from Cashfree');
      }

      return {
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id || params.orderId,
      };
    } catch (error: any) {
      console.error('Error creating Cashfree order:', error?.response?.data || error);
      const message = error?.response?.data?.message || error.message || 'Failed to create payment order';
      throw new Error(message);
    }
  }

  /**
   * Verify payment status by fetching the order from Cashfree
   */
  async verifyPayment(orderId: string): Promise<PaymentVerificationResult> {
    this.ensureConfigured();

    try {
      const response = await this.cashfree!.PGFetchOrder(orderId);
      const data = response.data;

      const orderStatus = data?.order_status;
      const success = orderStatus === 'PAID';

      // Fetch actual payment details to get payment method
      let paymentMethod: string | undefined = (data as any)?.payment_group;
      let transactionId = data?.cf_order_id?.toString();
      let bankReference: string | undefined = (data as any)?.bank_reference;

      if (success) {
        try {
          const paymentsResponse = await this.cashfree!.PGOrderFetchPayments(orderId);
          const payments = paymentsResponse.data as any;
          if (Array.isArray(payments) && payments.length > 0) {
            const successfulPayment = payments.find((p: any) => p.payment_status === 'SUCCESS') || payments[0];
            paymentMethod = successfulPayment?.payment_group || paymentMethod;
            transactionId = successfulPayment?.cf_payment_id?.toString() || transactionId;
            bankReference = successfulPayment?.bank_reference || bankReference;
          }
        } catch (paymentError: any) {
          console.warn('Could not fetch payment details:', paymentError?.message);
        }
      }

      return {
        success,
        status: orderStatus || 'UNKNOWN',
        orderId: data?.order_id,
        transactionId,
        amount: data?.order_amount,
        paymentMethod,
        bankReference,
        gatewayResponse: data,
      };
    } catch (error: any) {
      console.error('Error verifying Cashfree payment:', error?.response?.data || error);
      return { success: false, status: 'VERIFICATION_FAILED' };
    }
  }

  /**
   * Verify webhook signature from Cashfree
   */
  verifyWebhook(signature: string, rawBody: string, timestamp: string): boolean {
    this.ensureConfigured();

    try {
      this.cashfree!.PGVerifyWebhookSignature(signature, rawBody, timestamp);
      return true;
    } catch (error) {
      console.error('Cashfree webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Map Cashfree payment group to our payment method
   */
  getPaymentMethod(paymentGroup: string): 'card' | 'upi' | 'netbanking' | 'wallet' {
    const group = (paymentGroup || '').toLowerCase();

    if (group.includes('upi')) return 'upi';
    if (group.includes('card') || group.includes('credit') || group.includes('debit')) return 'card';
    if (group.includes('net_banking') || group.includes('netbanking') || group.includes('net')) return 'netbanking';
    if (group.includes('wallet') || group.includes('app')) return 'wallet';

    return 'card';
  }

  /**
   * Map Cashfree order status to our payment status
   */
  getPaymentStatus(status: string): 'success' | 'failed' | 'pending' {
    switch (status) {
      case 'PAID': return 'success';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'VOID': return 'failed';
      case 'ACTIVE': return 'pending';
      default: return 'failed';
    }
  }

}

export const cashfreeService = new CashfreeService();
