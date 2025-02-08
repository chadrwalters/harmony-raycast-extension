import { List, Icon, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useMemo, useState, useCallback } from "react";
import { useHarmony } from "../hooks/useHarmony";
import { HarmonyDevice, HarmonyActivity, HarmonyHub } from "../types/harmony";
import { Logger } from "../services/logger";
import { FeedbackState } from "./FeedbackState";
import { ErrorBoundary } from "./ErrorBoundary";
import { Preferences } from "../types/preferences";

/**
 * HarmonyCommand component provides a unified interface for controlling Harmony devices and activities.
 * Supports searching, filtering, and executing commands.
 */
export function HarmonyCommand(): JSX.Element {
  const {
    hubs,
    selectedHub,
    devices,
    activities,
    currentActivity,
    error,
    loadingState,
    connect,
    disconnect,
    refresh,
    executeCommand,
    startActivity,
  } = useHarmony();

  const [searchText, setSearchText] = useState("");
  const [view, setView] = useState<"activities" | "devices">("devices");
  const preferences = getPreferenceValues<Preferences>();

  // Reset search when switching views
  const resetSearch = useCallback(() => {
    setSearchText("");
  }, []);

  // Get icon for command based on its label
  const getCommandIcon = useCallback((label: string): Icon => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("power")) return Icon.Power;
    if (lowerLabel.includes("volume")) return Icon.SpeakerHigh;
    if (lowerLabel.includes("mute")) return Icon.SpeakerOff;
    if (lowerLabel.includes("play")) return Icon.Play;
    if (lowerLabel.includes("pause")) return Icon.Pause;
    if (lowerLabel.includes("stop")) return Icon.Stop;
    if (lowerLabel.includes("forward")) return Icon.Forward;
    if (lowerLabel.includes("back")) return Icon.Rewind;
    if (lowerLabel.includes("input")) return Icon.Link;
    if (lowerLabel.includes("menu")) return Icon.List;
    if (lowerLabel.includes("up")) return Icon.ArrowUp;
    if (lowerLabel.includes("down")) return Icon.ArrowDown;
    if (lowerLabel.includes("left")) return Icon.ArrowLeft;
    if (lowerLabel.includes("right")) return Icon.ArrowRight;
    if (lowerLabel.includes("select") || lowerLabel.includes("enter") || lowerLabel.includes("ok")) return Icon.Return;
    return Icon.Circle;
  }, []);

  // Show error state if there's an error
  if (error) {
    return (
      <FeedbackState
        title="Error"
        description={error.message}
        icon={{ source: Icon.ExclamationMark }}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }

  // Show hub selection if no hub is selected
  if (!selectedHub) {
    return (
      <List
        searchBarPlaceholder="Search hubs..."
        isLoading={loadingState.stage === "DISCOVERING"}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        {hubs.length > 0 ? (
          // Show found hubs even while discovering
          hubs
            .filter(hub => 
              searchText ? 
                hub.name.toLowerCase().includes(searchText.toLowerCase()) || 
                hub.ip.includes(searchText)
              : true
            )
            .map((hub) => (
              <List.Item
                key={hub.id}
                title={hub.name}
                subtitle={`${hub.ip} - ${hub.version || "Unknown Version"}`}
                icon={Icon.Wifi}
                actions={
                  <ActionPanel>
                    <Action
                      title="Connect"
                      icon={Icon.Link}
                      onAction={() => connect(hub)}
                    />
                  </ActionPanel>
                }
              />
            ))
        ) : loadingState.stage === "DISCOVERING" ? (
          <List.EmptyView
            icon={Icon.CircleProgress}
            title={loadingState.message || "Discovering Hubs"}
            description="Searching your network for Harmony Hubs..."
          />
        ) : loadingState.stage === "ERROR" ? (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title={loadingState.message || "Error"}
            description="Failed to discover Harmony Hubs. Please try again."
            actions={
              <ActionPanel>
                <Action title="Retry" onAction={refresh} />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView
            icon={Icon.XmarkCircle}
            title="No Hubs Found"
            description="No Harmony Hubs were found on your network."
            actions={
              <ActionPanel>
                <Action title="Search Again" onAction={refresh} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  // Show loading state while connecting or loading data
  if (loadingState.stage !== "complete") {
    return (
      <FeedbackState
        title={loadingState.message}
        description={`${Math.round(loadingState.progress * 100)}%`}
        icon={{ source: Icon.CircleProgress }}
      />
    );
  }

  // Show main control view
  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${view}...`}
      navigationTitle={selectedHub.name}
      isLoading={loadingState.stage === "loading"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={view}
          onChange={(newView) => {
            setView(newView as "activities" | "devices");
            resetSearch();
          }}
        >
          <List.Dropdown.Item title="Activities" value="activities" icon={Icon.PlayCircle} />
          <List.Dropdown.Item title="Devices" value="devices" icon={Icon.TV} />
        </List.Dropdown>
      }
    >
      {view === "activities" ? (
        activities.length === 0 ? (
          <List.EmptyView
            icon={Icon.QuestionMark}
            title="No Activities"
            description="No activities found for this hub"
          />
        ) : (
          activities.map((activity) => (
            <List.Item
              key={activity.id}
              title={activity.name}
              icon={Icon.PlayCircle}
              accessories={[
                { text: activity.isAVActivity ? "AV Activity" : "Activity" },
                currentActivity?.id === activity.id ? { icon: Icon.Checkmark } : null,
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Activity"
                    icon={Icon.Play}
                    onAction={() => startActivity(activity)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title="Switch to Devices"
                    icon={Icon.TV}
                    onAction={() => setView("devices")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                  <Action
                    title="Disconnect"
                    icon={Icon.Disconnect}
                    onAction={disconnect}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))
        )
      ) : devices.length === 0 ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Devices"
          description={searchText ? "Try a different search term" : "No devices found for this hub"}
        />
      ) : (
        devices.map((device) => (
          <List.Item
            key={device.id}
            title={device.name}
            subtitle={`${device.type} - ${device.commands.length} commands`}
            icon={Icon.TV}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Commands"
                    icon={Icon.List}
                    target={
                      <List navigationTitle={`${device.name} Commands`}>
                        {device.commands.map((command) => (
                          <List.Item
                            key={command.name}
                            title={command.label}
                            icon={getCommandIcon(command.label)}
                            actions={
                              <ActionPanel>
                                <Action
                                  title={`Execute ${command.label}`}
                                  icon={getCommandIcon(command.label)}
                                  onAction={() => executeCommand(device.id, command.name)}
                                />
                              </ActionPanel>
                            }
                          />
                        ))}
                      </List>
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Switch to Activities"
                    icon={Icon.PlayCircle}
                    onAction={() => setView("activities")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="Disconnect"
                    icon={Icon.Disconnect}
                    onAction={disconnect}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
