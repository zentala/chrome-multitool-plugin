/**
 * @file Provides a simple service for interacting with Chrome's storage API.
 */

// Define a generic type for storage areas
type StorageArea = 'local' | 'sync';

// Interface for the storage service
export interface IStorageService {
  /**
   * Retrieves an item from the specified storage area.
   * @param key The key of the item to retrieve.
   * @param area The storage area to use ('local' or 'sync'). Defaults to 'local'.
   * @returns A promise resolving to the retrieved item, or null if not found.
   */
  get<T>(key: string, area?: StorageArea): Promise<T | null>;

  /**
   * Stores an item in the specified storage area.
   * @param key The key to store the item under.
   * @param value The value to store.
   * @param area The storage area to use ('local' or 'sync'). Defaults to 'local'.
   * @returns A promise resolving when the item is stored.
   */
  set<T>(key: string, value: T, area?: StorageArea): Promise<void>;

  /**
   * Removes an item from the specified storage area.
   * @param key The key of the item to remove.
   * @param area The storage area to use ('local' or 'sync'). Defaults to 'local'.
   * @returns A promise resolving when the item is removed.
   */
  remove(key: string, area?: StorageArea): Promise<void>;

  /**
   * Clears all items from the specified storage area.
   * @param area The storage area to clear ('local' or 'sync'). Defaults to 'local'.
   * @returns A promise resolving when the storage is cleared.
   */
  clear(area?: StorageArea): Promise<void>;
}

/**
 * Implementation of the storage service using chrome.storage.
 */
class StorageService implements IStorageService {
  
  private getStorage(area: StorageArea = 'local'): chrome.storage.StorageArea {
    return area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  }

  async get<T>(key: string, area: StorageArea = 'local'): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.getStorage(area).get(key, (result) => {
        if (chrome.runtime.lastError) {
          console.error(`StorageService Error getting key "${key}" from ${area}:`, chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        // Check if the key exists in the result and return its value, otherwise null
        resolve(result && key in result ? (result[key] as T) : null);
      });
    });
  }

  async set<T>(key: string, value: T, area: StorageArea = 'local'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStorage(area).set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.error(`StorageService Error setting key "${key}" in ${area}:`, chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        console.debug(`StorageService: Key "${key}" set in ${area}.`);
        resolve();
      });
    });
  }

  async remove(key: string, area: StorageArea = 'local'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStorage(area).remove(key, () => {
        if (chrome.runtime.lastError) {
          console.error(`StorageService Error removing key "${key}" from ${area}:`, chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        console.debug(`StorageService: Key "${key}" removed from ${area}.`);
        resolve();
      });
    });
  }

  async clear(area: StorageArea = 'local'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStorage(area).clear(() => {
        if (chrome.runtime.lastError) {
          console.error(`StorageService Error clearing ${area}:`, chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        console.debug(`StorageService: Storage area "${area}" cleared.`);
        resolve();
      });
    });
  }
}

// Export a singleton instance of the service
export const storageService = new StorageService(); 