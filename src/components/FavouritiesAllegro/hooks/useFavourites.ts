import { useCallback } from 'react';
import { storageService } from '../../../services/storage.service';
import { notificationService } from '../../../services/notification.service';
import { AllegroFavourite } from '../types';

function useFavourites() {
  const addToFavourites = useCallback(async (button: HTMLButtonElement): Promise<void> => {
    try {
      // Find auction data
      const offerRow = button.closest('offer-row');
      if (!offerRow) throw new Error('Auction data not found');

      const titleLink = offerRow.querySelector('a[data-analytics-click-label="offerClick"]');
      const priceElement = offerRow.querySelector('price');
      const imageElement = offerRow.querySelector('img');

      if (!titleLink || !priceElement || !imageElement) {
        throw new Error('Required auction data missing');
      }

      const auctionId = titleLink.getAttribute('data-analytics-click-value') || '';
      
      // Check if already in favourites
      const isAlreadyFavourite = await storageService.isInFavourites(auctionId);
      if (isAlreadyFavourite) {
        notificationService.error('This auction is already in favourites');
        return;
      }

      const favourite: AllegroFavourite = {
        id: auctionId,
        title: titleLink.textContent?.trim() || '',
        price: parseFloat(priceElement.textContent?.trim() || '0'),
        imageUrl: imageElement.src || '',
        url: (titleLink as HTMLAnchorElement).href || '',
        addedAt: new Date().toISOString()
      };

      // Save
      const result = await storageService.addToFavourites(favourite);
      
      // Show success notification
      notificationService.success(
        `${favourite.title.substring(0, 50)}... added to favourites`
      );

    } catch (error) {
      notificationService.error('An error occurred while adding to favourites');
    }
  }, []);

  return { addToFavourites };
}

export default useFavourites; 