/**
 * Utility functions for data validation.
 * @module
 */

import { ErrorHandler, ErrorCategory } from "../logging/errorHandler";
import type { HarmonyHub, HarmonyActivity, HarmonyDevice, HarmonyCommand, HarmonyResponse } from "../../features/control/types/harmony";

/**
 * Options for validation functions.
 */
interface ValidationOptions {
  /** Whether to allow empty values */
  allowEmpty?: boolean;
  /** Whether to trim strings before validation */
  trim?: boolean;
  /** Custom validation function */
  validator?: (value: any) => boolean;
}

/**
 * Validation rule for data validation.
 */
interface ValidationRule {
  /**
   * Field name to validate.
   */
  field: string;
  /**
   * Validation function.
   */
  validate: (value: any) => boolean;
  /**
   * Error message for validation failure.
   */
  message: string;
}

/**
 * Validator class for data validation.
 */
export class Validator {
  /**
   * Validation rules for HarmonyHub.
   */
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
      validate: (hub) => typeof hub.ip === "string" && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hub.ip),
      message: "Hub IP must be a valid IPv4 address",
    },
  ];

  /**
   * Validation rules for HarmonyActivity.
   */
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

  /**
   * Validation rules for HarmonyDevice.
   */
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

  /**
   * Validation rules for HarmonyCommand.
   */
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

  /**
   * Validates a HarmonyHub object.
   *
   * @param hub - HarmonyHub object to validate
   * @throws {Error} If validation fails
   */
  static validateHub(hub: HarmonyHub): void {
    this.validate(hub, this.hubRules);
  }

  /**
   * Validates a HarmonyActivity object.
   *
   * @param activity - HarmonyActivity object to validate
   * @throws {Error} If validation fails
   */
  static validateActivity(activity: HarmonyActivity): void {
    this.validate(activity, this.activityRules);
  }

  /**
   * Validates a HarmonyDevice object.
   *
   * @param device - HarmonyDevice object to validate
   * @throws {Error} If validation fails
   */
  static validateDevice(device: HarmonyDevice): void {
    this.validate(device, this.deviceRules);
    device.commands.forEach((command) => this.validateCommand(command));
  }

  /**
   * Validates a HarmonyCommand object.
   *
   * @param command - HarmonyCommand object to validate
   * @throws {Error} If validation fails
   */
  static validateCommand(command: HarmonyCommand): void {
    this.validate(command, this.commandRules);
  }

  /**
   * Validates an object against a set of validation rules.
   *
   * @param object - Object to validate
   * @param rules - Validation rules
   * @throws {Error} If validation fails
   */
  private static validate(object: any, rules: ValidationRule[]): void {
    for (const rule of rules) {
      if (!rule.validate(object)) {
        throw new Error(rule.message);
      }
    }
  }

  /**
   * Validates a value with a custom validation function.
   *
   * @param value - Value to validate
   * @param validator - Custom validation function
   * @param message - Optional error message
   * @throws {Error} If validation fails
   */
  static validateWithValidator(value: any, validator: (value: any) => boolean, message?: string): void {
    if (!validator(value)) {
      throw new Error(message || "Validation failed");
    }
  }

  /**
   * Validates a HarmonyHub response.
   *
   * @param response - HarmonyHub response to validate
   * @returns {HarmonyHub} Validated HarmonyHub object
   * @throws {Error} If validation fails
   */
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

  /**
   * Validates a HarmonyActivity response.
   *
   * @param response - HarmonyActivity response to validate
   * @returns {HarmonyActivity} Validated HarmonyActivity object
   * @throws {Error} If validation fails
   */
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

  /**
   * Validates a HarmonyDevice response.
   *
   * @param response - HarmonyDevice response to validate
   * @returns {HarmonyDevice} Validated HarmonyDevice object
   * @throws {Error} If validation fails
   */
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

  /**
   * Validates a HarmonyCommand response.
   *
   * @param response - HarmonyCommand response to validate
   * @returns {HarmonyCommand} Validated HarmonyCommand object
   * @throws {Error} If validation fails
   */
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

  /**
   * Validates an object against a set of required fields.
   *
   * @param obj - Object to validate
   * @param requiredFields - Required fields
   * @throws {Error} If validation fails
   */
  static validateObject<T extends Record<string, unknown>>(obj: T, requiredFields: (keyof T)[]): void {
    for (const field of requiredFields) {
      if (!obj[field]) {
        throw new Error(`Missing required field: ${String(field)}`);
      }
    }
  }

  /**
   * Validates a string value.
   *
   * @param value - String value to validate
   * @param fieldName - Field name
   * @returns {string} Validated string value
   * @throws {Error} If validation fails
   */
  static validateString(value: unknown, fieldName: string): string {
    /**
     * Validates a string value.
     *
     * @param value - String value to validate
     * @param fieldName - Field name
     * @returns {string} Validated string value
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * const isValid = Validator.validateString("example", "fieldName");
     * ```
     */
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
    }
    return value;
  }

  /**
   * Validates a number value.
   *
   * @param value - Number value to validate
   * @param fieldName - Field name
   * @returns {number} Validated number value
   * @throws {Error} If validation fails
   */
  static validateNumber(value: unknown, fieldName: string): number {
    /**
     * Validates a number value.
     *
     * @param value - Number value to validate
     * @param fieldName - Field name
     * @returns {number} Validated number value
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * const isValid = Validator.validateNumber(42, "fieldName");
     * ```
     */
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid ${fieldName}: must be a number`);
    }
    return value;
  }

  /**
   * Validates a boolean value.
   *
   * @param value - Boolean value to validate
   * @param fieldName - Field name
   * @returns {boolean} Validated boolean value
   * @throws {Error} If validation fails
   */
  static validateBoolean(value: unknown, fieldName: string): boolean {
    /**
     * Validates a boolean value.
     *
     * @param value - Boolean value to validate
     * @param fieldName - Field name
     * @returns {boolean} Validated boolean value
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * const isValid = Validator.validateBoolean(true, "fieldName");
     * ```
     */
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid ${fieldName}: must be a boolean`);
    }
    return value;
  }

  /**
   * Validates a value with a custom validation function and error handler.
   *
   * @param validator - Custom validation function
   * @throws {Error} If validation fails
   */
  static async validateWithHandler(validator: () => void): Promise<void> {
    /**
     * Validates a value with a custom validation function and error handler.
     *
     * @param validator - Custom validation function
     * @throws {Error} If validation fails
     *
     * @example
     * ```typescript
     * await Validator.validateWithHandler(() => {
     *   // Custom validation logic
     * });
     * ```
     */
    try {
      validator();
    } catch (error) {
      await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorCategory.VALIDATION,
      );
    }
  }
}
