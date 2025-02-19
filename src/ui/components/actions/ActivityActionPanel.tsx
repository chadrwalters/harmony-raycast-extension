import { ActionPanel, Action, Icon } from "@raycast/api";
import { memo } from "react";

interface ActivityActionPanelProps {
  isCurrentActivity: boolean;
  onStartActivity: () => void;
  onStopActivity: () => void;
  onRefresh?: () => void;
  onClearCache?: () => void;
  onBack?: () => void;
}

function ActivityActionPanelImpl({
  isCurrentActivity,
  onStartActivity,
  onStopActivity,
  onRefresh,
  onClearCache,
  onBack,
}: ActivityActionPanelProps): JSX.Element {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isCurrentActivity ? (
          <Action title="Start Activity" icon={Icon.Play} onAction={onStartActivity} />
        ) : (
          <Action title="Stop Activity" icon={Icon.Stop} onAction={onStopActivity} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onRefresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />}
        {onClearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={onClearCache} />}
        {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const ActivityActionPanel = memo(ActivityActionPanelImpl);
