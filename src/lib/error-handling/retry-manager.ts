import { logger } from '../logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: Error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      return (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        error.message.includes('fetch') ||
        error.message.includes('5') // 5xx errors
      );
    },
    onRetry: () => {}
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', { 
            attempt, 
            totalAttempts: config.maxAttempts 
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Operation failed', lastError, { 
          attempt, 
          maxAttempts: config.maxAttempts,
          willRetry: attempt < config.maxAttempts && config.retryCondition(lastError)
        });

        // Don't retry if this is the last attempt or retry condition fails
        if (attempt === config.maxAttempts || !config.retryCondition(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        config.onRetry(attempt, lastError);

        logger.debug('Retrying operation', { 
          attempt, 
          delay: jitteredDelay,
          error: lastError.message 
        });

        await this.sleep(jitteredDelay);
      }
    }

    logger.error('Operation failed after all retry attempts', lastError, {
      totalAttempts: config.maxAttempts
    });

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry with circuit breaker pattern
  static createCircuitBreaker(
    operation: () => Promise<any>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ) {
    const config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      ...options
    };

    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failureCount = 0;
    let lastFailureTime = 0;
    let successCount = 0;

    return async function circuitBreakerWrapper() {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (now - lastFailureTime > config.monitoringPeriod) {
        failureCount = 0;
      }

      // Check if circuit should move from OPEN to HALF_OPEN
      if (state === 'OPEN' && now - lastFailureTime > config.resetTimeout) {
        state = 'HALF_OPEN';
        successCount = 0;
        logger.info('Circuit breaker moving to HALF_OPEN state');
      }

      // Reject immediately if circuit is OPEN
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }

      try {
        const result = await operation();

        // Success in HALF_OPEN state
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= 3) { // Require 3 successes to close
            state = 'CLOSED';
            failureCount = 0;
            logger.info('Circuit breaker CLOSED after successful recovery');
          }
        }

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Open circuit if failure threshold exceeded
        if (failureCount >= config.failureThreshold) {
          state = 'OPEN';
          logger.warn('Circuit breaker OPENED due to failure threshold', {
            failureCount,
            threshold: config.failureThreshold
          });
        }

        throw error;
      }
    };
  }
}

// Decorator for automatic retry
export function withRetry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryManager.withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}