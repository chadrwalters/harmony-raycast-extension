/**
 * Toast utility for user notifications
 * @module
 */

import { showToast, Toast } from "@raycast/api";
import { Logger } from "./logger";

/**
 * Configuration for toast notifications
 */
interface ToastConfig {
  /** Whether to log toast messages */
  logToasts: boolean;
  /** Whether to include timestamps in logs */
  includeTimestamp: boolean;
}

/**
 * Default configuration for toast notifications
 */
const defaultConfig: ToastConfig = {
  logToasts: true,
  includeTimestamp: true,
};

/**
 * ToastManager class for consistent user notifications across the application.
 * Provides methods for showing different types of toasts and optional logging.
 */
export class ToastManager {
  private static config: ToastConfig = defaultConfig;

  /**
   * Configure the toast manager
   * @param config - Partial configuration to merge with defaults
   */
  static configure(config: Partial<ToastConfig>): void {
    ToastManager.config = { ...defaultConfig, ...config };
  }

  /**
   * Show a success toast
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async success(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      Logger.info(`Success: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  /**
   * Show an error toast
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async error(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      Logger.error(`Error: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  /**
   * Show a warning toast
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async warning(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      Logger.warn(`Warning: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Failure, // Raycast doesn't have a warning style
      title,
      message,
    });
  }

  /**
   * Show a loading toast
   * @param title - Toast title
   * @param message - Optional toast message
   */
  static async loading(title: string, message?: string): Promise<void> {
    if (ToastManager.config.logToasts) {
      Logger.info(`Loading: ${title}${message ? ` - ${message}` : ""}`);
    }

    await showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }

  /**
   * Show a progress toast
   * @param title - Toast title
   * @param message - Optional toast message
   * @param progress - Progress value between 0 and 1
   */
  static async progress(
    title: string,
    message?: string,
    progress?: number
  ): Promise<void> {
    if (ToastManager.config.logToasts) {
      Logger.info(
        `Progress: ${title}${message ? ` - ${message}` : ""}${
          progress !== undefined ? ` (${Math.round(progress * 100)}%)` : ""
        }`
      );
    }

    await showToast({
      style: Toast.Style.Animated,
      title,
      message: message
        ? progress !== undefined
          ? `${message} (${Math.round(progress * 100)}%)`
          : message
        : undefined,
    });
  }
} 