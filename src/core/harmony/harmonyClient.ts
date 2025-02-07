// External dependencies
import { getPreferenceValues } from "@raycast/api";
import { environment } from "@raycast/api";
import { EventEmitter } from "events";
import { HarmonyClient as HarmonyClientWs, getHarmonyClient as getHarmonyClientWs } from "@harmonyhub/client-ws";
import { Explorer } from "@harmonyhub/discover";
import { Logger } from "../logging/logger";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity, CachedHarmonyData } from "../../features/control/types/harmony";
import { ErrorCategory } from "../logging/errorHandler";
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
async function getHarmonyClient(hub: HarmonyHub): Promise<HarmonyClientWs> {
  if (!hub.ip) {
    const error = new Error("No IP address available for hub");
    Logger.error("Failed to create harmony client", error);
    throw error;
  }

  Logger.debug('Creating harmony client for hub:', {
    name: hub.name,
    ip: hub.ip,
    remoteId: hub.remoteId
  });
  
  try {
    // Use the imported getHarmonyClient function directly
    const client = await getHarmonyClientWs(hub.ip);
    Logger.debug('HarmonyClient instance created');
    return client;
  } catch (error) {
    Logger.error('Failed to create harmony client', error);
    await ErrorHandler.handleError(error as Error, ErrorCategory.NETWORK);
    throw error;
  }
}

/**
 * HarmonyManager Class
 * 
 * Core service for interacting with the Harmony Hub.
 * Handles device discovery, connection management, and command execution.
 * Uses WebSocket for real-time communication with the hub.
 */
/**
 * Client for interacting with Harmony Hub devices.
 * Provides methods for discovery, connection, and command execution.
 */
export class HarmonyManager {
  private static instance: HarmonyManager;
  private client: HarmonyClientWs | null = null;
  private connectionState: "connected" | "disconnected" | "connecting" = "disconnected";
  private explorer: Explorer | null = null;
  private isDiscovering = false;
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  private currentPort: number = BASE_PORT;
  private discoveredHubs: HarmonyHub[] = [];
  private hubDataPromise: Promise<CachedHarmonyData | null> | null = null;
  private lastLoadTime = 0;
  private readonly LOAD_DEBOUNCE = 100; // Only load once every 100ms
  private readonly storage = new SecureStorage();
  private readonly sessionManager = new SessionManager();
  private readonly toastManager = new ToastManager();

  private hubFoundCallback?: (hub: HarmonyHub) => void;

  private constructor() {}

  /**
   * Returns the singleton instance of HarmonyManager.
   * @returns HarmonyManager instance
   */
  public static getInstance(): HarmonyManager {
    if (!HarmonyManager.instance) {
      HarmonyManager.instance = new HarmonyManager();
    }
    return HarmonyManager.instance;
  }

  /**
   * Cleans up the explorer instance.
   * @returns Promise<void>
   */
  private async cleanupExplorer(): Promise<void> {
    if (this.explorer) {
      try {
        Logger.info("Cleaning up explorer");
        await this.explorer.stop();
        this.explorer = null;
      } catch (error) {
        Logger.error("Error cleaning up explorer:", error);
      }
    }
  }

  /**
   * Discovers available Harmony Hub devices on the network.
   * @param onHubFound Optional callback for when a hub is found
   * @returns Promise<HarmonyHub[]> List of discovered Harmony Hub devices
   * @throws {Error} If discovery fails or times out
   */
  async discoverHubs(onHubFound?: (hub: HarmonyHub) => void): Promise<HarmonyHub[]> {
    if (this.isDiscovering && this.discoveryPromise) {
      Logger.info("Discovery already in progress, returning existing promise");
      return this.discoveryPromise;
    }

    // Ensure any previous explorer is cleaned up
    await this.cleanupExplorer();

    this.isDiscovering = true;
    this.discoveredHubs = [];
    
    this.discoveryPromise = new Promise<HarmonyHub[]>(async (resolve, reject) => {
      try {
        Logger.info("Starting hub discovery...");
        const interfaces = networkInterfaces();

        // Log network interfaces for debugging
        Logger.debug("Network interfaces:", JSON.stringify(interfaces, null, 2));

        // Only create one explorer for all interfaces
        const explorer = new Explorer();
        this.explorer = explorer;

        explorer.on('online', (hub: any) => {
          Logger.info(`Hub found:`, JSON.stringify(hub, null, 2));
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
            Logger.info(`New hub discovered: ${hubInfo.name} (${hubInfo.ip})`);
            this.discoveredHubs.push(hubInfo);
            
            // Call the callback synchronously
            if (onHubFound) {
              try {
                onHubFound(hubInfo);
              } catch (error) {
                Logger.error("Error in onHubFound callback:", error);
              }
            }
          } else {
            Logger.debug(`Duplicate hub found: ${hubInfo.name} (${hubInfo.ip})`);
          }
        });

        explorer.on('error', (error: Error) => {
          Logger.error(`Explorer error:`, error);
        });

        explorer.on('offline', (hub: any) => {
          Logger.debug(`Hub went offline:`, hub);
        });

        try {
          await explorer.start();
          Logger.debug(`Explorer started`);

          // Wait for discovery timeout
          Logger.info(`Waiting ${DISCOVERY_TIMEOUT}ms for discovery...`);
          await new Promise(resolve => setTimeout(resolve, DISCOVERY_TIMEOUT));

          // If we found any hubs, wait a bit longer for more responses
          if (this.discoveredHubs.length > 0) {
            Logger.info(`Found ${this.discoveredHubs.length} hub(s), waiting ${GRACE_PERIOD}ms for more...`);
            await new Promise(resolve => setTimeout(resolve, GRACE_PERIOD));
          }
        } finally {
          // Clean up explorer
          Logger.info("Stopping explorer...");
          try {
            await explorer.stop();
            this.explorer = null;
          } catch (error) {
            Logger.error("Error stopping explorer:", error);
          }
        }

        Logger.info(`Discovery complete. Found ${this.discoveredHubs.length} hub(s)`);
        resolve([...this.discoveredHubs]); // Return a copy
      } catch (error) {
        Logger.error("Discovery failed:", error);
        reject(error);
      } finally {
        this.isDiscovering = false;
        this.discoveryPromise = null;
      }
    });

    return this.discoveryPromise;
  }

  /**
   * Loads cached Harmony Hub data or discovers it if not available.
   * @param forceRefresh If true, forces a refresh of the cached data
   * @returns Promise<CachedHarmonyData | null> The cached Harmony Hub data or null if not found
   */
  async loadCachedHubData(forceRefresh = false): Promise<CachedHarmonyData | null> {
    // Debounce rapid calls
    const now = Date.now();
    if (now - this.lastLoadTime < this.LOAD_DEBOUNCE) {
      if (this.hubDataPromise) {
        Logger.debug("Using existing hub data promise (debounced)");
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
      Logger.debug("Using existing hub data promise");
      return this.hubDataPromise;
    }

    // Create a new promise that will either load from cache or discover
    this.hubDataPromise = (async () => {
      try {
        // First try to load from cache if not forcing refresh
        if (!forceRefresh) {
          Logger.info("Loading cached hub data...");
          const cached = await this.storage.get(CACHE_KEY);
          if (cached) {
            const data = JSON.parse(cached) as CachedHarmonyData;
            return data;
          }
        }

        // If no cache or force refresh, check if discovery is already happening
        if (this.isDiscovering && this.discoveryPromise) {
          Logger.info("Discovery in progress, waiting for it to finish...");
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
        Logger.info("Starting new discovery...");
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
        Logger.error("Failed to load or discover hub data:", error);
        throw error;
      } finally {
        // Clear the promise so future calls will try again
        this.hubDataPromise = null;
      }
    })();

    return this.hubDataPromise;
  }

  /**
   * Connects to a specific Harmony Hub device.
   * @param hub The Harmony Hub device to connect to
   * @returns Promise<void>
   * @throws {Error} If connection fails
   */
  async connect(hub: HarmonyHub): Promise<void> {
    try {
      Logger.info(`Connecting to hub: ${hub.name} (${hub.ip})`);
      this.connectionState = "connecting";

      // Clear existing client if any
      if (this.client) {
        await this.disconnect();
      }

      // Try to get cached data first
      let cachedData = await this.loadCachedHubData();
      const isCacheValid = cachedData?.hub?.id === hub.id && 
                         cachedData.timestamp && 
                         (Date.now() - new Date(cachedData.timestamp).getTime() < 24 * 60 * 60 * 1000); // 24 hours

      if (!isCacheValid) {
        Logger.info("Cache invalid or expired, creating new cache entry");
        cachedData = {
          hub: hub,
          activities: [],
          devices: [],
          timestamp: new Date().toISOString()
        };
      }

      // Create new client
      this.client = await getHarmonyClient(hub);
      this.connectionState = "connected";

      // Save/update cache
      await this.saveCachedHubData(cachedData);

      Logger.info(`Successfully connected to ${hub.name}`);
    } catch (error) {
      this.connectionState = "disconnected";
      Logger.error(`Failed to connect to hub: ${hub.name}`, error);
      throw error;
    }
  }

  /**
   * Disconnects from the currently connected Harmony Hub device.
   * @returns Promise<void>
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      // No need to log if there's no client
      return;
    }
    
    try {
      Logger.info("Disconnecting from hub...");
      await this.client.end();
      Logger.info("Successfully disconnected from hub");
    } catch (error) {
      Logger.error("Error disconnecting from hub:", error);
      throw error;
    } finally {
      this.client = null;
      this.connectionState = "disconnected";
    }
  }

  /**
   * Retrieves the list of available activities on the connected Harmony Hub device.
   * @returns Promise<HarmonyActivity[]> List of available activities
   * @throws {Error} If activity retrieval fails
   */
  async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      Logger.error("Cannot get activities: Not connected to hub");
      throw new Error("Not connected to hub");
    }

    try {
      // Try to get cached data first
      const cachedData = await this.loadCachedHubData();
      if (cachedData?.activities && cachedData.activities.length > 0) {
        Logger.info("Using cached activities");
        return cachedData.activities;
      }

      Logger.info("Fetching activities from hub...");
      const activities = await this.client.getActivities();
      Logger.debug("Raw activities response:", activities);
      
      if (!activities) {
        Logger.warn("No activities returned from hub");
        return [];
      }

      // Cache the activities
      if (cachedData) {
        cachedData.activities = activities;
        await this.saveCachedHubData(cachedData);
      }

      Logger.info("Found", activities.length, "activities");
      return activities;
    } catch (error) {
      Logger.error("Failed to fetch activities:", error);
      throw error;
    }
  }

  /**
   * Retrieves the list of available devices on the connected Harmony Hub device.
   * @returns Promise<HarmonyDevice[]> List of available devices
   * @throws {Error} If device retrieval fails
   */
  async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client) {
      Logger.error("Cannot get devices: Not connected to hub");
      throw new Error("Not connected to hub");
    }

    try {
      // Try to get cached data first
      const cachedData = await this.loadCachedHubData();
      if (cachedData?.devices && cachedData.devices.length > 0) {
        Logger.info("Using cached devices");
        return cachedData.devices;
      }

      Logger.info("Fetching devices from hub...");
      const commands = await this.client.getAvailableCommands();
      
      if (!commands || !commands.device) {
        Logger.warn("No devices returned from hub");
        return [];
      }

      const devices = commands.device.map((dev) => {
        const allCommands = dev.controlGroup.flatMap((group) => {
          return (group.function || []).map((fn) => {
            let command = {
              id: '',
              name: '',
              label: fn.label || '',
              deviceId: dev.id
            };

            try {
              if (fn.action) {
                const action = typeof fn.action === 'string' ? JSON.parse(fn.action) : fn.action;
                command.id = action.command || fn.name || '';
                command.name = action.command || fn.name || '';
                command.label = fn.label || action.command || fn.name || 'Unknown Command';
              } else if (fn.name) {
                command.id = fn.name;
                command.name = fn.name;
                command.label = fn.label || fn.name;
              }
            } catch (e) {
              Logger.warn(`Failed to parse command action for ${dev.label}:`, e);
              command.id = fn.name || 'unknown';
              command.name = fn.name || 'unknown';
              command.label = fn.label || fn.name || 'Unknown Command';
            }

            if (!command.id || !command.name || !command.label) {
              Logger.warn(`Invalid command found for ${dev.label}:`, command);
              return null;
            }

            return command;
          });
        }).filter(Boolean);

        Logger.info(`Device ${dev.label} has ${allCommands.length} valid commands`);
        
        return {
          id: dev.id,
          label: dev.label,
          type: dev.deviceTypeDisplayName || "Default",
          commands: allCommands,
        };
      });

      // Cache the devices
      if (cachedData) {
        cachedData.devices = devices;
        await this.saveCachedHubData(cachedData);
      }

      return devices;
    } catch (error) {
      Logger.error("Failed to fetch devices:", error);
      throw error;
    }
  }

  /**
   * Starts a specific activity on the connected Harmony Hub device.
   * @param activityId The ID of the activity to start
   * @returns Promise<void>
   * @throws {Error} If activity start fails
   */
  async startActivity(activityId: string): Promise<void> {
    if (!this.client) {
      Logger.error("Cannot start activity: Not connected to hub");
      throw new Error("Not connected to hub");
    }
    Logger.info("Starting activity:", activityId);
    await this.client.startActivity(activityId);
    Logger.info("Activity started successfully");
  }

  /**
   * Executes a command on a specific device on the connected Harmony Hub device.
   * @param deviceId The ID of the device to execute the command on
   * @param command The command to execute
   * @returns Promise<void>
   * @throws {Error} If command execution fails
   */
  async executeCommand(deviceId: string, command: string): Promise<void> {
    Logger.info(`=== Starting command execution ===`);
    Logger.info(`DeviceID: ${deviceId}, Command: ${command}`);

    try {
      // Ensure we have a valid connection
      await this.ensureConnected();

      // Get device from cache first, only fetch if not found
      let devices = await this.loadCachedHubData().then(data => data?.devices || []);
      if (!devices.length) {
        devices = await this.getDevices();
      }
      
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      Logger.debug(`Found device: ${device.label} (${device.id})`);

      // Find the command in the device's command list
      const deviceCommand = device.commands.find(c => c.id === command);
      if (!deviceCommand) {
        throw new Error(`Command ${command} not found for device ${device.label}`);
      }

      Logger.debug(`Command found: ${deviceCommand.id} (${deviceCommand.label})`);

      if (!this.client) {
        throw new Error('Harmony client not initialized');
      }

      // Get preferences for command timing
      const preferences = getPreferenceValues<{ commandHoldTime: string }>();
      const holdTime = parseInt(preferences.commandHoldTime || "100", 10);

      const commandBody = {
        command: command,
        deviceId: deviceId,
        type: "IRCommand"
      };

      // Send press command with retry logic
      const maxRetries = 2;
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount <= maxRetries) {
        try {
          Logger.debug(`Executing ${command} on ${device.label} (${deviceId}) - Attempt ${retryCount + 1}`);
          
          // Send press command
          await this.client.send("holdAction", commandBody);
          
          // Wait for hold time
          await new Promise((resolve) => setTimeout(resolve, holdTime));
          
          // Send release command
          await this.client.send("holdAction", commandBody);
          
          Logger.info(`Successfully executed ${command} on ${device.label}`);
          return;
        } catch (error) {
          lastError = error;
          Logger.error(`Command execution failed (Attempt ${retryCount + 1}):`, error);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // If we get here, all retries failed
      throw new Error(`Failed to execute command after ${maxRetries} retries: ${lastError?.message}`);

    } catch (error) {
      Logger.error("Command execution failed:", error);
      
      // Add more context to the error
      const enhancedError = new Error(
        `Failed to execute command: ${error.message}. ` +
        `Please ensure the device is powered on and within range of the Harmony Hub.`
      );
      
      throw enhancedError;
    }
  }

  /**
   * Ensures the connection to the Harmony Hub device is active.
   * @returns Promise<void>
   * @throws {Error} If connection is lost or cannot be established
   */
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

  /**
   * Caches the Harmony Hub data for the connected device.
   * @param hub The Harmony Hub device to cache data for
   * @returns Promise<void>
   * @throws {Error} If caching fails
   */
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

      await this.saveCachedHubData(data);
      Logger.info("Hub data cached successfully");
    } catch (error) {
      Logger.error("Failed to cache hub data:", error);
      throw error;
    }
  }

  /**
   * Saves the cached Harmony Hub data to storage.
   * @param data The cached Harmony Hub data to save
   * @returns Promise<void>
   * @throws {Error} If saving fails
   */
  async saveCachedHubData(data: CachedHarmonyData): Promise<void> {
    try {
      await this.storage.set(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      Logger.error("Failed to save hub data to cache:", error);
      throw error;
    }
  }

  /**
   * Clears the cached Harmony Hub data and resets the connection state.
   * @returns Promise<void>
   * @throws {Error} If clearing fails
   */
  async clearCache(): Promise<void> {
    try {
      Logger.info("Clearing cached hub data...");
      
      // Check if cache exists first
      const existingCache = await this.storage.get(CACHE_KEY);
      if (!existingCache) {
        Logger.info("No cache found to clear");
        return;
      }

      // Remove the cache
      await this.storage.remove(CACHE_KEY);
      Logger.info("Hub cache deleted successfully");

      // Clear any active client connection
      if (this.client) {
        Logger.info("Disconnecting active client...");
        await this.disconnect();
      }

      // Clear promises to force new discovery
      this.hubDataPromise = null;
      this.discoveryPromise = null;
      this.discoveredHubs = [];
      this.isDiscovering = false;

      // Clean up explorer if active
      await this.cleanupExplorer();

      Logger.info("Cache cleared and state reset successfully");
    } catch (error) {
      Logger.error("Error clearing hub cache:", error);
      throw error;
    }
  }

  /**
   * Discovers a Harmony Hub device on the network.
   * @returns Promise<void>
   * @throws {Error} If discovery fails
   */
  private async discoverHub(): Promise<void> {
    try {
      Logger.info("Starting hub discovery...");
      const explorer: Explorer = new Explorer();
      const discoveryTimeout: number = 5000;

      explorer.on("online", async (hub: any) => {
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

  /**
   * Maps device commands from raw data to HarmonyDevice format.
   * @param rawDevices The raw device data to map
   * @returns Promise<HarmonyDevice[]> The mapped device commands
   */
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
