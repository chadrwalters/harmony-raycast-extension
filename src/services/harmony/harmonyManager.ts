import { Explorer } from "@harmonyhub/discover";
import { HarmonyHub } from "../../types/harmony";
import { Logger } from "../logger";

// Constants
const DISCOVERY_TIMEOUT = 5000; // Reduced from 10s to 5s
const DISCOVERY_COMPLETE_DELAY = 500; // Wait 500ms after finding a hub before completing

export class HarmonyManager {
  private explorer: Explorer | null = null;
  private isDiscovering = false;
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  private completeTimeout: NodeJS.Timeout | null = null;

  /**
   * Start discovery of Harmony Hubs on the network
   */
  public async startDiscovery(
    onProgress?: (progress: number, message: string) => void
  ): Promise<HarmonyHub[]> {
    // If discovery is already in progress, return the existing promise
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    try {
      // Ensure cleanup of any previous explorer
      await this.cleanup();

      this.isDiscovering = true;
      onProgress?.(0, "Starting discovery process");
      this.explorer = new Explorer();

      // Create and store the discovery promise
      this.discoveryPromise = new Promise<HarmonyHub[]>((resolve, reject) => {
        if (!this.explorer) {
          reject(new Error("Explorer not initialized"));
          return;
        }

        const hubs: HarmonyHub[] = [];

        // Function to complete discovery
        const completeDiscovery = async () => {
          await this.cleanup();
          resolve(hubs);
        };

        // Set timeout to stop discovery after DISCOVERY_TIMEOUT
        const timeout = setTimeout(async () => {
          Logger.info("Discovery timeout");
          await completeDiscovery();
        }, DISCOVERY_TIMEOUT);

        this.explorer.on("online", (data: any) => {
          const hub: HarmonyHub = {
            name: data.friendlyName,
            ip: data.ip,
            remoteId: data.remoteId,
            hubId: data.hubId
          };

          hubs.push(hub);
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
        });

        this.explorer.on("error", async (error: Error) => {
          Logger.error("Discovery error:", error);
          clearTimeout(timeout);
          if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
          }
          await this.cleanup();
          reject(error);
        });

        // Start discovery
        this.explorer.start();
      });

      // Return the discovery promise
      return await this.discoveryPromise;

    } catch (error) {
      Logger.error("Failed to start discovery:", error);
      throw error;
    } finally {
      this.isDiscovering = false;
      this.discoveryPromise = null;
    }
  }

  /**
   * Clean up discovery resources
   */
  public async cleanup(): Promise<void> {
    if (this.explorer) {
      this.explorer.stop();
      this.explorer.removeAllListeners();
      this.explorer = null;
    }

    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      this.completeTimeout = null;
    }

    this.isDiscovering = false;
    this.discoveryPromise = null;
  }
}
