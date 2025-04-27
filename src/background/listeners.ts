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

// Wrap the listener logic in an exported function
export function setupContextMenuOnClickListener() {
  console.log('Setting up context menu onClicked listener...');
  chrome.contextMenus.onClicked.addListener((info, _tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
      const selectedText = info.selectionText.trim();
      console.log(`Context menu: Clicked! Selected text: "${selectedText}"`);

      // Call the reusable conversion handler
      handleCurrencyConversionRequest(selectedText)
        .then(result => {
          console.log("Context menu conversion result:", result);

          // Initialize with common required fields
          const notificationOptions: chrome.notifications.NotificationOptions = {
            type: 'basic',
            iconUrl: 'icons/icon128.png', // Ensure this path is correct relative to manifest.json
            title: '', // Will be set below
            message: '', // Will be set below
            priority: 0
          };

          if (result.success && result.originalAmount && result.originalCurrency && result.convertedAmount && result.targetCurrency) {
            // Options for successful conversion
            notificationOptions.title = 'ZNTL Konwerter Walut';
            notificationOptions.message = `${result.originalAmount} ${result.originalCurrency} = ${result.convertedAmount.toFixed(2)} ${result.targetCurrency}`;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore // TODO: Investigate NotificationOptions typing issue
            // chrome.notifications.create(successOptions);
          } else {
            // Options for error
             // TODO: Handle result.needsClarification - maybe open popup? Needs decision.
            notificationOptions.title = 'Błąd Konwersji ZNTL';
            notificationOptions.message = result.error || 'Nie udało się przeliczyć waluty. Zaznacz dokładniejszą kwotę i walutę.'; // Improved error message
             // TODO: Handle result.needsClarification - maybe open popup?
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore // TODO: Investigate NotificationOptions typing issue
            // chrome.notifications.create(errorOptions);
          }

          // Provide a unique ID to prevent notifications stacking unnecessarily
          // Or leave empty string/undefined for Chrome to generate one
          const notificationId = `zntl-conversion-${Date.now()}`;
          // Now call create - TS should be happier as the structure is defined upfront
          chrome.notifications.create(notificationId, notificationOptions);

        })
        .catch(error => {
          // Catch unexpected errors from handleCurrencyConversionRequest itself
          console.error("Context menu: Unexpected error during conversion:", error);
          // Use a similar structure for consistency, although less critical here
          const errorOptions: chrome.notifications.NotificationOptions = {
              type: 'basic',
              iconUrl: 'icons/icon128.png', // Ensure path is correct
              title: 'Błąd Systemowy ZNTL',
              message: 'Wystąpił nieoczekiwany błąd systemowy podczas konwersji.',
              priority: 1 // Higher priority for system errors
          };
          chrome.notifications.create(`zntl-error-${Date.now()}`, errorOptions); // Unique ID here too
        });
    } else if (info.menuItemId === CONTEXT_MENU_ID) {
        console.log('Context menu: Clicked, but no text selected?');
        // Optional: Show notification if no text selected
        // Use a similar structure here too
        const noSelectionOptions: chrome.notifications.NotificationOptions = {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'ZNTL Konwerter Walut',
            message: 'Zaznacz tekst zawierający kwotę i walutę, aby dokonać konwersji.',
            priority: 0
        };
        chrome.notifications.create(`zntl-noselection-${Date.now()}`, noSelectionOptions);
    }
  });
}

// DO NOT add the listener at the top level anymore
// setupContextMenuOnClickListener(); // Call this explicitly where needed (e.g., in index.ts or tests) 