/**
 * Manager class for discovering and managing Harmony Hubs on the network.
 * Handles hub discovery, caching, and validation of hub data.
 * @module
 */

import { Explorer } from "@harmonyhub/discover";
import { LocalStorage, showToast, Toast } from "@raycast/api";

import { HarmonyClient } from "../../services/harmony/harmonyClient";
import { HarmonyError, ErrorCategory } from "../../types/core/errors";
import { HarmonyHub } from "../../types/core/harmony";
import { Logger } from "../logger";

// Constants
const DISCOVERY_TIMEOUT = 5000; // Reduced from 10s to 5s
const DISCOVERY_COMPLETE_DELAY = 500; // Wait 500ms after finding a hub before completing
const CACHE_KEY = "harmony-hubs";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedHubs {
  hubs: HarmonyHub[];
  timestamp: number;
}

/**
 * Interface for raw hub data received from discovery process
 * @interface HubDiscoveryData
 */
interface HubDiscoveryData {
  /** Unique identifier for the hub */
  uuid: string;
  /** IP address of the hub */
  ip: string;
  /** User-friendly name of the hub */
  friendlyName: string;
  /** Additional hub information */
  fullHubInfo: {
    /** Hub ID from Logitech service */
    hubId: string;
    /** Product ID of the hub */
    productId: string;
    /** Current firmware version */
    current_fw_version: string;
    /** Protocol version supported by the hub */
    protocolVersion: string;
    /** Port number for hub communication */
    port: string;
    /** Remote ID assigned by Harmony service */
    remoteId: string;
  };
}

/**
 * HarmonyManager class handles discovery and caching of Harmony Hubs on the network.
 * Provides methods for finding, validating, and caching hub data.
 */
export class HarmonyManager {
  /** Explorer instance for hub discovery */
  private explorer: Explorer | null = null;
  /** Flag indicating if discovery is in progress */
  private isDiscovering = false;
  /** Promise for current discovery operation */
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  /** Timeout for completing discovery */
  private completeTimeout: NodeJS.Timeout | null = null;

  /**
   * Creates a validated HarmonyHub instance from discovery data
   * @param data - Raw hub data from discovery process
   * @returns Validated HarmonyHub instance
   * @throws {HarmonyError} If hub data is invalid
   */
  private createHub(data: HubDiscoveryData): HarmonyHub {
    // Validate required fields
    if (!data.friendlyName || !data.ip || !data.uuid || !data.fullHubInfo?.hubId) {
      throw new HarmonyError(
        "Invalid hub data received",
        ErrorCategory.VALIDATION,
        new Error(`Missing required fields: ${JSON.stringify(data)}`),
      );
    }

    return {
      id: data.uuid,
      name: data.friendlyName,
      ip: data.ip,
      hubId: data.fullHubInfo.hubId,
      remoteId: data.fullHubInfo.remoteId,
      version: data.fullHubInfo.current_fw_version,
      port: data.fullHubInfo.port,
      productId: data.fullHubInfo.productId,
      protocolVersion: data.fullHubInfo.protocolVersion,
    };
  }

  /**
   * Starts discovery of Harmony Hubs on the network.
   * Checks cache first, then performs network discovery if needed.
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving to list of discovered hubs
   * @throws {HarmonyError} If discovery fails
   */
  public async startDiscovery(onProgress?: (progress: number, message: string) => void): Promise<HarmonyHub[]> {
    // Check cache first
    try {
      const cached = await this.getCachedHubs();
      if (cached) {
        Logger.info(`Found ${cached.length} cached hubs`);
        onProgress?.(1, `Found ${cached.length} cached hub(s)`);

        // Verify each cached hub is still accessible
        Logger.debug("Verifying cached hubs are accessible");
        const verifiedHubs: HarmonyHub[] = [];
        for (const hub of cached) {
          try {
            const client = new HarmonyClient(hub);
            await client.connect();
            await client.disconnect();
            verifiedHubs.push(hub);
            Logger.info(`Verified hub ${hub.name} is accessible`);
          } catch (err) {
            Logger.warn(`Cached hub ${hub.name} is no longer accessible, will be removed from cache`, err);
          }
        }

        if (verifiedHubs.length > 0) {
          Logger.info(`${verifiedHubs.length} of ${cached.length} cached hubs verified`);
          if (verifiedHubs.length !== cached.length) {
            // Update cache with only verified hubs
            await this.cacheHubs(verifiedHubs);
          }
          if (verifiedHubs.length === 1) {
            const hub = verifiedHubs[0];
            if (hub) {
              await showToast({
                style: Toast.Style.Success,
                title: "Auto-connecting to Hub",
                message: `Found single Harmony Hub: ${hub.name}`,
              });
            }
          }
          return verifiedHubs;
        }

        Logger.info("No cached hubs are accessible, proceeding with discovery");
      }
    } catch (error) {
      Logger.warn("Failed to read cache:", error);
      // Continue with discovery even if cache read fails
    }

    // If discovery is already in progress, return the existing promise
    if (this.discoveryPromise) {
      Logger.info("Discovery already in progress, returning existing promise");
      return this.discoveryPromise;
    }

    try {
      // Ensure cleanup of any previous explorer
      await this.cleanup();

      this.isDiscovering = true;
      onProgress?.(0, "Starting discovery process");
      Logger.info("Starting hub discovery process");
      this.explorer = new Explorer();

      // Create and store the discovery promise
      this.discoveryPromise = new Promise<HarmonyHub[]>((resolve, reject) => {
        if (!this.explorer) {
          const error = new HarmonyError("Explorer not initialized", ErrorCategory.STATE);
          Logger.error("Discovery failed - explorer not initialized");
          reject(error);
          return;
        }

        const hubs: HarmonyHub[] = [];

        // Function to complete discovery
        const completeDiscovery = async (): Promise<HarmonyHub[]> => {
          await this.cleanup();
          if (hubs.length > 0) {
            Logger.info(`Discovery completed successfully, found ${hubs.length} hubs`);
            await this.cacheHubs(hubs);
          } else {
            Logger.warn("Discovery completed but no hubs were found");
          }
          resolve(hubs);
          return hubs;
        };

        // Set timeout to stop discovery after DISCOVERY_TIMEOUT
        const timeout = setTimeout(async () => {
          Logger.info("Discovery timeout reached");
          await completeDiscovery();
        }, DISCOVERY_TIMEOUT);

        this.explorer.on("online", (data: HubDiscoveryData) => {
          try {
            Logger.debug("Received hub data", { data });
            const hub = this.createHub(data);

            // Check for duplicate hubs
            if (!hubs.some((h) => h.hubId === hub.hubId)) {
              hubs.push(hub);
              Logger.info(`Found hub: ${hub.name} (${hub.ip})`);
              onProgress?.(0.5, `Found hub: ${hub.name}`);

              // Clear any existing completion timeout
              if (this.completeTimeout) {
                clearTimeout(this.completeTimeout);
              }

              // Set a new completion timeout
              this.completeTimeout = setTimeout(async () => {
                clearTimeout(timeout);
                await completeDiscovery();
              }, DISCOVERY_COMPLETE_DELAY);
            } else {
              Logger.info(`Skipping duplicate hub: ${hub.name} (${hub.ip})`);
            }
          } catch (error) {
            Logger.error("Failed to process hub data:", error);
            // Don't reject here, just log and continue discovery
          }
        });

        this.explorer.on("error", async (error: Error) => {
          Logger.error("Discovery error:", error);
          clearTimeout(timeout);
          if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
          }
          await this.cleanup();
          reject(new HarmonyError("Hub discovery failed", ErrorCategory.HUB_COMMUNICATION, error));
        });

        // Start discovery
        Logger.debug("Starting explorer");
        this.explorer.start();
      });

      // Return the discovery promise
      return await this.discoveryPromise;
    } catch (error) {
      Logger.error("Failed to start discovery:", error);
      throw new HarmonyError("Failed to start hub discovery", ErrorCategory.HUB_COMMUNICATION, error as Error);
    } finally {
      this.isDiscovering = false;
      this.discoveryPromise = null;
    }
  }

  /**
   * Caches discovered hubs in local storage
   * @param hubs - List of hubs to cache
   * @throws {HarmonyError} If caching fails
   */
  private async cacheHubs(hubs: HarmonyHub[]): Promise<void> {
    try {
      const cache: CachedHubs = {
        hubs,
        timestamp: Date.now(),
      };
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      Logger.info(`Cached ${hubs.length} hubs`);
    } catch (error) {
      Logger.warn("Failed to cache hubs:", error);
      throw new HarmonyError("Failed to cache hubs", ErrorCategory.STORAGE, error as Error);
    }
  }

  /**
   * Retrieves cached hubs if available and not expired
   * @returns Promise resolving to cached hubs or null if no valid cache exists
   * @throws {HarmonyError} If reading cache fails
   */
  private async getCachedHubs(): Promise<HarmonyHub[] | null> {
    try {
      const cached = await LocalStorage.getItem<string>(CACHE_KEY);
      if (!cached) return null;

      const { hubs, timestamp } = JSON.parse(cached) as CachedHubs;

      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_TTL) {
        Logger.info("Cache expired");
        await LocalStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Validate cached hub data
      for (const hub of hubs) {
        if (!hub.id || !hub.name || !hub.ip || !hub.hubId) {
          Logger.warn("Invalid hub data in cache, clearing cache");
          await LocalStorage.removeItem(CACHE_KEY);
          return null;
        }
      }

      return hubs;
    } catch (error) {
      Logger.warn("Failed to get cached hubs:", error);
      throw new HarmonyError("Failed to read hub cache", ErrorCategory.STORAGE, error as Error);
    }
  }

  /**
   * Cleans up discovery resources.
   * Stops the explorer and clears timeouts.
   */
  public async cleanup(): Promise<void> {
    if (this.explorer) {
      try {
        this.explorer.stop();
        this.explorer.removeAllListeners();
      } catch (error) {
        Logger.error("Error stopping explorer:", error);
      }
      this.explorer = null;
    }

    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      this.completeTimeout = null;
    }

    this.isDiscovering = false;
    this.discoveryPromise = null;
  }

  /**
   * Clears all caches including hub discovery and configs.
   * @throws {HarmonyError} If clearing caches fails
   */
  public async clearAllCaches(): Promise<void> {
    try {
      Logger.info("Clearing all Harmony caches");

      // Clear hub discovery cache
      await this.clearCache();

      // Clear all hub config caches
      const keys = await LocalStorage.allItems();
      for (const key of Object.keys(keys)) {
        if (key.startsWith("harmony-config-")) {
          await LocalStorage.removeItem(key);
        }
      }
    } catch (err) {
      throw new HarmonyError("Failed to clear caches", ErrorCategory.CACHE, err instanceof Error ? err : undefined);
    }
  }

  /**
   * Clears all cached data.
   * Removes hub cache and all hub-specific config caches.
   * @throws {HarmonyError} If clearing cache fails
   */
  public async clearCache(): Promise<void> {
    try {
      Logger.info("Clearing all Harmony caches");

      // Clear hub cache
      await LocalStorage.removeItem(CACHE_KEY);

      // Clear all hub-specific config caches
      const allKeys = await LocalStorage.allItems();
      for (const key of Object.keys(allKeys)) {
        if (key.startsWith("harmony-config-")) {
          await LocalStorage.removeItem(key);
        }
      }

      Logger.info("All caches cleared");
    } catch (error) {
      Logger.error("Failed to clear caches:", error);
      throw new HarmonyError("Failed to clear caches", ErrorCategory.STORAGE, error as Error);
    }
  }
}
