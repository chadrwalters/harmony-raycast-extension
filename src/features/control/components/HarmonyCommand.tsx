import React, { useState, useEffect } from "react";
import {
  List,
  Icon,
  Action,
  ActionPanel,
  showToast,
  Toast,
  open,
} from "@raycast/api";

// Types
import { HarmonyHub, HarmonyActivity, HarmonyDevice, HarmonyCommand } from "../types/harmony";
import { ErrorCategory } from "../../../core/types/error";

// Core services
import { ErrorHandler } from "../../../core/logging/errorHandler";
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { useHarmony } from "../hooks/useHarmony";

/**
 * HarmonyCommand Component
 * 
 * Main component for controlling Harmony devices and activities.
 * Handles device discovery, connection, and command execution.
 */
export default function HarmonyCommand() {
  const { executeCommand: executeHarmonyCommand } = useHarmony();
  const [state, setState] = useState({
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

      // Show executing toast
      await showToast({
        style: Toast.Style.Animated,
        title: `Executing ${command.label}...`,
      });

      // Execute the command using the useHarmony hook
      await executeHarmonyCommand(command.deviceId, command.id);

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
      } else if (errorMessage.includes("timeout")) {
        title = "Command Timeout";
        message = "Command took too long to execute. Please try again.";
      }

      await showToast({
        style: Toast.Style.Failure,
        title: title,
        message: message,
      });

      await ErrorHandler.handleError(error as Error, ErrorCategory.COMMAND_EXECUTION);
    }
  };

  const renderHubs = () => {
    return state.hubs.map((hub) => (
      <List.Item
        key={hub.id}
        title={hub.name || "Unknown Hub"}
        subtitle={hub.ip}
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action title="Select Hub" onAction={() => loadActivities(hub)} />
          </ActionPanel>
        }
      />
    ));
  };

  const renderActivities = () => {
    return state.activities.map((activity) => (
      <List.Item
        key={activity.id}
        title={activity.label || "Unknown Activity"}
        icon={activity.isAVActivity ? Icon.Video : Icon.Star}
        actions={
          <ActionPanel>
            <Action title="Start Activity" onAction={() => startActivity(activity)} />
            <Action
              title="View Devices"
              icon={Icon.Tv}
              onAction={() => setState(prev => ({ ...prev, view: "devices" }))}
            />
          </ActionPanel>
        }
      />
    ));
  };

  const renderDevices = () => {
    return state.devices.map((device) => {
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
          title={device.label || "Unknown Device"}
          icon={icon}
          actions={
            <ActionPanel>
              <Action title="View Commands" onAction={() => loadCommands(device)} />
              <Action
                title="View Activities"
                icon={Icon.Star}
                onAction={() => setState(prev => ({ ...prev, view: "activities" }))}
              />
            </ActionPanel>
          }
        />
      );
    });
  };

  const renderCommands = () => {
    return state.commands.map((command) => (
      <List.Item
        key={command.id}
        title={command.label || "Unknown Command"}
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
    ));
  };

  const getSearchPlaceholder = () => {
    switch (state.view) {
      case "hubs":
        return "Search for hubs";
      case "activities":
        return "Search for activities";
      case "devices":
        return "Search for devices";
      case "commands":
        return "Search for commands";
      default:
        return "";
    }
  };

  const getNavigationTitle = () => {
    switch (state.view) {
      case "hubs":
        return "Hubs";
      case "activities":
        return `${state.selectedHub?.name} - Activities`;
      case "devices":
        return `${state.selectedHub?.name} - Devices`;
      case "commands":
        return `${state.selectedHub?.name} - ${state.selectedDevice?.label} Commands`;
      default:
        return "";
    }
  };

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder={getSearchPlaceholder()}
      navigationTitle={getNavigationTitle()}
      searchBarAccessory={
        state.view === "activities" || state.view === "devices" ? (
          <List.Dropdown
            tooltip="Switch View"
            value={state.view}
            onChange={(newView) => setState((prev) => ({ ...prev, view: newView }))}
          >
            <List.Dropdown.Item title="Activities" value="activities" icon={Icon.Star} />
            <List.Dropdown.Item title="Devices" value="devices" icon={Icon.Tv} />
          </List.Dropdown>
        ) : null
      }
    >
      {state.error ? (
        <List.Item
          key="error"
          title="Error"
          subtitle={state.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Try Again" onAction={loadHubs} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : state.view === "hubs" ? (
        renderHubs()
      ) : state.view === "activities" ? (
        renderActivities()
      ) : state.view === "devices" ? (
        renderDevices()
      ) : (
        renderCommands()
      )}
    </List>
  );
}
