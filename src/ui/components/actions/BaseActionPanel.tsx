import { ActionPanel, Action, Icon } from "@raycast/api";
import { memo } from "react";

interface BaseActionPanelProps {
  onRefresh?: () => void;
  onClearCache?: () => void;
  onBack?: () => void;
}

function BaseActionPanelImpl({ onRefresh, onClearCache, onBack }: BaseActionPanelProps): JSX.Element {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {onRefresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />}
        {onClearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={onClearCache} />}
        {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const BaseActionPanel = memo(BaseActionPanelImpl);
