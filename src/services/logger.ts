/**
 * Logging service for the Harmony Hub integration
 * Provides structured logging with different severity levels
 * @module
 */

import { environment } from "@raycast/api";

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  /** Detailed debugging information */
  DEBUG = "DEBUG",
  /** General information about program execution */
  INFO = "INFO",
  /** Potentially harmful situations */
  WARN = "WARN",
  /** Error events that might still allow the program to continue */
  ERROR = "ERROR",
  /** Very severe error events that will likely lead to program termination */
  FATAL = "FATAL",
}

/**
 * Configuration options for the logger
 */
interface LoggerConfig {
  /** Minimum level of messages to log */
  minLevel: LogLevel;
  /** Whether to include timestamps in log messages */
  includeTimestamp: boolean;
  /** Whether to include the log level in messages */
  includeLevel: boolean;
  /** Whether to pretty print objects in log messages */
  prettyPrint: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: environment.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
  includeTimestamp: true,
  includeLevel: true,
  prettyPrint: true,
};

/**
 * Logger service for structured logging
 * Supports multiple log levels and configurable output formatting
 */
export class Logger {
  private static config: LoggerConfig = DEFAULT_CONFIG;

  /**
   * Configures the logger
   * @param config - Configuration options to apply
   */
  public static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Logs a debug message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  public static debug(message: string, context?: unknown): void {
    Logger.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Logs an info message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  public static info(message: string, context?: unknown): void {
    Logger.log(LogLevel.INFO, message, context);
  }

  /**
   * Logs a warning message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  public static warn(message: string, context?: unknown): void {
    Logger.log(LogLevel.WARN, message, context);
  }

  /**
   * Logs an error message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  public static error(message: string, context?: unknown): void {
    Logger.log(LogLevel.ERROR, message, context);
  }

  /**
   * Logs a fatal error message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  public static fatal(message: string, context?: unknown): void {
    Logger.log(LogLevel.FATAL, message, context);
  }

  /**
   * Internal method to format and output log messages
   * @param level - The severity level of the message
   * @param message - The message to log
   * @param context - Optional context object to include
   */
  private static log(level: LogLevel, message: string, context?: unknown): void {
    if (Logger.shouldLog(level)) {
      const parts: string[] = [];

      if (Logger.config.includeTimestamp) {
        parts.push(new Date().toISOString());
      }

      if (Logger.config.includeLevel) {
        parts.push(`[${level}]`);
      }

      parts.push(message);

      if (context !== undefined) {
        const contextStr = Logger.config.prettyPrint
          ? JSON.stringify(context, null, 2)
          : JSON.stringify(context);
        parts.push(contextStr);
      }

      const logMessage = parts.join(" ");

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case LogLevel.INFO:
          console.info(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(logMessage);
          break;
      }
    }
  }

  /**
   * Checks if a message at the given level should be logged
   * @param level - The severity level to check
   * @returns True if the message should be logged
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const minLevelIndex = levels.indexOf(Logger.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }
}

export type LoggerType = typeof Logger;
