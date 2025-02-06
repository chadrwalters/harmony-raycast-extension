import React, { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, showToast, Toast, open } from "@raycast/api";
import { ErrorHandler } from "../lib/errorHandler";
import { HarmonyHub, HarmonyActivity, HarmonyDevice, HarmonyCommand } from "../types/harmony";
import { ErrorCategory } from "../types/error";
import { HarmonyManager } from "../lib/harmonyClient";
import { Logger } from "../lib/logger";

interface State {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  activities: HarmonyActivity[];
  devices: HarmonyDevice[];
  selectedDevice: HarmonyDevice | null;
  commands: HarmonyCommand[];
  isLoading: boolean;
  error: Error | null;
  view: "hubs" | "activities" | "devices" | "commands";
}

export default function HarmonyCommand() {
  const [state, setState] = useState<State>({
    hubs: [],
    selectedHub: null,
    activities: [],
    devices: [],
    selectedDevice: null,
    commands: [],
    isLoading: false,
    error: null,
    view: "hubs",
  });

  useEffect(() => {
    loadHubs();
    return () => {
      // Cleanup on unmount
      HarmonyManager.getInstance().disconnect().catch(console.error);
    };
  }, []);

  const loadHubs = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const manager = HarmonyManager.getInstance();

      // Try to load from cache first
      const cachedData = await manager.loadCachedHubData();
      if (cachedData) {
        Logger.info("Using cached hub data");
        setState((prev) => ({
          ...prev,
          hubs: [cachedData.hub],
          isLoading: false,
        }));
        return;
      }

      // If no cache, discover hubs
      Logger.info("No cache found, discovering hubs");
      const hubs = await manager.discoverHubs();
      setState((prev) => ({
        ...prev,
        hubs,
        isLoading: false,
        view: "hubs",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  };

  const loadActivities = async (hub: HarmonyHub) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const manager = HarmonyManager.getInstance();

      // Always connect first
      Logger.info("Connecting to hub:", hub.name);
      await manager.connect(hub);

      // Try to load from cache first
      const cachedData = await manager.loadCachedHubData();
      if (cachedData && cachedData.hub.id === hub.id) {
        Logger.info("Using cached hub data");
        setState((prev) => ({
          ...prev,
          activities: cachedData.activities,
          devices: cachedData.devices,
          selectedHub: hub,
          isLoading: false,
          view: "activities",
        }));
        return;
      }

      // If no cache or different hub, fetch fresh data
      Logger.info("No cache found or different hub, fetching fresh data");
      const activities = await manager.getActivities();
      Logger.info("Got activities:", activities);

      const devices = await manager.getDevices();
      Logger.info("Got devices:", devices);

      // Cache the data
      await manager.cacheHubData(hub);

      setState((prev) => ({
        ...prev,
        selectedHub: hub,
        activities: activities || [],
        devices: devices || [],
        isLoading: false,
        view: "activities",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  };

  const loadCommands = async (device: HarmonyDevice) => {
    setState((prev) => ({
      ...prev,
      selectedDevice: device,
      commands: device.commands || [],
      view: "commands",
    }));
  };

  const startActivity = async (activity: HarmonyActivity) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const manager = HarmonyManager.getInstance();
      await manager.startActivity(activity.id);
      setState((prev) => ({ ...prev, isLoading: false }));
      await showToast({
        style: Toast.Style.Success,
        title: `Started ${activity.label}`,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  };

  const executeCommand = async (command: HarmonyCommand) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const manager = HarmonyManager.getInstance();

      // Show executing toast
      await showToast({
        style: Toast.Style.Animated,
        title: `Executing ${command.label}...`,
      });

      // Execute the command exactly as received from the Hub
      await manager.executeCommand(command.deviceId, command.id);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: `Successfully executed ${command.label}`,
      });

      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));

      // Show appropriate error message based on error type
      const errorMessage = error.message || "Unknown error occurred";
      let title = "Command Execution Failed";
      let message = errorMessage;

      if (errorMessage.includes("Not connected")) {
        title = "Connection Error";
        message = "Lost connection to hub. Please try selecting the hub again.";
      } else if (errorMessage.includes("after 3 attempts")) {
        title = "Command Failed";
        message = "Command failed after multiple attempts. Please try again.";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: title,
        message: message,
      });

      await ErrorHandler.handleError(error as Error, ErrorCategory.COMMAND_EXECUTION);
    }
  };

  if (state.error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Occurred"
          description={state.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={loadHubs} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state.isLoading) {
    return (
      <List>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading..." />
      </List>
    );
  }

  if (state.view === "hubs") {
    return (
      <List>
        {state.hubs.length === 0 ? (
          <List.EmptyView
            icon={Icon.Wifi}
            title="No Hubs Found"
            description="Make sure your Harmony Hub is connected to the network"
          />
        ) : (
          state.hubs.map((hub) => (
            <List.Item
              key={hub.id}
              title={hub.name}
              subtitle={hub.ip}
              icon={Icon.Wifi}
              actions={
                <ActionPanel>
                  <Action title="Select Hub" onAction={() => loadActivities(hub)} icon={Icon.ArrowRight} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  if (state.view === "activities") {
    return (
      <List
        navigationTitle={`${state.selectedHub?.name} - Activities`}
        searchBarAccessory={
          <List.Dropdown
            tooltip="View"
            value={state.view}
            onChange={(newValue) => setState((prev) => ({ ...prev, view: newValue as "activities" | "devices" }))}
          >
            <List.Dropdown.Item title="Activities" value="activities" />
            <List.Dropdown.Item title="Devices" value="devices" />
          </List.Dropdown>
        }
      >
        {state.activities.map((activity) => (
          <List.Item
            key={activity.id}
            title={activity.label}
            icon={activity.isAVActivity ? Icon.Video : Icon.Star}
            actions={
              <ActionPanel>
                <Action title="Start Activity" onAction={() => startActivity(activity)} icon={Icon.Play} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  if (state.view === "devices") {
    return (
      <List
        navigationTitle={`${state.selectedHub?.name} - Devices`}
        searchBarAccessory={
          <List.Dropdown
            tooltip="View"
            value={state.view}
            onChange={(newValue) => setState((prev) => ({ ...prev, view: newValue as "activities" | "devices" }))}
          >
            <List.Dropdown.Item title="Activities" value="activities" />
            <List.Dropdown.Item title="Devices" value="devices" />
          </List.Dropdown>
        }
      >
        {state.devices.map((device) => {
          let icon = Icon.Tv;
          switch (device.type) {
            case "audio":
              icon = Icon.Speaker;
              break;
            case "streaming":
              icon = Icon.Video;
              break;
            case "game":
              icon = Icon.Gamepad;
              break;
            case "dvd":
              icon = Icon.Circle;
              break;
          }
          return (
            <List.Item
              key={device.id}
              title={device.label}
              icon={icon}
              actions={
                <ActionPanel>
                  <Action title="View Commands" onAction={() => loadCommands(device)} icon={Icon.List} />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  }

  return (
    <List navigationTitle={`${state.selectedHub?.name} - ${state.selectedDevice?.label} Commands`}>
      <List.Section title="Commands">
        {state.commands.map((command) => (
          <List.Item
            key={command.id}
            title={command.label}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action title="Execute Command" icon={Icon.Play} onAction={() => executeCommand(command)} />
                <Action
                  title="Copy Command"
                  icon={Icon.CopyClipboard}
                  onAction={async () => {
                    navigator.clipboard.writeText(command.label);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Command Copied",
                      message: command.label,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
