import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyCommand } from "../../../types/core/harmony";

interface CommandsViewProps {
  commands: HarmonyCommand[];
  onExecuteCommand: (command: HarmonyCommand) => void;
  onBack?: () => void;
}

function CommandsViewImpl({ commands, onExecuteCommand, onBack }: CommandsViewProps): JSX.Element {
  const { refresh, clearCache } = useHarmony();

  return (
    <List
      navigationTitle="Commands"
      searchBarPlaceholder="Search commands..."
      isLoading={false}
      isShowingDetail={false}
    >
      {commands.map((command) => (
        <List.Item
          key={command.id}
          title={command.label}
          subtitle={command.name}
          icon={Icon.Terminal}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Execute Command" icon={Icon.Terminal} onAction={() => onExecuteCommand(command)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {refresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />}
                {clearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />}
                {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export const CommandsView = memo(CommandsViewImpl);
