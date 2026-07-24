import * as z from 'zod';

/** v1 order request — minimal payload for mobile. */
export const v1CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(999, 'Quantity too high'),
  })).min(1, 'Cart cannot be empty'),
  shippingAddressId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid address ID'),
  prescriptionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid prescription ID').optional(),
  discountId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid discount ID').optional(),
});

export type V1CreateOrderInput = z.infer<typeof v1CreateOrderSchema>;

/** v1 reorder request — simple pass-through. */
export const v1ReorderSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order ID'),
});

export type V1ReorderInput = z.infer<typeof v1ReorderSchema>;
