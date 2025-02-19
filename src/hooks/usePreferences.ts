/**
 * Hook for accessing and validating preferences
 * @module
 */

import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { HarmonyError } from "../types/core/errors";
import { ErrorCategory } from "../types/core/harmony";

interface ValidatedPreferences {
  /** Default view to display */
  defaultView: "activities" | "devices";
  /** Cache duration in seconds */
  cacheDuration: number;
  /** Network timeout in milliseconds */
  networkTimeout: number;
  /** Whether debug mode is enabled */
  debugMode: boolean;
  /** Whether to auto-retry failed commands */
  autoRetry: boolean;
  /** Maximum number of retries */
  maxRetries: number;
  /** Duration to hold a command in milliseconds */
  commandHoldTime: number;
}

/**
 * Hook for accessing validated preferences
 */
export function usePreferences() {
  const preferences = getPreferenceValues<Preferences>();

  return useMemo(() => {
    try {
      const cacheDuration = parseInt(preferences.cacheDuration, 10);
      if (isNaN(cacheDuration) || cacheDuration < 0) {
        throw new HarmonyError(
          "Invalid cache duration: must be a positive number",
          ErrorCategory.DATA
        );
      }

      const networkTimeout = parseInt(preferences.networkTimeout, 10);
      if (isNaN(networkTimeout) || networkTimeout < 0) {
        throw new HarmonyError(
          "Invalid network timeout: must be a positive number",
          ErrorCategory.DATA
        );
      }

      const maxRetries = parseInt(preferences.maxRetries, 10);
      if (isNaN(maxRetries) || maxRetries < 0) {
        throw new HarmonyError(
          "Invalid max retries: must be a positive number",
          ErrorCategory.DATA
        );
      }

      const commandHoldTime = parseInt(preferences.commandHoldTime, 10);
      if (isNaN(commandHoldTime) || commandHoldTime < 0) {
        throw new HarmonyError(
          "Invalid command hold time: must be a positive number",
          ErrorCategory.DATA
        );
      }

      const validated: ValidatedPreferences = {
        defaultView: preferences.defaultView,
        cacheDuration,
        networkTimeout,
        debugMode: preferences.debugMode,
        autoRetry: preferences.autoRetry,
        maxRetries,
        commandHoldTime,
      };

      return {
        preferences: validated,
        error: null,
      };
    } catch (error) {
      return {
        preferences: null,
        error: error instanceof HarmonyError ? error : new HarmonyError(
          "Failed to validate preferences",
          ErrorCategory.DATA,
          error instanceof Error ? error : undefined
        ),
      };
    }
  }, [preferences]);
} 