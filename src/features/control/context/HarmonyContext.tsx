import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { ErrorHandler, ErrorCategory } from "../../../core/logging/errorHandler";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

const DISCOVERY_TIMEOUT = 30000; // 30 seconds
const GRACE_PERIOD = 10000; // 10 seconds

/**
 * Props for the HarmonyProvider component.
 */
interface HarmonyProviderProps {
  /** Child components that will have access to the Harmony context */
  children: React.ReactNode;
}

/**
 * Context interface defining the shape of the Harmony context.
 */
interface HarmonyContextType {
  /** Current state of the Harmony system */
  hubs: HarmonyHub[];
  isLoading: boolean;
  error: Error | null;
  refreshHubs: () => Promise<void>;
}

/**
 * Context for managing Harmony Hub state and operations.
 * Provides access to Harmony Hub functionality throughout the application.
 */
const HarmonyContext = createContext<HarmonyContextType | undefined>(undefined);

/**
 * Custom hook for accessing the Harmony context.
 * Provides type-safe access to Harmony Hub functionality.
 *
 * @throws {Error} If used outside of a HarmonyProvider
 * @returns {HarmonyContextType} The Harmony context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, refreshHubs } = useHarmonyContext();
 *   // Use Harmony functionality
 * }
 * ```
 */
export function useHarmonyContext(): HarmonyContextType {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmonyContext must be used within a HarmonyProvider");
  }
  return context;
}

/**
 * Provider component for the Harmony context.
 * Manages state and provides Harmony Hub functionality to child components.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <HarmonyProvider>
 *       <YourComponents />
 *     </HarmonyProvider>
 *   );
 * }
 * ```
 */
export function HarmonyProvider({ children }: HarmonyProviderProps) {
  const [state, setState] = useState<HarmonyContextType>({
    hubs: [],
    isLoading: false,
    error: null,
    refreshHubs: async () => {}
  });
  
  // Use a ref to track the latest state for the callback
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshHubs = useCallback(async () => {
    try {
      Logger.debug("Starting hub refresh...");
      
      // Reset state at start of refresh
      Logger.debug("Resetting state...");
      setState({
        hubs: [],
        isLoading: true,
        error: null,
        refreshHubs
      });
      
      // First try to load from cache
      const hubData = await HarmonyManager.getInstance().loadCachedHubData();
      if (hubData?.hub) {
        Logger.debug("Using cached hub data:", hubData.hub);
        setState(prev => {
          Logger.debug("Setting cached hub state. Previous state:", prev);
          return {
            hubs: [hubData.hub],
            isLoading: false,
            error: null,
            refreshHubs
          };
        });
        return;
      }

      // If no cached data, start discovery
      const manager = HarmonyManager.getInstance();
      
      Logger.debug("Starting hub discovery with callback...");
      
      // Start discovery and collect hubs
      await manager.discoverHubs((hub) => {
        Logger.debug("Hub found callback triggered for:", hub.name);
        
        // Update state with new hub while keeping isLoading true
        setState(currentState => {
          Logger.debug("Current state in callback:", JSON.stringify(currentState));
          const existingHubs = currentState.hubs.filter(h => h.id !== hub.id);
          const newHubs = [...existingHubs, hub];
          Logger.debug(`Updating state: ${existingHubs.length} existing, ${newHubs.length} total`);
          
          const newState = {
            ...currentState,
            hubs: newHubs,
            isLoading: true,
            refreshHubs
          };
          Logger.debug("New state will be:", JSON.stringify(newState));
          return newState;
        });
      });

      Logger.debug("Discovery complete, setting final state...");
      
      // Discovery is complete, set final state
      setState(currentState => {
        Logger.debug("Setting final state. Current state:", JSON.stringify(currentState));
        const finalState = {
          ...currentState,
          isLoading: false,
          refreshHubs
        };
        Logger.debug("Final state will be:", JSON.stringify(finalState));
        return finalState;
      });
      
      Logger.debug("Hub refresh complete");
    } catch (error) {
      Logger.error("Error refreshing hubs:", error);
      setState(prev => {
        Logger.debug("Setting error state. Previous state:", JSON.stringify(prev));
        return {
          hubs: [],
          error: error as Error,
          isLoading: false,
          refreshHubs
        };
      });
      
      showToast({
        style: Toast.Style.Failure,
        title: "Error Scanning",
        message: "Failed to scan for Harmony Hubs. Please try again."
      });
      
      await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    }
  }, []);

  // Only refresh on mount
  useEffect(() => {
    Logger.debug("HarmonyProvider mounted, starting initial refresh");
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
