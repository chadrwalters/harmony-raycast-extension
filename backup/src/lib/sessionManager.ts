import { LocalStorage } from "@raycast/api";
import { ToastManager } from "./toastManager";

interface Session {
  token: string;
  expiresAt: number;
  lastActivity: number;
}

const CACHE_KEYS = {
  HUB_CACHE: "harmony_hub_cache",
  SESSION_CACHE: "harmony_session",
  DATA_CACHE: "harmony_cache",
};

export class SessionManager {
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  static async createSession(token: string): Promise<void> {
    const session: Session = {
      token,
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastActivity: Date.now(),
    };

    await LocalStorage.setItem(CACHE_KEYS.SESSION_CACHE, JSON.stringify(session));
  }

  static async getSession(): Promise<Session | null> {
    try {
      const stored = await LocalStorage.getItem(CACHE_KEYS.SESSION_CACHE);
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
      await LocalStorage.setItem(CACHE_KEYS.SESSION_CACHE, JSON.stringify(session));

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  static async clearSession(): Promise<void> {
    await LocalStorage.removeItem(CACHE_KEYS.SESSION_CACHE);
  }

  static async clearCache(): Promise<void> {
    await Promise.all([
      LocalStorage.removeItem(CACHE_KEYS.HUB_CACHE),
      LocalStorage.removeItem(CACHE_KEYS.SESSION_CACHE),
      LocalStorage.removeItem(CACHE_KEYS.DATA_CACHE),
    ]);
    ToastManager.success("Cache cleared successfully");
  }

  static async validateSession(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {
      await ToastManager.error("Session Expired", "Please reconnect to your Hub");
      return false;
    }
    return true;
  }
}
