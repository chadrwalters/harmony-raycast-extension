// External dependencies
import { getPreferenceValues } from "@raycast/api";
import { environment } from "@raycast/api"; // Added environment import
import { EventEmitter } from "events";
import { HarmonyClient, getHarmonyClient as getHarmonyClientWs } from "@harmonyhub/client-ws";
import { Explorer } from "@harmonyhub/discover";
import { Logger } from "../logging/logger";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity, CachedHarmonyData } from "../types/harmony";
import { ErrorCategory } from "../types/error";
import { ErrorHandler } from "../logging/errorHandler";
import { SecureStorage } from "../storage/secure-storage";
import { SessionManager } from "../session/session-manager";
import { ToastManager } from "../ui/toast-manager";
import { measureAsync } from "../utils/performance";
import { networkInterfaces } from 'os';

const CACHE_KEY = "harmony_hub_data";
const BASE_PORT = 35000; // Use higher port range
const MAX_PORT_TRIES = 5; // Try fewer ports
const DISCOVERY_TIMEOUT = 30000; // 30 seconds per port
const DISCOVERY_RETRY_DELAY = 1000; // 1 second between retries
const GRACE_PERIOD = 10000; // 10 seconds after last hub found

// WebSocket states
const WS_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

/**
 * Creates a new Harmony client instance
 * @param hub The hub to connect to
 * @returns A new HarmonyClient instance
 */
async function getHarmonyClient(hub: HarmonyHub): Promise<HarmonyClient> {
  if (!hub.ip) {
    throw new Error("No IP address available for hub");
  }

  Logger.debug('Creating harmony client for hub:', {
    name: hub.name,
    ip: hub.ip,
    remoteId: hub.remoteId
  });
  
  // Use the imported getHarmonyClient function directly
  const client = await getHarmonyClientWs(hub.ip);
  
  Logger.debug('HarmonyClient instance created');

  // Add event listeners for debugging
  client.on('error', (error: Error) => {
    Logger.error('Harmony client error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: (error as any).cause
    });
  });

  client.on('debug', (message: string) => {
    Logger.debug('Harmony client debug:', message);
  });

  return client;
}

/**
 * HarmonyManager Class
 * 
 * Core service for interacting with the Harmony Hub.
 * Handles device discovery, connection management, and command execution.
 * Uses WebSocket for real-time communication with the hub.
 */
export class HarmonyManager {
  private static instance: HarmonyManager;
  private client: HarmonyClient | null = null;
  private connectionState: "connected" | "disconnected" | "connecting" = "disconnected";
  private explorer: Explorer | null = null;
  private isDiscovering = false;
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  private currentPort: number = BASE_PORT;
  private discoveredHubs: HarmonyHub[] = [];
  private hubDataPromise: Promise<CachedHarmonyData | null> | null = null;
  private lastLoadTime = 0;
  private readonly LOAD_DEBOUNCE = 100; // Only load once every 100ms

  private readonly logger = new Logger();
  private readonly errorHandler = new ErrorHandler();
  private readonly storage = new SecureStorage();
  private readonly sessionManager = new SessionManager();
  private readonly toastManager = new ToastManager();

  private hubFoundCallback?: (hub: HarmonyHub) => void;

  private constructor() {}

  public static getInstance(): HarmonyManager {
    if (!HarmonyManager.instance) {
      HarmonyManager.instance = new HarmonyManager();
    }
    return HarmonyManager.instance;
  }

  private async cleanupExplorer(): Promise<void> {
    if (this.explorer) {
      try {
        this.logger.info("Cleaning up explorer");
        await this.explorer.stop();
        this.explorer = null;
      } catch (error) {
        this.logger.error("Error cleaning up explorer:", error);
      }
    }
  }

  async discoverHubs(onHubFound?: (hub: HarmonyHub) => void): Promise<HarmonyHub[]> {
    if (this.isDiscovering && this.discoveryPromise) {
      this.logger.info("Discovery already in progress, returning existing promise");
      return this.discoveryPromise;
    }

    // Ensure any previous explorer is cleaned up
    await this.cleanupExplorer();

    this.isDiscovering = true;
    this.discoveredHubs = [];
    
    this.discoveryPromise = new Promise<HarmonyHub[]>(async (resolve, reject) => {
      try {
        this.logger.info("Starting hub discovery...");
        const interfaces = networkInterfaces();

        // Log network interfaces for debugging
        this.logger.debug("Network interfaces:", JSON.stringify(interfaces, null, 2));

        // Only create one explorer for all interfaces
        const explorer = new Explorer();
        this.explorer = explorer;

        explorer.on('online', (hub: any) => {
          this.logger.info(`Hub found:`, JSON.stringify(hub, null, 2));
          const hubInfo: HarmonyHub = {
            id: hub.uuid,
            ip: hub.ip,
            name: hub.friendlyName,
            remoteId: hub.remoteId,
            hubId: hub.hubId,
            version: hub.current_fw_version,
            port: hub.port || "5222",
          };

          // Only add if not already discovered
          const isDuplicate = this.discoveredHubs.some(h => h.id === hubInfo.id);
          if (!isDuplicate) {
            this.logger.info(`New hub discovered: ${hubInfo.name} (${hubInfo.ip})`);
            this.discoveredHubs.push(hubInfo);
            
            // Call the callback synchronously
            if (onHubFound) {
              try {
                onHubFound(hubInfo);
              } catch (error) {
                this.logger.error("Error in onHubFound callback:", error);
              }
            }
          } else {
            this.logger.debug(`Duplicate hub found: ${hubInfo.name} (${hubInfo.ip})`);
          }
        });

        explorer.on('error', (error: Error) => {
          this.logger.error(`Explorer error:`, error);
        });

        explorer.on('offline', (hub: any) => {
          this.logger.debug(`Hub went offline:`, hub);
        });

        try {
          await explorer.start();
          this.logger.debug(`Explorer started`);

          // Wait for discovery timeout
          this.logger.info(`Waiting ${DISCOVERY_TIMEOUT}ms for discovery...`);
          await new Promise(resolve => setTimeout(resolve, DISCOVERY_TIMEOUT));

          // If we found any hubs, wait a bit longer for more responses
          if (this.discoveredHubs.length > 0) {
            this.logger.info(`Found ${this.discoveredHubs.length} hub(s), waiting ${GRACE_PERIOD}ms for more...`);
            await new Promise(resolve => setTimeout(resolve, GRACE_PERIOD));
          }
        } finally {
          // Clean up explorer
          this.logger.info("Stopping explorer...");
          try {
            await explorer.stop();
            this.explorer = null;
          } catch (error) {
            this.logger.error("Error stopping explorer:", error);
          }
        }

        this.logger.info(`Discovery complete. Found ${this.discoveredHubs.length} hub(s)`);
        resolve([...this.discoveredHubs]); // Return a copy
      } catch (error) {
        this.logger.error("Discovery failed:", error);
        reject(error);
      } finally {
        this.isDiscovering = false;
        this.discoveryPromise = null;
      }
    });

    return this.discoveryPromise;
  }

  async loadCachedHubData(forceRefresh = false): Promise<CachedHarmonyData | null> {
    // Debounce rapid calls
    const now = Date.now();
    if (now - this.lastLoadTime < this.LOAD_DEBOUNCE) {
      if (this.hubDataPromise) {
        this.logger.debug("Using existing hub data promise (debounced)");
        return this.hubDataPromise;
      }
    }
    this.lastLoadTime = now;
    
    // If force refresh, clear existing promises
    if (forceRefresh) {
      this.hubDataPromise = null;
      this.discoveryPromise = null;
    }
    
    // If we already have a promise for hub data, return it
    if (this.hubDataPromise) {
      this.logger.debug("Using existing hub data promise");
      return this.hubDataPromise;
    }

    // Create a new promise that will either load from cache or discover
    this.hubDataPromise = (async () => {
      try {
        // First try to load from cache if not forcing refresh
        if (!forceRefresh) {
          this.logger.info("Loading cached hub data...");
          const cached = await this.storage.get(CACHE_KEY);
          if (cached) {
            const data = JSON.parse(cached) as CachedHarmonyData;
            return data;
          }
        }

        // If no cache or force refresh, check if discovery is already happening
        if (this.isDiscovering && this.discoveryPromise) {
          this.logger.info("Discovery in progress, waiting for it to finish...");
          const hubs = await this.discoveryPromise;
          if (hubs.length > 0) {
            return {
              hub: hubs[0],
              activities: [],
              devices: [],
              timestamp: new Date().toISOString(),
            };
          }
          return null;
        }

        // No cache and no discovery, start discovery
        this.logger.info("Starting new discovery...");
        const hubs = await this.discoverHubs();
        if (hubs.length > 0) {
          const data = {
            hub: hubs[0],
            activities: [],
            devices: [],
            timestamp: new Date().toISOString(),
          };
          // Cache the result
          await this.saveCachedHubData(data);
          return data;
        }
        return null;
      } catch (error) {
        this.logger.error("Failed to load or discover hub data:", error);
        throw error;
      } finally {
        // Clear the promise so future calls will try again
        this.hubDataPromise = null;
      }
    })();

    return this.hubDataPromise;
  }

  async connect(hub: HarmonyHub): Promise<void> {
    try {
      Logger.info("=== Starting hub connection ===");
      Logger.info("Connecting to hub:", {
        name: hub.name,
        ip: hub.ip,
        remoteId: hub.remoteId
      });
      
      this.connectionState = "connecting";

      // Clean up existing client if any
      if (this.client) {
        Logger.info("Cleaning up existing client connection");
        await this.disconnect();
        // Add a small delay after disconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create new client
      Logger.debug("Creating Harmony client...");
      this.client = await getHarmonyClient(hub);
      
      if (!this.client) {
        throw new Error("Failed to create Harmony client");
      }

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

      // Cache the hub data
      await this.cacheHubData(hub);

      Logger.info("=== Hub connection finished ===");
    } catch (error) {
      this.connectionState = "disconnected";
      this.client = null;
      Logger.error("Failed to connect to hub:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      // No need to log if there's no client
      return;
    }
    
    try {
      this.logger.info("Disconnecting from hub...");
      await this.client.end();
      this.logger.info("Successfully disconnected from hub");
    } catch (error) {
      this.logger.error("Error disconnecting from hub:", error);
      throw error;
    } finally {
      this.client = null;
      this.connectionState = "disconnected";
    }
  }

  async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      this.logger.error("Cannot get activities: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    this.logger.info("Fetching activities...");
    try {
      this.logger.debug("Calling client.getActivities()");
      const activities = await this.client.getActivities();
      this.logger.debug("Raw activities response:", activities);
      if (!activities) {
        this.logger.warn("No activities returned from hub");
        return [];
      }
      this.logger.info("Found", activities.length, "activities");
      return activities;
    } catch (error) {
      this.logger.error("Failed to fetch activities:", error);
      throw error;
    }
  }

  async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client) {
      this.logger.error("Cannot get devices: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    this.logger.info("Fetching devices...");
    try {
      this.logger.debug("Calling client.getAvailableCommands()");
      const commands = await this.client.getAvailableCommands();
      
      // Log the entire raw response for debugging
      this.logger.debug("=== START RAW COMMANDS RESPONSE ===");
      this.logger.debug(JSON.stringify(commands, null, 2));
      this.logger.debug("=== END RAW COMMANDS RESPONSE ===");

      if (!commands || !commands.device) {
        this.logger.warn("No devices returned from hub");
        return [];
      }

      // Log each device's commands in detail
      this.logger.debug("=== START DEVICE DETAILS ===");
      commands.device.forEach((device: any) => {
        this.logger.debug(`\nDevice: ${device.label} (${device.id})`);
        this.logger.debug(`Raw device data:`, JSON.stringify(device, null, 2));
        this.logger.debug(`Type: ${device.type}`);
        this.logger.debug(`DisplayName: ${device.deviceTypeDisplayName}`);
        if (device.controlGroup) {
          device.controlGroup.forEach((group: any) => {
            this.logger.debug(`  Group: ${group.name}`);
            if (group.function) {
              group.function.forEach((fn: any) => {
                try {
                  const action = JSON.parse(fn.action);
                  this.logger.debug(`    Command: ${action.command} (Label: ${fn.label || action.command})`);
                } catch (e) {
                  this.logger.error(`Failed to parse action for command:`, fn);
                }
              });
            }
          });
        }
      });
      this.logger.debug("=== END DEVICE DETAILS ===");

      const devices = commands.device.map((dev) => {
        Logger.debug(`Processing device: ${dev.label} (${dev.id})`);
        
        const mappedCommands = dev.controlGroup.flatMap((group) => {
          Logger.debug(`  Processing control group: ${group.name}`);
          return (group.function || []).map((fn) => {
            try {
              const action = JSON.parse(fn.action);
              Logger.debug(`    Mapping command: ${action.command} (${fn.label || action.command}) for device ${dev.id}`);
              return {
                id: action.command,
                label: fn.label || action.command,
                deviceId: dev.id,
                group: group.name,
              };
            } catch (e) {
              Logger.error(`Failed to parse action for command:`, fn);
              return null;
            }
          }).filter(Boolean); // Remove any null commands
        });

        Logger.debug(`Mapped ${mappedCommands.length} commands for device ${dev.label}`);
        
        return {
          id: dev.id,
          label: dev.label,
          type: dev.deviceTypeDisplayName || dev.type,
          commands: mappedCommands,
        };
      });
      
      this.logger.debug("=== START TRANSFORMED DEVICES ===");
      this.logger.debug(JSON.stringify(devices, null, 2));
      this.logger.debug("=== END TRANSFORMED DEVICES ===");
      
      this.logger.info("Found", devices.length, "devices");
      return devices;
    } catch (error) {
      this.logger.error("Failed to fetch devices:", error);
      throw error;
    }
  }

  async startActivity(activityId: string): Promise<void> {
    if (!this.client) {
      this.logger.error("Cannot start activity: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    this.logger.info("Starting activity:", activityId);
    await this.client.startActivity(activityId);
    this.logger.info("Activity started successfully");
  }

  async executeCommand(deviceId: string, command: string): Promise<void> {
    Logger.info(`=== Starting command execution ===`);
    Logger.info(`DeviceID: ${deviceId}, Command: ${command}`);

    try {
      // Get latest device data to ensure we have current command mappings
      const devices = await this.getDevices();
      const device = devices.find(d => d.id === deviceId);
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      Logger.debug(`Found device: ${device.label} (${device.id})`);

      // Special handling for volume commands
      if (command === "VolumeUp" || command === "VolumeDown" || command === "Mute") {
        Logger.debug(`Processing volume command: ${command}`);
        
        // Verify device supports volume control
        const volumeCommands = device.commands.filter(c => c.group === "Volume");
        if (volumeCommands.length === 0) {
          throw new Error(`Device ${device.label} does not support volume control`);
        }

        // Verify specific volume command exists
        const volumeCommand = volumeCommands.find(c => c.id === command);
        if (!volumeCommand) {
          throw new Error(`Volume command ${command} not found for device ${device.label}`);
        }

        Logger.debug(`Volume command found: ${volumeCommand.id} (${volumeCommand.label})`);
      }

      try {
        if (!this.client) {
          throw new Error('Harmony client not initialized');
        }

        // Log client state in development mode
        if (environment.isDevelopment) {
          Logger.debug(`Client state: connected=${this.client.connected}, authenticated=${this.client.authenticated}`);
        }

        const commandBody = {
          command: command,
          deviceId: deviceId,
          type: "IRCommand"
        };

        // Send press command
        try {
          Logger.debug(`Executing ${command} on ${device.label} (${deviceId})`);
          await this.client.send("holdAction", commandBody);
        } catch (pressError) {
          Logger.error(`Press command failed: ${pressError.message}`, {
            command,
            deviceId,
            error: pressError.message
          });
          throw pressError;
        }

        // Wait between press and release
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Send release command
        try {
          await this.client.send("holdAction", commandBody);
          Logger.info(`Successfully executed ${command} on ${device.label}`);
        } catch (releaseError) {
          Logger.error(`Release command failed: ${releaseError.message}`, {
            command,
            deviceId,
            error: releaseError.message
          });
          throw releaseError;
        }
      } catch (error) {
        const errorContext = {
          command,
          deviceId,
          deviceLabel: device.label,
          error: error.message
        };
        
        Logger.error(`Command execution failed`, errorContext);
        throw new Error(`Failed to execute ${command} for ${device.label}: ${error.message}`);
      }
    } catch (error) {
      Logger.error(`Command execution failed:`, error);
      throw error;
    }
  }

  async ensureConnected(): Promise<void> {
    Logger.debug("Checking connection state...");
    
    // If we think we're connected but client is null, something's wrong
    if (!this.client) {
      Logger.error("Client is null but connection state is:", this.connectionState);
      this.connectionState = "disconnected";
      throw new Error("No WebSocket instance available. Please try reconnecting.");
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

  async cacheHubData(hub: HarmonyHub): Promise<void> {
    try {
      this.logger.info("Caching hub data for:", hub.name);
      const [activities, devices] = await Promise.all([this.getActivities(), this.getDevices()]);

      const data: CachedHarmonyData = {
        hub,
        activities,
        devices,
        timestamp: new Date().toISOString(),
      };

      await this.saveCachedHubData(data);
      this.logger.info("Hub data cached successfully");
    } catch (error) {
      this.logger.error("Failed to cache hub data:", error);
      throw error;
    }
  }

  async saveCachedHubData(data: CachedHarmonyData): Promise<void> {
    try {
      await this.storage.set(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      this.logger.error("Failed to save hub data to cache:", error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      this.logger.info("Clearing hub cache...");
      
      // Check if cache exists first
      const existingCache = await this.storage.get(CACHE_KEY);
      if (!existingCache) {
        this.logger.info("No cache found to clear");
        return;
      }

      // Remove the cache
      await this.storage.remove(CACHE_KEY);
      this.logger.info("Hub cache deleted successfully");

      // Clear any active client connection
      if (this.client) {
        this.logger.info("Disconnecting active client...");
        await this.disconnect();
      }

      // Clear promises to force new discovery
      this.hubDataPromise = null;
      this.discoveryPromise = null;
      this.discoveredHubs = [];
      this.isDiscovering = false;

      // Clean up explorer if active
      await this.cleanupExplorer();

      this.logger.info("Cache cleared and state reset successfully");
    } catch (error) {
      this.logger.error("Error clearing hub cache:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to clear cache");
    }
  }

  private async discoverHub(): Promise<void> {
    try {
      this.logger.info("Starting hub discovery...");
      const explorer: Explorer = new Explorer();
      const discoveryTimeout: number = 5000;

      explorer.on("online", async (hub: any) => {
        this.logger.debug("Raw hub data:", JSON.stringify(hub, null, 2));
        const harmonyHub: HarmonyHub = {
          id: hub.uuid,
          ip: hub.ip,
          name: hub.friendlyName,
          remoteId: hub.fullHubInfo?.remoteId,
          port: hub.fullHubInfo?.port || "5222",
          hubId: hub.fullHubInfo?.hubId,
          version: hub.fullHubInfo?.current_fw_version,
        };
        this.logger.info("Found hub:", harmonyHub);
      });

      await explorer.start();
      await new Promise((resolve) => setTimeout(resolve, discoveryTimeout));
      await explorer.stop();
      this.logger.info("Hub discovery complete.");
    } catch (error) {
      this.logger.error("Failed to discover hub:", error);
      throw error;
    }
  }

  private async mapDeviceCommands(rawDevices: any[]): Promise<HarmonyDevice[]> {
    Logger.debug("=== START DEVICE COMMAND MAPPING ===");
    const devices: HarmonyDevice[] = [];

    for (const rawDevice of rawDevices) {
      try {
        Logger.debug(`Processing device: ${rawDevice.label} (${rawDevice.contentProfileKey})`);
        const commands: any[] = [];
        
        // Track command groups for validation
        const commandGroups = new Set<string>();

        if (rawDevice.controlGroup) {
          for (const group of rawDevice.controlGroup) {
            if (!group.name) {
              Logger.warn(`Found control group without name for device ${rawDevice.label}`);
              continue;
            }

            commandGroups.add(group.name);
            Logger.debug(`Processing control group: ${group.name}`);

            if (group.function) {
              for (const func of group.function) {
                try {
                  const action = JSON.parse(func.action);
                  if (!action.command) {
                    Logger.warn(`Invalid command action for device ${rawDevice.label}: ${func.action}`);
                    continue;
                  }

                  commands.push({
                    id: action.command,
                    label: func.label || action.command,
                    deviceId: rawDevice.contentProfileKey.toString(),
                    group: group.name
                  });

                  Logger.debug(`Mapped command: ${action.command} (${func.label || action.command}) for device ${rawDevice.contentProfileKey}`);
                } catch (error) {
                  Logger.error(`Failed to parse command action for device ${rawDevice.label}:`, error);
                }
              }
            }
          }
        }

        // Validate volume control capability
        if (commandGroups.has("Volume")) {
          Logger.info(`Device ${rawDevice.label} supports volume control`);
          const volumeCommands = commands.filter(c => c.group === "Volume");
          Logger.debug(`Volume commands: ${volumeCommands.map(c => c.id).join(", ")}`);
        }

        devices.push({
          id: rawDevice.contentProfileKey.toString(),
          label: rawDevice.label,
          type: rawDevice.deviceTypeDisplayName || "Default",
          commands
        });

        Logger.debug(`Mapped ${commands.length} commands for device ${rawDevice.label}`);
      } catch (error) {
        Logger.error(`Failed to map device ${rawDevice.label}:`, error);
      }
    }

    Logger.debug("=== END DEVICE COMMAND MAPPING ===");
    return devices;
  }
}
