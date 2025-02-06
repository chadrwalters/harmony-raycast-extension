import { ToastManager } from "./toastManager";
import { SessionManager } from "./sessionManager";

export enum ErrorCategory {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
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

  static async handleError(message: string, category: ErrorCategory = ErrorCategory.UNKNOWN): Promise<void> {
    console.error(`[${category}] Error:`, message);

    switch (category) {
      case ErrorCategory.NETWORK:
        await this.handleNetworkError(new Error(message));
        break;

      case ErrorCategory.AUTHENTICATION:
        await this.handleAuthenticationError();
        break;

      case ErrorCategory.VALIDATION:
        await this.handleValidationError(new Error(message));
        break;

      default:
        await ToastManager.error("Error", message);
        break;
    }
  }
}
