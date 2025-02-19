/**
 * Custom error types for Harmony Hub integration
 * @module
 */

/**
 * Categories of errors that can occur
 */
export enum ErrorCategory {
  /** Network or connection errors */
  CONNECTION = "CONNECTION",
  /** Hub communication errors */
  HUB_COMMUNICATION = "HUB_COMMUNICATION",
  /** Command execution errors */
  COMMAND_EXECUTION = "COMMAND_EXECUTION",
  /** Activity start errors */
  ACTIVITY_START = "ACTIVITY_START",
  /** Activity stop errors */
  ACTIVITY_STOP = "ACTIVITY_STOP",
  /** Cache-related errors */
  CACHE = "CACHE",
  /** Storage-related errors */
  STORAGE = "STORAGE",
  /** State validation errors */
  STATE = "STATE",
  /** Data validation errors */
  VALIDATION = "VALIDATION",
  /** Discovery errors */
  DISCOVERY = "DISCOVERY",
  /** Unknown errors */
  UNKNOWN = "UNKNOWN",
}

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
  /** Warning level - operation can continue */
  WARNING = "WARNING",
  /** Error level - operation cannot continue */
  ERROR = "ERROR",
  /** Fatal level - application cannot continue */
  FATAL = "FATAL",
}

/**
 * Context for retryable operations
 */
export interface RetryContext {
  /** Number of attempts made */
  readonly attempts: number;
  /** Maximum number of attempts allowed */
  readonly maxAttempts: number;
  /** Timestamp of the last attempt */
  readonly lastAttemptTimestamp: number;
  /** Delay between attempts in milliseconds */
  readonly delayMs: number;
}

/**
 * Strategy for recovering from errors
 */
export interface ErrorRecoveryStrategy {
  /** Name of the recovery strategy */
  readonly name: string;
  /** Description of what the strategy does */
  readonly description: string;
  /** Whether the strategy can be automated */
  readonly isAutomatic: boolean;
  /** Steps to perform for recovery */
  readonly steps: string[];
}

/**
 * Details that can be included with errors
 */
export interface ErrorDetails {
  /** Type of the invalid value */
  type?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** List of allowed values */
  allowedValues?: readonly string[];
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Custom error class for Harmony Hub operations
 * Provides detailed error information and categorization
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
  readonly details?: ErrorDetails;
  /** Recovery strategies */
  readonly recoveryStrategies?: ErrorRecoveryStrategy[];
  /** Timestamp when error occurred */
  readonly timestamp: number;

  /**
   * Creates a new HarmonyError instance
   * @param message - User-friendly error message
   * @param category - Category of the error
   * @param cause - Original error that caused this error
   * @param retryContext - Context for retryable operations
   * @param isRetryable - Whether the operation can be retried
   * @param code - Error code for specific error types
   * @param details - Additional error details
   * @param severity - Severity level of the error
   * @param recoveryStrategies - Strategies for recovering from the error
   */
  constructor(
    message: string,
    category: ErrorCategory,
    cause?: Error,
    retryContext?: RetryContext,
    isRetryable = true,
    code?: string,
    details?: ErrorDetails,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    recoveryStrategies?: ErrorRecoveryStrategy[],
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
   * Gets a user-friendly error message suitable for display
   * @returns User-friendly error message with severity prefix
   */
  getUserMessage(): string {
    const prefix = this.severity === ErrorSeverity.WARNING ? "Warning" : "Error";
    return `${prefix}: ${this.message}`;
  }

  /**
   * Gets a detailed error message including all error information
   * Useful for logging and debugging
   * @returns Detailed multi-line error message
   */
  getDetailedMessage(): string {
    const details: string[] = [
      `Error: ${this.message}`,
      `Category: ${this.category}`,
      `Severity: ${this.severity}`,
      `Timestamp: ${new Date(this.timestamp).toISOString()}`,
      `Retryable: ${this.isRetryable}`,
    ];

    if (this.code) {
      details.push(`Code: ${this.code}`);
    }

    if (this.retryContext) {
      details.push(
        `Retry Attempts: ${this.retryContext.attempts}/${this.retryContext.maxAttempts}`,
        `Last Attempt: ${new Date(this.retryContext.lastAttemptTimestamp).toISOString()}`,
      );
    }

    if (this.cause) {
      details.push(`Cause: ${this.cause.message}`);
      if (this.cause.stack) {
        details.push(`Stack: ${this.cause.stack}`);
      }
    }

    if (this.details) {
      details.push(`Additional Details: ${JSON.stringify(this.details, null, 2)}`);
    }

    return details.join("\n");
  }
}
