import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyHub } from "../../../types/core/harmony";

interface HubsViewProps {
  onHubSelect: (hub: HarmonyHub) => void;
  onBack?: () => void;
}

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
