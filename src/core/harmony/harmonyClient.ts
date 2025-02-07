// External dependencies
import { getPreferenceValues } from "@raycast/api";
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

const CACHE_KEY = "harmony_hub_data";
const BASE_PORT = 65000;
const MAX_PORT_TRIES = 10;
const DISCOVERY_TIMEOUT = 5000;

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

  private readonly logger = new Logger();
  private readonly errorHandler = new ErrorHandler();
  private readonly storage = new SecureStorage();
  private readonly sessionManager = new SessionManager();
  private readonly toastManager = new ToastManager();

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
        await this.explorer.stop();
      } catch (error) {
        this.logger.warn("Error stopping explorer:", error);
      } finally {
        this.explorer = null;
      }
    }
  }

  private async _discoverHubs(): Promise<HarmonyHub[]> {
    try {
      await this.cleanupExplorer();

      this.logger.info("Starting hub discovery...");
      
      for (let i = 0; i < MAX_PORT_TRIES; i++) {
        const port = this.currentPort + i;
        this.logger.debug(`Trying port ${port}...`);
        
        try {
          this.explorer = new Explorer(port);
          
          const hubs: HarmonyHub[] = [];
          const timeout = setTimeout(() => {
            if (hubs.length === 0) {
              throw new Error("No hubs found");
            }
          }, DISCOVERY_TIMEOUT);

          this.explorer!.on("online", (hub) => {
            // Log the complete hub object to see all available properties
            this.logger.debug("Raw hub data:", JSON.stringify(hub, null, 2));
            
            const fullInfo = hub.fullHubInfo || {};
            this.logger.info("Found hub:", { 
              uuid: hub.uuid, 
              ip: hub.ip, 
              name: hub.friendlyName,
              port: fullInfo.port,
              hubId: fullInfo.hubId,
              productId: fullInfo.productId,
              version: fullInfo.current_fw_version,
              protocols: fullInfo.protocolVersion,
              remoteId: fullInfo.remoteId,
            });

            // Extract remoteId from the full hub info
            const remoteId = fullInfo.remoteId;
            if (!remoteId) {
              this.logger.warn("No remoteId found in hub info, skipping hub");
              return;
            }

            const harmonyHub: HarmonyHub = {
              id: hub.uuid,
              ip: hub.ip,
              name: hub.friendlyName,
              remoteId: remoteId,
              port: fullInfo.port || "5222",
              hubId: fullInfo.hubId,
              version: fullInfo.current_fw_version,
            };
            
            // Only add if not already discovered
            if (!hubs.some(h => h.id === harmonyHub.id)) {
              hubs.push(harmonyHub);
            }
          });

          this.explorer!.on("error", (error: Error) => {
            clearTimeout(timeout);
            throw error;
          });

          this.explorer!.start();
          await new Promise(resolve => setTimeout(resolve, DISCOVERY_TIMEOUT));
          await this.explorer!.stop();
          return hubs;
        } catch (error) {
          await this.cleanupExplorer();
          if (i === MAX_PORT_TRIES - 1) {
            throw new Error("All ports in use. Please try again later.");
          }
          this.logger.warn(`Port ${port} in use, trying next port...`);
          continue;
        }
      }
      
      throw new Error("No hubs found after trying all ports");
    } catch (error) {
      this.logger.error("Failed to discover hubs:", error);
      throw error;
    } finally {
      await this.cleanupExplorer();
    }
  }

  async discoverHubs(): Promise<HarmonyHub[]> {
    if (this.isDiscovering) {
      this.logger.info("Discovery already in progress, returning existing promise");
      return this.discoveryPromise!;
    }

    this.isDiscovering = true;
    this.discoveryPromise = this._discoverHubs()
      .finally(() => {
        this.isDiscovering = false;
        this.discoveryPromise = null;
      });

    return this.discoveryPromise;
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
    try {
      if (this.client) {
        this.logger.info("Disconnecting from hub");
        await this.client.end();
        this.client = null;
      }
      this.connectionState = "disconnected";
      this.logger.info("Successfully disconnected from hub");
    } catch (error) {
      this.logger.error("Error during disconnect:", error);
      // Reset state even if there's an error
      this.client = null;
      this.connectionState = "disconnected";
      throw error;
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
                this.logger.debug(`    Command: ${fn.name} (Label: ${fn.label || fn.name})`);
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
          return group.function.map((fn) => {
            Logger.debug(`    Mapping command: ${fn.name} (${fn.label || fn.name}) for device ${dev.id}`);
            return {
              id: fn.name,
              label: fn.label || fn.name,
              deviceId: dev.id,
              group: group.name, // Add group name for better context
            };
          });
        });

        Logger.debug(`Mapped ${mappedCommands.length} commands for device ${dev.label}`);
        
        return {
          id: dev.id,
          label: dev.label,
          type: dev.type,
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

        Logger.debug('=== Command Execution Details ===');
        Logger.debug(`Client state: ${JSON.stringify({
          connected: this.client.connected,
          authenticated: this.client.authenticated
        })}`);

        // Construct the command payload according to Harmony API requirements
        const commandBody = {
          command: command,
          deviceId: deviceId,
          type: "IRCommand"
        };

        Logger.debug(`Command body: ${JSON.stringify(commandBody, null, 2)}`);

        // Send press command
        try {
          Logger.debug('Sending press command...');
          await this.client.send("holdAction", commandBody);
          Logger.debug('Press command sent successfully');
        } catch (pressError) {
          Logger.error('Press command failed:', pressError);
          Logger.error('Press command details:', {
            body: commandBody,
            error: pressError.message,
            stack: pressError.stack
          });
          throw pressError;
        }

        // Wait between press and release
        const delayMs = 100;
        Logger.debug(`Waiting ${delayMs}ms between press and release`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Send release command
        try {
          Logger.debug('Sending release command...');
          await this.client.send("holdAction", commandBody);
          Logger.debug('Release command sent successfully');
        } catch (releaseError) {
          Logger.error('Release command failed:', releaseError);
          Logger.error('Release command details:', {
            body: commandBody,
            error: releaseError.message,
            stack: releaseError.stack
          });
          throw releaseError;
        }

        Logger.info(`Successfully executed ${command} command for ${device.label}`);
      } catch (error) {
        const errorDetails = {
          command,
          deviceId,
          deviceLabel: device.label,
          error: error.message,
          stack: error.stack,
          clientState: this.client ? {
            connected: this.client.connected,
            authenticated: this.client.authenticated
          } : 'Client not initialized'
        };
        
        Logger.error(`Command execution failed with details:`, errorDetails);
        throw new Error(`Failed to execute command ${command} for device ${device.label}: ${error.message}`);
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

  async loadCachedHubData(): Promise<CachedHarmonyData | null> {
    try {
      this.logger.info("Loading cached hub data...");
      const cached = await this.storage.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as CachedHarmonyData;
      }
      this.logger.info("No cache found, discovering hubs");
      return null;
    } catch (error) {
      this.logger.error("Failed to load cached hub data:", error);
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
      await this.storage.removeItem(CACHE_KEY);
      this.logger.info("Hub cache cleared successfully");
    } catch (error) {
      this.logger.error("Failed to clear hub cache:", error);
      throw error;
    }
  }

  private async discoverHub(): Promise<void> {
    try {
      this.logger.info("Starting hub discovery...");
      const explorer: Explorer = new Explorer();
      const discoveryTimeout: number = 5000;

      explorer.on("online", async (hub: HarmonyHub) => {
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
