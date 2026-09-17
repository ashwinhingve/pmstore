import { NextResponse } from 'next/server';
import * as z from 'zod';
import { createErrorResponse } from '@/lib/utils/errorHandler';

/**
 * One error shape for every inventory route. A Zod failure becomes a 400 with
 * per-field messages the admin form can show inline; everything else (AppError
 * from the service, Mongoose duplicate keys, cast errors) flows through the
 * shared sanitizeError so nothing leaks a raw Mongoose error (API CLAUDE.md).
 */
export function handleInventoryError(err: unknown): NextResponse {
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: err.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }
  return createErrorResponse(err);
}
