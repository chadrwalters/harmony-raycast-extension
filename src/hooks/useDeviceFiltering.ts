/**
 * Hook for filtering devices with memoization
 * @module
 */

import { useMemo } from "react";
import { useHarmony } from "./useHarmony";
import { useViewStore } from "../stores/view";
import { HarmonyDevice } from "../types/core/harmony";

/**
 * Hook for filtering and searching devices
 */
export function useDeviceFiltering() {
  const { devices } = useHarmony();
  const searchQuery = useViewStore((state) => state.searchQuery);
  const filters = useViewStore((state) => state.filters);

  // Memoize filtered devices
  const filteredDevices = useMemo(() => {
    let result = [...devices];

    // Apply device type filter
    if (filters.deviceType) {
      result = result.filter((device) => device.type === filters.deviceType);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(query) ||
          device.type.toLowerCase().includes(query) ||
          device.commands.some((cmd) =>
            cmd.label.toLowerCase().includes(query)
          )
      );
    }

    return result;
  }, [devices, searchQuery, filters.deviceType]);

  // Memoize device types
  const deviceTypes = useMemo(() => {
    const types = new Set(devices.map((device) => device.type));
    return Array.from(types).sort();
  }, [devices]);

  // Memoize devices by type
  const devicesByType = useMemo(() => {
    const byType = new Map<string, HarmonyDevice[]>();
    
    filteredDevices.forEach((device) => {
      const devices = byType.get(device.type) || [];
      devices.push(device);
      byType.set(device.type, devices);
    });

    // Sort devices within each type
    byType.forEach((devices) => {
      devices.sort((a, b) => a.name.localeCompare(b.name));
    });

    return byType;
  }, [filteredDevices]);

  return {
    filteredDevices,
    deviceTypes,
    devicesByType,
    totalDevices: devices.length,
    filteredCount: filteredDevices.length,
  };
} 