import { Action, ActionPanel, Icon } from "@raycast/api";
import { memo } from "react";

export interface BaseActionPanelProps {
  onRefresh?: () => void;
  onClearCache?: () => void;
  onReconnect?: () => void;
  children?: React.ReactNode;
}

function BaseActionPanelImpl({ onRefresh, onClearCache, onReconnect, children }: BaseActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {children}
      </ActionPanel.Section>

      <ActionPanel.Section title="Management">
        {onRefresh && (
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        )}
        {onReconnect && (
          <Action
            icon={Icon.Link}
            title="Reconnect"
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onReconnect}
          />
        )}
        {onClearCache && (
          <Action
            icon={Icon.Trash}
            title="Clear Cache"
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={onClearCache}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export const BaseActionPanel = memo(BaseActionPanelImpl, (prevProps, nextProps) => {
  return (
    prevProps.onRefresh === nextProps.onRefresh &&
    prevProps.onClearCache === nextProps.onClearCache &&
    prevProps.onReconnect === nextProps.onReconnect &&
    prevProps.children === nextProps.children
  );
}); 