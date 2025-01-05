import { logViewer } from '../components/Shared/logViewer';
import { storageService } from '../services/storage.service';
import { FavouritesWrapper } from '../components/FavouritiesAllegro/components/FavouritesWrapper';
import { createRoot } from 'react-dom/client';
import { AllegroFavourite } from '../components/FavouritiesAllegro/types';
import React from 'react';

interface AllegroRawFavourite {
  id: string;
  name: string;
  price: string;
  thumbnailUrl: string;
  url: string;
}

class AllegroFavouritesPageInjector {
  constructor() {
    logViewer.log('AllegroFavouritesPageInjector: Inicjalizacja');
    this.init();
  }

  private async init(): Promise<void> {
    logViewer.log(`Inicjalizacja na ścieżce: ${window.location.pathname}`);
    
    if (window.location.pathname === '/ulubione') {
      logViewer.log('Wykryto stronę ulubionych');
      
      // Czekamy na załadowanie DOM
      const waitForContent = setInterval(() => {
        const mainContainer = document.querySelector('div[data-box-name="layout.grid.m.d"]');
        
        if (mainContainer) {
          logViewer.log('Znaleziono główny kontener');
          clearInterval(waitForContent);
          this.renderFavouritesContent(mainContainer);
        }
      }, 500);

      // Timeout zabezpieczający
      setTimeout(() => {
        clearInterval(waitForContent);
        logViewer.log('Przekroczono limit czasu oczekiwania na kontener');
      }, 10000);
    }
  }

  private async renderFavouritesContent(container: Element): Promise<void> {
    try {
      const favourites = await storageService.getAll<AllegroRawFavourite>();
      logViewer.log(`Pobrano ${favourites.length} ulubionych produktów`);

      // Przekształć AllegroFavourite[] na FavouriteItem[]
      const favouriteItems: AllegroFavourite[] = favourites.map((item: AllegroRawFavourite) => ({
        id: item.id,
        title: item.name || 'Brak tytułu',
        imageUrl: item.thumbnailUrl || '',
        price: parseFloat(item.price) || 0,
        url: item.url || '',
      }));

      // Przygotuj kontener dla React
      const root = document.createElement('div');
      root.className = 'allegro-favourites-root';
      container.replaceWith(root);

      // Użyj createRoot zamiast render
      const reactRoot = createRoot(root);
      reactRoot.render(
        React.createElement(FavouritesWrapper, {
          favourites: favouriteItems,
          onRemove: async (id: string) => {
            await storageService.removeFromFavourites(id);
            this.renderFavouritesContent(root);
          }
        })
      );

      logViewer.log('Wyrenderowano komponent FavouritesWrapper');
      
    } catch (error) {
      logViewer.log(`Błąd podczas renderowania: ${error}`);
    }
  }
}

// Inicjalizacja
new AllegroFavouritesPageInjector(); 