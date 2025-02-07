// External dependencies
import { LocalStorage } from "@raycast/api";
import crypto from "crypto";

// Core services
import { ErrorHandler } from "../logging/errorHandler";
import { ErrorCategory } from "../../core/types/error";

/**
 * Secure storage implementation for sensitive data.
 * Uses Raycast's LocalStorage with encryption for sensitive data.
 */
export class SecureStorage {
  private static instance: SecureStorage;
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-32-chars-12345678901";
  private readonly ALGORITHM = "aes-256-cbc";
  private readonly errorHandler = new ErrorHandler();

  /**
   * Gets the singleton instance of SecureStorage.
   * @returns {SecureStorage} The singleton instance
   */
  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Stores a value securely.
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise<void>
   * @throws {Error} If storage fails
   *
   * @example
   * ```typescript
   * await secureStorage.set("api_key", "secret_key_123");
   * ```
   */
  public async set(key: string, value: string): Promise<void> {
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
   * Retrieves a value from secure storage.
   *
   * @param key - Storage key
   * @returns Promise<string | null> The stored value or null if not found
   * @throws {Error} If retrieval fails
   *
   * @example
   * ```typescript
   * const value = await secureStorage.get("api_key");
   * ```
   */
  public async get(key: string): Promise<string | null> {
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
   * Removes a value from secure storage.
   *
   * @param key - Storage key
   * @returns Promise<void>
   * @throws {Error} If removal fails
   *
   * @example
   * ```typescript
   * await secureStorage.remove("api_key");
   * ```
   */
  public async remove(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Clears all values from secure storage.
   *
   * @returns Promise<void>
   * @throws {Error} If clear operation fails
   *
   * @example
   * ```typescript
   * await secureStorage.clear();
   * ```
   */
  public async clear(): Promise<void> {
    try {
      await LocalStorage.clear();
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Checks if a key exists in secure storage.
   *
   * @param key - Storage key
   * @returns Promise<boolean> True if the key exists
   * @throws {Error} If check fails
   *
   * @example
   * ```typescript
   * const exists = await secureStorage.has("api_key");
   * ```
   */
  public async has(key: string): Promise<boolean> {
    try {
      const item = await LocalStorage.getItem(key);
      return item !== null;
    } catch (error) {
      this.errorHandler.handle(error as Error, ErrorCategory.Storage);
      throw error;
    }
  }

  /**
   * Encrypts a value for storage.
   *
   * @param value - Value to encrypt
   * @returns Encrypted value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(value);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted.toString('hex')
    });
  }

  /**
   * Decrypts a stored value.
   *
   * @param value - Value to decrypt
   * @returns Decrypted value
   */
  private decrypt(value: string): string {
    const { iv, data } = JSON.parse(value);
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(Buffer.from(data, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
