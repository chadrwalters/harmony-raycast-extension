// External dependencies
import { useState, useMemo } from "react";
import { List, Icon, ActionPanel, Action, useNavigation, Color } from "@raycast/api";

// Types
import type { HarmonyDevice, HarmonyCommand } from "../types/harmony";

// Hooks and services
import { useHarmony } from "../hooks/useHarmony";
import { ToastManager } from "../../../core/ui/toast-manager";

// Components
import { FeedbackState, ErrorStates } from "../../shared/components/FeedbackState";

// Component types
interface DeviceListProps {
  devices: HarmonyDevice[];
}

/**
 * DeviceList Component
 * 
 * Displays a list of Harmony devices and their available commands.
 * Handles device selection and command execution.
 */
export default function DeviceList({ devices }: DeviceListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { executeCommand } = useHarmony();
  const { pop } = useNavigation();

  const filteredDevices = useMemo(() => {
    if (!searchText) return devices;

    const lowerSearch = searchText.toLowerCase();
    return devices.filter((device) => {
      const matchesDevice = device.label.toLowerCase().includes(lowerSearch);
      const matchesCommand = device.commands?.some((cmd) => cmd.label.toLowerCase().includes(lowerSearch));
      return matchesDevice || matchesCommand;
    });
  }, [devices, searchText]);

  const handleCommandExecution = async (device: HarmonyDevice, command: HarmonyCommand) => {
    setIsLoading(true);
    try {
      await executeCommand(device, command);
      await ToastManager.success({
        title: "Command Executed",
        message: `${command.label} sent to ${device.label}`,
      });
    } catch (error) {
      await ToastManager.error({
        title: "Command Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!devices || devices.length === 0) {
    return (
      <FeedbackState
        title="No Devices Found"
        description="No Harmony devices were found. Make sure your Harmony Hub is connected and try again."
        state={ErrorStates.NO_RESULTS}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search devices and commands..."
      onSearchTextChange={setSearchText}
      navigationTitle="Device Controls"
      isShowingDetail
    >
      {filteredDevices.map((device) => (
        <List.Section
          key={device.id}
          title={device.label}
          subtitle={device.type || ''}
        >
          {device.commands?.map((command) => (
            <List.Item
              key={`${device.id}-${command.id}`}
              title={command.label}
              icon={getCommandIcon(command.label)}
              detail={
                <List.Item.Detail
                  markdown={`# ${command.label}\n\n**Device:** ${device.label}\n**Type:** ${device.type || 'Unknown'}\n\nExecute this command to control your ${device.label}.`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Device" text={device.label} />
                      <List.Item.Detail.Metadata.Label title="Command" text={command.label} />
                      <List.Item.Detail.Metadata.Label title="Type" text={device.type || 'Unknown'} />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text="Ready"
                          color={Color.Green}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Execute Command"
                    icon={Icon.Play}
                    onAction={() => handleCommandExecution(device, command)}
                  />
                  <Action
                    title="Copy Command"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={async () => {
                      navigator.clipboard.writeText(command.label);
                      await ToastManager.success({
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
      ))}
    </List>
  );
}

function getCommandIcon(label: string): Icon {
  // Convert to lowercase for easier matching
  const labelLC = label.toLowerCase();

  // Navigation controls
  if (labelLC.includes('up') || labelLC === 'direction up') return Icon.ArrowUp;
  if (labelLC.includes('down') || labelLC === 'direction down') return Icon.ArrowDown;
  if (labelLC.includes('left') || labelLC === 'direction left') return Icon.ArrowLeft;
  if (labelLC.includes('right') || labelLC === 'direction right') return Icon.ArrowRight;
  if (labelLC.includes('select') || labelLC === 'ok') return Icon.CircleFilled;
  if (labelLC.includes('menu')) return Icon.List;
  if (labelLC.includes('back')) return Icon.ArrowLeft;

  // Common controls
  if (labelLC.includes('power') || labelLC.includes('on') || labelLC.includes('off')) return Icon.Power;
  if (labelLC.includes('volume')) return Icon.SpeakerUp;
  if (labelLC.includes('mute')) return Icon.SpeakerOff;
  if (labelLC.includes('play')) return Icon.Play;
  if (labelLC.includes('pause')) return Icon.Pause;
  if (labelLC.includes('stop')) return Icon.Stop;
  if (labelLC.includes('forward')) return Icon.Forward;
  if (labelLC.includes('rewind') || labelLC.includes('backward')) return Icon.Rewind;
  if (labelLC.includes('input') || labelLC.includes('source')) return Icon.Link;

  return Icon.Circle;
}
