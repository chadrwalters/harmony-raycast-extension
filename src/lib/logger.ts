import { environment } from "@raycast/api";

export class Logger {
  static debug(...args: unknown[]): void {
    if (environment.isDevelopment) {
      console.debug(...args);
    }
  }

  static info(...args: unknown[]): void {
    console.info(...args);
  }

  static warn(...args: unknown[]): void {
    console.warn(...args);
  }

  static error(...args: unknown[]): void {
    console.error(...args);
  }
}
