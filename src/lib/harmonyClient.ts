import { HarmonyClient, getHarmonyClient } from "@harmonyhub/client-ws";
import { Explorer } from "@harmonyhub/discover";
import { LocalStorage } from "@raycast/api";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity, CachedHarmonyData } from "../types/harmony";
import { Logger } from "./logger";

const CACHE_KEY = "harmony_hub_cache";

export class HarmonyManager {
  private client: HarmonyClient | null = null;
  private explorer: Explorer | null = null;
  private static instance: HarmonyManager;
  private discoveredHubs: HarmonyHub[] = [];

  private constructor() {}

  public static getInstance(): HarmonyManager {
    if (!HarmonyManager.instance) {
      HarmonyManager.instance = new HarmonyManager();
    }
    return HarmonyManager.instance;
  }

  async discoverHubs(): Promise<HarmonyHub[]> {
    try {
      Logger.info("Starting hub discovery...");
      this.explorer = new Explorer(61991);
      this.discoveredHubs = [];

      return new Promise((resolve, reject) => {
        let discoveryTimeout: NodeJS.Timeout;

        this.explorer!.on("online", (hub) => {
          // Log the complete hub object to see all available properties
          Logger.debug("Raw hub data:", JSON.stringify(hub, null, 2));
          
          const fullInfo = hub.fullHubInfo || {};
          Logger.info("Found hub:", { 
            uuid: hub.uuid, 
            ip: hub.ip, 
            name: hub.friendlyName,
            port: fullInfo.port,
            hubId: fullInfo.hubId,
            productId: fullInfo.productId,
            version: fullInfo.current_fw_version,
            protocols: fullInfo.protocolVersion,
          });

          const harmonyHub: HarmonyHub = {
            id: hub.uuid,
            ip: hub.ip,
            name: hub.friendlyName,
            remoteId: fullInfo.remoteId,
            port: fullInfo.port || "5222",
            hubId: fullInfo.hubId,
            version: fullInfo.current_fw_version,
          };
          
          // Only add if not already discovered
          if (!this.discoveredHubs.some(h => h.id === harmonyHub.id)) {
            this.discoveredHubs.push(harmonyHub);
          }
        });

        this.explorer!.on("error", (error) => {
          Logger.error("Hub discovery error:", error);
          clearTimeout(discoveryTimeout);
          this.explorer!.stop();
          reject(error);
        });

        // Stop discovery after 10 seconds
        discoveryTimeout = setTimeout(() => {
          Logger.info("Hub discovery complete. Found", this.discoveredHubs.length, "hubs");
          this.explorer!.stop();
          resolve(this.discoveredHubs);
        }, 10000);

        Logger.debug("Starting explorer...");
        this.explorer!.start();
      });
    } catch (error) {
      Logger.error("Failed to discover hubs:", error);
      throw new Error(`Failed to discover hubs: ${error}`);
    }
  }

  async connect(hub: HarmonyHub): Promise<void> {
    try {
      if (!hub || !hub.ip) {
        throw new Error("Invalid hub or hub IP address");
      }
      
      Logger.info("Connecting to hub:", {
        id: hub.id,
        ip: hub.ip,
        name: hub.name,
        port: hub.port,
        hubId: hub.hubId,
        version: hub.version,
      });
      
      // Disconnect existing client if any
      if (this.client) {
        try {
          Logger.info("Disconnecting from existing client");
          await this.client.disconnect();
        } catch (error) {
          Logger.warn("Error disconnecting from existing client:", error);
        }
        this.client = null;
      }

      // Create new client using factory function
      Logger.debug("Creating client with simplified config");
      const config = {
        port: parseInt(hub.port || "5222", 10),
        remoteId: hub.remoteId,
      };

      Logger.debug("Connection config:", { ip: hub.ip, ...config });
      
      // Wait for connection to be established
      return new Promise((resolve, reject) => {
        getHarmonyClient(hub.ip, config)
          .then(client => {
            this.client = client;

            // Set up event handlers
            this.client.on(HarmonyClient.Events.CONNECTED, () => {
              Logger.info("Successfully connected to hub");
              resolve();
            });

            this.client.on(HarmonyClient.Events.DISCONNECTED, () => {
              Logger.info("Client disconnected from hub");
              this.client = null;
            });

            this.client.on('error', (error: Error) => {
              Logger.error("Hub connection error:", error);
              reject(error);
            });
          })
          .catch(reject);
      });
    } catch (error) {
      this.client = null;
      Logger.error("Failed to connect to hub:", error);
      throw new Error(`Failed to connect to hub: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    Logger.info("Disconnecting from hub...");
    if (this.client) {
      try {
        await this.client.disconnect();
        Logger.info("Disconnected from hub");
      } catch (error) {
        Logger.warn("Error during disconnect:", error);
      }
      this.client = null;
    }
    if (this.explorer) {
      this.explorer.stop();
      this.explorer = null;
      Logger.info("Stopped hub explorer");
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
      Logger.debug("Raw commands response:", commands);
      if (!commands || !commands.device) {
        Logger.warn("No devices returned from hub");
        return [];
      }
      const devices = commands.device.map(dev => ({
        id: dev.id,
        label: dev.label,
        type: dev.type,
        commands: dev.controlGroup.flatMap(group => 
          group.function.map(fn => ({
            id: fn.name,
            label: fn.label || fn.name,
            deviceId: dev.id
          }))
        )
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
    if (!this.client) {
      Logger.error("Cannot execute command: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    Logger.info("Executing command:", command, "for device:", deviceId);
    await this.client.send(deviceId, command);
    Logger.info("Command executed successfully");
  }

  // Cache management
  async cacheHubData(hub: HarmonyHub): Promise<void> {
    try {
      Logger.info("Caching hub data for:", hub.name);
      const [activities, devices] = await Promise.all([
        this.getActivities(),
        this.getDevices()
      ]);
      
      const data: CachedHarmonyData = {
        hub,
        activities,
        devices,
        timestamp: new Date().toISOString()
      };
      
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
      Logger.info("Hub data cached successfully");
    } catch (error) {
      Logger.error("Failed to cache hub data:", error);
      throw error;
    }
  }

  async loadCachedHubData(): Promise<CachedHarmonyData | null> {
    try {
      Logger.info("Loading cached hub data...");
      const cached = await LocalStorage.getItem(CACHE_KEY);
      if (!cached) {
        Logger.info("No cached hub data found");
        return null;
      }
      const data = JSON.parse(cached as string) as CachedHarmonyData;
      Logger.info("Loaded cached hub data for:", data.hub.name);
      return data;
    } catch (error) {
      Logger.error("Failed to load cached hub data:", error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      Logger.info("Clearing hub cache...");
      await LocalStorage.removeItem(CACHE_KEY);
      Logger.info("Hub cache cleared successfully");
    } catch (error) {
      Logger.error("Failed to clear hub cache:", error);
      throw error;
    }
  }
}
