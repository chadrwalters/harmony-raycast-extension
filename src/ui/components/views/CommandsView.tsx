import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { memo, useCallback } from "react";
import { HarmonyDevice, HarmonyCommand } from "../../../types/core/harmony";
import { Logger } from "../../../services/logger";
import { useViewStore } from "../../../stores/view";
import { View } from "../../../types/core/views";

interface CommandsViewProps {
  device: HarmonyDevice;
  onExecuteCommand: (command: HarmonyCommand) => void;
  onBack: () => void;
}

interface CommandListItemProps {
  command: HarmonyCommand;
  onExecute: (command: HarmonyCommand) => void;
  onBack: () => void;
}

const CommandListItem = memo(({ command, onExecute, onBack }: CommandListItemProps) => (
  <List.Item
    key={command.id}
    title={command.label}
    icon={Icon.Terminal}
    actions={
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title={`Execute ${command.label}`}
            onAction={() => onExecute(command)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Back to Devices"
            icon={Icon.ArrowLeft}
            onAction={onBack}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />
));

function CommandsViewImpl({ device, onExecuteCommand, onBack }: CommandsViewProps) {
  const viewStore = useViewStore();

  const handleExecuteCommand = useCallback((command: HarmonyCommand) => {
    Logger.debug("Executing command", { command });
    onExecuteCommand(command);
  }, [onExecuteCommand]);

  const handleBack = useCallback(() => {
    viewStore.clearSelection();
    viewStore.changeView(View.DEVICES);
  }, [viewStore]);

  return (
    <List
      navigationTitle={`${device.name} Commands`}
      searchBarPlaceholder="Search commands..."
    >
      {device.commands.map((command) => (
        <CommandListItem
          key={command.id}
          command={command}
          onExecute={handleExecuteCommand}
          onBack={handleBack}
        />
      ))}
    </List>
  );
}

export const CommandsView = memo(CommandsViewImpl); 