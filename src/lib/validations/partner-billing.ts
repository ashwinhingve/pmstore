import { z } from 'zod';

export const partnerBillingInputSchema = z.object({
  amount: z.number().finite().min(0).max(1000000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'Use at most two decimal places'),
  reference: z.string().trim().min(3).max(200),
  source: z.enum(['wallet', 'invoice']), status: z.enum(['paid', 'unpaid']),
  chargeDate: z.iso.datetime().refine(value => Date.parse(value) <= Date.now() + 86400000, 'Charge date cannot be in the future'),
  expectedVersion: z.number().int().min(0), verified: z.literal(true),
}).strict().refine(value => value.source !== 'wallet' || value.status === 'paid', 'A verified wallet debit must be marked paid');

export interface PartnerBilling {
  amount: number; reference: string; source: 'wallet' | 'invoice'; status: 'paid' | 'unpaid';
  chargeDate: Date; recordedBy: string; recordedAt: Date;
}
