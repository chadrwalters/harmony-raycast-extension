import React, { useState, useEffect, useCallback } from "react";
import {
  List,
  Icon,
  Action,
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";

// Types
import { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

// Core services
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { useHarmonyContext } from "../context/HarmonyContext";

interface Preferences {
  defaultView: "activities" | "devices";
}

const DISCOVERY_TIMEOUT = 30000; // 30 seconds
const GRACE_PERIOD = 10000; // 10 seconds

/**
 * HarmonyCommand Component
 * 
 * Main component for controlling Harmony devices and activities.
 * Handles device discovery, connection, and command execution.
 */
export default function HarmonyCommand() {
  const { hubs, isLoading, error, refreshHubs } = useHarmonyContext();
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const preferences = getPreferenceValues<Preferences>();
  const [localState, setLocalState] = useState({
    selectedHub: null as HarmonyHub | null,
    activities: [] as HarmonyActivity[],
    devices: [] as HarmonyDevice[],
    selectedDevice: null as HarmonyDevice | null,
    commands: [] as any[],
    isLoading: false,
    view: preferences.defaultView,
  });

  // Group commands by their group for better organization
  const getGroupedCommands = (device: HarmonyDevice) => {
    const groups: { [key: string]: Array<{ id: string; label: string }> } = {};
    
    if (!device.commands) {
      Logger.debug(`No commands found for device ${device.label}`);
      return groups;
    }

    Logger.debug(`Grouping ${device.commands.length} commands for device ${device.label}`);
    
    device.commands.forEach(command => {
      const group = command.group || "Other";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push({
        id: command.id,
        label: command.label
      });
      Logger.debug(`Added command ${command.label} to group ${group}`);
    });
    
    return groups;
  };

  // Send a command to a device
  const sendCommand = async (deviceId: string, commandId: string) => {
    try {
      Logger.info(`Sending command ${commandId} to device ${deviceId}`);
      const manager = HarmonyManager.getInstance();
      await manager.executeCommand(deviceId, commandId);
    } catch (error) {
      Logger.error("Error sending command:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Sending Command",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Handle rescan button
  const handleRescan = useCallback(async (forceRefresh = false) => {
    try {
      Logger.info("Starting rescan...");
      setDiscoveryProgress(0);
      if (forceRefresh) {
        await HarmonyManager.getInstance().clearCache();
      }
      await refreshHubs();
    } catch (error) {
      Logger.error("Error rescanning:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Scanning",
        message: "Failed to scan for hubs. Please try again."
      });
    }
  }, [refreshHubs]);

  // Start an activity
  const startActivity = async (activity: HarmonyActivity) => {
    try {
      Logger.info("Starting activity:", activity);
      const manager = HarmonyManager.getInstance();
      await manager.startActivity(activity.id);
      showToast({
        style: Toast.Style.Success,
        title: "Activity Started",
        message: `Successfully started ${activity.label}`
      });
    } catch (error) {
      Logger.error("Error starting activity:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Starting Activity",
        message: "Failed to start activity. Please try again."
      });
    }
  };

  // Load activities and devices for a hub
  const loadActivities = async (hub: HarmonyHub) => {
    try {
      Logger.info("Loading activities for hub:", hub);
      setLocalState(prev => ({ ...prev, isLoading: true }));

      const manager = HarmonyManager.getInstance();
      await manager.connect(hub);

      const cachedData = await manager.loadCachedHubData();
      if (cachedData && cachedData.hub.id === hub.id) {
        Logger.info("Using cached hub data");
        setLocalState(prev => ({
          ...prev,
          selectedHub: hub,
          activities: cachedData.activities,
          devices: cachedData.devices,
          isLoading: false,
        }));
        return;
      }

      Logger.info("Loading fresh hub data");
      const [activities, devices] = await Promise.all([
        manager.getActivities(),
        manager.getDevices(),
      ]);

      Logger.info("Got activities:", activities);
      Logger.info("Got devices:", devices);

      setLocalState(prev => ({
        ...prev,
        selectedHub: hub,
        activities,
        devices,
        isLoading: false,
      }));
    } catch (error) {
      Logger.error("Error loading activities:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Activities",
        message: "Failed to load activities. Please try again."
      });
      setLocalState(prev => ({ 
        ...prev, 
        selectedHub: null,
        isLoading: false 
      }));
    }
  };

  // Toggle between activities and devices view
  const toggleView = () => {
    setLocalState(prev => ({
      ...prev,
      view: prev.view === "activities" ? "devices" : "activities"
    }));
  };

  // Effect to update discovery progress
  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / DISCOVERY_TIMEOUT) * 100, 100);
        setDiscoveryProgress(progress);
        
        if (elapsed >= DISCOVERY_TIMEOUT + GRACE_PERIOD) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setDiscoveryProgress(100);
    }
  }, [isLoading]);

  // Render the list of hubs, activities, or devices
  return (
    <List
      isLoading={isLoading || localState.isLoading}
      searchBarPlaceholder={
        !localState.selectedHub 
          ? isLoading 
            ? "Searching for Harmony Hubs..." 
            : "Search Hubs..."
          : localState.view === "activities"
            ? "Search Activities..."
            : "Search Devices..."
      }
      navigationTitle={
        !localState.selectedHub
          ? "Harmony Hubs"
          : localState.view === "activities"
            ? "Activities"
            : "Devices"
      }
    >
      {!localState.selectedHub ? (
        // Show hubs
        hubs.length === 0 ? (
          <List.EmptyView
            icon={Icon.WifiDisabled}
            title={`Searching for Harmony Hubs (${Math.round(discoveryProgress)}%)`}
            description={
              isLoading
                ? "This may take up to 40 seconds..."
                : "Make sure your Harmony Hub is powered on and connected to the same network"
            }
            actions={
              <ActionPanel>
                <Action
                  title="Rescan"
                  icon={Icon.ArrowClockwise}
                  onAction={() => handleRescan(true)}
                />
              </ActionPanel>
            }
          />
        ) : (
          hubs.map((hub) => (
            <List.Item
              key={hub.id}
              icon={Icon.Wifi}
              title={hub.name || "Unknown Hub"}
              subtitle={`IP: ${hub.ip}`}
              accessories={[{ text: hub.version ? `v${hub.version}` : undefined }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Hub"
                    onAction={() => loadActivities(hub)}
                  />
                  <Action
                    title="Rescan"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleRescan(true)}
                  />
                </ActionPanel>
              }
            />
          ))
        )
      ) : localState.view === "activities" ? (
        // Show activities
        localState.activities.length === 0 ? (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="No Activities Found"
            description="No activities are configured for this hub"
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Devices"
                  icon={Icon.Tv}
                  onAction={toggleView}
                />
                <Action
                  title="Back to Hubs"
                  icon={Icon.ArrowLeft}
                  onAction={() => setLocalState(prev => ({ ...prev, selectedHub: null, activities: [], devices: [] }))}
                />
              </ActionPanel>
            }
          />
        ) : (
          localState.activities.map((activity) => (
            <List.Item
              key={activity.id}
              icon={Icon.PlayCircle}
              title={activity.label}
              subtitle={activity.type}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Activity"
                    onAction={() => startActivity(activity)}
                  />
                  <Action
                    title="Switch to Devices"
                    icon={Icon.Tv}
                    onAction={toggleView}
                  />
                  <Action
                    title="Back to Hubs"
                    icon={Icon.ArrowLeft}
                    onAction={() => setLocalState(prev => ({ ...prev, selectedHub: null, activities: [], devices: [] }))}
                  />
                </ActionPanel>
              }
            />
          ))
        )
      ) : (
        // Show devices
        localState.devices.length === 0 ? (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="No Devices Found"
            description="No devices are configured for this hub"
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Activities"
                  icon={Icon.PlayCircle}
                  onAction={toggleView}
                />
                <Action
                  title="Back to Hubs"
                  icon={Icon.ArrowLeft}
                  onAction={() => setLocalState(prev => ({ ...prev, selectedHub: null, activities: [], devices: [] }))}
                />
              </ActionPanel>
            }
          />
        ) : (
          localState.devices.map((device) => {
            const commandGroups = getGroupedCommands(device);
            const hasCommands = Object.keys(commandGroups).length > 0;

            if (!hasCommands) {
              Logger.debug(`No commands found for device ${device.label}`);
              return null;
            }

            return (
              <List.Item
                key={device.id}
                icon={device.type === "StereoReceiver" ? Icon.Speaker : Icon.Tv}
                title={device.label}
                subtitle={device.type}
                actions={
                  <ActionPanel>
                    {Object.entries(commandGroups).map(([group, commands]) => (
                      <ActionPanel.Submenu
                        key={group}
                        title={group}
                      >
                        {commands.map(command => (
                          <Action
                            key={command.id}
                            title={command.label}
                            onAction={() => sendCommand(device.id, command.id)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    ))}
                    <Action
                      title="Switch to Activities"
                      icon={Icon.PlayCircle}
                      onAction={toggleView}
                    />
                    <Action
                      title="Back to Hubs"
                      icon={Icon.ArrowLeft}
                      onAction={() => setLocalState(prev => ({ ...prev, selectedHub: null, activities: [], devices: [] }))}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )
      )}
    </List>
  );
}
