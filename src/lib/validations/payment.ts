import * as z from 'zod';

/**
 * Payment initiation request validation
 */
export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

/**
 * Cashfree callback parameters validation
 */
export const cashfreeCallbackSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
});

/**
 * Payment method validation
 */
export const paymentMethodSchema = z.enum(['cod', 'card', 'upi', 'netbanking', 'wallet'], {
  error: 'Invalid payment method',
});

/**
 * Transaction status validation
 */
export const transactionStatusSchema = z.enum(
  ['initiated', 'pending', 'success', 'failed', 'refunded'],
  {
    error: 'Invalid transaction status',
  }
);

/**
 * Refund request validation
 */
export const refundRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
  reason: z.string().min(5, 'Reason too short').max(500, 'Reason too long'),
  refundType: z.enum(['FULL', 'PARTIAL']).default('FULL'),
});

/**
 * Order amount validation
 */
export const orderAmountSchema = z.object({
  subtotal: z.number().nonnegative('Subtotal cannot be negative'),
  shippingCost: z.number().nonnegative('Shipping cost cannot be negative'),
  taxAmount: z.number().nonnegative('Tax amount cannot be negative'),
  discountAmount: z.number().nonnegative('Discount amount cannot be negative').optional(),
  totalAmount: z.number().positive('Total amount must be positive'),
});

/**
 * Map Cashfree payment group to our payment method
 */
export function mapPaymentGroup(
  group: string
): 'card' | 'upi' | 'netbanking' | 'wallet' {
  const lowerGroup = (group || '').toLowerCase();

  if (lowerGroup.includes('upi')) return 'upi';
  if (
    lowerGroup.includes('card') ||
    lowerGroup.includes('credit') ||
    lowerGroup.includes('debit')
  )
    return 'card';
  if (lowerGroup.includes('net_banking') || lowerGroup.includes('netbanking') || lowerGroup.includes('net')) return 'netbanking';
  if (lowerGroup.includes('wallet') || lowerGroup.includes('app')) return 'wallet';

  return 'card'; // default
}

/**
 * Validate and parse amount string
 */
export function parseAmount(amountStr: string | undefined): number {
  if (!amountStr) return 0;

  const parsed = parseFloat(amountStr);

  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid amount format');
  }

  // Round to 2 decimal places
  return Math.round(parsed * 100) / 100;
}

/**
 * Compare amounts with tolerance for floating point errors
 */
export function compareAmounts(
  amount1: number,
  amount2: number,
  tolerancePaise: number = 1
): boolean {
  const diff = Math.abs(amount1 - amount2);
  return diff <= tolerancePaise / 100;
}

/**
 * Format amount for gateway (2 decimal places)
 */
export function formatAmountForGateway(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate order amounts are consistent
 */
export function validateOrderAmounts(amounts: {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
}): { valid: boolean; error?: string } {
  const { subtotal, shippingCost, taxAmount, discountAmount = 0, totalAmount } = amounts;

  const calculatedTotal = subtotal + shippingCost + taxAmount - discountAmount;

  if (!compareAmounts(calculatedTotal, totalAmount)) {
    return {
      valid: false,
      error: `Total amount mismatch. Expected: ${calculatedTotal.toFixed(2)}, Got: ${totalAmount.toFixed(2)}`,
    };
  }

  return { valid: true };
}

export type InitiatePaymentRequest = z.infer<typeof initiatePaymentSchema>;
export type CashfreeCallbackPayload = z.infer<typeof cashfreeCallbackSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type OrderAmount = z.infer<typeof orderAmountSchema>;
