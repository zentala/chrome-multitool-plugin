// Typy
export interface AllegroFavourite {
  id: string;
  name: string;
  price: string;
  thumbnailUrl: string;
  url: string;
  addedAt: string;
}

export interface StorageResponse {
  success: boolean;
  message: string;
  data?: AllegroFavourite;
}

class StorageService {
  private readonly STORAGE_KEY = 'allegro_favourites';

  // Generic method to fetch data
  async getAll<T>(): Promise<T[]> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Error getting data:', error);
      return [];
    }
  }

  // Add to favourites logic remains the same
  async addToFavourites(item: any): Promise<StorageResponse> {
    try {
      const favourites = await this.getAll<any>();
      
      // Check if it already exists
      if (favourites.some((fav: any) => fav.id === item.id)) {
        return {
          success: false,
          message: 'Ta aukcja jest już w ulubionych'
        };
      }

      // Add new item
      const updatedFavourites = [...favourites, item];
      
      // Save to storage
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: updatedFavourites
      });

      return {
        success: true,
        message: 'Dodano do ulubionych',
        data: item
      };
    } catch {
      return {
        success: false,
        message: 'Błąd podczas zapisywania'
      };
    }
  }

  // Remove from favourites logic remains the same
  async removeFromFavourites(id: string): Promise<StorageResponse> {
    try {
      const favourites = await this.getAll<any>();
      const updatedFavourites = favourites.filter((fav: any) => fav.id !== id);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: updatedFavourites
      });

      return {
        success: true,
        message: 'Usunięto z ulubionych'
      };
    } catch {
      return {
        success: false,
        message: 'Błąd podczas usuwania'
      };
    }
  }

  // Check if an item is in favourites
  async isInFavourites(id: string): Promise<boolean> {
    const favourites = await this.getAll<any>();
    return favourites.some((fav: any) => fav.id === id);
  }
}

export const storageService = new StorageService();
