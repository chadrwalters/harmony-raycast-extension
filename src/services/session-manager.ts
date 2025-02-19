/**
 * Session management service for Harmony Hub integration.
 * Handles user session state, persistence, and cache management.
 * @module
 */

import { LocalStorage } from "@raycast/api";

import { ToastManager } from "../services/toast";

/**
 * Interface representing a user session.
 * Contains authentication and state information.
 * @interface Session
 */
interface Session {
  /** Authentication token for the session */
  token: string;
  /** Timestamp when the session expires */
  expiresAt: number;
  /** Timestamp of the last user activity */
  lastActivity: number;
}

/**
 * SessionManager class handles user session state and persistence.
 * Provides methods for storing and retrieving session data securely.
 * Manages session expiration and inactivity timeouts.
 */
export class SessionManager {
  /** Key for storing session data in local storage */
  private static readonly SESSION_KEY = "harmony_session";
  /** Key for storing general cache data */
  private static readonly CACHE_KEY = "harmony_cache";
  /** Key for storing hub-specific cache data */
  private static readonly HUB_CACHE_KEY = "harmony_hub_cache";
  /** Duration of a session in milliseconds (24 hours) */
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000;
  /** Threshold for session inactivity in milliseconds (30 minutes) */
  private static readonly ACTIVITY_THRESHOLD = 30 * 60 * 1000;

  /**
   * Creates a new session with the given token.
   * Sets expiration and activity timestamps.
   * @param token - The session token to store
   * @returns Promise that resolves when the session is created
   */
  static async createSession(token: string): Promise<void> {
    const session: Session = {
      token,
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastActivity: Date.now(),
    };

    await LocalStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Retrieves the current session if valid.
   * Checks for expiration and inactivity.
   * Updates last activity timestamp if session is valid.
   * @returns Promise resolving to the current session or null if invalid/expired
   */
  static async getSession(): Promise<Session | null> {
    try {
      const stored = await LocalStorage.getItem(this.SESSION_KEY);
      if (!stored || typeof stored !== "string") {
        return null;
      }

      const session = JSON.parse(stored) as Session;
      const now = Date.now();

      // Check if session has expired
      if (now > session.expiresAt) {
        await this.clearSession();
        return null;
      }

      // Check if session is inactive
      if (now - session.lastActivity > this.ACTIVITY_THRESHOLD) {
        await this.clearSession();
        return null;
      }

      // Update last activity
      session.lastActivity = now;
      await LocalStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  /**
   * Clears the current session.
   * Removes session data from local storage.
   * @returns Promise that resolves when the session is cleared
   */
  static async clearSession(): Promise<void> {
    await LocalStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Clears all cached data.
   * Removes both general and hub-specific caches.
   * Shows success toast on completion.
   * @returns Promise that resolves when caches are cleared
   */
  static async clearCache(): Promise<void> {
    await Promise.all([LocalStorage.removeItem(this.CACHE_KEY), LocalStorage.removeItem(this.HUB_CACHE_KEY)]);
    await ToastManager.success("Cache cleared successfully");
  }

  /**
   * Validates the current session.
   * Shows error toast if session is invalid.
   * @returns Promise resolving to true if session is valid, false otherwise
   */
  static async validateSession(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {
      await ToastManager.error("Session Expired", "Please reconnect to your Hub");
      return false;
    }
    return true;
  }
}
