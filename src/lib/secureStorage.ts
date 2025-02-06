import { LocalStorage } from '@raycast/api';
import { ErrorHandler } from './errorHandler';
import { ErrorCategory } from '../types/error';
import crypto from 'crypto';

export interface StorageItem {
  key: string;
  value: string;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-32-chars-12345678901';
const ALGORITHM = 'aes-256-cbc';

export class SecureStorage {
  private static async encrypt(text: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private static async decrypt(text: string): Promise<string> {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      const encryptedValue = await this.encrypt(value);
      await LocalStorage.setItem(key, encryptedValue);
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const encryptedValue = await LocalStorage.getItem(key);
      if (!encryptedValue) {
        return null;
      }
      return this.decrypt(encryptedValue);
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await LocalStorage.clear();
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  static async allItems(): Promise<StorageItem[]> {
    try {
      const items = await LocalStorage.allItems();
      const result: StorageItem[] = [];
      for (const [key, encryptedValue] of Object.entries(items)) {
        if (typeof encryptedValue === 'string') {
          const value = await this.decrypt(encryptedValue);
          result.push({ key, value });
        }
      }
      return result;
    } catch (error) {
      await ErrorHandler.handleError(error as Error, ErrorCategory.STORAGE);
      throw error;
    }
  }
}
