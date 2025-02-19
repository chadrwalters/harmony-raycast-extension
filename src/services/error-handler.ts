/**
 * Error handling utilities for Harmony Hub integration
 * @module
 */

import { showToast, Toast } from "@raycast/api";
import { Logger } from "./logger";
import {
  HarmonyError,
  ErrorCategory,
  ErrorSeverity,
  ErrorRecoveryAction,
} from "../types/core/errors";

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
  defaultCategory: ErrorCategory.DATA,
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
   * @param error - The error to handle
   * @param context - Optional context information
   * @param category - Optional error category
   */
  static handle(
    error: Error | unknown,
    context?: string,
    category?: ErrorCategory
  ): void {
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
   * Handle an async operation with proper error handling
   * @param operation - The async operation to handle
   * @param context - Optional context information
   * @param category - Optional error category
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    category?: ErrorCategory
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handle(error, context, category);
      throw error;
    }
  }

  /**
   * Convert any error to a HarmonyError
   * @param error - The error to convert
   * @param category - Optional error category
   */
  private static toHarmonyError(
    error: Error | unknown,
    category?: ErrorCategory
  ): HarmonyError {
    if (error instanceof HarmonyError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    return new HarmonyError(
      message,
      category || ErrorHandler.config.defaultCategory,
      cause
    );
  }

  /**
   * Show an error toast to the user
   * @param error - The error to show
   */
  private static showErrorToast(error: HarmonyError): void {
    const title = ErrorHandler.getCategoryTitle(error.category);
    const message = error.getUserMessage();

    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  /**
   * Get a user-friendly title for an error category
   * @param category - The error category
   */
  private static getCategoryTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.CONNECTION:
        return "Connection Error";
      case ErrorCategory.DISCOVERY:
        return "Discovery Error";
      case ErrorCategory.COMMAND:
        return "Command Error";
      case ErrorCategory.STATE:
        return "State Error";
      case ErrorCategory.DATA:
        return "Data Error";
      case ErrorCategory.HUB_COMMUNICATION:
        return "Hub Communication Error";
      default:
        return "Error";
    }
  }

  /**
   * Get recovery actions for an error
   * @param error - The error to get recovery actions for
   */
  static getRecoveryActions(error: HarmonyError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    switch (error.category) {
      case ErrorCategory.CONNECTION:
        actions.push(
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.RECONNECT
        );
        break;
      case ErrorCategory.DISCOVERY:
        actions.push(
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.CLEAR_CACHE
        );
        break;
      case ErrorCategory.COMMAND:
        actions.push(ErrorRecoveryAction.RETRY);
        break;
      case ErrorCategory.STATE:
        actions.push(
          ErrorRecoveryAction.RESET_CONFIG,
          ErrorRecoveryAction.RESTART
        );
        break;
      case ErrorCategory.DATA:
        actions.push(
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.CLEAR_CACHE
        );
        break;
      case ErrorCategory.HUB_COMMUNICATION:
        actions.push(
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.RECONNECT,
          ErrorRecoveryAction.CLEAR_CACHE
        );
        break;
      default:
        actions.push(ErrorRecoveryAction.MANUAL);
    }

    return actions;
  }

  /**
   * Show a success toast
   * @param title - The toast title
   * @param message - Optional toast message
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
   * @param title - The toast title
   * @param message - Optional toast message
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
   * @param title - The toast title
   * @param message - Optional toast message
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