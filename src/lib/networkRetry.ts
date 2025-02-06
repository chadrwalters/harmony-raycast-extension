interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  timeout: 15000,
};

export class NetworkRetry {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
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
        await new Promise(resolve => setTimeout(resolve, delay));

        // Increase delay for next attempt, but don't exceed maxDelay
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
        attempt++;
      }
    }

    throw new Error("Operation failed after all retry attempts");
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return this.withRetry(operation, { maxAttempts: 1, timeout });
  }

  static exponentialBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
    return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
  }
}
