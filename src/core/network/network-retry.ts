/**
 * Configuration options for network retry behavior.
 */
interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay between retries in milliseconds */
  initialDelay?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  /** Factor to multiply delay by after each retry */
  backoffFactor?: number;
  /** Timeout for the operation in milliseconds */
  timeout?: number;
}

/**
 * Default retry configuration.
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  timeout: 15000,
};

/**
 * Executes a network operation with exponential backoff retry logic.
 *
 * @param operation - The async operation to execute
 * @param options - Optional retry configuration
 * @returns Promise with the operation result
 * @throws Last encountered error after all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await NetworkRetry.withRetry(
 *   async () => await fetchData(),
 *   { maxAttempts: 5, initialDelay: 1000 }
 * );
 * ```
 */
export class NetworkRetry {
  static async withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let attempt = 1;
    let delay = config.initialDelay;

    while (attempt <= config.maxAttempts) {
      try {
        // Create a promise that rejects on timeout
        const timeoutPromise = new Promise<T>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${config.timeout}ms`));
          }, config.timeout);
        });

        // Race between the operation and timeout
        return await Promise.race([operation(), timeoutPromise]);
      } catch (error) {
        if (attempt === config.maxAttempts) {
          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Increase delay for next attempt, but don't exceed maxDelay
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
        attempt++;
      }
    }

    throw new Error("Operation failed after all retry attempts");
  }

  /**
   * Executes a network operation with a specified timeout.
   *
   * @param operation - The async operation to execute
   * @param timeout - Timeout for the operation in milliseconds
   * @returns Promise with the operation result
   * @throws Last encountered error after all retries are exhausted
   */
  static async withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return this.withRetry(operation, { maxAttempts: 1, timeout });
  }

  /**
   * Calculates the delay for the next retry attempt using exponential backoff.
   *
   * @param attempt - Current retry attempt number
   * @param initialDelay - Initial delay between retries in milliseconds
   * @param maxDelay - Maximum delay between retries in milliseconds
   * @returns Delay in milliseconds
   */
  static exponentialBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
    return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
  }
}
