import { Action, ActionPanel, Icon } from "@raycast/api";
import { HarmonyDevice, HarmonyCommand } from "../../../types/core/harmony";
import { BaseActionPanel, BaseActionPanelProps } from "./BaseActionPanel";

interface DeviceActionPanelProps extends BaseActionPanelProps {
  device: HarmonyDevice;
  onExecuteCommand: (command: HarmonyCommand) => void;
  onCopyId?: () => void;
}

export function DeviceActionPanel({
  device,
  onExecuteCommand,
  onCopyId,
  ...baseProps
}: DeviceActionPanelProps) {
  return (
    <BaseActionPanel {...baseProps}>
      <ActionPanel.Section title="Device Commands">
        {device.commands.map((command) => (
          <Action
            key={command.id}
            title={command.label}
            icon={Icon.Terminal}
            onAction={() => onExecuteCommand(command)}
          />
        ))}
      </ActionPanel.Section>
      
      {onCopyId && (
        <ActionPanel.Section>
          <Action
            title="Copy Device ID"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={onCopyId}
          />
        </ActionPanel.Section>
      )}
    </BaseActionPanel>
  );
} 