/**
 * View component for displaying and managing Harmony devices.
 * Shows devices grouped by type with available commands.
 * @module
 */

import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo, useMemo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyDevice } from "../../../types/core/harmony";

/**
 * Props for the DevicesView component
 * @interface DevicesViewProps
 */
interface DevicesViewProps {
  /** Callback when a device is selected */
  onDeviceSelect: (device: HarmonyDevice) => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying and managing Harmony devices.
 * Groups devices by type and shows available commands.
 * Provides actions for selecting devices and viewing commands.
 * @param props - Component props
 * @returns JSX element
 */
function DevicesViewImpl({ onDeviceSelect, onBack }: DevicesViewProps): JSX.Element {
  const { devices, refresh, clearCache } = useHarmony();

  // Group devices by type
  const { deviceTypes, devicesByType } = useMemo(() => {
    const types = new Set<string>();
    const byType = new Map<string, HarmonyDevice[]>();

    devices.forEach((device) => {
      types.add(device.type);
      const typeDevices = byType.get(device.type) || [];
      typeDevices.push(device);
      byType.set(device.type, typeDevices);
    });

    return {
      deviceTypes: Array.from(types).sort(),
      devicesByType: byType,
    };
  }, [devices]);

  return (
    <List navigationTitle="Devices" searchBarPlaceholder="Search devices..." isLoading={false} isShowingDetail={false}>
      {deviceTypes.map((type) => {
        const typeDevices = devicesByType.get(type) || [];
        return (
          <List.Section key={type} title={type}>
            {typeDevices.map((device) => (
              <List.Item
                key={device.id}
                title={device.name}
                subtitle={device.type}
                icon={Icon.Devices}
                accessories={[
                  {
                    text: `${device.commands.length} commands`,
                    tooltip: "Number of available commands",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action title="Select Device" icon={Icon.ArrowRight} onAction={() => onDeviceSelect(device)} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {refresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />}
                      {clearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />}
                      {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export const DevicesView = memo(DevicesViewImpl);
