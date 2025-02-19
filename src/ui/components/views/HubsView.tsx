import { List, Icon, Action } from "@raycast/api";
import { memo, useCallback } from "react";
import { HarmonyHub, HarmonyStage, LoadingState } from "../../../types/core/harmony";
import { HarmonyError } from "../../../types/core/errors";
import { FeedbackState } from "../FeedbackState";
import { BaseActionPanel } from "../actions/BaseActionPanel";

interface HubsViewProps {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  loadingState: LoadingState | null;
  error: HarmonyError | null;
  onSelectHub: (hub: HarmonyHub) => void;
  onRefresh: () => void;
  onClearCache: () => void;
}

interface HubListItemProps {
  hub: HarmonyHub;
  isSelected: boolean;
  onSelectHub: (hub: HarmonyHub) => void;
  onRefresh: () => void;
  onClearCache: () => void;
}

const HubListItem = memo(({ hub, isSelected, onSelectHub, onRefresh, onClearCache }: HubListItemProps) => (
  <List.Item
    key={hub.id}
    title={hub.name}
    subtitle={hub.ip}
    icon={isSelected ? Icon.CheckCircle : Icon.Circle}
    accessories={[
      { text: hub.version || "Unknown Version" },
      { icon: isSelected ? Icon.Link : undefined },
    ]}
    actions={
      <BaseActionPanel
        onRefresh={onRefresh}
        onClearCache={onClearCache}
      >
        <Action
          title="Select Hub"
          icon={Icon.Link}
          onAction={() => onSelectHub(hub)}
        />
      </BaseActionPanel>
    }
  />
));

function HubsViewImpl({
  hubs,
  selectedHub,
  loadingState,
  error,
  onSelectHub,
  onRefresh,
  onClearCache,
}: HubsViewProps) {
  const handleSelectHub = useCallback((hub: HarmonyHub) => {
    onSelectHub(hub);
  }, [onSelectHub]);

  // Show error state if there's an error
  if (error) {
    return (
      <FeedbackState
        title="Hub Discovery Error"
        description="Unable to discover Harmony Hubs on your network"
        icon={Icon.ExclamationMark}
        error={error}
        onRetry={onRefresh}
        onClearCache={onClearCache}
      />
    );
  }

  // Show loading state while discovering
  if (loadingState?.stage === HarmonyStage.DISCOVERING) {
    return (
      <FeedbackState
        title="Discovering Hubs"
        description={loadingState.message}
        icon={Icon.CircleProgress}
      />
    );
  }

  // Show empty state if no hubs found
  if (!hubs.length) {
    return (
      <FeedbackState
        title="No Hubs Found"
        description="Make sure your Harmony Hub is powered on and connected to your network"
        icon={Icon.WifiDisabled}
        onRetry={onRefresh}
        onClearCache={onClearCache}
      />
    );
  }

  return (
    <List
      navigationTitle="Select Harmony Hub"
      searchBarPlaceholder="Search hubs..."
    >
      {hubs.map((hub) => (
        <HubListItem
          key={hub.id}
          hub={hub}
          isSelected={selectedHub?.id === hub.id}
          onSelectHub={handleSelectHub}
          onRefresh={onRefresh}
          onClearCache={onClearCache}
        />
      ))}
    </List>
  );
}

export const HubsView = memo(HubsViewImpl); 