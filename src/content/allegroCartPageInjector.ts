import { logViewer } from './logViewer';
import { notificationService } from '../services/notification.service';
import useFavourites from '../components/FavouritiesAllegro/hooks/useFavourites';

class AllegroCardInjector {
  private notificationService: typeof notificationService;

  constructor() {
    this.notificationService = notificationService;
    logViewer.log('AllegroCardInjector: Inicjalizacja dla koszyka Allegro');
    this.init();
  }

  private addFavouriteButtonToAllegroCartItems(): void {
    if (!document.querySelector('#material-symbols-font')) {
      const link = document.createElement('link');
      link.id = 'material-symbols-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=star';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = `
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          color: #777;
          vertical-align: middle;
          cursor: pointer;
          font-size: 28px;
        }
      `;
      document.head.appendChild(style);
    }

    const allegroRemoveButtonContainers = document.querySelectorAll('._1bwbj._292b3_UJkFo');
    
    const { addToFavourites } = useFavourites();

    allegroRemoveButtonContainers.forEach(container => {
      (container as HTMLElement).style.flexDirection = 'column';
      (container as HTMLElement).style.gap = '8px';
      
      if (!container.querySelector('.allegro-fav-button')) {
        const allegroRemoveButton = container.querySelector('button');
        const allegroAuctionId = allegroRemoveButton?.getAttribute('data-analytics-interaction-value') || '';
        
        logViewer.log(`ID aukcji: ${allegroAuctionId}`);
        
        const allegroFavButton = document.createElement('button');
        allegroFavButton.className = 'm911_5r mdwl_5r mefy_5r mg9e_0 mh36_0 mj7a_0 mnyp_5r mqen_m6 msts_n7 mvrt_0 allegro-fav-button';
        allegroFavButton.setAttribute('type', 'button');
        allegroFavButton.setAttribute('data-allegro-auction-id', allegroAuctionId);
        
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = 'star';
        
        allegroFavButton.appendChild(icon);
        
        allegroFavButton.addEventListener('click', async (e: MouseEvent) => {
          e.preventDefault();
          const target = e.currentTarget as HTMLButtonElement;
          await addToFavourites(target);
          
          const iconElement = target.querySelector('.material-symbols-outlined');
          if (iconElement) {
            (iconElement as HTMLElement).style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
          }
        });
        
        if (allegroRemoveButton) {
          container.insertBefore(allegroFavButton, allegroRemoveButton);
        }
      }
    });
  }

  private init(): void {
    setTimeout(() => {
      this.addFavouriteButtonToAllegroCartItems();
    }, 1000);

    const allegroCartObserver = new MutationObserver(() => {
      this.addFavouriteButtonToAllegroCartItems();
    });

    const allegroCartContainer = document.querySelector('.a883q');
    if (allegroCartContainer) {
      allegroCartObserver.observe(allegroCartContainer, { 
        childList: true, 
        subtree: true 
      });
    }
  }
}

new AllegroCardInjector(); 