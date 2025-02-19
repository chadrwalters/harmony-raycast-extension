/**
 * Core type definitions for Harmony Hub integration
 * @module
 */

/**
 * Represents a Logitech Harmony Hub device on the network
 * @interface HarmonyHub
 */
export interface HarmonyHub {
  /** Unique identifier for the hub */
  readonly id: string;
  /** User-friendly name of the hub */
  readonly name: string;
  /** IP address of the hub on the local network */
  readonly ip: string;
  /** Remote ID assigned by Harmony service */
  readonly remoteId?: string;
  /** Hub ID from Logitech service */
  readonly hubId?: string;
  /** Version of the hub firmware */
  readonly version?: string;
  /** Port number for hub communication */
  readonly port?: string;
  /** Product ID of the hub */
  readonly productId?: string;
  /** Protocol versions supported by the hub */
  readonly protocolVersion?: string;
}

/**
 * Represents a device that can be controlled by the Harmony Hub
 * @interface HarmonyDevice
 */
export interface HarmonyDevice {
  /** Unique identifier for the device */
  readonly id: string;
  /** User-friendly name of the device */
  readonly name: string;
  /** Type of device (e.g., TV, Receiver, etc.) */
  readonly type: string;
  /** Available commands for this device */
  readonly commands: readonly HarmonyCommand[];
}

/**
 * Represents a command that can be sent to a device
 * @interface HarmonyCommand
 */
export interface HarmonyCommand {
  /** Unique identifier for the command */
  readonly id: string;
  /** Internal name of the command */
  readonly name: string;
  /** User-friendly label for display */
  readonly label: string;
  /** ID of the device this command belongs to */
  readonly deviceId: string;
  /** Command group for categorization (e.g., "IRCommand", "PowerToggle", etc.) */
  readonly group?: string;
}

/**
 * Represents an activity configured on the Harmony Hub
 * @interface HarmonyActivity
 */
export interface HarmonyActivity {
  /** Unique identifier for the activity */
  readonly id: string;
  /** User-friendly name of the activity */
  readonly name: string;
  /** Type of activity (e.g., "WatchTV", "ListenToMusic", etc.) */
  readonly type: string;
  /** Whether this is the currently running activity */
  readonly isCurrent: boolean;
}

/**
 * Represents the stage of the Harmony Hub connection process
 * @enum {string}
 */
export enum HarmonyStage {
  /** Initial state before any connection attempt */
  INITIAL = "initial",
  /** Actively discovering hubs on the network */
  DISCOVERING = "discovering",
  /** Establishing connection to a specific hub */
  CONNECTING = "connecting",
  /** Loading device information from the hub */
  LOADING_DEVICES = "loading_devices",
  /** Loading activity information from the hub */
  LOADING_ACTIVITIES = "loading_activities",
  /** Starting a new activity */
  STARTING_ACTIVITY = "starting_activity",
  /** Stopping the current activity */
  STOPPING_ACTIVITY = "stopping_activity",
  /** Executing a device command */
  EXECUTING_COMMAND = "executing_command",
  /** Refreshing hub state */
  REFRESHING = "refreshing",
  /** Successfully connected and ready */
  CONNECTED = "connected",
  /** Error state */
  ERROR = "error"
}

/**
 * Categories of errors that can occur during Harmony operations
 * @enum {string}
 */
export enum ErrorCategory {
  /** Network or connectivity errors */
  CONNECTION = "connection",
  /** Hub discovery errors */
  DISCOVERY = "discovery",
  /** Command execution errors */
  COMMAND = "command",
  /** State management errors */
  STATE = "state",
  /** Data retrieval or parsing errors */
  DATA = "data",
  /** Hub communication errors */
  HUB_COMMUNICATION = "hub_communication",
  /** Command execution specific errors */
  COMMAND_EXECUTION = "command_execution",
  /** Activity start errors */
  ACTIVITY_START = "activity_start",
  /** Activity stop errors */
  ACTIVITY_STOP = "activity_stop",
  /** Validation errors */
  VALIDATION = "validation",
  /** Storage errors */
  STORAGE = "storage",
  /** Cache errors */
  CACHE = "cache",
  /** Queue errors */
  QUEUE = "queue",
  /** Network-specific errors */
  NETWORK = "network",
  /** Harmony-specific errors */
  HARMONY = "harmony",
  /** WebSocket errors */
  WEBSOCKET = "websocket",
  /** Authentication errors */
  AUTHENTICATION = "authentication",
  /** System-level errors */
  SYSTEM = "system",
  /** Unknown errors */
  UNKNOWN = "unknown"
}

/**
 * Recovery actions available for different error types
 * @enum {string}
 */
export enum ErrorRecoveryAction {
  /** Retry the failed operation */
  RETRY = "retry",
  /** Reconnect to the hub */
  RECONNECT = "reconnect",
  /** Clear local cache */
  CLEAR_CACHE = "clear_cache",
  /** Reset configuration */
  RESET_CONFIG = "reset_config",
  /** Restart the hub */
  RESTART = "restart",
  /** Manual intervention required */
  MANUAL = "manual"
}

/**
 * Represents the loading state during operations
 * @interface LoadingState
 */
export interface LoadingState {
  /** Current stage of the process */
  readonly stage: HarmonyStage;
  /** Progress from 0 to 1 */
  readonly progress: number;
  /** User-friendly message about the current state */
  readonly message: string;
}

/**
 * Configuration for operation timeouts
 */
export interface TimeoutConfig {
  /** Timeout for network operations in milliseconds */
  connection: number;
  /** Timeout for message operations in milliseconds */
  message: number;
  /** Timeout for activity operations in milliseconds */
  activity: number;
  /** Timeout for command operations in milliseconds */
  command: number;
  /** Timeout for discovery operations in milliseconds */
  discovery: number;
  /** Timeout for cache operations in milliseconds */
  cache: number;
}

/**
 * Type guard to check if an object is a HarmonyHub
 * @param obj The object to check
 * @returns True if the object is a HarmonyHub
 */
export function isHarmonyHub(obj: unknown): obj is HarmonyHub {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HarmonyHub).id === "string" &&
    typeof (obj as HarmonyHub).name === "string" &&
    typeof (obj as HarmonyHub).ip === "string"
  );
}

/**
 * Type guard to check if an object is a HarmonyDevice
 * @param obj The object to check
 * @returns True if the object is a HarmonyDevice
 */
export function isHarmonyDevice(obj: unknown): obj is HarmonyDevice {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HarmonyDevice).id === "string" &&
    typeof (obj as HarmonyDevice).name === "string" &&
    typeof (obj as HarmonyDevice).type === "string" &&
    Array.isArray((obj as HarmonyDevice).commands)
  );
}

/**
 * Type guard to check if an object is a HarmonyCommand
 * @param obj The object to check
 * @returns True if the object is a HarmonyCommand
 */
export function isHarmonyCommand(obj: unknown): obj is HarmonyCommand {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HarmonyCommand).id === "string" &&
    typeof (obj as HarmonyCommand).name === "string" &&
    typeof (obj as HarmonyCommand).label === "string" &&
    typeof (obj as HarmonyCommand).deviceId === "string"
  );
}

/**
 * Type guard to check if an object is a HarmonyActivity
 * @param obj The object to check
 * @returns True if the object is a HarmonyActivity
 */
export function isHarmonyActivity(obj: unknown): obj is HarmonyActivity {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HarmonyActivity).id === "string" &&
    typeof (obj as HarmonyActivity).name === "string" &&
    typeof (obj as HarmonyActivity).type === "string" &&
    typeof (obj as HarmonyActivity).isCurrent === "boolean"
  );
}

/**
 * Validation utility to ensure a HarmonyHub object is valid
 * @param hub The hub object to validate
 * @throws {Error} If the hub object is invalid
 */
export function validateHarmonyHub(hub: HarmonyHub): void {
  if (!isHarmonyHub(hub)) {
    throw new Error("Invalid HarmonyHub object");
  }
}

/**
 * Validation utility to ensure a HarmonyDevice object is valid
 * @param device The device object to validate
 * @throws {Error} If the device object is invalid
 */
export function validateHarmonyDevice(device: HarmonyDevice): void {
  if (!isHarmonyDevice(device)) {
    throw new Error("Invalid HarmonyDevice object");
  }
  device.commands.forEach(validateHarmonyCommand);
}

/**
 * Validation utility to ensure a HarmonyCommand object is valid
 * @param command The command object to validate
 * @throws {Error} If the command object is invalid
 */
export function validateHarmonyCommand(command: HarmonyCommand): void {
  if (!isHarmonyCommand(command)) {
    throw new Error("Invalid HarmonyCommand object");
  }
}

/**
 * Validation utility to ensure a HarmonyActivity object is valid
 * @param activity The activity object to validate
 * @throws {Error} If the activity object is invalid
 */
export function validateHarmonyActivity(activity: HarmonyActivity): void {
  if (!isHarmonyActivity(activity)) {
    throw new Error("Invalid HarmonyActivity object");
  }
} 