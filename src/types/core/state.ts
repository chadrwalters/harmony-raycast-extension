/**
 * State-related type definitions for Harmony Hub integration
 * @module
 */

import type { HarmonyError } from "./errors";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity } from "./harmony";
import type { LoadingState } from "./harmony";

/**
 * State machine states for Harmony Hub control
 * @enum {string}
 */
export enum MachineState {
  /** Initial state */
  IDLE = "IDLE",
  /** Discovering available hubs */
  DISCOVERING = "DISCOVERING",
  /** Connecting to a hub */
  CONNECTING = "CONNECTING",
  /** Connected to a hub */
  CONNECTED = "CONNECTED",
  /** Error state */
  ERROR = "ERROR",
}

/**
 * Context data for Harmony state machine
 * @interface MachineContext
 */
export interface MachineContext {
  /** List of available hubs */
  readonly hubs: readonly HarmonyHub[];
  /** Currently selected hub */
  readonly selectedHub: HarmonyHub | null;
  /** Available devices on the hub */
  readonly devices: readonly HarmonyDevice[];
  /** Available activities on the hub */
  readonly activities: readonly HarmonyActivity[];
  /** Currently running activity */
  readonly currentActivity: HarmonyActivity | null;
  /** Error state if any */
  readonly error: HarmonyError | null;
}

/**
 * Event payload for hub discovery
 * @interface DiscoverEvent
 */
export interface DiscoverEvent {
  readonly type: "DISCOVER";
}

/**
 * Event payload for hub selection
 * @interface SelectHubEvent
 */
export interface SelectHubEvent {
  readonly type: "SELECT_HUB";
  /** Hub to select */
  readonly hub: HarmonyHub;
}

/**
 * Event payload for state refresh
 * @interface RefreshEvent
 */
export interface RefreshEvent {
  readonly type: "REFRESH";
}

/**
 * Event payload for retrying a failed action
 * @interface RetryEvent
 */
export interface RetryEvent {
  readonly type: "RETRY";
}

/**
 * Event payload for clearing the state
 * @interface ClearEvent
 */
export interface ClearEvent {
  readonly type: "CLEAR";
}

/**
 * Event payload for hub disconnection
 * @interface DisconnectEvent
 */
export interface DisconnectEvent {
  readonly type: "DISCONNECT";
}

/**
 * Event payload for error state
 * @interface ErrorEvent
 */
export interface ErrorEvent {
  readonly type: "error.platform";
  /** Error that occurred */
  readonly data: HarmonyError;
}

/**
 * Event payload for done discovering hubs
 * @interface DoneDiscoverEvent
 */
export interface DoneDiscoverEvent {
  readonly type: "done.invoke.discoverHubs";
  /** List of discovered hubs */
  readonly data: {
    readonly hubs: readonly HarmonyHub[];
  };
}

/**
 * Event payload for done loading hub data
 * @interface DoneLoadHubEvent
 */
export interface DoneLoadHubEvent {
  readonly type: "done.invoke.loadHubData";
  /** Loaded hub data */
  readonly data: {
    readonly devices: readonly HarmonyDevice[];
    readonly activities: readonly HarmonyActivity[];
  };
}

/**
 * Union type of all possible state machine events
 * @type {MachineEvent}
 */
export type MachineEvent =
  | DiscoverEvent
  | SelectHubEvent
  | DisconnectEvent
  | RefreshEvent
  | RetryEvent
  | ClearEvent
  | ErrorEvent
  | DoneDiscoverEvent
  | DoneLoadHubEvent;

/**
 * Service types for XState
 * @interface MachineServices
 */
export interface MachineServices {
  readonly discoverHubs: {
    readonly data: { readonly hubs: readonly HarmonyHub[] };
  };
  readonly loadHubData: {
    readonly data: {
      readonly devices: readonly HarmonyDevice[];
      readonly activities: readonly HarmonyActivity[];
    };
  };
}

/**
 * Core state for Harmony operations
 * @interface HarmonyState
 */
export interface HarmonyState {
  /** Available Harmony Hubs */
  readonly hubs: readonly HarmonyHub[];
  /** Currently selected hub */
  readonly selectedHub: HarmonyHub | null;
  /** Available devices */
  readonly devices: readonly HarmonyDevice[];
  /** Available activities */
  readonly activities: readonly HarmonyActivity[];
  /** Currently running activity */
  readonly currentActivity: HarmonyActivity | null;
  /** Current error if any */
  readonly error: Error | null;
  /** Current loading state */
  readonly loadingState: LoadingState;
}
