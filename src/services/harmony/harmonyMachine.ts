/**
 * State machine for managing Harmony Hub states and transitions.
 * @module
 */

import { createMachine, assign } from "xstate";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/harmony";
import { Logger } from "../logger";
import { ErrorCategory } from "../../types/errors";

/**
 * Possible states for the Harmony Hub state machine.
 */
export enum HarmonyState {
  /** Initial state */
  IDLE = "idle",
  /** Discovering hubs */
  DISCOVERING = "discovering",
  /** Connecting to hub */
  CONNECTING = "connecting",
  /** Connected and ready */
  CONNECTED = "connected",
  /** Executing command */
  EXECUTING = "executing",
  /** Error state */
  ERROR = "error",
}

/**
 * Events that can trigger state transitions.
 */
export enum HarmonyEvent {
  /** Start hub discovery */
  START_DISCOVERY = "start_discovery",
  /** Hub discovered */
  HUB_DISCOVERED = "hub_discovered",
  /** Start connection */
  START_CONNECTION = "start_connection",
  /** Connection established */
  CONNECTION_ESTABLISHED = "connection_established",
  /** Start command execution */
  START_EXECUTION = "start_execution",
  /** Command completed */
  EXECUTION_COMPLETE = "execution_complete",
  /** Error occurred */
  ERROR = "error",
  /** Reset state */
  RESET = "reset",
}

/**
 * Context for the state machine.
 */
export interface HarmonyContext {
  hub?: HarmonyHub;
  device?: HarmonyDevice;
  command?: any;
  error?: string | null;
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: string | null;
}

/**
 * State machine for managing Harmony Hub operations.
 * Implements a finite state machine pattern for handling hub states and transitions.
 */
export const harmonyMachine = createMachine({
  id: "harmony",
  initial: "idle",
  context: {
    hubs: [],
    selectedHub: null,
    devices: [],
    activities: [],
    currentActivity: null,
    error: null,
  } as HarmonyContext,
  states: {
    idle: {
      on: {
        [HarmonyEvent.START_DISCOVERY]: "discovering",
        [HarmonyEvent.START_CONNECTION]: {
          target: "connecting",
          cond: (context: HarmonyContext) => !!context.selectedHub,
        },
      },
    },
    discovering: {
      on: {
        [HarmonyEvent.HUB_DISCOVERED]: {
          target: "idle",
          actions: assign({
            hubs: (context, event) => [...context.hubs, event.hub],
          }),
        },
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: assign({
            error: (_, event) => event.error,
          }),
        },
      },
    },
    connecting: {
      on: {
        [HarmonyEvent.CONNECTION_ESTABLISHED]: "connected",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: assign({
            error: (_, event) => event.error,
          }),
        },
      },
    },
    connected: {
      on: {
        [HarmonyEvent.START_EXECUTION]: "executing",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: assign({
            error: (_, event) => event.error,
          }),
        },
      },
    },
    executing: {
      on: {
        [HarmonyEvent.EXECUTION_COMPLETE]: "connected",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: assign({
            error: (_, event) => event.error,
          }),
        },
      },
    },
    error: {
      on: {
        [HarmonyEvent.RESET]: {
          target: "idle",
          actions: assign({
            error: () => null,
          }),
        },
      },
    },
  },
});
