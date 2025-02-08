/**
 * Types and interfaces for Harmony Hub integration.
 * @module
 */

/**
 * Represents a Logitech Harmony Hub device
 */
export interface HarmonyHub {
  /** Unique identifier for the hub */
  id: string;
  /** User-friendly name of the hub */
  name: string;
  /** Remote ID assigned by Harmony service */
  remoteId?: string;
  /** IP address of the hub on the local network */
  ip: string;
  /** Hub ID from Logitech service */
  hubId?: string;
  /** Version of the hub firmware */
  version?: string;
  /** Port number for hub communication */
  port?: string;
  /** Product ID of the hub */
  productId?: string;
  /** Protocol versions supported by the hub */
  protocolVersion?: string;
}

/**
 * Represents a device controlled by the Harmony Hub
 */
export interface HarmonyDevice {
  /** Unique identifier for the device */
  id: string;
  /** User-friendly name of the device */
  name: string;
  /** Type of device (e.g., TV, Receiver) */
  type: string;
  /** Available commands for this device */
  commands: HarmonyCommand[];
}

/**
 * Represents a command that can be sent to a device
 */
export interface HarmonyCommand {
  /** Command identifier */
  id: string;
  /** Command name */
  name: string;
  /** Device ID this command belongs to */
  deviceId: string;
  /** Command group (e.g., IRCommand) */
  group?: string;
}

/**
 * Command queue configuration
 */
export interface CommandQueueConfig {
  /** Maximum number of commands in queue */
  maxQueueSize?: number;
  /** Maximum concurrent commands */
  maxConcurrent?: number;
  /** Default command timeout in ms */
  defaultTimeout?: number;
  /** Default number of retries */
  defaultRetries?: number;
  /** Delay between commands in ms */
  commandDelay?: number;
}

/**
 * Represents an activity configured on the Harmony Hub
 */
export interface HarmonyActivity {
  /** Activity identifier */
  id: string;
  /** User-friendly name */
  name: string;
  /** Activity type */
  type: string;
  /** Whether this is the current activity */
  isCurrent: boolean;
  /** Whether this is an AV activity */
  isAVActivity?: boolean;
  /** Display name for activity type */
  activityTypeDisplayName?: string;
  /** Control groups */
  controlGroup?: any[];
  /** Fix-it options */
  fixit?: any;
  /** Activity rules */
  rules?: any[];
  /** Activity sequences */
  sequences?: any[];
  /** Suggested display name */
  suggestedDisplay?: string;
  /** Activity status */
  status?: string;
}

/**
 * Stage of the Harmony Hub connection process
 */
export enum HarmonyStage {
  DISCOVERING = "DISCOVERING",
  CONNECTING = "CONNECTING",
  LOADING = "LOADING",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR"
}

/**
 * Loading state information
 */
export interface LoadingState {
  /** Current stage of loading */
  stage: HarmonyStage;
  /** Progress percentage (0-100) */
  progress: number;
  /** User-friendly message */
  message: string;
}

/**
 * Current state of the Harmony Hub system
 */
export interface HarmonyState {
  /** Available hubs */
  hubs: HarmonyHub[];
  /** Currently selected hub */
  selectedHub: HarmonyHub | null;
  /** Available devices */
  devices: HarmonyDevice[];
  /** Available activities */
  activities: HarmonyActivity[];
  /** Current activity */
  currentActivity: HarmonyActivity | null;
  /** Current error if any */
  error: Error | null;
  /** Loading state */
  loadingState: LoadingState;
}

/**
 * Error categories for Harmony operations
 */
export enum ErrorCategory {
  DISCOVERY = "DISCOVERY",
  CONNECTION = "CONNECTION",
  STATE = "STATE",
  COMMAND = "COMMAND",
  ACTIVITY = "ACTIVITY",
  DEVICE = "DEVICE",
  HUB_COMMUNICATION = "HUB_COMMUNICATION",
  UNKNOWN = "UNKNOWN"
}

/**
 * Message handler type.
 */
export type MessageHandler = (message: any) => void;

/**
 * Error handler type.
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Hub discovery handler type.
 */
export type HubDiscoveryHandler = (hub: HarmonyHub) => void;

/**
 * Status of a command in the queue
 */
export enum CommandStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT"
}

/**
 * Command request for the queue
 */
export interface CommandRequest {
  /** Request identifier */
  id: string;
  /** Command to execute */
  command: HarmonyCommand;
  /** Timestamp of request */
  timestamp: number;
  /** Number of retries */
  retries?: number;
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  /** Request identifier */
  id: string;
  /** Command that was executed */
  command: HarmonyCommand;
  /** Final status */
  status: CommandStatus;
  /** Error if failed */
  error?: Error;
  /** Request timestamp */
  timestamp: number;
  /** Completion timestamp */
  completedAt?: number;
}
