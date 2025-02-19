/**
 * Hook for managing user preferences.
 * Handles loading, saving, validating, and resetting preferences.
 * @module
 */

import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

import { Logger } from "../services/logger";
import { HarmonyError } from "../types/core/errors";
import { ErrorCategory } from "../types/core/harmony";
import {
  validateDefaultView,
  validateCommandDisplayMode,
  validateCommandGridColumns,
  validateAutoConnect,
  validateShowToasts,
  validateDiscoveryTimeout,
  validateCommandTimeout,
  validateActivityTimeout,
} from "../utils/validation";

/**
 * Default values for preferences.
 * Used when no stored preferences exist.
 * @const
 */
const DEFAULT_PREFERENCES = {
  /** Default view to show when opening the extension */
  defaultView: "devices",
  /** How to display command buttons */
  commandDisplayMode: "list",
  /** Number of columns in grid mode */
  commandGridColumns: 3,
  /** Whether to auto-connect to a single hub */
  autoConnect: true,
  /** Whether to show toast notifications */
  showToasts: true,
  /** Timeout for hub discovery in milliseconds */
  discoveryTimeout: 5000,
  /** Timeout for command execution in milliseconds */
  commandTimeout: 1000,
  /** Timeout for activity changes in milliseconds */
  activityTimeout: 5000,
} as const;

/**
 * Type for user preferences.
 * Based on the default preferences structure.
 */
export type Preferences = typeof DEFAULT_PREFERENCES;

/** Key for storing preferences in local storage */
const PREFERENCES_KEY = "preferences";

/**
 * Hook for managing user preferences.
 * Handles loading, saving, and validating preferences.
 * Provides functions to update and reset preferences.
 * @returns Object containing preferences and functions to update them
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<HarmonyError | null>(null);

  /**
   * Loads preferences from local storage.
   * Validates and merges with defaults.
   */
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stored = await LocalStorage.getItem<string>(PREFERENCES_KEY);
      if (!stored) {
        Logger.info("No stored preferences found, using defaults");
        return;
      }

      const parsed = JSON.parse(stored) as Partial<Preferences>;
      Logger.debug("Loaded stored preferences", parsed);

      // Validate each preference
      if (parsed.defaultView !== undefined) {
        validateDefaultView(parsed.defaultView);
      }

      if (parsed.commandDisplayMode !== undefined) {
        validateCommandDisplayMode(parsed.commandDisplayMode);
      }

      if (parsed.commandGridColumns !== undefined) {
        validateCommandGridColumns(parsed.commandGridColumns);
      }

      if (parsed.autoConnect !== undefined) {
        validateAutoConnect(parsed.autoConnect);
      }

      if (parsed.showToasts !== undefined) {
        validateShowToasts(parsed.showToasts);
      }

      if (parsed.discoveryTimeout !== undefined) {
        validateDiscoveryTimeout(parsed.discoveryTimeout);
      }

      if (parsed.commandTimeout !== undefined) {
        validateCommandTimeout(parsed.commandTimeout);
      }

      if (parsed.activityTimeout !== undefined) {
        validateActivityTimeout(parsed.activityTimeout);
      }

      // Merge with defaults
      setPreferences((prev) => ({ ...prev, ...parsed }));
    } catch (err) {
      const error = new HarmonyError(
        "Failed to load preferences",
        ErrorCategory.STORAGE,
        err instanceof Error ? err : undefined,
      );
      Logger.error("Failed to load preferences", error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Saves preferences to local storage.
   * Validates new preferences before saving.
   * @param newPreferences - New preferences to save
   * @throws {HarmonyError} If preferences are invalid or saving fails
   */
  const savePreferences = useCallback(async (newPreferences: Partial<Preferences>) => {
    try {
      setError(null);

      // Validate new preferences
      if (newPreferences.defaultView !== undefined) {
        validateDefaultView(newPreferences.defaultView);
      }

      if (newPreferences.commandDisplayMode !== undefined) {
        validateCommandDisplayMode(newPreferences.commandDisplayMode);
      }

      if (newPreferences.commandGridColumns !== undefined) {
        validateCommandGridColumns(newPreferences.commandGridColumns);
      }

      if (newPreferences.autoConnect !== undefined) {
        validateAutoConnect(newPreferences.autoConnect);
      }

      if (newPreferences.showToasts !== undefined) {
        validateShowToasts(newPreferences.showToasts);
      }

      if (newPreferences.discoveryTimeout !== undefined) {
        validateDiscoveryTimeout(newPreferences.discoveryTimeout);
      }

      if (newPreferences.commandTimeout !== undefined) {
        validateCommandTimeout(newPreferences.commandTimeout);
      }

      if (newPreferences.activityTimeout !== undefined) {
        validateActivityTimeout(newPreferences.activityTimeout);
      }

      // Update state
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);

      // Save to storage
      await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPreferences));
      Logger.debug("Saved preferences", updatedPreferences);
    } catch (err) {
      const error = new HarmonyError(
        "Failed to save preferences",
        ErrorCategory.STORAGE,
        err instanceof Error ? err : undefined,
      );
      Logger.error("Failed to save preferences", error);
      setError(error);
      throw error;
    }
  }, [preferences]);

  /**
   * Resets preferences to defaults.
   * Clears stored preferences and reverts to defaults.
   * @throws {HarmonyError} If resetting preferences fails
   */
  const resetPreferences = useCallback(async () => {
    try {
      setError(null);
      await LocalStorage.removeItem(PREFERENCES_KEY);
      setPreferences(DEFAULT_PREFERENCES);
      Logger.info("Reset preferences to defaults");
    } catch (err) {
      const error = new HarmonyError(
        "Failed to reset preferences",
        ErrorCategory.STORAGE,
        err instanceof Error ? err : undefined,
      );
      Logger.error("Failed to reset preferences", error);
      setError(error);
      throw error;
    }
  }, []);

  // Load preferences on mount
  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    savePreferences,
    resetPreferences,
  };
}
