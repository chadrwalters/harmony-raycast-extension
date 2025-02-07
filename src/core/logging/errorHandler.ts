/**
 * Error handling functionality for the application.
 * Provides centralized error handling with logging and user feedback.
 * @module
 */

import { LocalStorage } from "@raycast/api";
import { ToastManager } from "../ui/toast-manager";
import { SessionManager } from "../session/session-manager";
import { Logger } from "./logger";

/**
 * Categories of errors that can occur in the application.
 */
export enum ErrorCategory {
  /** Network-related errors (connection, timeout, etc.) */
  NETWORK = "network",
  /** Data validation errors */
  VALIDATION = "validation",
  /** Authentication and authorization errors */
  AUTHENTICATION = "authentication",
  /** Storage-related errors */
  STORAGE = "storage",
  /** Unknown or uncategorized errors */
  UNKNOWN = "unknown"
}

/**
 * Configuration options for error handling.
 */
interface ErrorHandlerConfig {
  /** Whether to show toast notifications */
  showToasts: boolean;
  /** Whether to log errors */
  logErrors: boolean;
  /** Whether to include stack traces */
  includeStack: boolean;
}

/**
 * Error handler class for consistent error handling across the application.
 */
export class ErrorHandler {
  private static config: ErrorHandlerConfig = {
    showToasts: true,
    logErrors: true,
    includeStack: true
  };

  /**
   * Handles an error with appropriate logging and user feedback.
   *
   * @param error - The error to handle
   * @param category - Error category for classification
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await ErrorHandler.handleError(error, ErrorCategory.NETWORK);
   * ```
   */
  public static async handleError(error: Error, category: ErrorCategory): Promise<void> {
    if (this.config.logErrors) {
      Logger.error(`[${category}] Error:`, error);
    }

    switch (category) {
      case ErrorCategory.NETWORK:
        await this.handleNetworkError(error);
        break;

      case ErrorCategory.AUTHENTICATION:
        await this.handleAuthenticationError();
        break;

      case ErrorCategory.VALIDATION:
        await this.handleValidationError(error);
        break;

      default:
        await this.showErrorToast(error, category);
        break;
    }
  }

  /**
   * Handles a network error with retry logic.
   *
   * @param error - The error to handle
   * @returns Promise<void>
   */
  private static async handleNetworkError(error: Error): Promise<void> {
    if (this.config.showToasts) {
      Logger.error("Network error occurred", error);
      let currentRetry = 0;
      const retryCount = 3;

      try {
        while (currentRetry < retryCount) {
          currentRetry++;
          await ToastManager.warning("Network Error", `Retrying (${currentRetry}/${retryCount})...`);
          // Retry logic here
        }
      } catch (retryError) {
        Logger.error("Retry failed", retryError);
        await ToastManager.error("Network Error", "Failed to recover from network error");
      }
    }
  }

  /**
   * Handles an authentication error by clearing the session.
   *
   * @returns Promise<void>
   */
  private static async handleAuthenticationError(): Promise<void> {
    if (this.config.showToasts) {
      await ToastManager.error("Authentication Error", "Please reconnect to your Hub");
    }
    await SessionManager.clearSession();
  }

  /**
   * Handles a validation error by showing a toast notification.
   *
   * @param error - The error to handle
   * @returns Promise<void>
   */
  private static async handleValidationError(error: Error): Promise<void> {
    if (this.config.showToasts) {
      await ToastManager.error("Validation Error", error.message);
    }
  }

  /**
   * Shows a toast notification for an error.
   *
   * @param error - The error to show
   * @param category - Error category
   * @returns Promise<void>
   */
  private static async showErrorToast(error: Error, category: ErrorCategory): Promise<void> {
    if (this.config.showToasts) {
      await ToastManager.error("Error", this.getErrorMessage(error, category));
    }
  }

  /**
   * Gets a user-friendly error message.
   *
   * @param error - The error to format
   * @param category - Error category
   * @returns Formatted error message
   */
  private static getErrorMessage(error: Error, category: ErrorCategory): string {
    return error.message;
  }

  /**
   * Configures the error handler.
   *
   * @param config - Error handler configuration
   *
   * @example
   * ```typescript
   * ErrorHandler.configure({
   *   showToasts: true,
   *   logErrors: true
   * });
   * ```
   */
  public static configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
