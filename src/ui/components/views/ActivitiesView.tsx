import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { memo, useCallback, useMemo, useState } from "react";
import { HarmonyActivity, HarmonyStage, LoadingState } from "../../../types/core/harmony";
import { HarmonyError } from "../../../types/core/errors";
import { FeedbackState } from "../FeedbackState";
import { ActivityActionPanel } from "../actions/ActivityActionPanel";
import { useViewStore } from "../../../stores/view";
import { View } from "../../../types/core/views";

interface ActivitiesViewProps {
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  loadingState: LoadingState | null;
  error: HarmonyError | null;
  onStartActivity: (activity: HarmonyActivity) => void;
  onStopActivity: () => void;
  onRefresh: () => void;
  onClearCache: () => void;
  onReconnect: () => void;
}

interface ActivityListItemProps {
  activity: HarmonyActivity;
  isCurrentActivity: boolean;
  onStartActivity: () => void;
  onStopActivity: () => void;
  onRefresh: () => void;
  onClearCache: () => void;
  onReconnect: () => void;
}

const ActivityListItem = memo(({
  activity,
  isCurrentActivity,
  onStartActivity,
  onStopActivity,
  onRefresh,
  onClearCache,
  onReconnect,
}: ActivityListItemProps) => (
  <List.Item
    key={activity.id}
    title={activity.name}
    subtitle={isCurrentActivity ? "Currently Running" : undefined}
    icon={isCurrentActivity ? Icon.Play : Icon.Stop}
    accessories={[
      {
        icon: isCurrentActivity ? Icon.CheckCircle : undefined,
        tooltip: isCurrentActivity ? "Currently Running" : undefined
      }
    ]}
    detail={
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Activity Type"
              text={activity.type}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Status"
              text={isCurrentActivity ? "Running" : "Stopped"}
            />
            {isCurrentActivity && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Action"
                  text="Press ⏎ to Stop"
                />
              </>
            )}
            {!isCurrentActivity && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Action"
                  text="Press ⏎ to Start"
                />
              </>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    }
    actions={
      <ActionPanel>
        <ActionPanel.Section>
          {isCurrentActivity ? (
            <Action
              title="Stop Activity"
              icon={Icon.Stop}
              onAction={onStopActivity}
            />
          ) : (
            <Action
              title="Start Activity"
              icon={Icon.Play}
              onAction={onStartActivity}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Navigation">
          <Action
            title="Switch to Devices"
            icon={Icon.Devices}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => useViewStore.getState().changeView(View.DEVICES)}
          />
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
    }
  />
));

function ActivitiesViewImpl({
  activities,
  currentActivity,
  loadingState,
  error,
  onStartActivity,
  onStopActivity,
  onRefresh,
  onClearCache,
  onReconnect,
}: ActivitiesViewProps) {
  const [searchText, setSearchText] = useState("");

  const handleStartActivity = useCallback((activity: HarmonyActivity) => {
    onStartActivity(activity);
  }, [onStartActivity]);

  // Memoize filtered activities to prevent unnecessary recalculations
  const filteredActivities = useMemo(() => {
    if (!searchText) return activities;
    
    const lowerSearch = searchText.toLowerCase();
    return activities.filter(
      (activity) =>
        activity.name.toLowerCase().includes(lowerSearch) ||
        activity.type.toLowerCase().includes(lowerSearch)
    );
  }, [activities, searchText]);

  // Group activities by type for better organization
  const activitiesByType = useMemo(() => {
    const groups = new Map<string, HarmonyActivity[]>();
    filteredActivities.forEach((activity) => {
      const type = activity.type || "Other";
      const typeActivities = groups.get(type) || [];
      typeActivities.push(activity);
      groups.set(type, typeActivities);
    });
    return groups;
  }, [filteredActivities]);

  // Show error state if there's an error
  if (error) {
    return (
      <FeedbackState
        title="Activity Loading Error"
        description="Unable to load activities from the Harmony Hub"
        icon={Icon.ExclamationMark}
        error={error}
        onRetry={onRefresh}
        onClearCache={onClearCache}
        onReconnect={onReconnect}
      />
    );
  }

  // Show loading state while loading activities
  if (loadingState?.stage === HarmonyStage.LOADING_ACTIVITIES) {
    return (
      <FeedbackState
        title="Loading Activities"
        description={loadingState.message}
        icon={Icon.CircleProgress}
      />
    );
  }

  // Show loading state while starting/stopping activities
  if (loadingState?.stage === HarmonyStage.STARTING_ACTIVITY || 
      loadingState?.stage === HarmonyStage.STOPPING_ACTIVITY) {
    return (
      <FeedbackState
        title={loadingState.stage === HarmonyStage.STARTING_ACTIVITY ? 
          "Starting Activity" : "Stopping Activity"}
        description={loadingState.message}
        icon={Icon.CircleProgress}
      />
    );
  }

  // Show empty state if no activities found
  if (!activities.length) {
    return (
      <FeedbackState
        title="No Activities Found"
        description="No activities are configured on this Harmony Hub"
        icon={Icon.XMarkCircle}
        onRetry={onRefresh}
        onClearCache={onClearCache}
      />
    );
  }

  return (
    <List
      navigationTitle="Harmony Activities"
      searchBarPlaceholder="Search activities..."
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      {Array.from(activitiesByType.entries()).map(([type, activities]) => (
        <List.Section key={type} title={type}>
          {activities.map((activity) => (
            <ActivityListItem
              key={activity.id}
              activity={activity}
              isCurrentActivity={activity.id === currentActivity?.id}
              onStartActivity={() => handleStartActivity(activity)}
              onStopActivity={onStopActivity}
              onRefresh={onRefresh}
              onClearCache={onClearCache}
              onReconnect={onReconnect}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export const ActivitiesView = memo(ActivitiesViewImpl); 