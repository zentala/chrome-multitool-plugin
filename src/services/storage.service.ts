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
  data?: any;
}

class StorageService {
  private readonly STORAGE_KEY = 'allegro_favourites';

  // Pobierz wszystkie ulubione
  async getAllFavourites(): Promise<AllegroFavourite[]> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Error getting favourites:', error);
      return [];
    }
  }

  // Dodaj do ulubionych
  async addToFavourites(item: AllegroFavourite): Promise<StorageResponse> {
    try {
      const favourites = await this.getAllFavourites();
      
      // Sprawdź czy już istnieje
      if (favourites.some(fav => fav.id === item.id)) {
        return {
          success: false,
          message: 'Ta aukcja jest już w ulubionych'
        };
      }

      // Dodaj nowy element
      const updatedFavourites = [...favourites, item];
      
      // Zapisz do storage
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: updatedFavourites
      });

      return {
        success: true,
        message: 'Dodano do ulubionych',
        data: item
      };
    } catch (error) {
      return {
        success: false,
        message: 'Błąd podczas zapisywania'
      };
    }
  }

  // Usuń z ulubionych
  async removeFromFavourites(id: string): Promise<StorageResponse> {
    try {
      const favourites = await this.getAllFavourites();
      const updatedFavourites = favourites.filter(fav => fav.id !== id);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: updatedFavourites
      });

      return {
        success: true,
        message: 'Usunięto z ulubionych'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Błąd podczas usuwania'
      };
    }
  }

  // Sprawdź czy jest w ulubionych
  async isInFavourites(id: string): Promise<boolean> {
    const favourites = await this.getAllFavourites();
    return favourites.some(fav => fav.id === id);
  }
}

export const storageService = new StorageService(); 