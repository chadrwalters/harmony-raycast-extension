import { ActionPanel, Action, Icon } from "@raycast/api";
import { memo } from "react";

import { HarmonyCommand } from "../../../types/core/harmony";

interface DeviceActionPanelProps {
  onExecuteCommand: (command: HarmonyCommand) => void;
  onRefresh?: () => void;
  onClearCache?: () => void;
  onBack?: () => void;
}

function DeviceActionPanelImpl({
  onExecuteCommand,
  onRefresh,
  onClearCache,
  onBack,
}: DeviceActionPanelProps): JSX.Element {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Execute Command" icon={Icon.Terminal} onAction={() => onExecuteCommand} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onRefresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />}
        {onClearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={onClearCache} />}
        {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const DeviceActionPanel = memo(DeviceActionPanelImpl);
