// External dependencies
import { useMemo, useState, useCallback } from "react";
import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";

// Types
import { HarmonyDevice } from "../features/control/types/harmony";
import { useHarmony } from "../hooks/useHarmony";
import { Logger } from "../services/logger";
import { FeedbackState, ErrorStates, LoadingStates } from "./FeedbackState";

interface DeviceListProps {
  /** Optional filter for device types */
  deviceType?: string;
}

/**
 * DeviceList component displays a searchable list of Harmony devices and their commands.
 * Supports filtering and command execution.
 */
export function DeviceList({ deviceType }: DeviceListProps): JSX.Element {
  const { hub, devices, error, isLoading, executeCommand } = useHarmony();
  const [searchText, setSearchText] = useState("");

  // Memoize filtered devices to prevent unnecessary recalculations
  const filteredDevices = useMemo(() => {
    let result = devices;
    
    if (deviceType) {
      result = result.filter(device => device.type === deviceType);
    }
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(device => 
        device.name.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [devices, deviceType, searchText]);

  // Memoize command handler to prevent recreation on each render
  const handleCommand = useCallback(async (device: HarmonyDevice, command: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Sending command ${command} to ${device.name}`,
      });

      await executeCommand(device.id, command);

      await showToast({
        style: Toast.Style.Success,
        title: `Command sent successfully`,
      });
    } catch (error) {
      Logger.error("Failed to execute device command", { error, deviceId: device.id, command });
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to execute command",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [executeCommand]);

  if (error) {
    return <FeedbackState {...ErrorStates.COMMAND_FAILED} description={error.message} />;
  }

  if (!hub) {
    return <FeedbackState {...ErrorStates.NO_HUBS_FOUND} />;
  }

  if (isLoading) {
    return <FeedbackState {...LoadingStates.LOADING_DEVICES} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`${hub.name} - Devices`}
      searchBarPlaceholder="Search devices..."
    >
      {filteredDevices.length === 0 ? (
        <FeedbackState
          title="No Devices Found"
          description={searchText ? "Try adjusting your search" : "No devices available"}
          icon={Icon.ExclamationMark}
        />
      ) : (
        filteredDevices.map((device) => (
          <List.Item
            key={device.id}
            title={device.name}
            subtitle={device.type}
            icon={Icon.Monitor}
            actions={
              <ActionPanel>
                {device.commands.map((command) => (
                  <Action
                    key={command.toString()}
                    title={command.toString()}
                    onAction={() => handleCommand(device, command.toString())}
                  />
                ))}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
