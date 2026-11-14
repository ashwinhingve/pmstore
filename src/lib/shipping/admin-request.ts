import { z } from 'zod';
import { parcelSchema } from './parcel';

export const bookingRequestSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i),
  provider: z.enum(['delhivery', 'shiprocket']).default('delhivery'),
}).strict();

export const parcelRequestSchema = bookingRequestSchema.extend({
  parcel: parcelSchema,
  action: z.enum(['confirm', 'estimate']).default('confirm'),
});
