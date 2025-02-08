import React, { createContext, useContext, useEffect, useState } from "react";
import { HarmonyManager } from "../services/harmony/harmonyManager";
import { HarmonyDevice, HarmonyActivity, HarmonyHub, HarmonyStage, HarmonyCommand, HarmonyState } from "../types/harmony";
import { Logger } from "../services/logger";

interface HarmonyContextState extends HarmonyState {
  connect: (hub: HarmonyHub) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
}

const defaultState: HarmonyContextState = {
  hubs: [],
  selectedHub: null,
  devices: [],
  activities: [],
  currentActivity: null,
  error: null,
  loadingState: {
    stage: HarmonyStage.DISCOVERING,
    progress: 0,
    message: "Initializing..."
  },
  connect: async () => {},
  disconnect: async () => {},
  refresh: async () => {},
  executeCommand: async () => {}
};

const HarmonyContext = createContext<HarmonyContextState>(defaultState);

interface HarmonyProviderProps {
  children: React.ReactNode;
}

export function HarmonyProvider({ children }: HarmonyProviderProps) {
  const [state, setState] = useState<HarmonyContextState>(defaultState);

  useEffect(() => {
    let instance: HarmonyManager;
    let unsubscribe: () => void;

    const init = async () => {
      try {
        instance = HarmonyManager.getInstance();
        
        unsubscribe = instance.subscribe((newState) => {
          setState((prev) => ({
            ...prev,
            ...newState,
            connect: async (hub) => instance.selectHub(hub),
            disconnect: async () => instance.cleanup(),
            refresh: async () => instance.discoverHubs(),
            executeCommand: async (command) => instance.executeCommand(command)
          }));
        });

        await instance.discoverHubs();
      } catch (error) {
        Logger.error("Failed to initialize:", error);
        setState((prev) => ({
          ...prev,
          error: error as Error,
          loadingState: {
            stage: HarmonyStage.ERROR,
            progress: 1,
            message: "Failed to initialize"
          }
        }));
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (instance) {
        instance.cleanup().catch((error) => {
          Logger.error("Cleanup failed:", error);
        });
      }
    };
  }, []);

  return <HarmonyContext.Provider value={state}>{children}</HarmonyContext.Provider>;
}

export function useHarmony() {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmony must be used within a HarmonyProvider");
  }
  return context;
}
