import { LocalStorage } from "@raycast/api";
import { ToastManager } from "./toastManager";

interface Session {
  token: string;
  expiresAt: number;
  lastActivity: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = "harmony_session";
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  static async createSession(token: string): Promise<void> {
    const session: Session = {
      token,
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastActivity: Date.now(),
    };

    await LocalStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

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

  static async clearSession(): Promise<void> {
    await LocalStorage.removeItem(this.SESSION_KEY);
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
