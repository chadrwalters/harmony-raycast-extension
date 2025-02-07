import { environment } from "@raycast/api";

export class Logger {
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
    if (environment.isDevelopment) {
      // Changed from console.debug to console.log for better visibility
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
