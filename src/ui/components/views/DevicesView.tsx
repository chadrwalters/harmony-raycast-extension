import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { memo, useCallback, useMemo, useState } from "react";
import { HarmonyDevice, HarmonyCommand, LoadingState, HarmonyStage } from "../../../types/core/harmony";
import { HarmonyError } from "../../../types/core/errors";
import { FeedbackState } from "../FeedbackState";
import { Logger } from "../../../services/logger";
import { useViewStore } from "../../../stores/view";
import { View } from "../../../types/core/views";

interface DevicesViewProps {
  devices: HarmonyDevice[];
  loadingState: LoadingState | null;
  error: HarmonyError | null;
  onExecuteCommand: (command: HarmonyCommand) => void;
  onRefresh: () => void;
  onClearCache: () => void;
  onReconnect: () => void;
}

interface DeviceListItemProps {
  device: HarmonyDevice;
  searchText: string;
  onSelectDevice: (device: HarmonyDevice) => void;
  onRefresh: () => void;
  onClearCache: () => void;
  onReconnect: () => void;
}

const DeviceListItem = memo(({ 
  device, 
  searchText, 
  onSelectDevice, 
  onRefresh, 
  onClearCache, 
  onReconnect 
}: DeviceListItemProps) => {
  return (
    <List.Item
      key={device.id}
      id={device.id}
      title={device.name}
      subtitle={`${device.commands.length} commands`}
      icon={Icon.Devices}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Commands"
              icon={Icon.Terminal}
              onAction={() => onSelectDevice(device)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Switch to Activities"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => useViewStore.getState().changeView(View.ACTIVITIES)}
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
  );
});

function DevicesViewImpl({
  devices,
  loadingState,
  error,
  onExecuteCommand,
  onRefresh,
  onClearCache,
  onReconnect,
}: DevicesViewProps) {
  const [searchText, setSearchText] = useState("");
  const viewStore = useViewStore();

  const handleSelectDevice = useCallback((device: HarmonyDevice) => {
    Logger.debug("Selected device", { device });
    viewStore.selectDevice(device);
    setTimeout(() => {
      viewStore.changeView(View.DEVICE_DETAIL);
    }, 0);
  }, [viewStore]);

  // Memoize filtered devices to prevent unnecessary recalculations
  const filteredDevices = useMemo(() => {
    if (!searchText) return devices;
    
    const lowerSearch = searchText.toLowerCase();
    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(lowerSearch) ||
        device.type.toLowerCase().includes(lowerSearch) ||
        device.commands.some((cmd) => cmd.label.toLowerCase().includes(lowerSearch))
    );
  }, [devices, searchText]);

  // Group devices by type for better organization
  const devicesByType = useMemo(() => {
    const groups = new Map<string, HarmonyDevice[]>();
    filteredDevices.forEach((device) => {
      const type = device.type || "Other";
      const devices = groups.get(type) || [];
      devices.push(device);
      groups.set(type, devices);
    });
    return groups;
  }, [filteredDevices]);

  // Show error state if there's an error
  if (error) {
    return (
      <FeedbackState
        title="Device Loading Error"
        description="Unable to load devices from the Harmony Hub"
        icon={Icon.ExclamationMark}
        error={error}
        onRetry={onRefresh}
        onClearCache={onClearCache}
        onReconnect={onReconnect}
      />
    );
  }

  // Show loading state while loading devices
  if (loadingState?.stage === HarmonyStage.LOADING_DEVICES || 
      loadingState?.stage === HarmonyStage.LOADING_ACTIVITIES) {
    return (
      <FeedbackState
        title="Loading Devices"
        description={loadingState.message}
        icon={Icon.CircleProgress}
      />
    );
  }

  // Show empty state if no devices found
  if (!devices.length) {
    return (
      <FeedbackState
        title="No Devices Found"
        description="No devices are configured on this Harmony Hub"
        icon={Icon.XMarkCircle}
        onRetry={onRefresh}
        onClearCache={onClearCache}
      />
    );
  }

  Logger.debug("Rendering devices list", {
    totalDevices: devices.length,
    filteredCount: filteredDevices.length,
    deviceTypes: Array.from(devicesByType.keys())
  });

  return (
    <List
      navigationTitle="Harmony Devices"
      searchBarPlaceholder="Search devices..."
      onSearchTextChange={setSearchText}
    >
      {Array.from(devicesByType.entries()).map(([type, devices]) => (
        <List.Section key={type} title={type}>
          {devices.map((device) => (
            <DeviceListItem
              key={device.id}
              device={device}
              searchText={searchText}
              onSelectDevice={handleSelectDevice}
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

export const DevicesView = memo(DevicesViewImpl); 