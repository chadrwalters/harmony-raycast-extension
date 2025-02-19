/**
 * Store for managing view state in the application
 * @module
 */

import { create } from "zustand";

/**
 * Available views in the application
 */
export enum View {
  /** View for managing devices */
  DEVICES = "devices",
  /** View for managing activities */
  ACTIVITIES = "activities",
  /** View for executing commands */
  COMMANDS = "commands",
}

/**
 * State interface for the view store
 */
interface ViewState {
  /** Currently active view */
  currentView: View;
  /** Previously active view */
  previousView: View | null;
  /** Whether the view is in a loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Selected device ID if in device view */
  selectedDeviceId: string | null;
  /** Selected activity ID if in activity view */
  selectedActivityId: string | null;
}

/**
 * Actions that can be performed on the view store
 */
interface ViewActions {
  /** Set the current view
   * @param view - View to set as current
   */
  setView: (view: View) => void;

  /** Set the loading state
   * @param isLoading - Whether the view is loading
   */
  setLoading: (isLoading: boolean) => void;

  /** Set an error message
   * @param error - Error message to display
   */
  setError: (error: string | null) => void;

  /** Select a device
   * @param deviceId - ID of the device to select
   */
  selectDevice: (deviceId: string | null) => void;

  /** Select an activity
   * @param activityId - ID of the activity to select
   */
  selectActivity: (activityId: string | null) => void;

  /** Reset the store to its initial state */
  reset: () => void;
}

/**
 * Initial state for the view store
 */
const initialState: ViewState = {
  currentView: View.DEVICES,
  previousView: null,
  isLoading: false,
  error: null,
  selectedDeviceId: null,
  selectedActivityId: null,
};

/**
 * Store for managing view state
 * Handles view transitions, loading states, and selection
 */
export const useViewStore = create<ViewState & ViewActions>((set) => ({
  ...initialState,

  setView: (view) =>
    set((state) => ({
      currentView: view,
      previousView: state.currentView,
    })),

  setLoading: (isLoading) =>
    set({
      isLoading,
      error: null,
    }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  selectDevice: (deviceId) =>
    set({
      selectedDeviceId: deviceId,
      selectedActivityId: null,
    }),

  selectActivity: (activityId) =>
    set({
      selectedActivityId: activityId,
      selectedDeviceId: null,
    }),

  reset: () => set(initialState),
})); 