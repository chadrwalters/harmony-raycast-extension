/**
 * Persistence middleware for Zustand stores
 * @module
 */

import { StateCreator, StoreApi } from "zustand";
import { LocalStorage } from "../../services/localStorage";
import { Logger } from "../../services/logger";
import { HarmonyError } from "../../types/core/errors";
import { ErrorCategory } from "../../types/core/harmony";

type PersistImpl = <T>(
  config: PersistConfig<T>,
  baseStore: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

interface PersistConfig<T> {
  /** Storage key */
  key: string;
  /** Optional filter function to select what to persist */
  filter?: (state: T) => Partial<T>;
  /** Optional version for migrations */
  version?: number;
  /** Optional migration function */
  migrate?: (persistedState: any, version: number) => T;
  /** Optional merge function */
  merge?: (persistedState: Partial<T>, currentState: T) => T;
}

/**
 * Creates a persistence middleware for Zustand stores
 */
export const persist = <T>(
  config: PersistConfig<T>
): StateCreator<T> => (
  setState,
  getState,
  api
): T => {
  const {
    key,
    filter = (state) => state,
    version = 0,
    migrate = (state) => state,
    merge = (persistedState, currentState) => ({
      ...currentState,
      ...persistedState,
    }),
  } = config;

  let isHydrating = false;

  const setItem = async (state: T): Promise<void> => {
    if (isHydrating) return;

    try {
      const persistedState = filter(state);
      await LocalStorage.setItem(
        key,
        JSON.stringify({
          state: persistedState,
          version,
        })
      );
      Logger.info("Persisted state", { key });
    } catch (err) {
      Logger.error("Failed to persist state", err);
      throw new HarmonyError(
        "Failed to persist state",
        ErrorCategory.DATA,
        err instanceof Error ? err : undefined
      );
    }
  };

  const hydrate = async (): Promise<void> => {
    try {
      const persistedJSON = await LocalStorage.getItem(key);
      if (persistedJSON) {
        const { state, version: persistedVersion } = JSON.parse(persistedJSON);
        const migratedState = migrate(state, persistedVersion);
        
        isHydrating = true;
        setState(
          merge(migratedState, getState()),
          false
        );
        isHydrating = false;
        
        Logger.info("Hydrated state", { key });
      }
    } catch (err) {
      Logger.error("Failed to hydrate state", err);
      throw new HarmonyError(
        "Failed to hydrate state",
        ErrorCategory.DATA,
        err instanceof Error ? err : undefined
      );
    }
  };

  // Create store with persistence
  const initialState = api.getState();

  // Subscribe to state changes
  api.subscribe((state) => {
    setItem(state as T).catch((err) => {
      Logger.error("Failed to persist state update", err);
    });
  });

  // Hydrate initial state
  hydrate().catch((err) => {
    Logger.error("Failed to hydrate initial state", err);
  });

  return initialState;
}; 