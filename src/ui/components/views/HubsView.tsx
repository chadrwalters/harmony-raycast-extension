/**
 * View component for displaying and selecting Harmony Hubs.
 * Shows discovered hubs with their connection status and version.
 * @module
 */

import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyHub } from "../../../types/core/harmony";

/**
 * Props for the HubsView component
 * @interface HubsViewProps
 */
interface HubsViewProps {
  /** Callback when a hub is selected */
  onHubSelect: (hub: HarmonyHub) => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying and selecting Harmony Hubs.
 * Shows discovered hubs with their connection status and firmware version.
 * Provides actions for selecting hubs and managing connections.
 * @param props - Component props
 * @returns JSX element
 */
function HubsViewImpl({ onHubSelect, onBack }: HubsViewProps): JSX.Element {
  const { hubs, refresh, clearCache } = useHarmony();

  return (
    <List
      navigationTitle="Harmony Hubs"
      searchBarPlaceholder="Search hubs..."
      isLoading={false}
      isShowingDetail={false}
    >
      {hubs.map((hub) => (
        <List.Item
          key={hub.id}
          title={hub.name}
          subtitle={hub.ip}
          icon={Icon.Network}
          accessories={[
            {
              text: hub.version || "Unknown Version",
              tooltip: "Hub firmware version",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Select Hub" icon={Icon.ArrowRight} onAction={() => onHubSelect(hub)} />
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

export const HubsView = memo(HubsViewImpl);
