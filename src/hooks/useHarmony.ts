import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from "react";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand, LoadingState } from "../types/harmony";
import { HarmonyManager } from "../services/harmony/harmonyManager";
import { HarmonyClient } from "../services/harmony/harmonyClient";
import { HarmonyError, ErrorCategory } from "../types/errors";
import { Logger } from "../services/logger";
import { showToast, Toast } from "@raycast/api";

// Create a single manager instance
const manager = new HarmonyManager();

interface HarmonyContextState {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  error: Error | null;
  loadingState: LoadingState;
  connect: (hub: HarmonyHub) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
}

const HarmonyContext = createContext<HarmonyContextState | null>(null);

interface HarmonyProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for Harmony Hub functionality
 */
export const HarmonyProvider: React.FC<HarmonyProviderProps> = ({ children }) => {
  const harmony = useHarmonyState();
  return React.createElement(HarmonyContext.Provider, { value: harmony }, children);
};

/**
 * Hook for managing Harmony Hub state and operations
 */
function useHarmonyState(): HarmonyContextState {
  const [hubs, setHubs] = useState<HarmonyHub[]>([]);
  const [selectedHub, setSelectedHub] = useState<HarmonyHub | null>(null);
  const [client, setClient] = useState<HarmonyClient | null>(null);
  const [devices, setDevices] = useState<HarmonyDevice[]>([]);
  const [activities, setActivities] = useState<HarmonyActivity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<HarmonyActivity | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: "DISCOVERING",
    message: "Starting hub discovery",
    progress: 0
  });

  // Use ref to track if discovery is in progress
  const isDiscovering = useRef(false);

  // Discover hubs
  const discover = useCallback(async () => {
    // Prevent multiple discoveries
    if (isDiscovering.current) {
      return;
    }

    try {
      isDiscovering.current = true;
      setError(null);
      
      // Show initial loading state
      setLoadingState({
        stage: "DISCOVERING",
        message: "Searching for Harmony Hubs...",
        progress: 0.1
      });

      // Show toast for better feedback
      await showToast({
        style: Toast.Style.Animated,
        title: "Searching for Harmony Hubs"
      });

      const discoveredHubs = await manager.startDiscovery((progress, message) => {
        setLoadingState({
          stage: "DISCOVERING",
          message,
          progress: Math.max(0.1, progress)
        });
      });

      if (!isDiscovering.current) {
        // Discovery was cancelled
        return;
      }

      setHubs(discoveredHubs);
      
      if (discoveredHubs.length === 0) {
        setLoadingState({
          stage: "COMPLETE",
          message: "No Harmony Hubs found",
          progress: 1
        });
        await showToast({
          style: Toast.Style.Failure,
          title: "No Harmony Hubs found",
          message: "Make sure your hub is powered on and connected to the network"
        });
      } else {
        setLoadingState({
          stage: "COMPLETE",
          message: `Found ${discoveredHubs.length} Harmony Hub${discoveredHubs.length > 1 ? 's' : ''}`,
          progress: 1
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Found Harmony Hub",
          message: discoveredHubs[0].name
        });
      }
    } catch (error) {
      if (!isDiscovering.current) {
        // Discovery was cancelled
        return;
      }
      Logger.error("Discovery failed:", error);
      setError(error as Error);
      setLoadingState({
        stage: "ERROR",
        message: "Discovery failed",
        progress: 0
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "Discovery failed",
        message: (error as Error).message
      });
    } finally {
      isDiscovering.current = false;
    }
  }, []);

  // Connect to a hub
  const connect = useCallback(async (hub: HarmonyHub) => {
    try {
      setLoadingState({
        stage: "CONNECTING",
        message: `Connecting to ${hub.name}`,
        progress: 0
      });

      await showToast({
        style: Toast.Style.Animated,
        title: `Connecting to ${hub.name}`
      });

      // Create and connect client
      const newClient = new HarmonyClient(hub);
      await newClient.connect();
      
      setClient(newClient);
      setSelectedHub(hub);

      // Load devices and activities
      setLoadingState({
        stage: "LOADING",
        message: "Loading devices and activities",
        progress: 0.5
      });

      const [hubDevices, hubActivities] = await Promise.all([
        newClient.getDevices(),
        newClient.getActivities()
      ]);

      setDevices(hubDevices);
      setActivities(hubActivities);
      
      setLoadingState({
        stage: "COMPLETE",
        message: "Ready",
        progress: 1
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: `${hub.name} ready to use`
      });

    } catch (error) {
      Logger.error("Connection failed:", error);
      setError(error as Error);
      setLoadingState({
        stage: "ERROR",
        message: "Connection failed",
        progress: 0
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: (error as Error).message
      });
      throw error;
    }
  }, []);

  // Disconnect from current hub
  const disconnect = useCallback(async () => {
    if (client) {
      await client.disconnect();
      setClient(null);
      setSelectedHub(null);
      setDevices([]);
      setActivities([]);
      setCurrentActivity(null);
      await showToast({
        style: Toast.Style.Success,
        title: "Disconnected from hub"
      });
    }
  }, [client]);

  // Execute a command
  const executeCommand = useCallback(async (command: HarmonyCommand) => {
    if (!client) {
      throw new HarmonyError("Not connected to a hub", ErrorCategory.STATE);
    }
    try {
      await client.executeCommand(command);
      await showToast({
        style: Toast.Style.Success,
        title: "Command sent",
        message: command.name
      });
    } catch (error) {
      Logger.error("Command failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Command failed",
        message: (error as Error).message
      });
      throw error;
    }
  }, [client]);

  // Start discovery on mount
  useEffect(() => {
    // Start discovery
    discover();

    // Cleanup function
    return () => {
      // Cancel any ongoing discovery
      isDiscovering.current = false;
      manager.cleanup().catch(error => {
        Logger.error("Failed to cleanup:", error);
      });
    };
  }, []); // Only run on mount

  return {
    hubs,
    selectedHub,
    devices,
    activities,
    currentActivity,
    error,
    loadingState,
    connect,
    disconnect,
    refresh: discover,
    executeCommand
  };
}

/**
 * Hook for accessing Harmony Hub functionality
 */
export function useHarmony(): HarmonyContextState {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmony must be used within a HarmonyProvider");
  }
  return context;
}
