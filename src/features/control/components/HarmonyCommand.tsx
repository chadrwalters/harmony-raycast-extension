import React, { useState, useEffect, useCallback } from "react";
import {
  List,
  Icon,
  Action,
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Color
} from "@raycast/api";

// Types
import { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

// Core services
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { useHarmonyContext } from "../context/HarmonyContext";

/**
 * Preferences for the HarmonyCommand component.
 */
interface Preferences {
  /** The default view to display */
  defaultView: "activities" | "devices";
  /** The cache duration in seconds */
  cacheDuration: string;
  /** The network timeout in seconds */
  networkTimeout: string;
  /** Whether to enable debug mode */
  debugMode: boolean;
  /** Whether to auto-retry failed commands */
  autoRetry: boolean;
  /** The maximum number of retries */
  maxRetries: string;
}

/**
 * Props for the HarmonyCommand component.
 */
interface HarmonyCommandProps {
  // No props defined for this component
}

/**
 * HarmonyCommand component is the main component for controlling Harmony devices and activities.
 * It handles device discovery, connection, and command execution.
 *
 * @example
 * ```tsx
 * <HarmonyCommand />
 * ```
 */
export default function HarmonyCommand({}: HarmonyCommandProps) {
  // Get preferences
  const preferences = getPreferenceValues<Preferences>();

  // Get context
  const { hubs, isLoading, error, refreshHubs } = useHarmonyContext();

  // Local state
  const [selectedHub, setSelectedHub] = useState<HarmonyHub | null>(null);
  const [activities, setActivities] = useState<HarmonyActivity[]>([]);
  const [devices, setDevices] = useState<HarmonyDevice[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: "connecting",
    progress: 0,
    message: "Initializing connection..."
  });

  // Load settings and connect to last used hub
  useEffect(() => {
    loadSettings();
  }, []);

  // Load saved settings from storage
  const loadSettings = async () => {
    try {
      Logger.info("Loading settings...");
      const lastHubId = await LocalStorage.getItem("lastHubId");
      
      if (lastHubId) {
        Logger.info(`Found last hub ID: ${lastHubId}`);
        const hub = hubs.find(h => h.id === lastHubId);
        if (hub) {
          Logger.info(`Found matching hub: ${hub.name}`);
          await connectToHub(hub);
        } else {
          Logger.info(`No matching hub found for ID: ${lastHubId}`);
        }
      } else {
        Logger.info("No last hub ID found");
      }
    } catch (error) {
      Logger.error("Failed to load settings:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load settings",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Connect to a hub
  const connectToHub = async (hub: HarmonyHub) => {
    try {
      Logger.info(`Connecting to hub: ${hub.name} (${hub.ip})`);
      setIsConnecting(true);
      setConnectionError(null);
      setLoadingState({
        stage: "connecting",
        progress: 0.25,
        message: `Connecting to ${hub.name}...`
      });

      const manager = HarmonyManager.getInstance();
      await manager.connect(hub);
      
      setLoadingState({
        stage: "loading-activities",
        progress: 0.5,
        message: "Loading activities..."
      });
      const hubActivities = await manager.getActivities();
      
      setLoadingState({
        stage: "loading-devices",
        progress: 0.75,
        message: "Loading devices..."
      });
      const hubDevices = await manager.getDevices();

      // Save the last used hub ID
      await LocalStorage.setItem("lastHubId", hub.id);
      
      setSelectedHub(hub);
      setActivities(hubActivities);
      setDevices(hubDevices);
      
      Logger.info(`Successfully connected to ${hub.name}`);
      Logger.info(`Found ${hubActivities.length} activities and ${hubDevices.length} devices`);

      setLoadingState({
        stage: "complete",
        progress: 1,
        message: "Ready!"
      });

      showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: `Connected to ${hub.name}`
      });
    } catch (error) {
      Logger.error("Failed to connect to hub:", error);
      setConnectionError(error as Error);
      setLoadingState({
        stage: "complete",
        progress: 1,
        message: "Connection failed"
      });
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Validate and filter commands to ensure they have required properties
  const getValidCommands = (device: HarmonyDevice) => {
    if (!device.commands || !Array.isArray(device.commands)) {
      Logger.warn(`No valid commands found for device ${device.label}`);
      return [];
    }
    return device.commands.filter(cmd => {
      if (!cmd || !cmd.name || !cmd.label) {
        Logger.warn(`Invalid command found for device ${device.label}:`, cmd);
        return false;
      }
      return true;
    });
  };

  // Generate a unique key for a command
  const getCommandKey = (deviceId: string, command: { name: string; label: string }) => {
    return `${deviceId}-${command.name || 'unknown'}-${command.label || 'unlabeled'}`;
  };

  // Execute a command on a device
  const executeCommand = async (device: HarmonyDevice, command: string) => {
    try {
      Logger.info(`Executing command '${command}' on device: ${device.label} (${device.id})`);
      const manager = HarmonyManager.getInstance();
      
      // Verify the command exists
      const validCommand = device.commands.find(cmd => cmd.name === command && cmd.label);
      if (!validCommand) {
        throw new Error(`Command '${command}' not found or invalid for device ${device.label}`);
      }
      
      Logger.debug("Device commands:", device.commands);
      Logger.info(`Found command: ${validCommand.label} (${validCommand.name})`);
      await manager.executeCommand(device.id, command);
      
      showToast({
        style: Toast.Style.Success,
        title: "Command Executed",
        message: `${validCommand.label} on ${device.label}`
      });
    } catch (error) {
      Logger.error("Failed to execute command:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Start an activity
  const startActivity = async (activity: HarmonyActivity) => {
    try {
      Logger.info(`Starting activity: ${activity.label}`);
      const manager = HarmonyManager.getInstance();
      await manager.startActivity(activity.id);
      
      showToast({
        style: Toast.Style.Success,
        title: "Activity Started",
        message: `Started ${activity.label}`
      });
    } catch (error) {
      Logger.error(`Failed to start activity: ${activity.label}`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Activity Failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const getCommandIcon = (label: string) => {
    if (label.toLowerCase().includes("power")) {
      return Icon.Power;
    } else if (label.toLowerCase().includes("volume")) {
      return Icon.Volume;
    } else {
      return Icon.Terminal;
    }
  };

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
          title="Discovering Harmony Hubs"
          description="Scanning your network for Harmony Hubs..."
        />
      </List>
    );
  }

  if (isConnecting) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
          title={loadingState.message}
          description={`${Math.round(loadingState.progress * 100)}% Complete`}
        />
      </List>
    );
  }

  if (error || connectionError) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error?.message || connectionError?.message || "Unknown error occurred"}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => error ? refreshHubs() : selectedHub && connectToHub(selectedHub)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Render no hubs found state
  if (hubs.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Hubs Found"
          description="Make sure your Harmony Hub is powered on and connected to your network"
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={refreshHubs}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Render hub selection
  if (!selectedHub) {
    return (
      <List>
        {hubs.map((hub) => (
          <List.Item
            key={hub.id}
            title={hub.name}
            subtitle={hub.ip}
            icon={Icon.Wifi}
            accessories={[{ text: hub.version || "Unknown Version" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Connect"
                  onAction={() => connectToHub(hub)}
                  icon={Icon.Link}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Render the main list
  return (
    <List
      navigationTitle={`Harmony Control${selectedHub ? ` - ${selectedHub.name}` : ''}`}
      searchBarPlaceholder="Search commands..."
    >
      {selectedHub ? (
        <>
          {devices.map((device) => (
            <List.Item
              key={device.id}
              icon={Icon.TV}
              title={device.label}
              subtitle={`${device.commands.length} commands available`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Commands"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      target={
                        <List navigationTitle={`Commands - ${device.label}`}>
                          {getValidCommands(device).map((command) => (
                            <List.Item
                              key={getCommandKey(device.id, command)}
                              icon={getCommandIcon(command.label)}
                              title={command.label}
                              subtitle={command.name}
                              actions={
                                <ActionPanel>
                                  <ActionPanel.Section>
                                    <Action
                                      title="Execute Command"
                                      onAction={() => executeCommand(device, command.name)}
                                      icon={Icon.Terminal}
                                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                                    />
                                  </ActionPanel.Section>
                                </ActionPanel>
                              }
                            />
                          ))}
                        </List>
                      }
                    />
                    <Action.Push
                      title="Switch to Activities"
                      icon={Icon.Switch}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      target={
                        <List navigationTitle="Activities">
                          {activities.map((activity) => (
                            <List.Item
                              key={activity.id}
                              icon={Icon.PlayCircle}
                              title={activity.label}
                              actions={
                                <ActionPanel>
                                  <Action
                                    title="Start Activity"
                                    onAction={() => startActivity(activity)}
                                    icon={Icon.Play}
                                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                                  />
                                  <Action.Push
                                    title="Back to Devices"
                                    icon={Icon.ArrowLeft}
                                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                                    target={
                                      <List navigationTitle="Devices">
                                        {devices.map((device) => (
                                          <List.Item
                                            key={device.id}
                                            icon={Icon.TV}
                                            title={device.label}
                                            subtitle={`${device.commands.length} commands available`}
                                            actions={
                                              <ActionPanel>
                                                <Action.Push
                                                  title="View Commands"
                                                  icon={Icon.List}
                                                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                                                  target={
                                                    <List navigationTitle={`Commands - ${device.label}`}>
                                                      {getValidCommands(device).map((command) => (
                                                        <List.Item
                                                          key={getCommandKey(device.id, command)}
                                                          icon={getCommandIcon(command.label)}
                                                          title={command.label}
                                                          subtitle={command.name}
                                                          actions={
                                                            <ActionPanel>
                                                              <Action
                                                                title="Execute Command"
                                                                onAction={() => executeCommand(device, command.name)}
                                                                icon={Icon.Terminal}
                                                                shortcut={{ modifiers: ["cmd"], key: "return" }}
                                                              />
                                                            </ActionPanel>
                                                          }
                                                        />
                                                      ))}
                                                    </List>
                                                  }
                                                />
                                              </ActionPanel>
                                            }
                                          />
                                        ))}
                                      </List>
                                    }
                                  />
                                </ActionPanel>
                              }
                            />
                          ))}
                        </List>
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        hubs.map((hub) => (
          <List.Item
            key={hub.id}
            icon={Icon.Globe}
            title={hub.name}
            subtitle={`${hub.ip}:${hub.port}`}
            actions={
              <ActionPanel>
                <Action
                  key={`connect-${hub.id}`}
                  title="Connect"
                  onAction={() => connectToHub(hub)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

type LoadingState = {
  stage: "connecting" | "loading-activities" | "loading-devices" | "complete";
  progress: number;
  message: string;
};
