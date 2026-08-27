import * as z from 'zod';
import { isKnownOptionalField, OPTIONAL_FIELD_GROUPS } from '@/lib/import/template-fields';

const optionalFieldKey = z
  .string()
  .refine(isKnownOptionalField, { message: 'Unknown optional field' });

export const importTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be 100 characters or less'),
  includedOptionalFields: z
    .array(optionalFieldKey)
    .max(OPTIONAL_FIELD_GROUPS.length)
    .default([]),
  defaultManufacturer: z.string().trim().max(120).optional(),
  defaultSalt: z.string().trim().max(120).optional(),
});

export type ImportTemplateInput = z.infer<typeof importTemplateSchema>;
