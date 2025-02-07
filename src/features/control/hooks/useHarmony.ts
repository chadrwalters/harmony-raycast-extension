import { useState, useEffect, useCallback } from "react";
import { SessionManager } from "../../../core/session/session-manager";
import { ErrorHandler, ErrorCategory } from "../../../core/logging/errorHandler";
import { ToastManager } from "../../../core/ui/toast-manager";
import { measureAsync } from "../../../core/utils/performance";
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

interface HarmonyState {
  hubs: HarmonyHub[];
  activities: HarmonyActivity[];
  commands: HarmonyCommand[];
  currentActivity?: string;
  isConnected: boolean;
  error?: Error;
}

/**
 * useHarmony Hook
 * 
 * React hook for managing Harmony device state and operations.
 * All low-level operations are delegated to HarmonyManager.
 */
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
        Logger.info("=== Starting hub discovery ===");
        const manager = HarmonyManager.getInstance();
        
        // Try to load from cache first
        const cachedData = await manager.loadCachedHubData();
        if (cachedData) {
          Logger.info("Using cached hub data");
          setState((prev) => ({
            ...prev,
            hubs: [cachedData.hub],
          }));
          return;
        }

        // If no cache, do discovery
        const hubs = await manager.discoverHubs();
        setState((prev) => ({ ...prev, hubs }));
        Logger.info("=== Hub discovery finished ===");
      });
    } catch (error) {
      Logger.error("Hub discovery error:", error);
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  }, []);

  const connectToHub = useCallback(async (hub: HarmonyHub) => {
    try {
      await measureAsync("connectToHub", async () => {
        Logger.info("=== Starting hub connection ===");
        const manager = HarmonyManager.getInstance();
        await manager.connect(hub);
        setState((prev) => ({ ...prev, isConnected: true }));
        await ToastManager.success("Connected to Hub");
        Logger.info("=== Hub connection finished ===");
      });
    } catch (error) {
      Logger.error("Hub connection error:", error);
      await ErrorHandler.handleError(error as Error, ErrorCategory.AUTHENTICATION);
    }
  }, []);

  const startActivity = useCallback(async (activityId: string) => {
    try {
      await measureAsync("startActivity", async () => {
        Logger.info("=== Starting activity ===");
        const manager = HarmonyManager.getInstance();
        await manager.startActivity(activityId);
        setState((prev) => ({
          ...prev,
          currentActivity: activityId,
          activities: prev.activities.map((a) => ({
            ...a,
            isActive: a.id === activityId,
          })),
        }));
        await ToastManager.success("Activity Started");
        Logger.info("=== Activity started ===");
      });
    } catch (error) {
      Logger.error("Activity start error:", error);
      await ErrorHandler.handleError(error as Error);
    }
  }, []);

  const executeCommand = useCallback(async (deviceId: string, commandId: string) => {
    try {
      await measureAsync("executeCommand", async () => {
        const manager = HarmonyManager.getInstance();
        await manager.executeCommand(deviceId, commandId);
      });
    } catch (error) {
      Logger.error("Command execution error:", error);
      await ErrorHandler.handleError(error as Error, ErrorCategory.COMMAND_EXECUTION);
      throw error; // Re-throw to allow UI to show error
    }
  }, []);

  return {
    state,
    discoverHubs,
    connectToHub,
    startActivity,
    executeCommand,
  };
}
