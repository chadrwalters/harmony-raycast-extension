import { Toast, showToast } from "@raycast/api";

export class ToastManager {
  static async success(title: string, message?: string): Promise<void> {
    await showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  }

  static async error(title: string, message?: string): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  static async warning(title: string, message?: string): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  static async progress(title: string, message?: string): Promise<Toast> {
    return await showToast({
      style: Toast.Style.Animated,
      title,
      message,
    });
  }

  static async progressWithSteps(steps: string[]): Promise<void> {
    const toast = await this.progress(steps[0]);

    for (let i = 1; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.title = steps[i];
    }

    toast.style = Toast.Style.Success;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.hide();
  }
}
