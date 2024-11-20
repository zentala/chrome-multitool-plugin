import { storageService, AllegroFavourite } from './storage.service';
import { notificationService } from './notification.service';

class FavouritesService {
  async addToFavourites(button: HTMLButtonElement): Promise<void> {
    try {
      // Znajdź dane aukcji
      const offerRow = button.closest('offer-row');
      if (!offerRow) throw new Error('Nie znaleziono danych aukcji');

      const titleLink = offerRow.querySelector('a[data-analytics-click-label="offerClick"]');
      const priceElement = offerRow.querySelector('price');
      const imageElement = offerRow.querySelector('img');

      if (!titleLink || !priceElement || !imageElement) {
        throw new Error('Brak wymaganych danych aukcji');
      }

      const auctionId = titleLink.getAttribute('data-analytics-click-value') || '';
      
      // Sprawdź czy już jest w ulubionych
      const isAlreadyFavourite = await storageService.isInFavourites(auctionId);
      if (isAlreadyFavourite) {
        notificationService.error('Ta aukcja jest już w ulubionych');
        return;
      }

      // Przygotuj dane
      const favourite: AllegroFavourite = {
        id: auctionId,
        name: titleLink.textContent?.trim() || '',
        price: priceElement.textContent?.trim() || '',
        thumbnailUrl: imageElement.src,
        url: (titleLink as HTMLAnchorElement).href,
        addedAt: new Date().toISOString()
      };

      // Zapisz
      const result = await storageService.addToFavourites(favourite);
      
      // Pokaż powiadomienie o sukcesie
      notificationService.success(
        `${favourite.name.substring(0, 50)}... dodano do ulubionych`
      );

    } catch (error) {
      notificationService.error('Wystąpił błąd podczas dodawania do ulubionych');
    }
  }
}

export const favouritesService = new FavouritesService(); 