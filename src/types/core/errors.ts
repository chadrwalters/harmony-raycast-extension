/**
 * Error type definitions for Harmony Hub integration
 * @module
 */

import { ErrorCategory, TimeoutConfig } from "./harmony";

// Re-export ErrorCategory and TimeoutConfig for convenience
export { ErrorCategory } from "./harmony";
export type { TimeoutConfig } from "./harmony";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational issues that don't affect functionality */
  INFO = "info",
  /** Minor issues that may affect some functionality */
  WARNING = "warning",
  /** Serious issues that affect core functionality */
  ERROR = "error",
  /** Critical issues that prevent operation */
  CRITICAL = "critical"
}

/**
 * Recovery actions available for different error types
 */
export enum ErrorRecoveryAction {
  /** Retry the failed operation */
  RETRY = "retry",
  /** Reconnect to the hub */
  RECONNECT = "reconnect",
  /** Clear local cache */
  CLEAR_CACHE = "clear_cache",
  /** Reset configuration */
  RESET_CONFIG = "reset_config",
  /** Restart the hub */
  RESTART = "restart",
  /** Manual intervention required */
  MANUAL = "manual"
}

/**
 * Configuration for retry behavior
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
  /** Maximum total retry duration in milliseconds */
  maxRetryDuration?: number;
  /** Categories that should not be retried */
  nonRetryableCategories?: ErrorCategory[];
}

/**
 * Context for retry attempts
 */
export interface RetryContext {
  /** Number of retry attempts made */
  attempts: number;
  /** Total time spent retrying in milliseconds */
  totalDuration: number;
  /** Whether max retries has been reached */
  maxRetriesReached: boolean;
  /** Success rate of retry attempts */
  successRate?: number;
}

/**
 * Strategy for error recovery
 */
export interface ErrorRecoveryStrategy {
  /** Actions to take for recovery */
  actions: ErrorRecoveryAction[];
  /** Priority of this strategy (lower is higher priority) */
  priority: number;
  /** Whether recovery can be automatic */
  automatic: boolean;
  /** Maximum attempts for this strategy */
  maxAttempts: number;
  /** Delay between attempts in milliseconds */
  delayBetweenAttempts: number;
}

/**
 * Custom error class for Harmony-related errors
 * @class HarmonyError
 * @extends Error
 */
export class HarmonyError extends Error {
  /** The category of the error */
  readonly category: ErrorCategory;
  /** Error severity level */
  readonly severity: ErrorSeverity;
  /** The original error that caused this error, if any */
  readonly cause?: Error;
  /** Retry context if applicable */
  readonly retryContext?: RetryContext;
  /** Whether the error is retryable */
  readonly isRetryable: boolean;
  /** Error code if any */
  readonly code?: string;
  /** Additional error details */
  readonly details?: Record<string, unknown>;
  /** Recovery strategies */
  readonly recoveryStrategies?: ErrorRecoveryStrategy[];
  /** Timestamp when error occurred */
  readonly timestamp: number;

  /**
   * Creates a new HarmonyError
   * @param message The error message
   * @param category The category of the error
   * @param cause The original error that caused this error, if any
   * @param retryContext Retry attempt context if applicable
   * @param isRetryable Whether the error can be retried
   * @param code Error code if any
   * @param details Additional error details
   * @param severity Error severity level
   * @param recoveryStrategies Available recovery strategies
   */
  constructor(
    message: string,
    category: ErrorCategory,
    cause?: Error,
    retryContext?: RetryContext,
    isRetryable = true,
    code?: string,
    details?: Record<string, unknown>,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    recoveryStrategies?: ErrorRecoveryStrategy[]
  ) {
    super(message);
    this.name = "HarmonyError";
    this.category = category;
    this.severity = severity;
    this.cause = cause;
    this.retryContext = retryContext;
    this.isRetryable = isRetryable;
    this.code = code;
    this.details = details;
    this.recoveryStrategies = recoveryStrategies;
    this.timestamp = Date.now();

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HarmonyError);
    }
  }

  /**
   * Gets a user-friendly message for this error
   * @returns A user-friendly error message
   */
  public getUserMessage(): string {
    const baseMessage = this.getBaseUserMessage();
    const recoveryMessage = this.getRecoveryMessage();
    return recoveryMessage ? `${baseMessage}\n\n${recoveryMessage}` : baseMessage;
  }

  /**
   * Gets a detailed error message including the cause if available
   * @returns A detailed error message
   */
  public getDetailedMessage(): string {
    let message = `${this.message} (${this.category})`;
    if (this.code) {
      message += `\nCode: ${this.code}`;
    }
    if (this.cause) {
      message += `\nCaused by: ${this.cause.message}`;
    }
    if (this.details) {
      message += `\nDetails: ${JSON.stringify(this.details)}`;
    }
    return message;
  }

  /**
   * Create a new error with updated retry context
   */
  public withRetryContext(retryContext: RetryContext): HarmonyError {
    return new HarmonyError(
      this.message,
      this.category,
      this.cause,
      retryContext,
      this.isRetryable,
      this.code,
      this.details,
      this.severity,
      this.recoveryStrategies
    );
  }

  /**
   * Create a new error with updated recovery strategies
   */
  public withRecoveryStrategies(strategies: ErrorRecoveryStrategy[]): HarmonyError {
    return new HarmonyError(
      this.message,
      this.category,
      this.cause,
      this.retryContext,
      this.isRetryable,
      this.code,
      this.details,
      this.severity,
      strategies
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

    // Don't retry if we've exceeded max duration
    if (config.maxRetryDuration && this.retryContext.totalDuration >= config.maxRetryDuration) {
      return false;
    }

    // Don't retry certain error categories
    const nonRetryableCategories = config.nonRetryableCategories || [];
    if (nonRetryableCategories.includes(this.category)) return false;

    // Don't retry if success rate is too low
    if (this.retryContext.successRate !== undefined && this.retryContext.successRate < 0.2) {
      return false;
    }

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
   * Get recommended recovery strategy
   */
  public getRecoveryStrategy(): ErrorRecoveryStrategy | null {
    if (!this.recoveryStrategies || this.recoveryStrategies.length === 0) {
      return this.getDefaultRecoveryStrategy();
    }

    // Get highest priority strategy that hasn't exceeded max attempts
    return this.recoveryStrategies
      .sort((a, b) => a.priority - b.priority)
      .find(s => !this.retryContext || this.retryContext.attempts < s.maxAttempts) || null;
  }

  private getBaseUserMessage(): string {
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
      case ErrorCategory.HUB_COMMUNICATION:
        return "Lost communication with the Harmony Hub. Please check your connection.";
      default:
        return this.message;
    }
  }

  private getRecoveryMessage(): string | null {
    const strategy = this.getRecoveryStrategy();
    if (!strategy) return null;

    if (!strategy.automatic) {
      switch (strategy.actions[0]) {
        case ErrorRecoveryAction.RESET_CONFIG:
          return "Try resetting your configuration in the extension settings.";
        case ErrorRecoveryAction.RESTART:
          return "Please restart the extension to resolve this issue.";
        case ErrorRecoveryAction.MANUAL:
          return "Manual intervention is required. Please check the documentation.";
        default:
          return null;
      }
    }
    return null;
  }

  private getDefaultRecoveryStrategy(): ErrorRecoveryStrategy | null {
    switch (this.category) {
      case ErrorCategory.CONNECTION:
        return {
          actions: [ErrorRecoveryAction.RECONNECT],
          priority: 1,
          automatic: true,
          maxAttempts: 3,
          delayBetweenAttempts: 1000
        };
      case ErrorCategory.DISCOVERY:
        return {
          actions: [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CLEAR_CACHE],
          priority: 1,
          automatic: true,
          maxAttempts: 2,
          delayBetweenAttempts: 500
        };
      case ErrorCategory.COMMAND:
        return {
          actions: [ErrorRecoveryAction.RETRY],
          priority: 1,
          automatic: true,
          maxAttempts: 2,
          delayBetweenAttempts: 500
        };
      case ErrorCategory.STATE:
        return {
          actions: [ErrorRecoveryAction.RESET_CONFIG],
          priority: 2,
          automatic: false,
          maxAttempts: 1,
          delayBetweenAttempts: 0
        };
      case ErrorCategory.DATA:
        return {
          actions: [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.CLEAR_CACHE],
          priority: 1,
          automatic: true,
          maxAttempts: 2,
          delayBetweenAttempts: 500
        };
      case ErrorCategory.HUB_COMMUNICATION:
        return {
          actions: [ErrorRecoveryAction.RETRY, ErrorRecoveryAction.RECONNECT],
          priority: 1,
          automatic: true,
          maxAttempts: 3,
          delayBetweenAttempts: 1000
        };
      default:
        return null;
    }
  }
}

/**
 * Type guard to check if an error is a HarmonyError
 * @param error The error to check
 * @returns True if the error is a HarmonyError
 */
export function isHarmonyError(error: unknown): error is HarmonyError {
  return error instanceof HarmonyError;
}

/**
 * Wraps an error in a HarmonyError if it isn't one already
 * @param error The error to wrap
 * @param category The category to use if wrapping
 * @param message The message to use if wrapping
 * @returns A HarmonyError
 */
export function wrapError(
  error: unknown,
  category: ErrorCategory,
  message = "An unexpected error occurred"
): HarmonyError {
  if (isHarmonyError(error)) {
    return error;
  }
  return new HarmonyError(
    message,
    category,
    error instanceof Error ? error : undefined
  );
} 