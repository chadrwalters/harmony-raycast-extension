import { showToast, Toast } from "@raycast/api";

import { HarmonyError, ErrorCategory, ErrorSeverity, ErrorRecoveryAction } from "../types/core/errors";

import { Logger } from "./logger";

/**
 * Configuration for error handling
 */
interface ErrorHandlerConfig {
  /** Whether to show toasts for errors */
  showToasts: boolean;
  /** Whether to log errors */
  logErrors: boolean;
  /** Default error category if none is specified */
  defaultCategory: ErrorCategory;
  /** Default error severity if none is specified */
  defaultSeverity: ErrorSeverity;
}

/**
 * Default configuration for error handling
 */
const defaultConfig: ErrorHandlerConfig = {
  showToasts: true,
  logErrors: true,
  defaultCategory: ErrorCategory.UNKNOWN,
  defaultSeverity: ErrorSeverity.ERROR,
};

/**
 * ErrorHandler class for consistent error handling across the application.
 * Provides methods for handling errors, showing user feedback, and logging.
 */
export class ErrorHandler {
  private static config: ErrorHandlerConfig = defaultConfig;

  /**
   * Configure the error handler
   * @param config - Partial configuration to merge with defaults
   */
  static configure(config: Partial<ErrorHandlerConfig>): void {
    ErrorHandler.config = { ...defaultConfig, ...config };
  }

  /**
   * Handle any type of error, converting it to a HarmonyError if needed
   */
  static handle(error: Error | unknown, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error);

    // Log the error if enabled
    if (ErrorHandler.config.logErrors) {
      Logger.logError(harmonyError, context);
    }

    // Show user feedback if enabled
    if (ErrorHandler.config.showToasts) {
      ErrorHandler.showErrorToast(harmonyError);
    }
  }

  /**
   * Handle a specific error with a category
   */
  static handleWithCategory(error: Error | unknown, category: ErrorCategory, context?: string): void {
    const harmonyError = ErrorHandler.toHarmonyError(error, category);

    // Log the error if enabled
    if (ErrorHandler.config.logErrors) {
      Logger.logError(harmonyError, context);
    }

    // Show user feedback if enabled
    if (ErrorHandler.config.showToasts) {
      ErrorHandler.showErrorToast(harmonyError);
    }
  }

  /**
   * Convert any error to a HarmonyError
   */
  private static toHarmonyError(error: Error | unknown, category?: ErrorCategory): HarmonyError {
    if (error instanceof HarmonyError) {
      return error;
    }

    const defaultCategory = category || ErrorHandler.config.defaultCategory;
    const message = error instanceof Error ? error.message : String(error);
    const originalError = error instanceof Error ? error : undefined;

    return new HarmonyError(message, defaultCategory, originalError);
  }

  /**
   * Show an error toast to the user
   */
  private static showErrorToast(error: HarmonyError): void {
    const title = ErrorHandler.getCategoryTitle(error.category);
    showToast({
      style: Toast.Style.Failure,
      title,
      message: error.message,
    });
  }

  /**
   * Get a user-friendly title for an error category
   */
  private static getCategoryTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.CONNECTION:
      case ErrorCategory.NETWORK:
      case ErrorCategory.WEBSOCKET:
        return "Connection Error";
      case ErrorCategory.DISCOVERY:
        return "Discovery Error";
      case ErrorCategory.COMMAND:
      case ErrorCategory.COMMAND_EXECUTION:
        return "Command Error";
      case ErrorCategory.STATE:
        return "State Error";
      case ErrorCategory.DATA:
        return "Data Error";
      case ErrorCategory.HUB_COMMUNICATION:
        return "Hub Communication Error";
      case ErrorCategory.ACTIVITY_START:
        return "Activity Start Error";
      case ErrorCategory.ACTIVITY_STOP:
        return "Activity Stop Error";
      case ErrorCategory.VALIDATION:
        return "Validation Error";
      case ErrorCategory.STORAGE:
        return "Storage Error";
      case ErrorCategory.CACHE:
        return "Cache Error";
      case ErrorCategory.QUEUE:
        return "Queue Error";
      case ErrorCategory.HARMONY:
        return "Harmony Error";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication Error";
      case ErrorCategory.SYSTEM:
        return "System Error";
      default:
        return "Error";
    }
  }

  /**
   * Handle an async operation with proper error handling
   */
  static async handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handle(error, context);
      throw error;
    }
  }

  /**
   * Handle an async operation with a specific error category
   */
  static async handleAsyncWithCategory<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context?: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handleWithCategory(error, category, context);
      throw error;
    }
  }

  /**
   * Get recovery actions for an error
   */
  static getRecoveryActions(error: HarmonyError): ErrorRecoveryAction[] {
    const strategy = error.getDefaultRecoveryStrategy();
    return strategy?.actions || [ErrorRecoveryAction.MANUAL];
  }

  /**
   * Show a success toast
   */
  static showSuccess(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  /**
   * Show a warning toast
   */
  static showWarning(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  /**
   * Show a loading toast
   */
  static showLoading(title: string, message?: string): void {
    if (!ErrorHandler.config.showToasts) return;

    showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }
}
