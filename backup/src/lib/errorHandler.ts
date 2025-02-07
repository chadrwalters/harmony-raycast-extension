import { ToastManager } from "./toastManager";
import { SessionManager } from "./sessionManager";

export enum ErrorCategory {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  CACHE_OPERATION = "cache_operation",
  UNKNOWN = "unknown",
}

export class ErrorHandler {
  private static readonly MAX_RETRIES = 3;
  private static retryCount = 0;

  static async handleNetworkError(error: Error): Promise<void> {
    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      await ToastManager.warning("Network Error", `Retrying (${this.retryCount}/${this.MAX_RETRIES})...`);
      // Retry logic here
    } else {
      this.retryCount = 0;
      await ToastManager.error("Network Error", "Maximum retries exceeded. Please check your connection.");
    }
  }

  static async handleAuthenticationError(): Promise<void> {
    await ToastManager.error("Authentication Error", "Please reconnect to your Hub");
    await SessionManager.clearSession();
  }

  static async handleValidationError(error: Error): Promise<void> {
    await ToastManager.error("Validation Error", error.message);
  }

  static async handleCacheError(error: Error): Promise<void> {
    await ToastManager.error("Cache Error", `Failed to perform cache operation: ${error.message}`);
  }

  static async handleError(error: Error | string, category?: ErrorCategory): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`[${category}] Error:`, errorMessage);

    switch (category) {
      case ErrorCategory.NETWORK:
        await this.handleNetworkError(error instanceof Error ? error : new Error(errorMessage));
        break;

      case ErrorCategory.AUTHENTICATION:
        await this.handleAuthenticationError();
        break;

      case ErrorCategory.VALIDATION:
        await this.handleValidationError(error instanceof Error ? error : new Error(errorMessage));
        break;

      case ErrorCategory.CACHE_OPERATION:
        await this.handleCacheError(error instanceof Error ? error : new Error(errorMessage));
        break;

      default:
        await ToastManager.error("Error", errorMessage);
        break;
    }
  }
}
