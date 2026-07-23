import { NextResponse } from 'next/server';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_VERIFICATION_FAILED: 'PAYMENT_VERIFICATION_FAILED',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',

  // Shipping
  SHIPMENT_CREATION_FAILED: 'SHIPMENT_CREATION_FAILED',
  INVALID_PINCODE: 'INVALID_PINCODE',
  SHIPMENT_NOT_SERVICEABLE: 'SHIPMENT_NOT_SERVICEABLE',

  // Stock
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  STOCK_UPDATE_FAILED: 'STOCK_UPDATE_FAILED',

  // External Services
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  DELHIVERY_API_ERROR: 'DELHIVERY_API_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Webhook
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_WEBHOOK_PAYLOAD: 'INVALID_WEBHOOK_PAYLOAD',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
  timestamp: string;
}

/**
 * Sanitize error for production
 * @param error Any error object
 * @returns Sanitized error response
 */
export function sanitizeError(error: any): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const timestamp = new Date().toISOString();

  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: isDevelopment ? error.details : undefined,
        stack: isDevelopment ? error.stack : undefined,
      },
      timestamp,
    };
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    return {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: isDevelopment
          ? Object.values(error.errors).map((e: any) => ({
              field: e.path,
              message: e.message,
            }))
          : undefined,
        stack: isDevelopment ? error.stack : undefined,
      },
      timestamp,
    };
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return {
      error: {
        code: ErrorCodes.ALREADY_EXISTS,
        message: `A record with this ${field} already exists`,
        details: isDevelopment ? error.keyValue : undefined,
        stack: isDevelopment ? error.stack : undefined,
      },
      timestamp,
    };
  }

  // Handle Mongoose cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return {
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: 'Invalid ID format',
        details: isDevelopment ? { path: error.path, value: error.value } : undefined,
        stack: isDevelopment ? error.stack : undefined,
      },
      timestamp,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Log the full error server-side
    console.error('Unhandled error:', {
      message: error.message,
      stack: error.stack,
      timestamp,
    });

    // Return generic error in production
    if (!isDevelopment) {
      return {
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred. Please try again later.',
        },
        timestamp,
      };
    }

    // Return detailed error in development
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error.message,
        stack: error.stack,
      },
      timestamp,
    };
  }

  // Handle unknown errors
  console.error('Unknown error type:', error);

  return {
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      details: isDevelopment ? error : undefined,
    },
    timestamp,
  };
}

/**
 * Create error response with NextResponse
 * @param error Any error object
 * @param defaultStatus Default HTTP status code if not in AppError
 * @returns NextResponse with sanitized error
 */
export function createErrorResponse(
  error: any,
  defaultStatus: number = 500
): NextResponse {
  const sanitized = sanitizeError(error);
  const statusCode = error instanceof AppError ? error.statusCode : defaultStatus;

  return NextResponse.json(sanitized, { status: statusCode });
}

/**
 * Predefined error factory functions
 */
export const Errors = {
  unauthorized: (message = 'Unauthorized access') =>
    new AppError(401, message, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = 'Access forbidden') =>
    new AppError(403, message, ErrorCodes.FORBIDDEN),

  notFound: (resource = 'Resource', id?: string) =>
    new AppError(
      404,
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      ErrorCodes.NOT_FOUND
    ),

  validationError: (message: string, details?: any) =>
    new AppError(400, message, ErrorCodes.VALIDATION_ERROR, details),

  paymentFailed: (message: string, details?: any) =>
    new AppError(400, message, ErrorCodes.PAYMENT_FAILED, details),

  amountMismatch: (expected: number, received: number) =>
    new AppError(
      400,
      'Payment amount does not match order amount',
      ErrorCodes.AMOUNT_MISMATCH,
      { expected, received }
    ),

  invalidSignature: () =>
    new AppError(401, 'Invalid webhook signature', ErrorCodes.INVALID_SIGNATURE),

  rateLimitExceeded: (retryAfter: number) =>
    new AppError(
      429,
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      { retryAfter }
    ),

  insufficientStock: (productName: string, available: number, requested: number) =>
    new AppError(
      400,
      `Insufficient stock for ${productName}`,
      ErrorCodes.INSUFFICIENT_STOCK,
      { available, requested }
    ),

  externalApiError: (service: string, message: string) =>
    new AppError(
      502,
      `External service error: ${service}`,
      ErrorCodes.EXTERNAL_API_ERROR,
      { service, message }
    ),

  serviceUnavailable: (service?: string) =>
    new AppError(
      503,
      service
        ? `Service temporarily unavailable: ${service}`
        : 'Service temporarily unavailable',
      ErrorCodes.SERVICE_UNAVAILABLE,
      { service }
    ),

  internalError: (message = 'An unexpected error occurred') =>
    new AppError(500, message, ErrorCodes.INTERNAL_ERROR),
};

/**
 * Async error handler wrapper for API routes
 * @param handler Async handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandler(
  handler: (request: any, context?: any) => Promise<NextResponse>
) {
  return async (request: any, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API route error:', error);
      return createErrorResponse(error);
    }
  };
}
