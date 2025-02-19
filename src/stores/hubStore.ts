/**
 * Store for managing Harmony Hub connections.
 * Handles hub discovery, selection, and connection state.
 * @module
 */

import { create } from "zustand";
import { HarmonyHub } from "../types/core/harmony";

/**
 * State interface for the hub store.
 * Contains hub list, selection, and connection states.
 * @interface HubState
 */
interface HubState {
  /** List of discovered Harmony Hubs */
  hubs: HarmonyHub[];
  /** Currently selected hub for interaction */
  selectedHub: HarmonyHub | null;
  /** Whether hub discovery is in progress */
  isDiscovering: boolean;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** Error message if discovery or connection failed */
  error: string | null;
  /** Timestamp of the last successful discovery */
  lastDiscoveryTime: number | null;
  /** Timestamp of the last successful connection */
  lastConnectionTime: number | null;
}

/**
 * Actions that can be performed on the hub store.
 * Includes hub management, discovery, and connection operations.
 * @interface HubActions
 */
interface HubActions {
  /** Set the list of discovered hubs
   * @param hubs - List of hubs to set
   */
  setHubs: (hubs: HarmonyHub[]) => void;

  /** Select a hub for interaction
   * @param hub - Hub to select, or null to clear selection
   */
  selectHub: (hub: HarmonyHub | null) => void;

  /** Set the discovery state
   * @param isDiscovering - Whether discovery is in progress
   */
  setDiscovering: (isDiscovering: boolean) => void;

  /** Set the connection state
   * @param isConnecting - Whether connection is in progress
   */
  setConnecting: (isConnecting: boolean) => void;

  /** Set an error message
   * @param error - Error message to display, or null to clear
   */
  setError: (error: string | null) => void;

  /** Start hub discovery process */
  startDiscovery: () => void;

  /** Complete hub discovery process
   * @param success - Whether discovery was successful
   * @param error - Error message if discovery failed
   */
  completeDiscovery: (success: boolean, error?: string) => void;

  /** Start hub connection process
   * @param hub - Hub to connect to
   */
  startConnection: (hub: HarmonyHub) => void;

  /** Complete hub connection process
   * @param success - Whether connection was successful
   * @param error - Error message if connection failed
   */
  completeConnection: (success: boolean, error?: string) => void;

  /** Reset the store to its initial state */
  reset: () => void;
}

/** Initial state for the hub store */
const initialState: HubState = {
  hubs: [],
  selectedHub: null,
  isDiscovering: false,
  isConnecting: false,
  error: null,
  lastDiscoveryTime: null,
  lastConnectionTime: null,
};

/**
 * Store for managing Harmony Hub connections.
 * Handles hub discovery, selection, and connection state.
 * Uses Zustand for state management.
 */
export const useHubStore = create<HubState & HubActions>((set) => ({
  ...initialState,

  setHubs: (hubs) =>
    set({
      hubs,
      isDiscovering: false,
      error: null,
    }),

  selectHub: (hub) =>
    set({
      selectedHub: hub,
    }),

  setDiscovering: (isDiscovering) =>
    set({
      isDiscovering,
      error: null,
    }),

  setConnecting: (isConnecting) =>
    set({
      isConnecting,
      error: null,
    }),

  setError: (error) =>
    set({
      error,
      isDiscovering: false,
      isConnecting: false,
    }),

  startDiscovery: () =>
    set({
      isDiscovering: true,
      error: null,
    }),

  completeDiscovery: (success, error) =>
    set({
      isDiscovering: false,
      error: error || null,
      lastDiscoveryTime: Date.now(),
    }),

  startConnection: (hub) =>
    set({
      selectedHub: hub,
      isConnecting: true,
      error: null,
    }),

  completeConnection: (success, error) =>
    set({
      isConnecting: false,
      error: error || null,
      lastConnectionTime: Date.now(),
    }),

  reset: () => set(initialState),
})); 