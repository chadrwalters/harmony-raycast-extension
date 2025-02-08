/**
 * Extension preferences
 */
export interface Preferences {
  /** Default view to show (activities or devices) */
  defaultView: "activities" | "devices";

  /** Duration to hold a command in milliseconds */
  commandHoldTime: string;

  /** Enable debug level logging */
  debugLogging: boolean;

  /** Automatically retry failed operations */
  autoRetry: boolean;

  /** Maximum number of retry attempts */
  maxRetries: string;
}
