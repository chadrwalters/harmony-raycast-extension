import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo, useMemo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyActivity } from "../../../types/core/harmony";

interface ActivitiesViewProps {
  onActivitySelect: (activity: HarmonyActivity) => void;
  onBack?: () => void;
}

function ActivitiesViewImpl({ onActivitySelect, onBack }: ActivitiesViewProps): JSX.Element {
  const { activities, refresh, clearCache } = useHarmony();

  // Group activities by type
  const { activityTypes, activitiesByType } = useMemo(() => {
    const types = new Set<string>();
    const byType = new Map<string, HarmonyActivity[]>();

    activities.forEach((activity) => {
      types.add(activity.type);
      const typeActivities = byType.get(activity.type) || [];
      typeActivities.push(activity);
      byType.set(activity.type, typeActivities);
    });

    return {
      activityTypes: Array.from(types).sort(),
      activitiesByType: byType,
    };
  }, [activities]);

  return (
    <List
      navigationTitle="Activities"
      searchBarPlaceholder="Search activities..."
      isLoading={false}
      isShowingDetail={false}
    >
      {activityTypes.map((type) => {
        const typeActivities = activitiesByType.get(type) || [];
        return (
          <List.Section key={type} title={type}>
            {typeActivities.map((activity) => (
              <List.Item
                key={activity.id}
                title={activity.name}
                subtitle={activity.type}
                icon={activity.isCurrent ? Icon.Play : Icon.Stop}
                accessories={[
                  {
                    icon: activity.isCurrent ? Icon.CircleFilled : Icon.Circle,
                    tooltip: activity.isCurrent ? "Running" : "Stopped",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Select Activity"
                        icon={Icon.ArrowRight}
                        onAction={() => onActivitySelect(activity)}
                      />
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
          </List.Section>
        );
      })}
    </List>
  );
}

export const ActivitiesView = memo(ActivitiesViewImpl);
