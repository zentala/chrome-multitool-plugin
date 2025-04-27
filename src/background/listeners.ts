import { handleCurrencyConversionRequest } from './index'; // Import the refactored function

const CONTEXT_MENU_ID = 'ZNTL_CONVERT_CURRENCY';

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
 * Handles clicks on the context menu items.
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const selectedText = info.selectionText.trim();
    console.log(`Context menu: Clicked! Selected text: "${selectedText}"`);

    // Call the reusable conversion handler
    handleCurrencyConversionRequest(selectedText)
      .then(result => {
        console.log("Context menu conversion result:", result);
        
        if (result.success && result.originalAmount && result.originalCurrency && result.convertedAmount && result.targetCurrency) {
          // Options for successful conversion
          const successOptions: chrome.notifications.NotificationOptions = {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'ZNTL Konwerter Walut',
            message: `${result.originalAmount} ${result.originalCurrency} = ${result.convertedAmount.toFixed(2)} ${result.targetCurrency}`,
            priority: 0
          };
          chrome.notifications.create(successOptions);
        } else {
          // Options for error
          const errorOptions: chrome.notifications.NotificationOptions = {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Błąd Konwersji ZNTL',
            message: result.error || 'Nie udało się przeliczyć waluty.',
            priority: 0
          };
           // TODO: Handle result.needsClarification - maybe open popup?
          chrome.notifications.create(errorOptions);
        }
      })
      .catch(error => {
        // Catch unexpected errors from handleCurrencyConversionRequest itself
        console.error("Context menu: Unexpected error during conversion:", error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Błąd Konwersji ZNTL',
          message: 'Wystąpił nieoczekiwany błąd systemowy.',
          priority: 0
        });
      });
  } else if (info.menuItemId === CONTEXT_MENU_ID) {
      console.log('Context menu: Clicked, but no text selected?');
      // Optionally show a notification that text needs to be selected
  }
}); 