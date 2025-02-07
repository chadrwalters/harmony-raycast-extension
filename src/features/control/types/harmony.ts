/**
 * Types and interfaces for Harmony Hub integration.
 * @module
 */

/**
 * Represents a Harmony Hub device on the network.
 */
export interface HarmonyHub {
  /** Unique identifier for the hub */
  id: string;
  /** IP address of the hub */
  ip: string;
  /** Friendly name of the hub */
  name: string;
  /** Remote ID for the hub */
  remoteId: string;
  /** Optional port number */
  port?: string;
  /** Optional hub ID */
  hubId?: string;
  /** Optional firmware version */
  version?: string;
}

/**
 * Represents a device that can be controlled through the Harmony Hub.
 */
export interface HarmonyDevice {
  /** Unique identifier for the device */
  id: string;
  /** Display name of the device */
  label: string;
  /** Optional device type */
  type?: string;
  /** List of available commands for this device */
  commands?: HarmonyCommand[];
}

/**
 * Represents a command that can be executed on a Harmony device.
 */
export interface HarmonyCommand {
  /** Unique identifier for the command */
  id: string;
  /** Display name of the command */
  label: string;
  /** ID of the device this command belongs to */
  deviceId: string;
}

/**
 * Represents an activity that can be performed through the Harmony Hub.
 */
export interface HarmonyActivity {
  /** Unique identifier for the activity */
  id: string;
  /** Display name of the activity */
  label: string;
  /** Whether this is an AV activity */
  isAVActivity?: boolean;
  /** Whether this is the default tuning activity */
  isTuningDefault?: boolean;
  /** Current status of the activity */
  status?: string;
  /** Whether the activity is currently active */
  isActive?: boolean;
}

/**
 * Possible states of a Harmony activity.
 */
export enum ActivityStatus {
  /** Activity is in the process of starting */
  STARTING = "starting",
  /** Activity has successfully started */
  STARTED = "started",
  /** Activity is in the process of stopping */
  STOPPING = "stopping",
  /** Activity has stopped */
  STOPPED = "stopped",
}

/**
 * Current state of the Harmony Hub system.
 */
export interface HarmonyState {
  /** Currently active activity, if any */
  currentActivity?: HarmonyActivity;
  /** List of discovered Harmony Hubs */
  discoveredHubs: HarmonyHub[];
  /** Currently selected Harmony Hub */
  selectedHub?: HarmonyHub;
  /** List of available devices */
  devices: HarmonyDevice[];
  /** List of available activities */
  activities: HarmonyActivity[];
  /** Error message, if any */
  error?: string;
}

/**
 * Data structure for caching Harmony Hub information.
 */
export interface CachedHarmonyData {
  /** The Harmony Hub this cache is for */
  hub: HarmonyHub;
  /** Timestamp when the cache was created */
  timestamp: number;
  /** List of available devices */
  devices: HarmonyDevice[];
  /** List of available activities */
  activities: HarmonyActivity[];
}

/**
 * Raw response from the Harmony Hub API.
 */
export interface HarmonyResponse {
  /** Unique identifier */
  id?: string;
  /** Display label */
  label?: string;
  /** Type information */
  type?: string;
  /** Available commands */
  commands?: HarmonyCommand[];
  /** Whether this is an AV activity */
  isAVActivity?: boolean;
  /** Whether this is the default tuning activity */
  isTuningDefault?: boolean;
  /** Current status */
  status?: string;
  /** Remote ID */
  remoteId?: string;
  /** Friendly name */
  friendlyName?: string;
  /** IP address */
  ip?: string;
  /** Device ID */
  deviceId?: string;
  /** Action to perform */
  action?: string;
}
