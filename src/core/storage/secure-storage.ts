// External dependencies
import { LocalStorage } from "@raycast/api";
import crypto from "crypto";

// Core services
import { ErrorHandler } from "../logging/errorHandler";
import { ErrorCategory } from "../types/error";

// Types
export interface StorageItem {
  key: string;
  value: string;
}

/**
 * SecureStorage Class
 * 
 * Provides a secure storage interface for sensitive data.
 * Wraps Raycast's LocalStorage with additional encryption and error handling.
 */
export class SecureStorage {
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-32-chars-12345678901";
  private readonly ALGORITHM = "aes-256-cbc";
  private readonly errorHandler = new ErrorHandler();

  /**
   * Store a value securely
   * @param key Storage key
   * @param value Value to store
   */
  async set(key: string, value: string): Promise<void> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
      let encrypted = cipher.update(value);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      await LocalStorage.setItem(key, JSON.stringify({
        iv: iv.toString('hex'),
        data: encrypted.toString('hex')
      }));
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Retrieve a value securely
   * @param key Storage key
   * @returns Decrypted value
   */
  async get(key: string): Promise<string | null> {
    try {
      const item = await LocalStorage.getItem(key);
      if (!item) return null;

      const { iv, data } = JSON.parse(item);
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPTION_KEY),
        Buffer.from(iv, 'hex')
      );
      let decrypted = decipher.update(Buffer.from(data, 'hex'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Remove a value from storage
   * @param key Storage key
   */
  async remove(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Clear all stored values
   */
  async clear(): Promise<void> {
    try {
      await LocalStorage.clear();
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }
}
