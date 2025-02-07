import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { ErrorHandler, ErrorCategory } from "../../../core/logging/errorHandler";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

const DISCOVERY_TIMEOUT = 30000; // 30 seconds
const GRACE_PERIOD = 10000; // 10 seconds

interface HarmonyContextType {
  hubs: HarmonyHub[];
  isLoading: boolean;
  error: Error | null;
  refreshHubs: () => Promise<void>;
}

interface HarmonyState {
  hubs: HarmonyHub[];
  isLoading: boolean;
  error: Error | null;
}

const HarmonyContext = createContext<HarmonyContextType>({
  hubs: [],
  isLoading: false,
  error: null,
  refreshHubs: async () => {},
});

export function HarmonyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HarmonyState>({
    hubs: [],
    isLoading: true,
    error: null,
  });
  
  // Use a ref to track the latest state for the callback
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshHubs = useCallback(async () => {
    try {
      Logger.info("Starting hub refresh...");
      
      // Reset state at start of refresh
      Logger.info("Resetting state...");
      setState({
        hubs: [],
        isLoading: true,
        error: null,
      });
      
      // First try to load from cache
      const hubData = await HarmonyManager.getInstance().loadCachedHubData();
      if (hubData?.hub) {
        Logger.info("Using cached hub data:", hubData.hub);
        setState(prev => {
          Logger.info("Setting cached hub state. Previous state:", prev);
          return {
            hubs: [hubData.hub],
            isLoading: false,
            error: null,
          };
        });
        return;
      }

      // If no cached data, start discovery
      const manager = HarmonyManager.getInstance();
      
      Logger.info("Starting hub discovery with callback...");
      
      // Start discovery and collect hubs
      await manager.discoverHubs((hub) => {
        Logger.info("Hub found callback triggered for:", hub.name);
        
        // Update state with new hub while keeping isLoading true
        setState(currentState => {
          Logger.info("Current state in callback:", JSON.stringify(currentState));
          const existingHubs = currentState.hubs.filter(h => h.id !== hub.id);
          const newHubs = [...existingHubs, hub];
          Logger.info(`Updating state: ${existingHubs.length} existing, ${newHubs.length} total`);
          
          const newState = {
            ...currentState,
            hubs: newHubs,
          };
          Logger.info("New state will be:", JSON.stringify(newState));
          return newState;
        });
      });

      Logger.info("Discovery complete, setting final state...");
      
      // Discovery is complete, set final state
      setState(currentState => {
        Logger.info("Setting final state. Current state:", JSON.stringify(currentState));
        const finalState = {
          ...currentState,
          isLoading: false,
          error: null,
        };
        Logger.info("Final state will be:", JSON.stringify(finalState));
        return finalState;
      });
      
      Logger.info("Hub refresh complete");
    } catch (error) {
      Logger.error("Error refreshing hubs:", error);
      setState(prev => {
        Logger.info("Setting error state. Previous state:", JSON.stringify(prev));
        return {
          hubs: [],
          error: error as Error,
          isLoading: false,
        };
      });
      
      showToast({
        style: Toast.Style.Failure,
        title: "Error Scanning",
        message: "Failed to scan for Harmony Hubs. Please try again."
      });
      
      ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  }, []);

  // Only refresh on mount
  useEffect(() => {
    Logger.info("HarmonyProvider mounted, starting initial refresh");
    refreshHubs();
    
    return () => {
      // Cleanup
      HarmonyManager.getInstance().cleanupExplorer().catch(Logger.error);
    };
  }, []);

  // Force value to be recreated whenever state changes
  const value = {
    ...state,
    refreshHubs,
  };

  return (
    <HarmonyContext.Provider value={value}>
      {children}
    </HarmonyContext.Provider>
  );
}

export function useHarmonyContext() {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmonyContext must be used within a HarmonyProvider");
  }
  return context;
}
