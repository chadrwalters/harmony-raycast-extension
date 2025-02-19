import React, { useEffect, useRef } from "react";
import { useHarmony } from "../../../hooks/useHarmony";
import { useViewStore } from "../../../stores/view";
import { View } from "../../../types/core/views";
import { HarmonyError } from "../../../types/core/errors";
import { HubsView } from "./HubsView";
import { DevicesView } from "./DevicesView";
import { ActivitiesView } from "./ActivitiesView";
import { CommandsView } from "./CommandsView";
import { Logger } from "../../../services/logger";

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
    disconnect,
    refresh,
    executeCommand,
    clearCache,
    startActivity,
    stopActivity,
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
      hasError: !!error
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

  // Handle view rendering based on current view state
  Logger.debug("Rendering view", { currentView });
  
  switch (currentView) {
    case View.HUBS:
      Logger.info("Rendering HubsView", {
        hubCount: hubs.length,
        selectedHub: selectedHub?.name,
        loadingState: loadingState?.stage
      });
      return (
        <HubsView
          hubs={hubs}
          selectedHub={selectedHub}
          loadingState={loadingState}
          error={error}
          onSelectHub={connect}
          onRefresh={refresh}
          onClearCache={clearCache}
        />
      );

    case View.DEVICES:
      Logger.info("Rendering DevicesView", {
        deviceCount: devices.length,
        loadingState: loadingState?.stage
      });
      return (
        <DevicesView
          devices={devices}
          loadingState={loadingState}
          error={error}
          onExecuteCommand={executeCommand}
          onRefresh={refresh}
          onClearCache={clearCache}
          onReconnect={disconnect}
        />
      );

    case View.DEVICE_DETAIL:
      if (!selectedDevice) {
        return (
          <DevicesView
            devices={devices}
            loadingState={loadingState}
            error={error}
            onExecuteCommand={executeCommand}
            onRefresh={refresh}
            onClearCache={clearCache}
            onReconnect={disconnect}
          />
        );
      }
      Logger.info("Rendering CommandsView", {
        device: selectedDevice.name,
        commandCount: selectedDevice.commands.length
      });
      return (
        <CommandsView
          device={selectedDevice}
          onExecuteCommand={executeCommand}
          onBack={() => viewStore.changeView(View.DEVICES)}
        />
      );

    case View.ACTIVITIES:
      Logger.info("Rendering ActivitiesView", {
        activityCount: activities.length,
        currentActivity: currentActivity?.name,
        loadingState: loadingState?.stage
      });
      return (
        <ActivitiesView
          activities={activities}
          currentActivity={currentActivity}
          loadingState={loadingState}
          error={error}
          onStartActivity={(activity) => startActivity(activity.id)}
          onStopActivity={stopActivity}
          onRefresh={refresh}
          onClearCache={clearCache}
          onReconnect={disconnect}
        />
      );

    default:
      Logger.info("Rendering default HubsView", {
        hubCount: hubs.length,
        selectedHub: selectedHub?.name,
        loadingState: loadingState?.stage
      });
      return (
        <HubsView
          hubs={hubs}
          selectedHub={selectedHub}
          loadingState={loadingState}
          error={error}
          onSelectHub={connect}
          onRefresh={refresh}
          onClearCache={clearCache}
        />
      );
  }
}