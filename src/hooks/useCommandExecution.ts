/**
 * Hook for executing Harmony commands with memoization
 * @module
 */

import { useCallback, useState } from "react";
import { useHarmony } from "./useHarmony";
import { HarmonyCommand } from "../types/core/harmony";
import { HarmonyError } from "../types/core/errors";
import { ErrorCategory } from "../types/core/harmony";
import { ToastManager } from "../services/toast";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";

interface CommandExecutionState {
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Last executed command */
  lastCommand: HarmonyCommand | null;
  /** Last execution error */
  error: HarmonyError | null;
}

/**
 * Hook for executing commands with retry and error handling
 */
export function useCommandExecution() {
  const { executeCommand } = useHarmony();
  const [state, setState] = useState<CommandExecutionState>({
    isExecuting: false,
    lastCommand: null,
    error: null,
  });

  const preferences = getPreferenceValues<Preferences>();
  const holdTime = parseInt(preferences.commandHoldTime, 10);
  const autoRetry = preferences.autoRetry;
  const maxRetries = parseInt(preferences.maxRetries, 10);

  const execute = useCallback(
    async (command: HarmonyCommand) => {
      setState((prev) => ({
        ...prev,
        isExecuting: true,
        lastCommand: command,
        error: null,
      }));

      try {
        let retries = 0;
        let success = false;

        while (!success && retries <= maxRetries) {
          try {
            await executeCommand(command);
            success = true;
          } catch (error) {
            retries++;
            if (!autoRetry || retries > maxRetries) {
              throw error;
            }
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, holdTime));
          }
        }

        setState((prev) => ({
          ...prev,
          isExecuting: false,
        }));

        ToastManager.success(`Executed ${command.label}`);
      } catch (error) {
        const harmonyError = new HarmonyError(
          `Failed to execute ${command.label}`,
          ErrorCategory.COMMAND,
          error instanceof Error ? error : undefined
        );

        setState((prev) => ({
          ...prev,
          isExecuting: false,
          error: harmonyError,
        }));

        ToastManager.error(`Failed to execute ${command.label}`, harmonyError.message);
      }
    },
    [executeCommand, holdTime, autoRetry, maxRetries]
  );

  const retry = useCallback(async () => {
    if (state.lastCommand) {
      await execute(state.lastCommand);
    }
  }, [execute, state.lastCommand]);

  return {
    execute,
    retry,
    isExecuting: state.isExecuting,
    lastCommand: state.lastCommand,
    error: state.error,
  };
} 