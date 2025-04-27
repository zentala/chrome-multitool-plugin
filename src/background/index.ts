import { aiFacade } from '../services/aiFacade';
import { exchangeRateService } from '../services/exchangeRateService';
import { initializeContextMenu, setupContextMenuOnClickListener } from './listeners';
import { ConversionResult } from '../interfaces';

console.log('Background script loaded.');

// Initialize context menu on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated. Initializing context menu...');
  initializeContextMenu();
});

// Setup the listener for context menu clicks
setupContextMenuOnClickListener();

/**
 * Handles messages sent from other parts of the extension (e.g., popup).
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message);

  if (message.action === 'parseAndConvertCurrency') {
    // Use the refactored function and send its result back
    handleCurrencyConversionRequest(message.text)
      .then(sendResponse)
      .catch((error) => {
        console.error('Background: Error handling parseAndConvertCurrency message:', error);
        sendResponse({ success: false, error: 'Background script error during conversion.' });
      });
    return true; // Indicate async response

  } else if (message.action === 'clarifyAndConvertCurrency') {
    // Handle the request after user provided clarification
    if (!message.originalText || !message.clarification) {
        console.error('Background: Missing originalText or clarification for clarifyAndConvertCurrency');
        sendResponse({ success: false, error: 'Invalid clarification request.'});
        return false; // No async response needed here
    }

    // Modify the input text to include the user's hint
    // This is a simple approach; more complex prompts might be needed for better results
    const modifiedInputText = `${message.originalText} (Hint: User specified currency is ${message.clarification.toUpperCase()})`;
    console.log('Background: Retrying conversion with clarification:', modifiedInputText);

    // Call the same handler, but with the modified input
    handleCurrencyConversionRequest(modifiedInputText)
      .then(sendResponse)
      .catch((error) => {
        console.error('Background: Error handling clarifyAndConvertCurrency message:', error);
        sendResponse({ success: false, error: 'Background script error during clarification.' });
      });
      return true; // Indicate async response
  }

  // Add handlers for other message types here...
});

/**
 * Core logic for parsing and converting currency. Reusable by different triggers.
 * @param inputText The text input from the user.
 * @returns A promise resolving to a ConversionResult object.
 */
export async function handleCurrencyConversionRequest(inputText: string): Promise<ConversionResult> {
  if (!inputText?.trim()) {
    return { success: false, error: 'Input text is empty.' };
  }

  console.log('Background: Handling conversion request for:', inputText);

  try {
    // 1. Parse the input using AI Facade
    const parsedResult = await aiFacade.parseCurrencyInput(inputText);
    if (!parsedResult.success || !parsedResult.amount || !parsedResult.currency) {
      console.log('Background: AI parsing failed or incomplete:', parsedResult.error);
      // TODO: Implement logic to ask user for currency code if error is 'currency_not_recognized' etc.
      return {
        success: false,
        error: `AI parsing failed: ${parsedResult.error || 'Unknown reason'}`,
        needsClarification: parsedResult.error?.includes('parsing_failed') // Example flag
      };
    }

    const { amount, currency: fromCurrency } = parsedResult;
    const toCurrency = 'PLN'; // Hardcoded target currency for now

    console.log(`Background: AI parsed: ${amount} ${fromCurrency}. Converting to ${toCurrency}...`);

    // 2. Get the exchange rate
    const rate = await exchangeRateService.getRate(fromCurrency, toCurrency);

    if (rate === null) {
      console.error(`Background: Failed to get exchange rate for ${fromCurrency} -> ${toCurrency}`);
      // Return specific error, include parsed info for potential use
      return {
        success: false,
        error: `Failed to get exchange rate for ${fromCurrency} to ${toCurrency}. Stale data might be used if available previously. `,
        originalAmount: amount,
        originalCurrency: fromCurrency
      };
    }

    // 3. Calculate the converted amount
    const convertedAmount = amount * rate;

    console.log(`Background: Conversion successful: ${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`);

    // 4. Return the successful result
    return {
      success: true,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)), // Keep consistent type
      targetCurrency: toCurrency,
      rate: rate,
    };
  } catch (error) {
    console.error('Background: Unexpected error during handleCurrencyConversionRequest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during conversion.',
    };
  }
}

// Log any unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Background: Unhandled promise rejection:', event.reason);
}); 