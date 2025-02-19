/**
 * Store for managing command execution state.
 * Handles command queuing, execution tracking, and statistics.
 * @module
 */

import { create } from "zustand";
import { HarmonyCommand } from "../types/core/harmony";

/**
 * State interface for the command store.
 * Contains command execution state and statistics.
 * @interface CommandState
 */
interface CommandState {
  /** Currently executing command */
  currentCommand: HarmonyCommand | null;
  /** Queue of commands waiting to be executed */
  commandQueue: HarmonyCommand[];
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Error message if command execution failed */
  error: string | null;
  /** Number of commands successfully executed */
  successCount: number;
  /** Number of commands that failed to execute */
  failureCount: number;
  /** Timestamp of the last command execution */
  lastExecutionTime: number | null;
}

/**
 * Actions that can be performed on the command store.
 * Includes command execution and queue management.
 * @interface CommandActions
 */
interface CommandActions {
  /** Add a command to the execution queue
   * @param command - Command to add to the queue
   */
  queueCommand: (command: HarmonyCommand) => void;

  /** Start executing a command
   * @param command - Command to execute
   */
  startExecution: (command: HarmonyCommand) => void;

  /** Mark the current command execution as complete
   * @param success - Whether the execution was successful
   * @param error - Error message if execution failed
   */
  completeExecution: (success: boolean, error?: string) => void;

  /** Clear the command queue */
  clearQueue: () => void;

  /** Reset execution statistics */
  resetStats: () => void;

  /** Reset the store to its initial state */
  reset: () => void;
}

/** Initial state for the command store */
const initialState: CommandState = {
  currentCommand: null,
  commandQueue: [],
  isExecuting: false,
  error: null,
  successCount: 0,
  failureCount: 0,
  lastExecutionTime: null,
};

/**
 * Store for managing command execution state.
 * Handles command queuing, execution tracking, and statistics.
 * Uses Zustand for state management.
 */
export const useCommandStore = create<CommandState & CommandActions>((set) => ({
  ...initialState,

  queueCommand: (command) =>
    set((state) => ({
      commandQueue: [...state.commandQueue, command],
    })),

  startExecution: (command) =>
    set({
      currentCommand: command,
      isExecuting: true,
      error: null,
    }),

  completeExecution: (success, error) =>
    set((state) => ({
      currentCommand: null,
      isExecuting: false,
      error: error || null,
      successCount: success ? state.successCount + 1 : state.successCount,
      failureCount: success ? state.failureCount : state.failureCount + 1,
      lastExecutionTime: Date.now(),
    })),

  clearQueue: () =>
    set({
      commandQueue: [],
    }),

  resetStats: () =>
    set({
      successCount: 0,
      failureCount: 0,
      lastExecutionTime: null,
    }),

  reset: () => set(initialState),
})); 