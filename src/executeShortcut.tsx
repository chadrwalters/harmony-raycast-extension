import { showToast, Toast } from "@raycast/api";
import { HarmonyManager } from "./lib/harmonyClient";
import { ErrorHandler } from "./lib/errorHandler";
import { ErrorCategory } from "./types/error";

interface ShortcutArguments {
  type: "command" | "activity";
  deviceId?: string;
  commandId?: string;
  activityId?: string;
  label: string;
}

export default async function Command(props: { arguments: { shortcut: string } }) {
  try {
    const shortcut = JSON.parse(props.arguments.shortcut) as ShortcutArguments;
    const manager = HarmonyManager.getInstance();

    if (shortcut.type === "command" && shortcut.deviceId && shortcut.commandId) {
      await manager.executeCommand(shortcut.deviceId, shortcut.commandId);
    } else if (shortcut.type === "activity" && shortcut.activityId) {
      await manager.startActivity(shortcut.activityId);
    } else {
      throw new Error("Invalid shortcut configuration");
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Shortcut executed",
      message: shortcut.label,
    });
  } catch (error) {
    if (error instanceof Error) {
      await ErrorHandler.handleError(error, ErrorCategory.EXECUTION);
    } else {
      await ErrorHandler.handleError(new Error("Failed to execute shortcut"), ErrorCategory.EXECUTION);
    }
  }

  return null;
}
