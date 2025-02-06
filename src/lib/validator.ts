import { ErrorHandler, ErrorCategory } from "./errorHandler";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice, HarmonyCommand, HarmonyResponse } from "../types/harmony";

interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

export class Validator {
  private static readonly hubRules: ValidationRule[] = [
    {
      field: "id",
      validate: (hub) => typeof hub.id === "string" && hub.id.length > 0,
      message: "Hub ID must be a non-empty string",
    },
    {
      field: "friendlyName",
      validate: (hub) => typeof hub.friendlyName === "string" && hub.friendlyName.length > 0,
      message: "Hub friendly name must be a non-empty string",
    },
    {
      field: "ip",
      validate: (hub) =>
        typeof hub.ip === "string" &&
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hub.ip),
      message: "Hub IP must be a valid IPv4 address",
    },
  ];

  private static readonly activityRules: ValidationRule[] = [
    {
      field: "id",
      validate: (activity) => typeof activity.id === "string" && activity.id.length > 0,
      message: "Activity ID must be a non-empty string",
    },
    {
      field: "label",
      validate: (activity) => typeof activity.label === "string" && activity.label.length > 0,
      message: "Activity label must be a non-empty string",
    },
  ];

  private static readonly deviceRules: ValidationRule[] = [
    {
      field: "id",
      validate: (device) => typeof device.id === "string" && device.id.length > 0,
      message: "Device ID must be a non-empty string",
    },
    {
      field: "label",
      validate: (device) => typeof device.label === "string" && device.label.length > 0,
      message: "Device label must be a non-empty string",
    },
    {
      field: "commands",
      validate: (device) => Array.isArray(device.commands),
      message: "Device commands must be an array",
    },
  ];

  private static readonly commandRules: ValidationRule[] = [
    {
      field: "id",
      validate: (command) => typeof command.id === "string" && command.id.length > 0,
      message: "Command ID must be a non-empty string",
    },
    {
      field: "label",
      validate: (command) => typeof command.label === "string" && command.label.length > 0,
      message: "Command label must be a non-empty string",
    },
    {
      field: "action",
      validate: (command) => typeof command.action === "string" && command.action.length > 0,
      message: "Command action must be a non-empty string",
    },
  ];

  static validateHub(hub: HarmonyHub): void {
    this.validate(hub, this.hubRules);
  }

  static validateActivity(activity: HarmonyActivity): void {
    this.validate(activity, this.activityRules);
  }

  static validateDevice(device: HarmonyDevice): void {
    this.validate(device, this.deviceRules);
    device.commands.forEach(command => this.validateCommand(command));
  }

  static validateCommand(command: HarmonyCommand): void {
    this.validate(command, this.commandRules);
  }

  private static validate(object: any, rules: ValidationRule[]): void {
    for (const rule of rules) {
      if (!rule.validate(object)) {
        throw new Error(rule.message);
      }
    }
  }

  static async validateWithHandler<T>(validator: () => void): Promise<void> {
    try {
      validator();
    } catch (error) {
      await ErrorHandler.handleError(error instanceof Error ? error : new Error(String(error)), ErrorCategory.VALIDATION);
    }
  }

  static validateHubResponse(response: HarmonyResponse): HarmonyHub {
    try {
      const hub: HarmonyHub = {
        id: String(response.id || ""),
        friendlyName: String(response.friendlyName || ""),
        ip: String(response.ip || ""),
        remoteId: String(response.remoteId || ""),
      };
      this.validateHub(hub);
      return hub;
    } catch (error) {
      throw new Error(`Hub response validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static validateActivityResponse(response: HarmonyResponse): HarmonyActivity {
    try {
      const activity: HarmonyActivity = {
        id: String(response.id || ""),
        label: String(response.label || ""),
        isAVActivity: Boolean(response.isAVActivity),
        isTuningDefault: Boolean(response.isTuningDefault),
        status: String(response.status || ""),
      };
      this.validateActivity(activity);
      return activity;
    } catch (error) {
      throw new Error(`Activity response validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static validateDeviceResponse(response: HarmonyResponse): HarmonyDevice {
    try {
      const device: HarmonyDevice = {
        id: String(response.id || ""),
        label: String(response.label || ""),
        type: String(response.type || ""),
        commands: Array.isArray(response.commands) ? response.commands : [],
      };
      this.validateDevice(device);
      return device;
    } catch (error) {
      throw new Error(`Device response validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static validateCommandResponse(response: HarmonyResponse): HarmonyCommand {
    try {
      const command: HarmonyCommand = {
        id: String(response.id || ""),
        label: String(response.label || ""),
        deviceId: String(response.deviceId || ""),
        action: String(response.action || ""),
      };
      this.validateCommand(command);
      return command;
    } catch (error) {
      throw new Error(`Command response validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
