import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { showToast, Toast } from "@raycast/api";
import { HarmonyManager } from "../../../core/harmony/harmonyClient";
import { Logger } from "../../../core/logging/logger";
import { ErrorHandler, ErrorCategory } from "../../../core/logging/errorHandler";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice } from "../types/harmony";

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

  const refreshHubs = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // First try to load from cache
      const hubData = await HarmonyManager.getInstance().loadCachedHubData();
      if (hubData?.hub) {
        setState(prev => ({
          ...prev,
          hubs: [hubData.hub],
          isLoading: false,
        }));
        return;
      }

      // If no cached data, start discovery
      const manager = HarmonyManager.getInstance();
      
      // Clear hubs before starting new discovery
      setState(prev => ({ ...prev, hubs: [] }));
      
      await manager.discoverHubs((hub) => {
        // Update state as hubs are found
        setState(prev => ({
          ...prev,
          hubs: [...prev.hubs.filter(h => h.id !== hub.id), hub],
        }));
      });

      // Keep isLoading true during discovery
      await new Promise(resolve => setTimeout(resolve, 5000)); // DISCOVERY_TIMEOUT is not defined, replaced with 5000

      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      Logger.error("Error refreshing hubs:", error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
    }
  }, []); // No dependencies needed

  // Only refresh on mount
  useEffect(() => {
    refreshHubs();
  }, []);  // Empty deps, we don't want to trigger on refreshHubs changes

  const value = useMemo(() => ({
    ...state,
    refreshHubs,
  }), [state, refreshHubs]);

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
