import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../../types/harmony";
import { HarmonyError, ErrorCategory } from "../../types/errors";
import { Logger } from "../logger";
import { getHarmonyClient } from "@harmonyhub/client-ws";
import { getPreferenceValues } from "@raycast/api";

export class HarmonyClient {
  private client: any = null;
  private isConnected = false;
  public readonly hub: HarmonyHub;

  constructor(hub: HarmonyHub) {
    this.hub = hub;
  }

  /**
   * Connect to the Harmony Hub
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      Logger.info(`Connecting to hub ${this.hub.name} (${this.hub.ip})`);
      
      // Create client with remoteId if available for faster connection
      this.client = await getHarmonyClient(this.hub.ip);
      this.isConnected = true;
      
      Logger.info(`Connected to hub ${this.hub.name}`);

      // Setup disconnect handler
      this.client.on("disconnected", () => {
        Logger.warn(`Disconnected from hub ${this.hub.name}`);
        this.isConnected = false;
      });

    } catch (error) {
      this.isConnected = false;
      throw new HarmonyError(
        `Failed to connect to hub ${this.hub.name}`,
        ErrorCategory.CONNECTION,
        error as Error
      );
    }
  }

  /**
   * Get devices from the hub
   */
  public async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const config = await this.client.getAvailableCommands();
      return config.device.map(device => ({
        id: device.id,
        name: device.label,
        type: device.type,
        commands: device.controlGroup
          .flatMap(group => group.function)
          .map(func => ({
            id: func.name,
            name: func.label || func.name,
            deviceId: device.id,
            group: func.action?.command?.type || "IRCommand"
          }))
      }));
    } catch (error) {
      throw new HarmonyError(
        "Failed to get devices",
        ErrorCategory.HUB_COMMUNICATION,
        error as Error
      );
    }
  }

  /**
   * Get activities from the hub
   */
  public async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const activities = await this.client.getActivities();
      return activities.map(activity => ({
        id: activity.id,
        name: activity.label,
        type: activity.type,
        isCurrent: false // Will be updated by current activity check
      }));
    } catch (error) {
      throw new HarmonyError(
        "Failed to get activities",
        ErrorCategory.HUB_COMMUNICATION,
        error as Error
      );
    }
  }

  /**
   * Execute a command
   */
  public async executeCommand(command: HarmonyCommand): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const preferences = getPreferenceValues<{ commandHoldTime: string }>();
      const holdTime = parseInt(preferences.commandHoldTime || "100", 10);

      Logger.debug("Sending command to hub", { command });
      
      const commandBody = {
        command: command.name,
        deviceId: command.deviceId,
        type: command.group || "IRCommand"
      };

      // Send press action
      await this.client.send("holdAction", commandBody);

      // Wait for hold time
      await new Promise(resolve => setTimeout(resolve, holdTime));

      // Send release action
      await this.client.send("releaseAction", commandBody);

    } catch (error) {
      throw new HarmonyError(
        `Failed to execute command ${command.name}`,
        ErrorCategory.COMMAND_EXECUTION,
        error as Error
      );
    }
  }

  /**
   * Disconnect from the hub
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
      } catch (error) {
        Logger.error("Error disconnecting from hub:", error);
      }
      this.client = null;
    }
    this.isConnected = false;
  }
}
