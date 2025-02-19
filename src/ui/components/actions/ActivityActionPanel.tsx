import { Action, ActionPanel, Icon } from "@raycast/api";
import { HarmonyActivity } from "../../../types/core/harmony";
import { BaseActionPanel, BaseActionPanelProps } from "./BaseActionPanel";

interface ActivityActionPanelProps extends BaseActionPanelProps {
  activity: HarmonyActivity;
  isCurrentActivity: boolean;
  onStartActivity: () => void;
  onStopActivity: () => void;
  onCopyId?: () => void;
}

export function ActivityActionPanel({
  activity,
  isCurrentActivity,
  onStartActivity,
  onStopActivity,
  onCopyId,
  ...baseProps
}: ActivityActionPanelProps) {
  return (
    <BaseActionPanel {...baseProps}>
      <ActionPanel.Section title="Activity Controls">
        {!isCurrentActivity ? (
          <Action
            title="Start Activity"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onStartActivity}
          />
        ) : (
          <Action
            title="Stop Activity"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onStopActivity}
          />
        )}
      </ActionPanel.Section>

      {onCopyId && (
        <ActionPanel.Section>
          <Action
            title="Copy Activity ID"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={onCopyId}
          />
        </ActionPanel.Section>
      )}
    </BaseActionPanel>
  );
} 