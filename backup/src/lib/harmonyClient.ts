import { HarmonyClient, getHarmonyClient } from "@harmonyhub/client-ws";
import { Explorer } from "@harmonyhub/discover";
import { LocalStorage } from "@raycast/api";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity, CachedHarmonyData } from "../types/harmony";
import { Logger } from "./logger";

const CACHE_KEYS = {
  HUB_CACHE: "harmony_hub_cache",
  SESSION_CACHE: "harmony_session",
  DATA_CACHE: "harmony_cache",
};

export class HarmonyManager {
  private client: HarmonyClient | null = null;
  private explorer: Explorer | null = null;
  private static instance: HarmonyManager;
  private discoveredHubs: HarmonyHub[] = [];
  private connectionState: "disconnected" | "connecting" | "connected" = "disconnected";
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms
  private readonly DEFAULT_PORT = 61991;
  private explorerPort: number | null = null;
  private isDiscovering = false;
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;

  private constructor() {}

  public static getInstance(): HarmonyManager {
    if (!HarmonyManager.instance) {
      HarmonyManager.instance = new HarmonyManager();
    }
    return HarmonyManager.instance;
  }

  private async cleanupExplorer(): Promise<void> {
    if (this.explorer) {
      Logger.info("Stopping existing explorer");
      try {
        this.explorer.stop();
        this.explorer.removeAllListeners();
      } catch (error) {
        Logger.error("Error stopping explorer:", error);
      }
      this.explorer = null;
      // Wait a bit to ensure port is released
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async discoverHubs(): Promise<HarmonyHub[]> {
    if (this.isDiscovering) {
      Logger.info("Discovery already in progress, returning existing promise...");
      return this.discoveryPromise!;
    }

    try {
      this.isDiscovering = true;
      Logger.info("Starting hub discovery...");
      
      // Always do a fresh discovery
      this.discoveryPromise = this._discoverHubs();
      const hubs = await this.discoveryPromise;
      
      // Cache the results after successful discovery
      if (hubs.length > 0) {
        await this.cacheHubData(hubs[0]);
      }
      
      return hubs;
    } catch (error) {
      Logger.error("Hub discovery failed:", error);
      throw error;
    } finally {
      this.isDiscovering = false;
      this.discoveryPromise = null;
    }
  }

  private async _discoverHubs(): Promise<HarmonyHub[]> {
    try {
      Logger.info("Initializing hub discovery...");
      
      // Initialize explorer with longer timeout
      this.explorer = new Explorer(this.DEFAULT_PORT);
      const discoveryTimeout = 60000; // 60 seconds
      
      return new Promise<HarmonyHub[]>((resolve, reject) => {
        const discoveredHubs: HarmonyHub[] = [];
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (this.explorer) {
            this.explorer.removeAllListeners();
            this.explorer.close();
            this.explorer = null;
          }
        };

        this.explorer!.on("online", (data: any) => {
          try {
            Logger.info("Hub found:", data);
            const hub = Validator.validateHubResponse(data);
            if (!discoveredHubs.some(h => h.id === hub.id)) {
              Logger.info(`New hub found: ${hub.name} (${hub.ip})`);
              discoveredHubs.push(hub);
            }
          } catch (error) {
            Logger.error("Invalid hub data received:", error);
          }
        });

        this.explorer!.on("error", (error: Error) => {
          Logger.error("Explorer error:", error);
          cleanup();
          reject(error);
        });

        timeoutId = setTimeout(() => {
          Logger.info(`Discovery timeout after ${discoveryTimeout}ms. Found ${discoveredHubs.length} hub(s)`);
          cleanup();
          resolve(discoveredHubs);
        }, discoveryTimeout);

        // Start discovery
        this.explorer!.start();
      });
    } catch (error) {
      Logger.error("Failed to initialize hub discovery:", error);
      throw error;
    }
  }

  async connect(hub: HarmonyHub): Promise<void> {
    try {
      Logger.info("Connecting to hub:", hub.name);
      this.connectionState = "connecting";

      if (this.client) {
        Logger.info("Cleaning up existing client connection");
        await this.disconnect();
        // Add a small delay after disconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      Logger.info("Creating new client connection to:", hub.ip);
      this.client = await getHarmonyClient(hub.ip);
      
      // Wait for the connection to be fully established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 5000);

        const checkConnection = async () => {
          try {
            // Try to get activities as a connection test
            await this.client!.getActivities();
            clearTimeout(timeout);
            this.connectionState = "connected";
            Logger.info("Successfully connected to hub:", hub.name);
            resolve();
          } catch (error) {
            Logger.debug("Connection not ready yet, retrying...");
            setTimeout(checkConnection, 500);
          }
        };

        checkConnection();
      });
    } catch (error) {
      this.connectionState = "disconnected";
      this.client = null;
      Logger.error("Failed to connect to hub:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        Logger.info("Disconnecting from hub");
        await this.client.end();
        this.client = null;
      }
      this.connectionState = "disconnected";
      Logger.info("Successfully disconnected from hub");
    } catch (error) {
      Logger.error("Error during disconnect:", error);
      // Reset state even if there's an error
      this.client = null;
      this.connectionState = "disconnected";
      throw error;
    }
  }

  async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      Logger.error("Cannot get activities: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    Logger.info("Fetching activities...");
    try {
      Logger.debug("Calling client.getActivities()");
      const activities = await this.client.getActivities();
      Logger.debug("Raw activities response:", activities);
      if (!activities) {
        Logger.warn("No activities returned from hub");
        return [];
      }
      Logger.info("Found", activities.length, "activities");
      return activities;
    } catch (error) {
      Logger.error("Failed to fetch activities:", error);
      throw error;
    }
  }

  async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client) {
      Logger.error("Cannot get devices: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    Logger.info("Fetching devices...");
    try {
      Logger.debug("Calling client.getAvailableCommands()");
      const commands = await this.client.getAvailableCommands();
      Logger.debug("Raw commands response:", JSON.stringify(commands, null, 2));

      if (!commands || !commands.device) {
        Logger.warn("No devices returned from hub");
        return [];
      }

      // Log each device's commands in detail
      commands.device.forEach((device: any) => {
        Logger.debug(`Device: ${device.label} (${device.id})`);
        Logger.debug(`  Type: ${device.deviceTypeDisplayName}`);
        if (device.controlGroup) {
          device.controlGroup.forEach((group: any) => {
            Logger.debug(`  Group: ${group.name}`);
            if (group.function) {
              group.function.forEach((fn: any) => {
                Logger.debug(`    Command: ${fn.name} (Label: ${fn.label || fn.name})`);
              });
            }
          });
        }
      });

      const devices = commands.device.map((dev) => ({
        id: dev.id,
        label: dev.label,
        type: dev.type,
        commands: dev.controlGroup.flatMap((group) =>
          group.function.map((fn) => ({
            id: fn.name,
            label: fn.label || fn.name,
            deviceId: dev.id,
          })),
        ),
      }));
      Logger.info("Found", devices.length, "devices");
      Logger.debug("Transformed devices:", devices);
      return devices;
    } catch (error) {
      Logger.error("Failed to fetch devices:", error);
      throw error;
    }
  }

  async startActivity(activityId: string): Promise<void> {
    if (!this.client) {
      Logger.error("Cannot start activity: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    Logger.info("Starting activity:", activityId);
    await this.client.startActivity(activityId);
    Logger.info("Activity started successfully");
  }

  async executeCommand(deviceId: string, command: string): Promise<void> {
    this.retryCount = 0;
    await this.executeCommandWithRetry(deviceId, command);
  }

  private async ensureConnected(): Promise<void> {
    Logger.debug("Checking connection state:", this.connectionState);
    
    // If we think we're connected but client is null, something's wrong
    if (!this.client) {
      Logger.error("Client is null but connection state is:", this.connectionState);
      this.connectionState = "disconnected";
      throw new Error("Connection error. Please try reconnecting to the hub.");
    }

    // Try to get activities as a connection test
    try {
      await this.client.getActivities();
      Logger.debug("Connection verified via activities");
      
      // Double check connection state
      if (this.connectionState !== "connected") {
        Logger.info("Connection verified but state was wrong, fixing...");
        this.connectionState = "connected";
      }
    } catch (error) {
      Logger.error("Connection test failed:", error);
      this.connectionState = "disconnected";
      this.client = null;
      throw new Error("Lost connection to hub. Please try reconnecting.");
    }
  }

  private async executeCommandWithRetry(deviceId: string, command: string): Promise<void> {
    Logger.info(`Executing command: ${command} for device: ${deviceId}`);

    while (this.retryCount < this.MAX_RETRIES) {
      try {
        await this.ensureConnected();

        Logger.info("Executing command:", command, "for device:", deviceId);
        Logger.debug("Connection state:", this.connectionState);
        Logger.debug("Retry count:", this.retryCount);

        // Send press command
        await this.client!.send("holdAction", {
          command: command,
          deviceId: deviceId,
          status: "press",
          timestamp: "0",
          verb: "render",
        });

        // Wait 100ms between press and release
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Send release command
        await this.client!.send("holdAction", {
          command: command,
          deviceId: deviceId,
          status: "release",
          timestamp: "0",
          verb: "render",
        });

        Logger.info("Command executed successfully");
        return;
      } catch (error) {
        Logger.error("Command execution failed:", error);
        this.retryCount++;

        if (this.retryCount < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAYS[this.retryCount - 1];
          Logger.info(`Retrying command execution (attempt ${this.retryCount}/${this.MAX_RETRIES}) after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Try to reconnect before retry
          Logger.info("Attempting to reconnect before retry");
          try {
            const cachedData = await this.loadCachedHubData();
            if (cachedData) {
              await this.connect(cachedData.hub);
            }
          } catch (reconnectError) {
            Logger.error("Reconnection attempt failed:", reconnectError);
          }
        } else {
          throw error;
        }
      }
    }
  }

  async cacheHubData(hub: HarmonyHub): Promise<void> {
    try {
      Logger.info("Caching hub data for:", hub.name);
      const [activities, devices] = await Promise.all([this.getActivities(), this.getDevices()]);

      const data: CachedHarmonyData = {
        hub,
        activities,
        devices,
        timestamp: new Date().toISOString(),
      };

      await LocalStorage.setItem(CACHE_KEYS.HUB_CACHE, JSON.stringify(data));
      Logger.info("Hub data cached successfully");
    } catch (error) {
      Logger.error("Failed to cache hub data:", error);
      throw error;
    }
  }

  async loadCachedHubData(): Promise<CachedHarmonyData | null> {
    try {
      Logger.info("Loading cached hub data...");
      // Always return null to force fresh discovery
      return null;
    } catch (error) {
      Logger.error("Failed to load cached hub data:", error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      Logger.info("Clearing cache...");
      
      // Clear all cache keys
      await Promise.all([
        LocalStorage.removeItem(CACHE_KEYS.HUB_CACHE),
        LocalStorage.removeItem(CACHE_KEYS.SESSION_CACHE),
        LocalStorage.removeItem(CACHE_KEYS.DATA_CACHE),
      ]);

      // Reset instance state
      this.discoveredHubs = [];
      this.client = null;
      this.connectionState = "disconnected";
      this.retryCount = 0;
      
      Logger.info("Cache cleared successfully");
    } catch (error) {
      Logger.error("Failed to clear cache:", error);
      throw error;
    }
  }

  private async discoverHub(): Promise<void> {
    try {
      Logger.info("Starting hub discovery...");
      const explorer: Explorer = new Explorer();
      const discoveryTimeout: number = 5000;

      explorer.on("online", async (hub: HarmonyHub) => {
        Logger.debug("Raw hub data:", JSON.stringify(hub, null, 2));
        const harmonyHub: HarmonyHub = {
          id: hub.uuid,
          ip: hub.ip,
          name: hub.friendlyName,
          remoteId: hub.fullHubInfo?.remoteId,
          port: hub.fullHubInfo?.port || "5222",
          hubId: hub.fullHubInfo?.hubId,
          version: hub.fullHubInfo?.current_fw_version,
        };
        Logger.info("Found hub:", harmonyHub);
      });

      await explorer.start();
      await new Promise((resolve) => setTimeout(resolve, discoveryTimeout));
      await explorer.stop();
      Logger.info("Hub discovery complete.");
    } catch (error) {
      Logger.error("Failed to discover hub:", error);
      throw error;
    }
  }
}
