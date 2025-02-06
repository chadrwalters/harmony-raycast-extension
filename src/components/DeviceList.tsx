import { useState, useMemo } from "react";
import {
  List,
  Icon,
  ActionPanel,
  Action,
  useNavigation,
  Color,
} from "@raycast/api";
import type { HarmonyDevice, HarmonyCommand } from "../types/harmony";
import { useHarmony } from "../hooks/useHarmony";
import { FeedbackState, LoadingStates, ErrorStates } from "./FeedbackState";
import ToastManager from "../lib/toastManager";

interface DeviceListProps {
  devices: HarmonyDevice[];
}

export default function DeviceList({ devices }: DeviceListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { executeCommand } = useHarmony();
  const { pop } = useNavigation();

  const filteredDevices = useMemo(() => {
    if (!searchText) return devices;
    
    const lowerSearch = searchText.toLowerCase();
    return devices.filter(device => {
      const matchesDevice = device.label.toLowerCase().includes(lowerSearch);
      const matchesCommand = device.commands.some(cmd => 
        cmd.label.toLowerCase().includes(lowerSearch)
      );
      return matchesDevice || matchesCommand;
    });
  }, [devices, searchText]);

  const handleCommandExecution = async (device: HarmonyDevice, command: HarmonyCommand) => {
    setIsLoading(true);
    try {
      await ToastManager.progressWithSteps([
        "Preparing Command...",
        `Sending to ${device.label}`,
        "Executing Command...",
        `${command.label} Completed`,
      ]);
      await executeCommand(device.id, command.id);
      pop();
    } catch (error) {
      await ToastManager.error({
        ...ErrorStates.COMMAND_FAILED,
        action: {
          title: "Try Again",
          onAction: () => handleCommandExecution(device, command),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (devices.length === 0) {
    return (
      <List>
        <FeedbackState
          title="No Devices Found"
          description="No devices are currently configured with this Hub"
          icon={Icon.Devices}
          color={Color.Secondary}
        />
      </List>
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
          subtitle={`${device.commands.length} commands`}
        >
          {device.commands.map((command) => (
            <List.Item
              key={`${device.id}-${command.id}`}
              title={command.label}
              icon={getDeviceIcon(device.type)}
              detail={
                <List.Item.Detail
                  markdown={`# ${command.label}\n\n**Device:** ${device.label}\n**Type:** ${device.type}\n\nExecute this command to control your ${device.label}.`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Device"
                        text={device.label}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Command"
                        text={command.label}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={device.type}
                      />
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
                    shortcut={{ modifiers: ["cmd"], key: "." }}
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

function getDeviceIcon(type: string): Icon {
  switch (type.toLowerCase()) {
    case "tv":
      return Icon.Display;
    case "avreceiver":
      return Icon.Controller;
    case "gameconsole":
      return Icon.Gamepad;
    case "cable":
      return Icon.Box;
    case "audio":
      return Icon.Speaker;
    default:
      return Icon.Circle;
  }
}
