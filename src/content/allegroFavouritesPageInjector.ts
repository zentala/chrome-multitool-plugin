import { logViewer } from './logViewer';
import { storageService } from '../services/storage.service';

class AllegroFavouritesPageInjector {
  constructor() {
    logViewer.log('AllegroFavouritesPageInjector: Inicjalizacja');
    this.init();
  }

  private async createFavouritesContent(): Promise<HTMLDivElement> {
    logViewer.log('createFavouritesContent: Rozpoczęcie tworzenia contentu');
    
    const container = document.createElement('div');
    container.className = 'mpof_ki mr3m_1 mjyo_6x gel0f myre_zn _c73a0_3Felu _c73a0_Q4dKt _c73a0_KTBhZ g1i5x mryx_16';
    
    try {
      logViewer.log('Pobieranie ulubionych z storage...');
      const favourites = await storageService.getAllFavourites();
      logViewer.log(`Pobrano ${favourites.length} ulubionych produktów`);
    
      const content = document.createElement('div');
      content.className = 'opbox-sheet-wrapper m7er_k4 munh_56 m3h2_56 _17d9e_7VF-Y mjru_ey';
      
      if (favourites.length === 0) {
        logViewer.log('Brak ulubionych - wyświetlam pusty stan');
        content.innerHTML = `
          <div class="opbox-sheet _17d9e_Ww88Y msts_n7">
            <h2 class="mp0t_ji m9qz_yo">Twoje ulubione produkty</h2>
            <p class="mgn2_14">Nie masz jeszcze żadnych ulubionych produktów.</p>
          </div>
        `;
      } else {
        logViewer.log('Generowanie listy ulubionych produktów');
        const items = favourites.map(fav => `
          <div class="favourite-item" style="margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
            <img src="${fav.thumbnailUrl}" alt="${fav.name}" style="max-width: 100px;">
            <h3>${fav.name}</h3>
            <p>Cena: ${fav.price}</p>
            <a href="${fav.url}" target="_blank">Zobacz na Allegro</a>
            <button 
              class="remove-favourite" 
              data-id="${fav.id}"
              style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-left: 10px;"
            >
              Usuń z ulubionych
            </button>
          </div>
        `).join('');

        content.innerHTML = `
          <div class="opbox-sheet _17d9e_Ww88Y msts_n7">
            <h2 class="mp0t_ji m9qz_yo">Twoje ulubione produkty</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
              ${items}
            </div>
          </div>
        `;

        logViewer.log('Dodawanie event listenerów do przycisków usuwania');
        content.querySelectorAll('.remove-favourite').forEach(button => {
          button.addEventListener('click', async (e) => {
            const id = (e.target as HTMLButtonElement).dataset.id;
            if (id) {
              logViewer.log(`Usuwanie produktu o ID: ${id}`);
              await storageService.removeFromFavourites(id);
              const itemElement = (e.target as HTMLElement).closest('.favourite-item');
              if (itemElement) {
                itemElement.remove();
                logViewer.log('Produkt został usunięty z widoku');
              }
            }
          });
        });
      }
      
      container.appendChild(content);
      
    } catch (error) {
      logViewer.log(`Błąd podczas tworzenia contentu: ${error}`);
    }
    
    logViewer.log('createFavouritesContent: Zakończono tworzenie contentu');
    return container;
  }

  private async init(): Promise<void> {
    logViewer.log(`Inicjalizacja na ścieżce: ${window.location.pathname}`);
    
    if (window.location.pathname === '/ulubione') {
        logViewer.log('Wykryto stronę ulubionych');
        
        // Czekamy na załadowanie DOM
        const waitForContent = setInterval(() => {
            // Zmieniony selektor na bardziej specyficzny
            const mainContainer = document.querySelector('div[data-box-name="layout.grid.m.d"]');
            logViewer.log('Szukam kontenera głównego...');
            if (mainContainer) {
                logViewer.log('Znaleziono główny kontener');
                clearInterval(waitForContent);
                
                this.createFavouritesContent()
                    .then(favouritesContent => {
                        logViewer.log('Przygotowuję podmianę zawartości');
                        
                        // Tworzymy nowy kontener zachowujący strukturę Allegro
                        const newContainer = document.createElement('div');
                        newContainer.setAttribute('data-box-name', 'layout.grid.m.d');
                        newContainer.className = 'mpof_ki mwdn_1 mr3m_1 gvl9v _c73a0_1aH95 _c73a0_thXSa';
                        newContainer.appendChild(favouritesContent);
                        
                        logViewer.log('Podmieniam zawartość strony');
                        mainContainer.replaceWith(newContainer);
                        logViewer.log('Zawartość strony została podmieniona');
                        
                        // Dodatkowe sprawdzenie czy podmiana się udała
                        const checkIfReplaced = document.querySelector('.favourite-item');
                        if (checkIfReplaced) {
                            logViewer.log('Potwierdzono podmianę - znaleziono nowe elementy');
                        } else {
                            logViewer.log('BŁĄD: Nie znaleziono nowych elementów po podmianie!');
                        }
                    })
                    .catch(error => {
                        logViewer.log(`Błąd podczas podmiany contentu: ${error}`);
                    });
            } else {
                logViewer.log('Nie znaleziono jeszcze kontenera głównego...');
            }
        }, 500);

        // Zatrzymaj interval po 10 sekundach jeśli nie znaleziono kontenera
        setTimeout(() => {
            clearInterval(waitForContent);
            logViewer.log('Przekroczono limit czasu oczekiwania na kontener');
        }, 10000);
    } else {
        logViewer.log('Nie jesteśmy na stronie ulubionych - pomijam inicjalizację');
    }
  }
}

// Inicjalizacja
new AllegroFavouritesPageInjector(); 