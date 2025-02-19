/**
 * Logging service for Harmony Hub integration.
 * Provides structured logging with levels, history, and formatting.
 * @module
 */

import { LogLevel, LogEntry, LoggerOptions, ILogger } from "../types/core/logging";

/**
 * Default logger configuration
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  minLevel: LogLevel.INFO,
  maxEntries: 1000,
  includeTimestamp: true,
  includeLevel: true,
};

/**
 * Service for structured logging in the Harmony extension.
 * Supports multiple log levels, history tracking, and configurable formatting.
 */
export class Logger implements ILogger {
  /** Current logger configuration */
  private static options: LoggerOptions = DEFAULT_OPTIONS;
  /** Log history */
  private static history: LogEntry[] = [];

  /**
   * Configure the logger.
   * Updates logger settings while preserving existing log history.
   * @param options - New logger options
   */
  static configure(options: Partial<LoggerOptions>): void {
    Logger.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Log a debug message.
   * Only logs if minimum level is DEBUG.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  static debug(message: string, data?: unknown): void {
    Logger.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message.
   * Only logs if minimum level is INFO or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  static info(message: string, data?: unknown): void {
    Logger.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message.
   * Only logs if minimum level is WARN or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  static warn(message: string, data?: unknown): void {
    Logger.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message.
   * Only logs if minimum level is ERROR or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  static error(message: string, data?: unknown): void {
    Logger.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log an error with full stack trace.
   * Includes error details and optional context.
   * @param error - Error to log
   * @param context - Optional context information
   */
  static logError(error: Error, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    Logger.error(message, {
      name: error.name,
      stack: error.stack,
      context,
    });
  }

  /**
   * Get the current log history.
   * Returns a copy of the log entries.
   * @returns Array of log entries
   */
  static getHistory(): LogEntry[] {
    return [...Logger.history];
  }

  /**
   * Clear the log history.
   * Removes all stored log entries.
   */
  static clearHistory(): void {
    Logger.history = [];
  }

  /**
   * Set the minimum log level.
   * Updates which messages will be logged.
   * @param level - New minimum log level
   */
  static setMinLevel(level: LogLevel): void {
    Logger.options.minLevel = level;
  }

  /**
   * Internal method to create a log entry.
   * Formats and stores the log entry based on configuration.
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to include
   * @private
   */
  private static log(level: LogLevel, message: string, data?: unknown): void {
    if (level < (Logger.options.minLevel ?? LogLevel.INFO)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    Logger.history.push(entry);

    // Trim history if it exceeds max entries
    if (Logger.options.maxEntries && Logger.history.length > Logger.options.maxEntries) {
      Logger.history = Logger.history.slice(-Logger.options.maxEntries);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const prefix = Logger.formatPrefix(entry);
      console.log(prefix, message, data ? data : "");
    }
  }

  /**
   * Format the prefix for a log entry.
   * Includes timestamp and level based on configuration.
   * @param entry - Log entry to format
   * @returns Formatted prefix string
   * @private
   */
  private static formatPrefix(entry: LogEntry): string {
    const parts: string[] = [];

    if (Logger.options.includeTimestamp) {
      parts.push(entry.timestamp);
    }

    if (Logger.options.includeLevel) {
      parts.push(`[${LogLevel[entry.level]}]`);
    }

    return parts.join(" ");
  }
}

export type LoggerType = typeof Logger;
