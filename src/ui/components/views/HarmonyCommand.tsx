import { List, Icon, Action, ActionPanel } from "@raycast/api";
import React, { useEffect, useRef, useCallback } from "react";
import { memo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { Logger } from "../../../services/logger";
import { useViewStore } from "../../../stores/view";
import { HarmonyCommand as HarmonyCommandType, HarmonyDevice, HarmonyActivity } from "../../../types/core/harmony";
import { View } from "../../../types/core/views";

import { ActivitiesView } from "./ActivitiesView";
import { CommandsView } from "./CommandsView";
import { DevicesView } from "./DevicesView";
import { HubsView } from "./HubsView";

interface CommandItemProps {
  command: HarmonyCommandType;
  onExecute: () => void;
  onBack?: () => void;
}

function CommandItemImpl({ command, onExecute, onBack }: CommandItemProps): JSX.Element {
  return (
    <List.Item
      title={command.label}
      subtitle={command.name}
      icon={Icon.Terminal}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Execute Command" icon={Icon.Terminal} onAction={onExecute} />
          </ActionPanel.Section>
          {onBack && (
            <ActionPanel.Section>
              <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

export const CommandItem = memo(CommandItemImpl);

export function HarmonyCommand(): React.ReactElement {
  const {
    hubs,
    selectedHub,
    devices,
    activities,
    currentActivity,
    loadingState,
    error,
    connect,
    refresh,
    executeCommand,
    startActivity,
  } = useHarmony();

  const currentView = useViewStore((state) => state.currentView);
  const selectedDevice = useViewStore((state) => state.selectedDevice);
  const isMounted = useRef(false);
  const viewStore = useViewStore();

  // Start hub discovery on mount
  useEffect(() => {
    if (!isMounted.current) {
      Logger.info("HarmonyCommand mounted, starting refresh");
      refresh();
      isMounted.current = true;
    }
  }, [refresh]);

  // Log state changes
  useEffect(() => {
    Logger.debug("State updated", {
      currentView,
      hubCount: hubs.length,
      selectedHub: selectedHub?.name,
      deviceCount: devices.length,
      activityCount: activities.length,
      loadingState: loadingState?.stage,
      hasError: !!error,
    });
  }, [currentView, hubs, selectedHub, devices, activities, loadingState, error]);

  // Handle view transitions based on state
  useEffect(() => {
    // If we have a selected hub but no devices are showing, switch to hubs view
    if (!selectedHub && currentView !== View.HUBS) {
      Logger.info("No hub selected, switching to hubs view");
      viewStore.changeView(View.HUBS);
      return;
    }

    // If we have a selected hub and devices, switch from hubs view
    if (selectedHub && devices.length > 0 && currentView === View.HUBS) {
      Logger.info("Hub selected with devices, switching from hubs view");
      viewStore.changeView(View.DEVICES); // The view store will handle the preference
    }
  }, [selectedHub, devices.length, currentView, viewStore]);

  // Handle device detail view transitions
  useEffect(() => {
    if (currentView === View.DEVICE_DETAIL && !selectedDevice) {
      Logger.info("No device selected, switching to devices view");
      viewStore.changeView(View.DEVICES);
    }
  }, [currentView, selectedDevice, viewStore]);

  // Handle device selection
  const handleDeviceSelect = useCallback(
    (device: HarmonyDevice) => {
      Logger.debug("Device selected", { device: device.name });
      viewStore.selectDevice(device);
    },
    [viewStore],
  );

  // Handle view rendering based on current view state
  Logger.debug("Rendering view", { currentView });

  switch (currentView) {
    case View.HUBS:
      Logger.info("Rendering HubsView", {
        hubCount: hubs.length,
        selectedHub: selectedHub?.name,
        loadingState: loadingState?.stage,
      });
      return <HubsView onHubSelect={connect} />;

    case View.DEVICES:
      Logger.info("Rendering DevicesView", {
        deviceCount: devices.length,
        loadingState: loadingState?.stage,
      });
      return <DevicesView onDeviceSelect={handleDeviceSelect} />;

    case View.DEVICE_DETAIL:
      if (!selectedDevice) {
        return <DevicesView onDeviceSelect={handleDeviceSelect} />;
      }
      Logger.info("Rendering CommandsView", {
        device: selectedDevice.name,
        commandCount: selectedDevice.commands.length,
      });
      return (
        <CommandsView
          commands={selectedDevice.commands}
          onExecuteCommand={executeCommand}
          onBack={() => viewStore.changeView(View.DEVICES)}
        />
      );

    case View.ACTIVITIES:
      Logger.info("Rendering ActivitiesView", {
        activityCount: activities.length,
        currentActivity: currentActivity?.name,
        loadingState: loadingState?.stage,
      });
      return <ActivitiesView onActivitySelect={(activity: HarmonyActivity) => startActivity(activity.id)} />;

    default:
      Logger.info("Rendering default HubsView", {
        hubCount: hubs.length,
        selectedHub: selectedHub?.name,
        loadingState: loadingState?.stage,
      });
      return <HubsView onHubSelect={connect} />;
  }
}
