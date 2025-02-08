import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../../types/harmony";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import { Logger } from "../logger";
import { HarmonyClient as HarmonyClientWs, getHarmonyClient as getHarmonyClientWs } from "@harmonyhub/client-ws";
import { CommandQueue } from "./commandQueue";
import { getPreferenceValues } from "@raycast/api";

// Connection management constants
const CONNECTION_TIMEOUT = 10000;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000;
const PING_INTERVAL = 30000;

/**
 * Client for interacting with a Harmony Hub.
 * Handles connection management and command execution.
 */
export class HarmonyClient {
  private client: HarmonyClientWs | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timer | null = null;
  private connectPromise: Promise<void> | null = null;
  private commandQueue: CommandQueue;

  constructor(private readonly hub: HarmonyHub) {
    this.commandQueue = new CommandQueue(
      async (command: HarmonyCommand) => {
        if (!this.client || !this.isConnected) {
          throw new HarmonyError(
            "Not connected to Harmony Hub",
            ErrorCategory.STATE
          );
        }

        // Get preferences for command timing
        const preferences = getPreferenceValues<{ commandHoldTime: string }>();
        const holdTime = parseInt(preferences.commandHoldTime || "100", 10);

        Logger.debug("Sending command to hub", { command });
        
        const commandBody = {
          command: command.name,
          deviceId: command.deviceId,
          type: "IRCommand"
        };

        // Send press action
        await this.client.send("holdAction", commandBody);

        // Wait for hold time
        await new Promise(resolve => setTimeout(resolve, holdTime));

        // Send release action
        await this.client.send("holdAction", commandBody);
      },
      {
        maxQueueSize: 100,
        maxConcurrent: 1,
        defaultTimeout: 5000,
        defaultRetries: 2,
        commandDelay: 100
      }
    );
  }

  /**
   * Connect to the Harmony Hub
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * Internal connect implementation
   */
  private async doConnect(): Promise<void> {
    if (!this.hub.ip) {
      throw new HarmonyError("No IP address available for hub", ErrorCategory.STATE);
    }

    Logger.debug("Attempting to connect to hub", {
      ip: this.hub.ip,
      remoteId: this.hub.remoteId,
      hubId: this.hub.hubId
    });

    try {
      // Create client
      this.client = await getHarmonyClientWs(this.hub.ip);
      
      // Setup ping interval
      this.pingInterval = setInterval(() => {
        this.ping().catch(error => {
          Logger.error("Ping failed", error);
          this.handleConnectionError(error);
        });
      }, PING_INTERVAL);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      Logger.info("Connected to Harmony Hub");

    } catch (error) {
      Logger.error("Failed to connect to hub", error);
      await this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Handle connection errors
   */
  private async handleConnectionError(error: Error): Promise<void> {
    this.isConnected = false;
    
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      Logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY * this.reconnectAttempts));
      await this.connect();
    } else {
      Logger.error("Max reconnection attempts reached");
      throw new HarmonyError("Failed to connect to hub", ErrorCategory.CONNECTION, error);
    }
  }

  /**
   * Ping the hub to check connection
   */
  private async ping(): Promise<void> {
    if (!this.client) {
      throw new HarmonyError("No client available", ErrorCategory.STATE);
    }

    try {
      await this.client.send("ping", {});
    } catch (error) {
      throw new HarmonyError("Ping failed", ErrorCategory.CONNECTION, error as Error);
    }
  }

  /**
   * Get devices from the hub
   */
  public async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client) {
      throw new HarmonyError("No client available", ErrorCategory.STATE);
    }

    try {
      const config = await this.client.getConfig();
      return config.device;
    } catch (error) {
      throw new HarmonyError("Failed to get devices", ErrorCategory.DATA, error as Error);
    }
  }

  /**
   * Get activities from the hub
   */
  public async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      throw new HarmonyError("No client available", ErrorCategory.STATE);
    }

    try {
      const config = await this.client.getConfig();
      return config.activity;
    } catch (error) {
      throw new HarmonyError("Failed to get activities", ErrorCategory.DATA, error as Error);
    }
  }

  /**
   * Execute a command
   */
  public async executeCommand(command: HarmonyCommand): Promise<void> {
    await this.commandQueue.enqueue(command);
  }

  /**
   * Clean up resources
   */
  public async disconnect(): Promise<void> {
    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Clean up client
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        Logger.error("Error closing client", error);
      }
      this.client = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
}
