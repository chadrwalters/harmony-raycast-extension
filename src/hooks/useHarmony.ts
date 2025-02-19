import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from "react";
import { 
  HarmonyHub, 
  HarmonyDevice, 
  HarmonyActivity, 
  HarmonyCommand, 
  LoadingState, 
  HarmonyStage 
} from "../types/harmony";
import { HarmonyManager } from "../services/harmony/harmonyManager";
import { HarmonyClient } from "../services/harmony/harmonyClient";
import { HarmonyError, ErrorCategory } from "../types/core/errors";
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
  error: HarmonyError | null;
  loadingState: LoadingState;
  connect: (hub: HarmonyHub) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
  clearCache: () => Promise<void>;
  startActivity: (activityId: string) => Promise<void>;
  stopActivity: () => Promise<void>;
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
  const [state, setState] = useState<{
    hubs: HarmonyHub[];
    selectedHub: HarmonyHub | null;
    client: HarmonyClient | null;
    devices: HarmonyDevice[];
    activities: HarmonyActivity[];
    currentActivity: HarmonyActivity | null;
    error: HarmonyError | null;
    loadingState: LoadingState;
  }>({
    hubs: [],
    selectedHub: null,
    client: null,
    devices: [],
    activities: [],
    currentActivity: null,
    error: null,
    loadingState: {
      stage: HarmonyStage.INITIAL,
      message: "Starting hub discovery",
      progress: 0
    }
  });

  // Use ref to track if discovery is in progress
  const isDiscovering = useRef(false);

  // Update loading state
  const setLoadingState = useCallback((stage: HarmonyStage, message: string, progress: number) => {
    setState(prev => ({
      ...prev,
      loadingState: { stage, message, progress }
    }));
  }, []);

  // Set error state
  const setError = useCallback((error: HarmonyError | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Connect to a hub
  const connect = useCallback(async (hub: HarmonyHub) => {
    try {
      Logger.info(`Connecting to hub ${hub.name}`);
      setError(null);
      setLoadingState(HarmonyStage.CONNECTING, `Connecting to ${hub.name}...`, 0);

      // Create and connect to the client
      const newClient = new HarmonyClient(hub);
      await newClient.connect();
      
      Logger.info("Connected to hub, setting up state");
      setState(prev => ({
        ...prev,
        client: newClient,
        selectedHub: hub
      }));

      // Load devices
      setLoadingState(HarmonyStage.LOADING_DEVICES, "Loading devices...", 0.3);
      Logger.info("Loading devices");
      const hubDevices = await newClient.getDevices();
      Logger.info(`Loaded ${hubDevices.length} devices`);
      setState(prev => ({ ...prev, devices: hubDevices }));

      // Load activities
      setLoadingState(HarmonyStage.LOADING_ACTIVITIES, "Loading activities...", 0.6);
      Logger.info("Loading activities");
      const hubActivities = await newClient.getActivities();
      Logger.info(`Loaded ${hubActivities.length} activities`);
      setState(prev => ({ ...prev, activities: hubActivities }));

      // Get current activity
      Logger.info("Getting current activity");
      const current = await newClient.getCurrentActivity();
      setState(prev => ({ ...prev, currentActivity: current }));

      setLoadingState(HarmonyStage.CONNECTED, "Connected successfully", 1);
      Logger.info("Hub setup completed successfully");

    } catch (err) {
      const error = new HarmonyError(
        "Failed to connect to hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      Logger.error("Hub connection failed", error);
    }
  }, [setLoadingState, setError]);

  // Discover hubs
  const discover = useCallback(async () => {
    if (isDiscovering.current) {
      Logger.info("Discovery already in progress, skipping");
      return;
    }

    try {
      isDiscovering.current = true;
      setError(null);
      setLoadingState(HarmonyStage.DISCOVERING, "Searching for Harmony Hubs...", 0.1);

      Logger.info("Starting hub discovery");
      const discoveredHubs = await manager.startDiscovery((progress, message) => {
        setLoadingState(HarmonyStage.DISCOVERING, message, Math.max(0.1, progress));
      });

      if (!isDiscovering.current) {
        Logger.info("Discovery was cancelled");
        return;
      }

      Logger.info(`Discovery completed, found ${discoveredHubs.length} hubs`);
      setState(prev => ({ ...prev, hubs: discoveredHubs }));
      
      if (discoveredHubs.length === 0) {
        const error = new HarmonyError(
          "No Harmony Hubs found",
          ErrorCategory.HUB_COMMUNICATION
        );
        setError(error);
        setLoadingState(HarmonyStage.ERROR, error.message, 1);
        throw error;
      }

      setLoadingState(HarmonyStage.CONNECTED, "Hubs discovered successfully", 1);

      // If there's only one hub, automatically select it
      if (discoveredHubs.length === 1) {
        Logger.info("Single hub found, auto-selecting");
        await connect(discoveredHubs[0]);
      }

    } catch (err) {
      const error = new HarmonyError(
        "Failed to discover hubs",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      Logger.error("Hub discovery failed", error);
    } finally {
      isDiscovering.current = false;
    }
  }, [connect, setLoadingState, setError]);

  // Disconnect from hub
  const disconnect = useCallback(async () => {
    if (state.client) {
      try {
        await state.client.disconnect();
        setLoadingState(HarmonyStage.INITIAL, "Disconnected", 0);
      } catch (err) {
        const error = new HarmonyError(
          "Failed to disconnect",
          ErrorCategory.HUB_COMMUNICATION,
          err instanceof Error ? err : undefined
        );
        Logger.error("Hub disconnection failed", error);
      } finally {
        setState(prev => ({
          ...prev,
          client: null,
          selectedHub: null,
          devices: [],
          activities: [],
          currentActivity: null,
          error: null
        }));
      }
    }
  }, [state.client, setLoadingState]);

  // Execute a command
  const executeCommand = useCallback(async (command: HarmonyCommand) => {
    if (!state.client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    try {
      Logger.debug("Sending command to hub", { command });
      setLoadingState(HarmonyStage.EXECUTING_COMMAND, `Sending ${command.name}...`, 0.5);
      await state.client.executeCommand(command);
      setLoadingState(HarmonyStage.CONNECTED, "Command sent successfully", 1);
    } catch (err) {
      const error = new HarmonyError(
        "Failed to execute command",
        ErrorCategory.COMMAND_EXECUTION,
        err instanceof Error ? err : undefined
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      throw error;
    }
  }, [state.client, setLoadingState, setError]);

  // Start activity
  const startActivity = useCallback(async (activityId: string) => {
    if (!state.client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    try {
      setLoadingState(HarmonyStage.STARTING_ACTIVITY, `Starting activity ${activityId}...`, 0.5);
      await state.client.startActivity(activityId);
      setLoadingState(HarmonyStage.CONNECTED, "Activity started successfully", 1);
    } catch (err) {
      const error = new HarmonyError(
        "Failed to start activity",
        ErrorCategory.ACTIVITY_START,
        err instanceof Error ? err : undefined
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      throw error;
    }
  }, [state.client, setLoadingState, setError]);

  // Stop activity
  const stopActivity = useCallback(async () => {
    if (!state.client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    try {
      setLoadingState(HarmonyStage.STOPPING_ACTIVITY, "Stopping activity...", 0.5);
      await state.client.stopActivity();
      setLoadingState(HarmonyStage.CONNECTED, "Activity stopped successfully", 1);
    } catch (err) {
      const error = new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.ACTIVITY_STOP,
        err instanceof Error ? err : undefined
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      throw error;
    }
  }, [state.client, setLoadingState, setError]);

  // Clear cache and rediscover
  const clearCache = useCallback(async () => {
    await disconnect();
    await manager.clearCache();
    await discover();
  }, [disconnect, discover]);

  // Refresh state
  const refresh = useCallback(async () => {
    await discover();
  }, [discover]);

  return {
    ...state,
    connect,
    disconnect,
    refresh,
    executeCommand,
    clearCache,
    startActivity,
    stopActivity,
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
