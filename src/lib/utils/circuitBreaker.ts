/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests pass through
  OPEN = 'OPEN', // Circuit tripped, requests fail immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in HALF_OPEN before closing
  timeout: number; // Time in ms before attempting to close from OPEN
  monitoringWindow: number; // Time window for counting failures
  name?: string; // Optional name for logging
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastStateChange: number;
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(serviceName: string, retryAfter: number) {
    super(
      `Circuit breaker is OPEN for ${serviceName}. Service unavailable. Retry after ${Math.ceil(retryAfter / 1000)}s.`
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<CircuitBreakerConfig, 'name'>> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitoringWindow: 60000, // 1 minute
};

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is down
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private lastStateChange: number = Date.now();
  private config: Required<CircuitBreakerConfig>;
  private recentFailures: number[] = []; // Timestamps of recent failures
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      name: config.name || 'unnamed',
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      const timeSinceOpen = now - this.lastStateChange;

      // Check if timeout has elapsed to transition to HALF_OPEN
      if (timeSinceOpen >= this.config.timeout) {
        console.log(`Circuit breaker ${this.config.name}: OPEN → HALF_OPEN (timeout elapsed)`);
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        // Circuit still open, fail fast
        const retryAfter = this.config.timeout - timeSinceOpen;
        console.warn(
          `Circuit breaker ${this.config.name} is OPEN. Failing fast. Retry after ${Math.ceil(retryAfter / 1000)}s`
        );

        // Use fallback if provided
        if (fallback) {
          console.log(`Circuit breaker ${this.config.name}: Using fallback`);
          return await fallback();
        }

        throw new CircuitBreakerOpenError(this.config.name, retryAfter);
      }
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      // Use fallback if provided
      if (fallback) {
        console.log(`Circuit breaker ${this.config.name}: Error occurred, using fallback`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      console.log(
        `Circuit breaker ${this.config.name}: Success in HALF_OPEN (${this.successCount}/${this.config.successThreshold})`
      );

      if (this.successCount >= this.config.successThreshold) {
        console.log(`Circuit breaker ${this.config.name}: HALF_OPEN → CLOSED (success threshold reached)`);
        this.transitionTo(CircuitState.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
        this.recentFailures = [];
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
      this.recentFailures = [];
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++;
    this.failureCount++;
    const now = Date.now();
    this.lastFailureTime = now;
    this.recentFailures.push(now);

    // Remove failures outside monitoring window
    const windowStart = now - this.config.monitoringWindow;
    this.recentFailures = this.recentFailures.filter((timestamp) => timestamp >= windowStart);

    console.warn(
      `Circuit breaker ${this.config.name}: Failure recorded (${this.recentFailures.length}/${this.config.failureThreshold} in window)`
    );

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately opens the circuit
      console.error(`Circuit breaker ${this.config.name}: HALF_OPEN → OPEN (failure during test)`);
      this.transitionTo(CircuitState.OPEN);
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if failure threshold exceeded
      if (this.recentFailures.length >= this.config.failureThreshold) {
        console.error(
          `Circuit breaker ${this.config.name}: CLOSED → OPEN (failure threshold reached: ${this.recentFailures.length}/${this.config.failureThreshold})`
        );
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    console.log(`Circuit breaker ${this.config.name}: State changed ${oldState} → ${newState}`);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    console.log(`Circuit breaker ${this.config.name}: Manual reset`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.recentFailures = [];
    this.lastStateChange = Date.now();
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    console.log(`Circuit breaker ${this.config.name}: Manual open`);
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Check if circuit is currently allowing requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    // Check if timeout has elapsed
    const now = Date.now();
    const timeSinceOpen = now - this.lastStateChange;
    return timeSinceOpen >= this.config.timeout;
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({
          ...DEFAULT_CONFIG,
          ...config,
          name,
        })
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Predefined circuit breaker configurations
 */
export const CircuitBreakerPresets = {
  // Fast-failing for quick APIs
  FAST: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000, // 15 seconds
    monitoringWindow: 30000, // 30 seconds
  } as CircuitBreakerConfig,

  // Standard configuration for typical services
  STANDARD: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
  } as CircuitBreakerConfig,

  // Patient configuration for slow/unreliable services
  PATIENT: {
    failureThreshold: 10,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    monitoringWindow: 120000, // 2 minutes
  } as CircuitBreakerConfig,
};
