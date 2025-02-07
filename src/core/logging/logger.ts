import { environment } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

/**
 * Log levels supported by the logger.
 */
export enum LogLevel {
  /** Debug level for detailed troubleshooting */
  DEBUG = "debug",
  /** Info level for general operational events */
  INFO = "info",
  /** Warn level for potentially harmful situations */
  WARN = "warn",
  /** Error level for error events */
  ERROR = "error",
}

/**
 * Configuration options for the logger.
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Whether to include timestamps in log output */
  includeTimestamp: boolean;
  /** Whether to include the log level in output */
  includeLevel: boolean;
  /** Optional custom log formatter */
  formatter?: (level: LogLevel, message: string, meta?: any) => string;
}

interface Preferences {
  debugMode: boolean;
}

/**
 * Logger class provides centralized logging functionality with support for
 * different log levels, formatting, and output destinations.
 */
export class Logger {
  private static instance: Logger;
  private static config: LoggerConfig = {
    minLevel: LogLevel.DEBUG,
    includeTimestamp: true,
    includeLevel: true
  };

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Gets the singleton instance of the logger.
   * @returns {Logger} The singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Logs a debug message.
   *
   * @param message - The message to log
   * @param meta - Optional metadata to include
   *
   * @example
   * ```typescript
   * Logger.debug("Processing request", { requestId: "123" });
   * ```
   */
  public static debug(message: string, meta?: any): void {
    if (this.getDebugMode() && this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, [message, meta]));
    }
  }

  /**
   * Logs an info message.
   *
   * @param message - The message to log
   * @param meta - Optional metadata to include
   *
   * @example
   * ```typescript
   * Logger.info("Request completed successfully");
   * ```
   */
  public static info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, [message, meta]));
    }
  }

  /**
   * Logs a warning message.
   *
   * @param message - The message to log
   * @param meta - Optional metadata to include
   *
   * @example
   * ```typescript
   * Logger.warn("Rate limit approaching", { currentRate: 95 });
   * ```
   */
  public static warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.log(this.formatMessage(LogLevel.WARN, [message, meta]));
    }
  }

  /**
   * Logs an error message.
   *
   * @param message - The message to log
   * @param error - Optional error object
   * @param meta - Optional metadata to include
   *
   * @example
   * ```typescript
   * Logger.error("Failed to process request", error, { requestId: "123" });
   * ```
   */
  public static error(message: string, error?: Error, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.log(this.formatMessage(LogLevel.ERROR, [message, error, meta]));
    }
  }

  /**
   * Configures the logger with custom settings.
   *
   * @param config - Logger configuration options
   *
   * @example
   * ```typescript
   * Logger.configure({
   *   minLevel: LogLevel.INFO,
   *   includeTimestamp: true
   * });
   * ```
   */
  public static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  private static getDebugMode(): boolean {
    try {
      const prefs = getPreferenceValues<Preferences>();
      return prefs.debugMode || environment.isDevelopment;
    } catch (error) {
      return environment.isDevelopment;
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(Logger.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  private static formatMessage(level: LogLevel, args: unknown[]): string {
    const parts: string[] = [];

    if (Logger.config.includeTimestamp) {
      const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
      parts.push(timestamp);
    }

    if (Logger.config.includeLevel) {
      parts.push(`[${level}]`);
    }

    const messages = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).filter(Boolean);

    parts.push(messages.join(' '));

    return parts.join(' ');
  }
}
