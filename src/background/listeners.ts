import { handleCurrencyConversionRequest } from './index'; // Import the main handler
// Import the new handler (will be created)
import { handleCurrencyClarificationRequest } from './index';

const CONTEXT_MENU_ID = 'ZNTL_CONVERT_CURRENCY';
const DEFAULT_ICON_URL = 'icons/icon128.png'; // Default icon for notifications

/**
 * Initializes the context menu for currency conversion.
 */
export function initializeContextMenu() {
  // Remove existing menu item first (if any) to avoid duplicates during development
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    if (chrome.runtime.lastError) {
      // Ignore the error "Cannot find context menu item" which means it didn't exist
      // console.debug('Context menu item did not exist, creating new one.');
    }
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'ZNTL: Przelicz walutę na PLN',
      contexts: ['selection'],
    });
    console.log('Context menu created.');
  });
}

/**
 * Sets up the listener for context menu clicks.
 */
export function setupContextMenuOnClickListener() {
  chrome.contextMenus.onClicked.addListener(async (info /*, tab is unused */) => {
    console.log('Context menu clicked:', info);
    if (info.menuItemId === CONTEXT_MENU_ID) {
      const selectedText = info.selectionText;
      if (selectedText) {
        try {
          const result = await handleCurrencyConversionRequest(selectedText);
          if (result.success) {
            chrome.notifications.create(`zntl-conversion-${Date.now()}`, {
              type: 'basic',
              iconUrl: DEFAULT_ICON_URL,
              title: 'ZNTL Konwerter Walut',
              message: `${selectedText} = ${result.convertedAmount?.toFixed(2)} PLN`,
            });
          } else {
            chrome.notifications.create(`zntl-error-${Date.now()}`, {
              type: 'basic',
              iconUrl: DEFAULT_ICON_URL,
              title: 'Błąd Konwersji ZNTL',
              message: result.error || 'Nie udało się przeliczyć waluty.',
            });
          }
        } catch (error) {
          console.error('Error handling context menu click:', error);
          chrome.notifications.create(`zntl-generic-error-${Date.now()}`, {
            type: 'basic',
            iconUrl: DEFAULT_ICON_URL,
            title: 'Błąd Rozszerzenia ZNTL',
            message: 'Wystąpił nieoczekiwany błąd.',
          });
        }
      } else {
        chrome.notifications.create(`zntl-noselection-${Date.now()}`, {
          type: 'basic',
          iconUrl: DEFAULT_ICON_URL,
          title: 'ZNTL Konwerter Walut',
          message: 'Zaznacz tekst zawierający kwotę i walutę, aby dokonać konwersji.',
        });
      }
    }
  });
  console.log('Context menu click listener added.');
}

/**
 * Sets up the listener for messages from the popup or other parts of the extension.
 */
export function setupRuntimeMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in background:', message);

    if (message.action === 'parseAndConvertCurrency') {
      // Handle the conversion request asynchronously
      handleCurrencyConversionRequest(message.text)
        .then(result => {
          console.log('Sending response back for parseAndConvertCurrency:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error in handleCurrencyConversionRequest:', error);
          // Send back a generic error response
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error handling request.'
          });
        });
      // Return true to indicate you wish to send a response asynchronously
      return true;
    } else if (message.action === 'clarifyAndConvertCurrency') {
      // Handle the clarification request asynchronously
      handleCurrencyClarificationRequest(message.originalText, message.clarification)
        .then(result => {
          console.log('Sending response back for clarifyAndConvertCurrency:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error in handleCurrencyClarificationRequest:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error handling clarification request.'
          });
        });
      // Return true for async response
      return true;
    }

    // If the action is not recognized, you might want to send a default response or do nothing
    // console.log('Unknown message action:', message.action);
    // sendResponse({ success: false, error: 'Unknown action' }); // Optional
    // Or return false / undefined if not handling this message type
    return false; 
  });
  console.log('Runtime message listener added.');
}

// --- Initialization --- //

// Initialize context menu when the extension is installed or updated
chrome.runtime.onInstalled.addListener(initializeContextMenu);

// Setup listeners
setupContextMenuOnClickListener();
setupRuntimeMessageListener();

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