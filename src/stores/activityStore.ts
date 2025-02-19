/**
 * Store for managing Harmony Hub activities.
 * Handles activity listing, execution, and state tracking.
 * @module
 */

import { create } from "zustand";
import { HarmonyActivity } from "../types/core/harmony";

/**
 * State interface for the activity store.
 * Contains activity list, current activity, and execution states.
 * @interface ActivityState
 */
interface ActivityState {
  /** List of available activities from the hub */
  activities: HarmonyActivity[];
  /** Currently running activity on the hub */
  currentActivity: HarmonyActivity | null;
  /** Whether activities are being loaded from the hub */
  isLoading: boolean;
  /** Error message if loading or execution failed */
  error: string | null;
  /** Whether an activity change is in progress */
  isChanging: boolean;
  /** Timestamp of the last activity state change */
  lastChangeTime: number | null;
}

/**
 * Actions that can be performed on the activity store.
 * Includes activity management and execution operations.
 * @interface ActivityActions
 */
interface ActivityActions {
  /** Set the list of available activities
   * @param activities - List of activities to set
   */
  setActivities: (activities: HarmonyActivity[]) => void;

  /** Update the currently running activity
   * @param activity - Activity that is now running, or null if none
   */
  setCurrentActivity: (activity: HarmonyActivity | null) => void;

  /** Set the loading state
   * @param isLoading - Whether activities are being loaded
   */
  setLoading: (isLoading: boolean) => void;

  /** Set an error message
   * @param error - Error message to display, or null to clear
   */
  setError: (error: string | null) => void;

  /** Start an activity change operation
   * @param activity - Activity being started
   */
  startChange: (activity: HarmonyActivity) => void;

  /** Complete an activity change operation
   * @param success - Whether the change was successful
   * @param error - Error message if change failed
   */
  completeChange: (success: boolean, error?: string) => void;

  /** Reset the store to its initial state */
  reset: () => void;
}

/** Initial state for the activity store */
const initialState: ActivityState = {
  activities: [],
  currentActivity: null,
  isLoading: false,
  error: null,
  isChanging: false,
  lastChangeTime: null,
};

/**
 * Store for managing Harmony Hub activities.
 * Handles activity loading, tracking current activity, and activity changes.
 * Uses Zustand for state management.
 */
export const useActivityStore = create<ActivityState & ActivityActions>((set) => ({
  ...initialState,

  setActivities: (activities) =>
    set({
      activities,
      isLoading: false,
      error: null,
    }),

  setCurrentActivity: (activity) =>
    set({
      currentActivity: activity,
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
      isChanging: false,
    }),

  startChange: (activity) =>
    set({
      isChanging: true,
      error: null,
    }),

  completeChange: (success, error) =>
    set({
      isChanging: false,
      error: error || null,
      lastChangeTime: Date.now(),
    }),

  reset: () => set(initialState),
})); 