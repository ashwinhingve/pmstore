/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: any, nextDelay: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  backoffMultiplier: 2,
  timeout: 10000, // 10 seconds
  retryableErrors: [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
};

/**
 * Error class for non-retryable errors
 */
export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  // Network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // HTTP status codes that are retryable (5xx server errors, 429 rate limit)
  if (error.status) {
    const status = parseInt(error.status);
    return status === 429 || (status >= 500 && status < 600);
  }

  // Fetch API errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // AbortError from timeout
  if (error.name === 'AbortError') {
    return true;
  }

  // NonRetryableError should never be retried
  if (error instanceof NonRetryableError) {
    return false;
  }

  // Default: retry unknown errors
  return true;
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function to retry
 * @param options Retry configuration options
 * @returns Promise resolving to the function result
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) throw new Error('API error');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms:`, error.message);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout to the function execution
      if (config.timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${config.timeout}ms`));
          }, config.timeout);
        });

        return await Promise.race([fn(), timeoutPromise]);
      }

      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt >= config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt + 1, error, delay);
      } else {
        console.warn(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms:`, {
          error: error.message || error,
          code: error.code,
          status: error.status,
        });
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(`All ${config.maxRetries} retry attempts failed:`, lastError);
  throw lastError;
}

/**
 * Retry a fetch request with automatic timeout and error handling
 *
 * @param url URL to fetch
 * @param init Fetch init options
 * @param retryOptions Retry configuration
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * const response = await retryFetch(
 *   'https://api.example.com/data',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ key: 'value' })
 *   },
 *   { maxRetries: 3, timeout: 5000 }
 * );
 * ```
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = retryOptions?.timeout
      ? setTimeout(() => controller.abort(), retryOptions.timeout)
      : null;

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      // Throw on HTTP errors for retry logic
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, retryOptions);
}

/**
 * Predefined retry configurations for common scenarios
 */
export const RetryPresets = {
  // Quick retries for fast APIs (e.g., database queries)
  FAST: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    timeout: 3000,
  } as RetryOptions,

  // Standard retries for typical HTTP APIs
  STANDARD: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    timeout: 10000,
  } as RetryOptions,

  // Aggressive retries for critical operations
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 16000,
    timeout: 15000,
  } as RetryOptions,

  // Patient retries for slow external services
  PATIENT: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 30000,
    timeout: 30000,
  } as RetryOptions,
};
