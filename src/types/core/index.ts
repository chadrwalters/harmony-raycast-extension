/**
 * Core types and utilities for Harmony Hub integration
 * @module
 */

// Base types
export * from "./harmony";
export * from "./errors";
export * from "./validation";
export * from "./command";
export * from "./logging";
export * from "./websocket";
export * from "./state";

// Re-export commonly used types for convenience
export type {
  // Harmony types
  HarmonyHub,
  HarmonyDevice,
  HarmonyCommand,
  HarmonyActivity,
  LoadingState,
} from "./harmony";

// Re-export commonly used enums
export {
  // Harmony enums
  HarmonyStage,
  ErrorCategory,
} from "./harmony";

// Re-export error types
export {
  HarmonyError,
  isHarmonyError,
  wrapError,
} from "./errors";

// Re-export validation functions
export {
  validateHub,
  validateDevice,
  validateCommand,
  validateActivity,
  validateLoadingState,
} from "./validation";

// Re-export command types
export type {
  CommandQueueConfig,
  CommandRequest,
  CommandResult,
  RetryConfig,
  TimeoutConfig,
  RetryContext,
} from "./command";

export {
  CommandStatus,
  ErrorRecoveryAction,
} from "./command";

// Re-export logging types
export type {
  LoggerOptions,
  LogEntry,
  ILogger,
  LogFilter,
  LogFormatter,
} from "./logging";

export {
  LogLevel,
  ErrorSeverity,
} from "./logging";

// Re-export WebSocket types
export type {
  WebSocketMessage,
  CommandPayload,
  ActivityPayload,
  WebSocketMessageUnion,
  WebSocketResponse,
  ActivitiesResponse,
  DevicesResponse,
  WebSocketEventHandler,
  WebSocketErrorHandler,
  QueuedMessage,
} from "./websocket";

export {
  WebSocketConnectionStatus,
  WebSocketMessageType,
} from "./websocket";

// Re-export state types
export type {
  MachineContext,
  DiscoverEvent,
  SelectHubEvent,
  RefreshEvent,
  RetryEvent,
  ClearEvent,
  DisconnectEvent,
  ErrorEvent,
  DoneDiscoverEvent,
  DoneLoadHubEvent,
  MachineEvent,
  MachineServices,
  HarmonyState,
} from "./state";

export {
  MachineState,
} from "./state"; 