import { Product } from '../types/Product';

// Pomocnicze funkcje
function addDebugInfo(text: string): void {
  if (process.env.NODE_ENV === 'development') {
    const debugDiv = document.createElement('div');
    debugDiv.textContent = `[DEBUG] ${text}`;
    debugDiv.style.cssText = `
      position: fixed;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: lime;
      padding: 5px;
      font-family: monospace;
      z-index: 999999;
    `;
    
    const existingLogs = document.querySelectorAll('[data-debug-log]').length;
    debugDiv.style.top = `${10 + (existingLogs * 30)}px`;
    debugDiv.setAttribute('data-debug-log', 'true');
    
    document.documentElement.appendChild(debugDiv);
  }
}

// Główna funkcja dodająca przycisk
function injectSaveButton(): void {
  addDebugInfo('Injecting save button...');

  setTimeout(() => {
    try {
      // Nowy selektor - szukamy diva z tymi klasami
      const buttonContainer = document.querySelector('div[class*="_1bwbj"][class*="_292b3_UJkFo"]');
      if (!buttonContainer) {
        addDebugInfo('Button container not found');
        return;
      }

      // Stwórz przycisk w stylu Allegro
      const saveButton = document.createElement('button');
      saveButton.innerHTML = '💾 Zapisz';
      saveButton.className = 'm911_5r mdwl_5r mefy_5r mg9e_0 mh36_0 mj7a_0 mnyp_5r mqen_m6 msts_n7 mvrt_0';
      saveButton.style.marginRight = '10px'; // Dodaj margines przed oryginalnym przyciskiem
      
      // Dodaj ikonę w stylu Allegro
      const icon = document.createElement('i');
      icon.className = '_d8zz0 _nem5f';
      icon.title = 'zapisz przedmiot';
      saveButton.prepend(icon);

      // Obsługa kliknięcia
      saveButton.onclick = async () => {
        try {
          // Znajdź dane produktu
          const productRow = buttonContainer.closest('[data-cy="offer-row"]');
          if (!productRow) {
            throw new Error('Product row not found');
          }

          const product = {
            id: productRow.getAttribute('data-id') || '',
            name: productRow.querySelector('[data-cy="offer-row.name"]')?.textContent || '',
            price: productRow.querySelector('[data-cy="offer-row.price"]')?.textContent || '',
            url: productRow.querySelector('a')?.href || window.location.href,
            imageUrl: productRow.querySelector('img')?.src
          };

          // Zapisz do storage
          await chrome.storage.local.set({
            [`product_${product.id}`]: product
          });

          // Pokaż potwierdzenie
          const originalIcon = icon.className;
          icon.className = '_d8zz0 _nem5f';
          icon.title = 'zapisano!';
          setTimeout(() => {
            icon.className = originalIcon;
            icon.title = 'zapisz przedmiot';
          }, 2000);

          addDebugInfo('Product saved successfully');

        } catch (error) {
          addDebugInfo('Error saving product');
          icon.className = '_d8zz0 _nem5f';
          icon.title = 'błąd!';
          setTimeout(() => {
            icon.className = '_d8zz0 _nem5f';
            icon.title = 'zapisz przedmiot';
          }, 2000);
        }
      };

      // Wstaw przycisk przed istniejącym przyciskiem
      const existingButton = buttonContainer.querySelector('button');
      if (existingButton) {
        buttonContainer.insertBefore(saveButton, existingButton);
      } else {
        buttonContainer.appendChild(saveButton);
      }
      
      addDebugInfo('Save button injected successfully');

    } catch (error) {
      addDebugInfo('Error in injection process');
      if (error instanceof Error) {
        addDebugInfo(error.message);
      }
    }
  }, 1000);
}

// Start
addDebugInfo('Allegro injector starting...');
injectSaveButton();

// Obserwuj zmiany w DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const buttonContainer = document.querySelector('div[class*="_1bwbj"][class*="_292b3_UJkFo"]');
      if (buttonContainer && !buttonContainer.querySelector('button[title="zapisz przedmiot"]')) {
        injectSaveButton();
      }
    }
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

addDebugInfo('DOM observer started'); 