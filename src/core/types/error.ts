/**
 * Categories of errors that can occur in the application.
 * Used for consistent error handling and user feedback.
 */
export enum ErrorCategory {
  /**
   * Errors related to network connectivity.
   * Examples: connection timeouts, failed requests, etc.
   */
  NETWORK = "network",
  /**
   * Errors related to device discovery.
   * Examples: failed device detection, invalid device IDs, etc.
   */
  DISCOVERY = "discovery",
  /**
   * Errors related to device connection.
   * Examples: failed connection attempts, invalid credentials, etc.
   */
  CONNECTION = "connection",
  /**
   * Errors related to command execution.
   * Examples: invalid commands, failed command execution, etc.
   */
  COMMAND = "command",
  /**
   * Errors related to activity control.
   * Examples: failed activity starts, invalid activity states, etc.
   */
  ACTIVITY = "activity",
  /**
   * Errors related to state management.
   * Examples: invalid state transitions, failed state updates, etc.
   */
  STATE = "state",
  /**
   * Validation errors.
   * Examples: invalid input data, failed data validation, etc.
   */
  VALIDATION = "validation",
  /**
   * Unknown or unclassified errors.
   * Examples: unexpected errors, unhandled exceptions, etc.
   */
  UNKNOWN = "unknown",
}

/**
 * Base error class for Harmony-related errors.
 * Provides structured error information with categorization.
 */
export class HarmonyError extends Error {
  /**
   * The category of the error.
   * @see ErrorCategory
   */
  public category: ErrorCategory;
  /**
   * The original error that caused this error.
   * May be null or undefined if no original error is available.
   */
  public originalError?: Error;

  /**
   * Creates a new HarmonyError.
   *
   * @param message - Error message
   * @param category - Error category
   * @param originalError - Optional original error
   */
  constructor(message: string, category: ErrorCategory, originalError?: Error) {
    super(message);
    this.name = "HarmonyError";
    this.category = category;
    this.originalError = originalError;
  }

  /**
   * Creates a network-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static network(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.NETWORK, originalError);
  }

  /**
   * Creates a discovery-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static discovery(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.DISCOVERY, originalError);
  }

  /**
   * Creates a connection-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static connection(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.CONNECTION, originalError);
  }

  /**
   * Creates a command-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static command(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.COMMAND, originalError);
  }

  /**
   * Creates an activity-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static activity(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.ACTIVITY, originalError);
  }

  /**
   * Creates a state-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static state(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.STATE, originalError);
  }

  /**
   * Creates a validation-related error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static validation(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.VALIDATION, originalError);
  }

  /**
   * Creates an unknown or unclassified error.
   *
   * @param message - Error message
   * @param originalError - Optional original error
   * @returns {HarmonyError} A new HarmonyError instance
   */
  public static unknown(message: string, originalError?: Error): HarmonyError {
    return new HarmonyError(message, ErrorCategory.UNKNOWN, originalError);
  }
}
