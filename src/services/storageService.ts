/**
 * A simple wrapper around chrome.storage.local for type safety
 * and easier usage with async/await.
 */
class StorageService {
  /**
   * Gets a value from chrome.storage.local.
   * @param key The key of the item to retrieve.
   * @returns A promise resolving to the value, or null if not found or an error occurs.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as T) || null;
    } catch (error) {
      console.error(`StorageService: Error getting item with key '${key}':`, error);
      return null;
    }
  }

  /**
   * Sets a value in chrome.storage.local.
   * @param key The key of the item to set.
   * @param value The value to set.
   * @returns A promise that resolves when the operation is complete, or rejects on error.
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`StorageService: Error setting item with key '${key}':`, error);
      // Optional: rethrow the error if the caller needs to handle it
      // throw error;
    }
  }

  /**
   * Removes an item from chrome.storage.local.
   * @param key The key of the item to remove.
   * @returns A promise that resolves when the operation is complete, or rejects on error.
   */
  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`StorageService: Error removing item with key '${key}':`, error);
      // Optional: rethrow the error
      // throw error;
    }
  }

  /**
   * Clears all items from chrome.storage.local.
   * Use with caution!
   * @returns A promise that resolves when the operation is complete, or rejects on error.
   */
  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('StorageService: Error clearing storage:', error);
      // Optional: rethrow the error
      // throw error;
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService(); 