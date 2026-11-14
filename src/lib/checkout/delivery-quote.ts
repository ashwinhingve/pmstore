import { z } from 'zod';
import Product, { type IProduct } from '@/models/Product';
import Address, { type IAddress } from '@/models/Address';
import SiteSettings, { type ISiteSettings } from '@/models/SiteSettings';
import { AppError } from '@/lib/utils/errorHandler';
import { evaluateDelivery, readDeliveryPolicy } from '@/lib/shipping/delivery-policy';
import { massInGrams } from '@/lib/shipping/parcel';

export const deliveryQuoteRequestSchema = z.object({
  items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), variantId: z.string().optional(), quantity: z.number().int().positive().max(10000) }).strict()).min(1).max(200),
  shippingAddressId: z.string().regex(/^[a-f\d]{24}$/i),
}).strict();

export async function customerDelivery(subtotal: number, weight: number, destination: string) {
  const settings = await SiteSettings.findOne({ key: 'global' }).select('delivery').lean<ISiteSettings | null>();
  return evaluateDelivery(subtotal, weight, destination, readDeliveryPolicy(settings?.delivery));
}

export async function quoteCustomerDelivery(input: z.infer<typeof deliveryQuoteRequestSchema>, userId: string) {
  const address = await Address.findOne({ _id: input.shippingAddressId, userId }).lean<IAddress | null>();
  if (!address) throw new AppError(404, 'Select one of your saved delivery addresses.', 'INVALID_ADDRESS');
  const ids = [...new Set(input.items.map(item => item.productId))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true, isDiscontinued: { $ne: true } }).lean<IProduct[]>();
  let subtotal = 0;
  let grams = 0;
  for (const item of input.items) {
    const product = products.find(product => String(product._id) === item.productId);
    const variant = item.variantId ? product?.variants.find(variant => variant.id === item.variantId && variant.isActive) : undefined;
    if (!product || (item.variantId && !variant)) throw new AppError(422, 'Some cart items are unavailable. Refresh your cart.', 'INVALID_CART');
    subtotal += (variant?.price ?? product.price) * item.quantity;
    grams += (massInGrams(variant?.weight ?? product.weight, variant?.weight != null ? variant.weightUnit ?? product.weightUnit : product.weightUnit) ?? 0) * item.quantity;
  }
  const result = await customerDelivery(subtotal, grams, address.postalCode);
  return { shippingCost: result.shippingCost, reason: result.reason, subtotal,
    pickup: result.pickup ? { id: result.pickup.id, name: result.pickup.name, pincode: result.pickup.pincode } : null,
    estimatedDays: result.calculation.tier.estimatedDays };
}
