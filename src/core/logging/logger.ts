import { environment } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  debugMode: boolean;
}

export class Logger {
  private static getDebugMode(): boolean {
    try {
      const prefs = getPreferenceValues<Preferences>();
      return prefs.debugMode || environment.isDevelopment;
    } catch (error) {
      return environment.isDevelopment;
    }
  }

  private static formatMessage(level: string, args: unknown[]): string {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    const messages = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    });
    return `${timestamp} [${level}] ${messages.join(' ')}`;
  }

  debug(...args: unknown[]): void {
    Logger.debug(...args);
  }

  info(...args: unknown[]): void {
    Logger.info(...args);
  }

  warn(...args: unknown[]): void {
    Logger.warn(...args);
  }

  error(...args: unknown[]): void {
    Logger.error(...args);
  }

  static debug(...args: unknown[]): void {
    if (this.getDebugMode()) {
      console.log(this.formatMessage('DEBUG', args));
    }
  }

  static info(...args: unknown[]): void {
    console.log(this.formatMessage('INFO', args));
  }

  static warn(...args: unknown[]): void {
    console.log(this.formatMessage('WARN', args));
  }

  static error(...args: unknown[]): void {
    console.log(this.formatMessage('ERROR', args));
  }
}
