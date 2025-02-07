import { useState, useCallback } from "react";
import { SessionManager } from "../lib/sessionManager";
import { ErrorHandler, ErrorCategory } from "../lib/errorHandler";
import { ToastManager } from "../lib/toastManager";
import { measureAsync } from "../lib/performance";
import { HarmonyManager } from "../lib/harmonyClient"; // Fixed import path
import { Logger } from "../lib/logger"; // Added import for Logger

export interface HarmonyHub {
  id: string;
  friendlyName: string;
  ip: string;
}

export interface HarmonyActivity {
  id: string;
  label: string;
  isActive: boolean;
}

export interface HarmonyCommand {
  id: string;
  label: string;
  deviceId: string;
}

interface HarmonyState {
  hubs: HarmonyHub[];
  activities: HarmonyActivity[];
  commands: HarmonyCommand[];
  currentActivity?: string;
  isConnected: boolean;
  error?: Error;
}

export function useHarmony() {
  const [state, setState] = useState<HarmonyState>({
    hubs: [],
    activities: [],
    commands: [],
    isConnected: false,
  });

  const discoverHubs = useCallback(async () => {
    try {
      await measureAsync("discoverHubs", async () => {
        Logger.info("Starting hub discovery...");
        const manager = HarmonyManager.getInstance();
        const hubs = await manager.discoverHubs();
        Logger.info(`Found ${hubs.length} hub(s):`, hubs);
        setState((prev) => ({ ...prev, hubs }));
      });
    } catch (error) {
      Logger.error("Hub discovery failed:", error);
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  }, []);

  const connectToHub = useCallback(async (hub: HarmonyHub) => {
    try {
      await measureAsync("connectToHub", async () => {
        await SessionManager.createSession(hub.id);
        setState((prev) => ({ ...prev, isConnected: true }));
        await ToastManager.success("Connected to Hub");
      });
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.AUTHENTICATION);
    }
  }, []);

  const startActivity = useCallback(async (activityId: string) => {
    try {
      await measureAsync("startActivity", async () => {
        if (!(await SessionManager.validateSession())) {
          return;
        }
        // Activity implementation
        setState((prev) => ({
          ...prev,
          currentActivity: activityId,
          activities: prev.activities.map((a) => ({
            ...a,
            isActive: a.id === activityId,
          })),
        }));
        await ToastManager.success("Activity Started");
      });
    } catch (error) {
      await ErrorHandler.handleError(error as Error);
    }
  }, []);

  const executeCommand = useCallback(async (deviceId: string, commandId: string) => {
    try {
      await measureAsync("executeCommand", async () => {
        if (!(await SessionManager.validateSession())) {
          return;
        }
        
        const manager = HarmonyManager.getInstance();
        
        // First try to get cached hub data
        const cachedData = await manager.loadCachedHubData();
        if (!cachedData) {
          throw new Error("No hub connection available. Please select a hub first.");
        }

        // Always connect and verify connection
        Logger.info("Connecting to hub:", cachedData.hub.name);
        await manager.connect(cachedData.hub);
        
        // Add a small delay after connecting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify connection before executing command
        try {
          await manager.ensureConnected();
        } catch (error) {
          Logger.error("Connection verification failed:", error);
          // Try connecting one more time
          await manager.connect(cachedData.hub);
          await new Promise(resolve => setTimeout(resolve, 500));
          await manager.ensureConnected();
        }
        
        await manager.executeCommand(deviceId, commandId);
      });
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.COMMAND_EXECUTION);
      throw error; // Re-throw to allow UI to show error
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      Logger.info("Clearing Harmony Hub cache...");
      const manager = HarmonyManager.getInstance();
      await manager.clearCache();
      Logger.info("Cache cleared successfully");
    } catch (error) {
      Logger.error("Failed to clear cache:", error);
      await ErrorHandler.handleError(error as Error, ErrorCategory.CACHE_OPERATION);
      throw error; // Re-throw to allow UI to show error
    }
  }, []);

  return {
    state,
    discoverHubs,
    connectToHub,
    startActivity,
    executeCommand,
    clearCache,
  };
}
