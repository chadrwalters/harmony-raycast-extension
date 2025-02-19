/**
 * Logger service for Harmony Hub extension
 * @module
 */

/**
 * Logger interface
 */
export const Logger = {
  debug: (message: string, ...args: any[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  logError: (error: Error, context?: string) => {
    const message = context ? `${context}: ${error.message}` : error.message;
    console.error(`[ERROR] ${message}`, {
      name: error.name,
      stack: error.stack,
      error,
    });
  }
} as const;

export type LoggerType = typeof Logger;
