import { handleCurrencyConversionRequest } from './index'; // Import the refactored function

const CONTEXT_MENU_ID = 'ZNTL_CONVERT_CURRENCY';
const DEFAULT_ICON_URL = 'icons/icon128.png'; // Default icon for notifications

/**
 * Initializes the context menu item for currency conversion.
 */
export function initializeContextMenu() {
  // Remove existing menu item first to avoid duplicates during development hot-reloading
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    // Check for errors, e.g., if the menu item didn't exist
    if (chrome.runtime.lastError) {
      // console.log("Context menu item didn't exist, creating new one.");
    }
    // Create the new menu item
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'ZNTL: Przelicz walutę na PLN',
      contexts: ['selection'], // Show only when text is selected
    });
    console.log('Context menu initialized.');
  });
}

/**
 * @param {chrome.contextMenus.OnClickData} info - Information about the clicked menu item.
 * @param {chrome.tabs.Tab | undefined} _tab - The tab where the click happened (optional, hence possibly undefined).
 */
export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, _tab?: chrome.tabs.Tab): Promise<void> {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const selectedText = info.selectionText.trim();
    console.log(`Context menu: Clicked! Selected text: "${selectedText}"`);

    // Call the reusable conversion handler
    handleCurrencyConversionRequest(selectedText)
      .then(result => {
        console.log("Context menu conversion result:", result);
        const notificationId = `zntl-conversion-${Date.now()}`;

        if (result.success && result.originalAmount && result.originalCurrency && result.convertedAmount && result.targetCurrency) {
          // Create success notification directly
          chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: DEFAULT_ICON_URL, // Directly use constant
            title: 'ZNTL Konwerter Walut',
            message: `${result.originalAmount} ${result.originalCurrency} = ${result.convertedAmount.toFixed(2)} ${result.targetCurrency}`,
            priority: 0
          });
        } else {
          // Create error notification directly
           // TODO: Handle result.needsClarification - maybe open popup? Needs decision.
          chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: DEFAULT_ICON_URL, // Directly use constant
            title: 'Błąd Konwersji ZNTL',
            message: result.error || 'Nie udało się przeliczyć waluty. Zaznacz dokładniejszą kwotę i walutę.',
            priority: 0
          });
        }
      })
      .catch(error => {
        // Catch unexpected errors from handleCurrencyConversionRequest itself
        console.error("Context menu: Unexpected error during conversion:", error);
        // Create system error notification directly
        chrome.notifications.create(`zntl-error-${Date.now()}`, {
            type: 'basic',
            iconUrl: DEFAULT_ICON_URL, // Directly use constant
            title: 'Błąd Systemowy ZNTL',
            message: 'Wystąpił nieoczekiwany błąd systemowy podczas konwersji.',
            priority: 1
        });
      });
  } else if (info.menuItemId === CONTEXT_MENU_ID) {
      console.log('Context menu: Clicked, but no text selected?');
      // Create no-selection notification directly
      chrome.notifications.create(`zntl-noselection-${Date.now()}`, {
          type: 'basic',
          iconUrl: DEFAULT_ICON_URL, // Directly use constant
          title: 'ZNTL Konwerter Walut',
          message: 'Zaznacz tekst zawierający kwotę i walutę, aby dokonać konwersji.',
          priority: 0
      });
  }
}

/**
 * Sets up the listener for context menu clicks.
 */
export function setupContextMenuOnClickListener(): void {
  if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener(handleContextMenuClick); // Pass the function directly
  } else {
    console.error("chrome.contextMenus.onClicked API is not available.");
  }
}

// --- Direct Execution ---

// Initialize context menu immediately when this script is loaded.
initializeContextMenu();

// Setup the listener for context menu clicks immediately.
setupContextMenuOnClickListener();


// NOTE: Potentially unused functions below. Review and remove if confirmed.
// Example unused function (kept for illustration if needed later, but should be removed if truly unused)
/*
function handleOtherClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): void {
  console.log("Another context menu item clicked:", info, tab);
}
*/

// Remove unused function:
/*
export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  console.debug("handleContextMenuClick called", { info, tab });

  if (info.menuItemId === ZNTL_CONTEXT_MENU_ID && info.selectionText) {
    const result = await handleCurrencyConversionRequest(info.selectionText);
    console.debug("Conversion result:", result);

    if (result.success) {
      const message = `${result.originalAmount} ${result.originalCurrency} = ${result.convertedAmount.toFixed(2)} ${result.targetCurrency}`;
      showNotification("ZNTL Konwerter Walut", message);
    } else {
      // Handle specific clarification needed case
      if (result.needsClarification) {
        // TODO: Implement UI interaction to ask for clarification
        console.warn("Clarification needed:", result.error);
        showNotification("ZNTL Potrzebne Doprecyzowanie", `Nie można jednoznacznie określić waluty: ${info.selectionText}. Proszę spróbować z bardziej precyzyjnym zapytaniem (np. '100 USD' zamiast '100 dolarów').`);
      } else {
        console.error("Conversion failed:", result.error);
        showNotification("Błąd Konwersji ZNTL", result.error || "Nieznany błąd podczas konwersji.");
      }
    }
  } else {
    console.warn("Context menu click ignored:", { menuItemId: info.menuItemId, hasSelection: !!info.selectionText });
  }
}
*/ 