/**
 * Error categories for Harmony Hub extension
 */
export enum ErrorCategory {
  /** Connection-related errors */
  CONNECTION = "connection",
  /** Hub discovery errors */
  DISCOVERY = "discovery",
  /** Command execution errors */
  COMMAND = "command",
  /** State management errors */
  STATE = "state",
  /** Data retrieval or parsing errors */
  DATA = "data"
}

/**
 * Retry configuration for error handling
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
}

/**
 * Timeout configuration for operations
 */
export interface TimeoutConfig {
  /** Connection timeout in milliseconds */
  connection: number;
  /** Message timeout in milliseconds */
  message: number;
  /** Activity timeout in milliseconds */
  activity: number;
  /** Command timeout in milliseconds */
  command: number;
}

/**
 * Retry context for error handling
 */
export interface RetryContext {
  /** Number of retry attempts made */
  attempts: number;
  /** Time of first attempt */
  firstAttempt: number;
  /** Time of last attempt */
  lastAttempt: number;
  /** Next scheduled retry time */
  nextRetry: number | null;
  /** Whether maximum retries have been reached */
  maxRetriesReached: boolean;
}

/**
 * Custom error class for Harmony Hub extension
 */
export class HarmonyError extends Error {
  /** Error category */
  public readonly category: ErrorCategory;
  /** Original error if any */
  public readonly originalError?: Error;
  /** Retry context if applicable */
  public readonly retryContext?: RetryContext;
  /** Whether the error is retryable */
  public readonly isRetryable: boolean;
  /** Error code if any */
  public readonly code?: string;
  /** Additional error details */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory,
    originalError?: Error,
    retryContext?: RetryContext,
    isRetryable = true,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HarmonyError";
    this.category = category;
    this.originalError = originalError;
    this.retryContext = retryContext;
    this.isRetryable = isRetryable;
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HarmonyError);
    }
  }

  /**
   * Create a new error with updated retry context
   */
  public withRetryContext(retryContext: RetryContext): HarmonyError {
    return new HarmonyError(
      this.message,
      this.category,
      this.originalError,
      retryContext,
      this.isRetryable,
      this.code,
      this.details
    );
  }

  /**
   * Check if error should be retried based on category and context
   */
  public shouldRetry(config: RetryConfig): boolean {
    if (!this.isRetryable) return false;
    if (!this.retryContext) return true;
    if (this.retryContext.maxRetriesReached) return false;

    // Don't retry if we've exceeded max attempts
    if (this.retryContext.attempts >= config.maxAttempts) return false;

    // Don't retry certain error categories
    const nonRetryableCategories = [
      ErrorCategory.CONNECTION,
      ErrorCategory.DISCOVERY
    ];
    if (nonRetryableCategories.includes(this.category)) return false;

    return true;
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  public getRetryDelay(config: RetryConfig): number {
    if (!this.retryContext) return config.baseDelay;

    const { attempts } = this.retryContext;
    const { baseDelay, maxDelay, useExponentialBackoff } = config;

    if (!useExponentialBackoff) return baseDelay;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      baseDelay * Math.pow(2, attempts),
      maxDelay
    );

    // Add jitter to prevent thundering herd
    return delay * (0.5 + Math.random());
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.CONNECTION:
        return "Failed to connect to Harmony Hub. Please check your network connection and try again.";
      case ErrorCategory.DISCOVERY:
        return "Failed to discover Harmony Hubs. Please ensure your hub is powered on and connected to the network.";
      case ErrorCategory.COMMAND:
        return "Failed to execute command. Please try again.";
      case ErrorCategory.STATE:
        return "Failed to update state. Please try reconnecting to the hub.";
      case ErrorCategory.DATA:
        return "Failed to retrieve data from Harmony Hub. Please try again.";
      default:
        return this.message;
    }
  }
}
