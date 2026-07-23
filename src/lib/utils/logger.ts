import { randomUUID } from 'crypto';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Log level priorities (for filtering)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Log context interface
 */
export interface LogContext {
  correlationId?: string;
  userId?: string;
  orderId?: string;
  transactionId?: string;
  waybill?: string;
  endpoint?: string;
  [key: string]: any;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  message: string;
  context?: LogContext;
  data?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  metric?: {
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, string>;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private correlationId: string;
  private context: LogContext;
  private startTime?: number;
  private minLogLevel: LogLevel;

  constructor(context: LogContext = {}) {
    this.correlationId = context.correlationId || randomUUID();
    this.context = { ...context, correlationId: this.correlationId };
    this.minLogLevel = this.getMinLogLevel();
  }

  /**
   * Get minimum log level from environment
   */
  private getMinLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
    return envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined
      ? envLevel
      : process.env.NODE_ENV === 'production'
      ? LogLevel.INFO
      : LogLevel.DEBUG;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLogLevel];
  }

  /**
   * Format and output log entry
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    // In development, use colored console output
    if (isDevelopment) {
      const colors = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m', // Green
        [LogLevel.WARN]: '\x1b[33m', // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      const color = colors[entry.level];

      console.log(
        `${color}[${entry.level}]${reset} ${entry.timestamp} [${entry.correlationId.substring(0, 8)}] ${entry.message}`,
        entry.data || entry.error || ''
      );
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(entry));

      // Send to external monitoring service if configured
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Send log entry to external monitoring service
   */
  private sendToMonitoring(entry: LogEntry): void {
    // TODO: Implement Sentry, Datadog, or other monitoring integration
    // Example:
    // if (process.env.SENTRY_DSN && entry.level === LogLevel.ERROR) {
    //   Sentry.captureException(entry);
    // }
  }

  /**
   * Start a timer for measuring operation duration
   */
  startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time since startTimer was called
   */
  private getElapsedTime(): number | undefined {
    return this.startTime ? Date.now() - this.startTime : undefined;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      correlationId: this.correlationId,
      message,
      context: this.context,
      data,
    });
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      correlationId: this.correlationId,
      message,
      context: this.context,
      data,
      duration: this.getElapsedTime(),
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      correlationId: this.correlationId,
      message,
      context: this.context,
      data,
    });
  }

  /**
   * Log error message
   */
  error(message: string, error?: any, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      correlationId: this.correlationId,
      message,
      context: this.context,
      data,
      error: error
        ? {
            message: error.message || String(error),
            stack: error.stack,
            code: error.code,
          }
        : undefined,
    });
  }

  /**
   * Log a metric for monitoring
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      correlationId: this.correlationId,
      message: `Metric: ${name}`,
      context: this.context,
      metric: {
        name,
        value,
        unit,
        tags,
      },
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Get the correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context);
}

/**
 * Extract correlation ID from request headers
 */
export function getCorrelationId(headers: Headers): string {
  return headers.get('x-correlation-id') || headers.get('x-request-id') || randomUUID();
}

/**
 * Create logger from Next.js request
 */
export function createRequestLogger(
  request: { headers: Headers; url?: string; method?: string },
  additionalContext?: LogContext
): Logger {
  const correlationId = getCorrelationId(request.headers);
  const url = request.url ? new URL(request.url) : null;

  return createLogger({
    correlationId,
    endpoint: url?.pathname,
    method: request.method,
    ...additionalContext,
  });
}

/**
 * Measure and log execution time of a function
 */
export async function measureExecutionTime<T>(
  logger: Logger,
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  logger.startTimer();
  logger.debug(`Starting: ${operationName}`);

  try {
    const result = await fn();
    logger.info(`Completed: ${operationName}`);
    return result;
  } catch (error) {
    logger.error(`Failed: ${operationName}`, error);
    throw error;
  }
}

/**
 * Predefined log messages for common operations
 */
export const LogMessages = {
  // Payment
  PAYMENT_INITIATED: 'Payment initiated',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  PAYMENT_FAILED: 'Payment processing failed',
  PAYMENT_CALLBACK_RECEIVED: 'Payment callback received',
  PAYMENT_VERIFICATION_FAILED: 'Payment verification failed',
  PAYMENT_AMOUNT_MISMATCH: 'Payment amount mismatch detected',

  // Shipping
  SHIPMENT_CREATED: 'Shipment created successfully',
  SHIPMENT_CREATION_FAILED: 'Shipment creation failed',
  WEBHOOK_RECEIVED: 'Webhook received',
  WEBHOOK_VERIFICATION_FAILED: 'Webhook signature verification failed',
  SHIPMENT_STATUS_UPDATED: 'Shipment status updated',

  // Order
  ORDER_CREATED: 'Order created',
  ORDER_UPDATED: 'Order updated',
  ORDER_CANCELLED: 'Order cancelled',
  STOCK_REDUCED: 'Product stock reduced',

  // Security
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  UNAUTHORIZED_ACCESS: 'Unauthorized access attempt',
  INVALID_SIGNATURE: 'Invalid signature detected',
  ADMIN_SETUP_FAILED: 'Admin setup attempt failed',

  // External API
  EXTERNAL_API_CALL: 'External API call',
  EXTERNAL_API_SUCCESS: 'External API call successful',
  EXTERNAL_API_FAILED: 'External API call failed',
  EXTERNAL_API_RETRY: 'Retrying external API call',
  CIRCUIT_BREAKER_OPENED: 'Circuit breaker opened',
  CIRCUIT_BREAKER_CLOSED: 'Circuit breaker closed',
};

/**
 * Metric names for monitoring
 */
export const MetricNames = {
  // Payment metrics
  PAYMENT_DURATION: 'payment.duration',
  PAYMENT_SUCCESS_RATE: 'payment.success_rate',
  PAYMENT_CALLBACK_DURATION: 'payment.callback.duration',

  // Shipping metrics
  SHIPMENT_CREATION_DURATION: 'shipment.creation.duration',
  WEBHOOK_PROCESSING_DURATION: 'webhook.processing.duration',

  // API metrics
  API_RESPONSE_TIME: 'api.response_time',
  EXTERNAL_API_RESPONSE_TIME: 'external_api.response_time',

  // Database metrics
  DB_QUERY_DURATION: 'db.query.duration',
  DB_TRANSACTION_DURATION: 'db.transaction.duration',

  // Error metrics
  ERROR_COUNT: 'error.count',
  RATE_LIMIT_HIT: 'rate_limit.hit',
};
