/**
 * Store for managing Harmony Hub devices.
 * Handles device listing, selection, and command management.
 * @module
 */

import { create } from "zustand";
import { HarmonyDevice } from "../types/core/harmony";

/**
 * State interface for the device store.
 * Contains device list, selection, and loading states.
 * @interface DeviceState
 */
interface DeviceState {
  /** List of available devices from the hub */
  devices: HarmonyDevice[];
  /** Currently selected device for command execution */
  selectedDevice: HarmonyDevice | null;
  /** Whether devices are being loaded from the hub */
  isLoading: boolean;
  /** Error message if loading or command execution failed */
  error: string | null;
  /** Timestamp of the last device list update */
  lastUpdateTime: number | null;
}

/**
 * Actions that can be performed on the device store.
 * Includes device management and command operations.
 * @interface DeviceActions
 */
interface DeviceActions {
  /** Set the list of available devices
   * @param devices - List of devices to set
   */
  setDevices: (devices: HarmonyDevice[]) => void;

  /** Select a device for command execution
   * @param device - Device to select, or null to clear selection
   */
  selectDevice: (device: HarmonyDevice | null) => void;

  /** Set the loading state
   * @param isLoading - Whether devices are being loaded
   */
  setLoading: (isLoading: boolean) => void;

  /** Set an error message
   * @param error - Error message to display, or null to clear
   */
  setError: (error: string | null) => void;

  /** Update a device's command list
   * @param deviceId - ID of the device to update
   * @param commands - New commands for the device
   */
  updateDeviceCommands: (deviceId: string, commands: HarmonyDevice["commands"]) => void;

  /** Reset the store to its initial state */
  reset: () => void;
}

/** Initial state for the device store */
const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,
  lastUpdateTime: null,
};

/**
 * Store for managing Harmony Hub devices.
 * Handles device loading, selection, and command updates.
 * Uses Zustand for state management.
 */
export const useDeviceStore = create<DeviceState & DeviceActions>((set) => ({
  ...initialState,

  setDevices: (devices) =>
    set({
      devices,
      isLoading: false,
      error: null,
      lastUpdateTime: Date.now(),
    }),

  selectDevice: (device) =>
    set({
      selectedDevice: device,
    }),

  setLoading: (isLoading) =>
    set({
      isLoading,
      error: null,
    }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  updateDeviceCommands: (deviceId, commands) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              commands,
            }
          : device,
      ),
      lastUpdateTime: Date.now(),
    })),

  reset: () => set(initialState),
})); 