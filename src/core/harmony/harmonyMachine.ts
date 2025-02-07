/**
 * State machine for managing Harmony Hub states and transitions.
 * @module
 */

import { EventEmitter } from "events";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../features/control/types/harmony";
import { Logger } from "../logging/logger";
import { ErrorHandler } from "../logging/errorHandler";
import { ErrorCategory } from "../../types/error";
import { createMachine } from "xstate";

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
interface HarmonyContext {
  /** Current hub */
  hub?: HarmonyHub;
  /** Current device */
  device?: HarmonyDevice;
  /** Current command */
  command?: any;
  /** Current error */
  error?: string | null;
  /** Hubs */
  hubs: HarmonyHub[];
  /** Selected hub */
  selectedHub: HarmonyHub | null;
  /** Devices */
  devices: HarmonyDevice[];
  /** Activities */
  activities: HarmonyActivity[];
  /** Current activity */
  currentActivity: string | null;
}

/**
 * State machine for managing Harmony Hub operations.
 * Implements a finite state machine pattern for handling hub states and transitions.
 */
export class HarmonyMachine extends EventEmitter {
  harmonyMachine = createMachine({
    id: "harmony",
    initial: "idle",
    context: {
      state: {
        hubs: [],
        selectedHub: null,
        devices: [],
        activities: [],
        currentActivity: null,
        error: null,
      },
    },
    states: {
      idle: {
        /**
         * Initial state.
         * Can transition to discovering, connecting, or loading cache.
         */
        on: {
          /**
           * Start hub discovery.
           */
          DISCOVER: "discovering",
          /**
           * Start connection.
           */
          CONNECT: {
            target: "connecting",
            cond: (context: HarmonyContext) => !!context.state.selectedHub,
          },
          /**
           * Load cache.
           */
          LOAD_CACHE: "loadingCache",
        },
      },
      loadingCache: {
        /**
         * Loading cache state.
         * Can transition to connected, idle, or error.
         */
        on: {
          /**
           * Cache loaded.
           */
          CACHE_LOADED: {
            target: "connected",
            actions: ["updateStateFromCache"],
          },
          /**
           * Cache empty.
           */
          CACHE_EMPTY: "idle",
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
      discovering: {
        /**
         * Discovering hubs state.
         * Can transition to idle or error.
         */
        on: {
          /**
           * Hub found.
           */
          HUB_FOUND: {
            target: "idle",
            actions: ["addDiscoveredHub"],
          },
          /**
           * Discovery complete.
           */
          DISCOVERY_COMPLETE: "idle",
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
      connecting: {
        /**
         * Connecting to hub state.
         * Can transition to fetching config or error.
         */
        on: {
          /**
           * Connected.
           */
          CONNECTED: "fetchingConfig",
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
      fetchingConfig: {
        /**
         * Fetching config state.
         * Can transition to connected or error.
         */
        on: {
          /**
           * Config loaded.
           */
          CONFIG_LOADED: {
            target: "connected",
            actions: ["updateConfig"],
          },
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
      connected: {
        /**
         * Connected state.
         * Can transition to disconnecting, update activity, execute command, or error.
         */
        on: {
          /**
           * Disconnect.
           */
          DISCONNECT: "disconnecting",
          /**
           * Update activity.
           */
          UPDATE_ACTIVITY: {
            actions: ["updateActivity"],
          },
          /**
           * Execute command.
           */
          EXECUTE_COMMAND: {
            actions: ["executeCommand"],
          },
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
      disconnecting: {
        /**
         * Disconnecting state.
         * Can transition to idle or error.
         */
        on: {
          /**
           * Disconnected.
           */
          DISCONNECTED: "idle",
          /**
           * Error occurred.
           */
          ERROR: {
            target: "idle",
            actions: ["setError"],
          },
        },
      },
    },
  });
}
