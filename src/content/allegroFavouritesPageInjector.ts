import { logViewer } from './logViewer';
import { storageService } from '../services/storage.service';
import { FavouritesWrapper } from '../components/FavouritesWrapper';
import { createRoot } from 'react-dom/client';
import React from 'react';

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
      const favourites = await storageService.getAllFavourites();
      logViewer.log(`Pobrano ${favourites.length} ulubionych produktów`);

      // Przygotuj kontener dla React
      const root = document.createElement('div');
      root.className = 'allegro-favourites-root';
      container.replaceWith(root);

      // Renderuj komponent React
      createRoot(root).render(
        React.createElement(FavouritesWrapper, {
          favourites: favourites,
          onRemove: async (id: string) => {
            await storageService.removeFromFavourites(id);
            // Odśwież widok po usunięciu
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