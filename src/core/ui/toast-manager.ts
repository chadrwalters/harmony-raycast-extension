import { Toast, showToast } from "@raycast/api";

/**
 * Options for displaying a toast notification.
 */
interface ToastOptions {
  /** The title of the toast */
  title: string;
  /** Optional message to display */
  message?: string;
  /** Optional style of the toast */
  style?: Toast.Style;
}

/**
 * ToastManager provides a centralized way to show toast notifications.
 * It wraps Raycast's toast functionality with consistent styling and behavior.
 */
export class ToastManager {
  /**
   * Shows a success toast notification.
   *
   * @param titleOrOptions - Title string or toast options
   * @param message - Optional message when using string parameters
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Object style
   * await ToastManager.success({
   *   title: "Command Executed",
   *   message: "The device responded successfully"
   * });
   * 
   * // Parameter style
   * await ToastManager.success("Command Executed", "The device responded successfully");
   * ```
   */
  static async success(titleOrOptions: string | ToastOptions, message?: string): Promise<void> {
    const options = typeof titleOrOptions === "string" 
      ? { title: titleOrOptions, message } 
      : titleOrOptions;

    await showToast({
      style: Toast.Style.Success,
      title: options.title,
      message: options.message,
    });
  }

  /**
   * Shows an error toast notification.
   *
   * @param titleOrOptions - Title string or toast options
   * @param message - Optional message when using string parameters
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Object style
   * await ToastManager.error({
   *   title: "Command Failed",
   *   message: "Could not connect to device"
   * });
   * 
   * // Parameter style
   * await ToastManager.error("Command Failed", "Could not connect to device");
   * ```
   */
  static async error(titleOrOptions: string | ToastOptions, message?: string): Promise<void> {
    const options = typeof titleOrOptions === "string" 
      ? { title: titleOrOptions, message } 
      : titleOrOptions;

    await showToast({
      style: Toast.Style.Failure,
      title: options.title,
      message: options.message,
    });
  }

  /**
   * Shows a warning toast notification.
   *
   * @param titleOrOptions - Title string or toast options
   * @param message - Optional message when using string parameters
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Object style
   * await ToastManager.warning({
   *   title: "Network Slow",
   *   message: "Response time is high"
   * });
   * 
   * // Parameter style
   * await ToastManager.warning("Network Slow", "Response time is high");
   * ```
   */
  static async warning(titleOrOptions: string | ToastOptions, message?: string): Promise<void> {
    const options = typeof titleOrOptions === "string" 
      ? { title: titleOrOptions, message } 
      : titleOrOptions;

    await showToast({
      style: Toast.Style.Animated,
      title: options.title,
      message: options.message,
    });
  }

  /**
   * Shows an animated toast notification.
   *
   * @param titleOrOptions - Title string or toast options
   * @param message - Optional message when using string parameters
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // Object style
   * await ToastManager.loading({
   *   title: "Processing",
   *   message: "Please wait..."
   * });
   * 
   * // Parameter style
   * await ToastManager.loading("Processing", "Please wait...");
   * ```
   */
  static async loading(titleOrOptions: string | ToastOptions, message?: string): Promise<void> {
    const options = typeof titleOrOptions === "string" 
      ? { title: titleOrOptions, message } 
      : titleOrOptions;

    await showToast({
      style: Toast.Style.Animated,
      title: options.title,
      message: options.message,
    });
  }

  /**
   * Shows a progress toast notification with multiple steps.
   *
   * @param steps - Array of step titles
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await ToastManager.progressWithSteps([
   *   "Step 1: Initializing",
   *   "Step 2: Processing",
   *   "Step 3: Finalizing"
   * ]);
   * ```
   */
  static async progressWithSteps(steps: string[]): Promise<void> {
    const toast = await this.loading({ title: steps[0] });

    for (let i = 1; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.title = steps[i];
    }

    toast.style = Toast.Style.Success;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.hide();
  }
}
