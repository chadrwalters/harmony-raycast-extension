/**
 * Harmony Hub state management store
 * @module
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ErrorHandler } from "../services/error-handler";
import { ToastManager } from "../services/toast";
import { LocalStorage } from "../services/localStorage";
import { Logger } from "../services/logger";
import {
  HarmonyHub,
  HarmonyDevice,
  HarmonyActivity,
  HarmonyCommand,
  HarmonyError,
  ErrorCategory,
  LoadingState,
  HarmonyStage,
} from "../types/core";
import {
  MutableHarmonyState,
  toMutableHub,
  toMutableDevice,
  toMutableActivity,
  toMutableLoadingState,
} from "../types/core/state-mutable";

/**
 * Actions that can be performed on the store
 */
interface HarmonyActions {
  // Hub Management
  discoverHubs: () => Promise<void>;
  selectHub: (hub: HarmonyHub) => Promise<void>;
  disconnectHub: () => Promise<void>;
  
  // Device Management
  loadDevices: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
  
  // Activity Management
  loadActivities: () => Promise<void>;
  startActivity: (activity: HarmonyActivity) => Promise<void>;
  stopActivity: (activity: HarmonyActivity) => Promise<void>;
  
  // State Management
  setError: (error: HarmonyError | null) => void;
  clearError: () => void;
  setLoadingState: (state: LoadingState) => void;
  reset: () => void;
}

/**
 * Combined store type with state and actions
 */
type HarmonyStore = MutableHarmonyState & HarmonyActions;

/**
 * Create the Harmony store with Zustand and Immer
 */
export const useHarmonyStore = create<HarmonyStore>()(
  immer((set, get) => {
    // Load persisted state
    const loadPersistedState = async () => {
      try {
        const persistedJSON = await LocalStorage.getItem("harmony-hub-state");
        if (persistedJSON) {
          const { state } = JSON.parse(persistedJSON);
          set((draft) => {
            if (state.selectedHub) {
              draft.selectedHub = toMutableHub(state.selectedHub);
            }
            if (state.hubs) {
              draft.hubs = state.hubs.map(toMutableHub);
            }
          });
          Logger.info("Loaded persisted hub state");
        }
      } catch (err) {
        Logger.error("Failed to load persisted hub state", err);
      }
    };

    // Save state changes
    const saveState = async (state: HarmonyStore) => {
      try {
        const persistedState = {
          selectedHub: state.selectedHub,
          hubs: state.hubs,
        };
        await LocalStorage.setItem(
          "harmony-hub-state",
          JSON.stringify({ state: persistedState, version: 1 })
        );
        Logger.info("Saved hub state");
      } catch (err) {
        Logger.error("Failed to save hub state", err);
      }
    };

    // Initialize state
    loadPersistedState();

    return {
      // Initial State
      hubs: [],
      selectedHub: null,
      devices: [],
      activities: [],
      currentActivity: null,
      error: null,
      loadingState: {
        stage: HarmonyStage.INITIAL,
        progress: 0,
        message: "Ready",
      },

      // Hub Management Actions
      discoverHubs: async () => {
        try {
          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.DISCOVERING,
              progress: 0,
              message: "Discovering Harmony Hubs...",
            });
            state.error = null;
          });

          // TODO: Implement hub discovery
          const hubs: HarmonyHub[] = [];

          set((state) => {
            state.hubs = hubs.map(toMutableHub);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 1,
              message: `Found ${hubs.length} hub(s)`,
            });
          });
          saveState(get());

          ToastManager.success(`Found ${hubs.length} Harmony Hub(s)`);
        } catch (error) {
          ErrorHandler.handle(error, "Failed to discover hubs", ErrorCategory.DISCOVERY);
          set((state) => {
            state.error = error as HarmonyError;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.ERROR,
              progress: 1,
              message: "Hub discovery failed",
            });
          });
        }
      },

      selectHub: async (hub) => {
        try {
          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTING,
              progress: 0,
              message: `Connecting to ${hub.name}...`,
            });
            state.error = null;
          });

          // TODO: Implement hub connection
          
          set((state) => {
            state.selectedHub = toMutableHub(hub);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Connected to ${hub.name}`,
            });
          });
          saveState(get());

          // Load devices and activities
          await get().loadDevices();
          await get().loadActivities();

          ToastManager.success(`Connected to ${hub.name}`);
        } catch (error) {
          ErrorHandler.handle(error, "Failed to connect to hub", ErrorCategory.CONNECTION);
          set((state) => {
            state.error = error as HarmonyError;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.ERROR,
              progress: 1,
              message: "Connection failed",
            });
          });
        }
      },

      disconnectHub: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) return;

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 0,
              message: "Disconnecting...",
            });
          });

          // TODO: Implement hub disconnection

          set((state) => {
            state.selectedHub = null;
            state.devices = [];
            state.activities = [];
            state.currentActivity = null;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 1,
              message: "Disconnected",
            });
          });
          saveState(get());

          ToastManager.success("Disconnected from Harmony Hub");
        } catch (error) {
          ErrorHandler.handle(error, "Failed to disconnect", ErrorCategory.CONNECTION);
        }
      },

      // Device Management Actions
      loadDevices: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.LOADING_DEVICES,
              progress: 0,
              message: "Loading devices...",
            });
          });

          // TODO: Implement device loading
          const devices: HarmonyDevice[] = [];

          set((state) => {
            state.devices = devices.map(toMutableDevice);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Loaded ${devices.length} devices`,
            });
          });
        } catch (error) {
          ErrorHandler.handle(error, "Failed to load devices", ErrorCategory.DATA);
          set((state) => {
            state.error = error as HarmonyError;
          });
        }
      },

      executeCommand: async (command) => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.EXECUTING_COMMAND,
              progress: 0,
              message: `Executing command: ${command.label}`,
            });
          });

          // TODO: Implement command execution

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Executed command: ${command.label}`,
            });
          });
        } catch (error) {
          ErrorHandler.handle(error, "Failed to execute command", ErrorCategory.COMMAND);
          set((state) => {
            state.error = error as HarmonyError;
          });
        }
      },

      // Activity Management Actions
      loadActivities: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.LOADING_ACTIVITIES,
              progress: 0,
              message: "Loading activities...",
            });
          });

          // TODO: Implement activity loading
          const activities: HarmonyActivity[] = [];

          set((state) => {
            state.activities = activities.map(toMutableActivity);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Loaded ${activities.length} activities`,
            });
          });
        } catch (error) {
          ErrorHandler.handle(error, "Failed to load activities", ErrorCategory.DATA);
          set((state) => {
            state.error = error as HarmonyError;
          });
        }
      },

      startActivity: async (activity) => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.STARTING_ACTIVITY,
              progress: 0,
              message: `Starting activity: ${activity.name}`,
            });
          });

          // TODO: Implement activity start

          set((state) => {
            state.currentActivity = toMutableActivity(activity);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Started activity: ${activity.name}`,
            });
          });

          ToastManager.success(`Started activity: ${activity.name}`);
        } catch (error) {
          ErrorHandler.handle(error, "Failed to start activity", ErrorCategory.COMMAND);
          set((state) => {
            state.error = error as HarmonyError;
          });
        }
      },

      stopActivity: async (activity) => {
        try {
          const { selectedHub, currentActivity } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }
          if (!currentActivity) {
            throw new HarmonyError("No activity is running", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.STOPPING_ACTIVITY,
              progress: 0,
              message: `Stopping activity: ${activity.name}`,
            });
          });

          // TODO: Implement activity stop

          set((state) => {
            state.currentActivity = null;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Stopped activity: ${activity.name}`,
            });
          });

          ToastManager.success(`Stopped activity: ${activity.name}`);
        } catch (error) {
          ErrorHandler.handle(error, "Failed to stop activity", ErrorCategory.COMMAND);
          set((state) => {
            state.error = error as HarmonyError;
          });
        }
      },

      // State Management Actions
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      setLoadingState: (loadingState) => {
        set((state) => {
          state.loadingState = toMutableLoadingState(loadingState);
        });
      },

      reset: () => {
        set((state) => {
          state.hubs = [];
          state.selectedHub = null;
          state.devices = [];
          state.activities = [];
          state.currentActivity = null;
          state.error = null;
          state.loadingState = toMutableLoadingState({
            stage: HarmonyStage.INITIAL,
            progress: 0,
            message: "Ready",
          });
        });
        saveState(get());
      },
    };
  })
);

// Export selectors for common state derivations
export const selectHubs = (state: HarmonyStore) => state.hubs;
export const selectSelectedHub = (state: HarmonyStore) => state.selectedHub;
export const selectDevices = (state: HarmonyStore) => state.devices;
export const selectActivities = (state: HarmonyStore) => state.activities;
export const selectCurrentActivity = (state: HarmonyStore) => state.currentActivity;
export const selectError = (state: HarmonyStore) => state.error;
export const selectLoadingState = (state: HarmonyStore) => state.loadingState;
export const selectIsLoading = (state: HarmonyStore) =>
  state.loadingState.stage !== HarmonyStage.INITIAL &&
  state.loadingState.stage !== HarmonyStage.CONNECTED &&
  state.loadingState.stage !== HarmonyStage.ERROR; 