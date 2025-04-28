import { aiFacade } from '../services/aiFacade';
import { exchangeRateService, ExchangeRateServiceError } from '../services/exchangeRateService';
import { initializeContextMenu, setupContextMenuOnClickListener } from './listeners';
import { ConversionResult } from '../interfaces';
import { AIAdapterError } from '../interfaces/IAIAdapter'; // Import AI specific error

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
  let parsedAmount: number | undefined = undefined;
  let parsedCurrency: string | undefined = undefined;

  try {
    // 1. Use the AI facade to parse the input
    const parseOutput = await aiFacade.parseCurrency({ text: inputText }); // Pass input object

    if (parseOutput.success) {
        parsedAmount = parseOutput.amount;
        parsedCurrency = parseOutput.currencyCode;
        console.log(`Background: AI parsed: ${parsedAmount} ${parsedCurrency}. Converting to PLN...`);
    } else {
      // Handle AI parsing failure (error or needsClarification)
      console.log('Background: AI parsing failed or needs clarification:', parseOutput);
      return {
        success: false,
        error: parseOutput.error ? `AI Error: ${parseOutput.error}` : undefined,
        needsClarification: parseOutput.needsClarification ? parseOutput.needsClarification : undefined,
      };
    }
    
    // Ensure amount and currency are valid before proceeding
    if (parsedAmount === undefined || !parsedCurrency) {
        // This case should theoretically be handled by the check above, but adds safety
        console.error('Background: Parsed amount or currency is invalid after successful AI parsing.');
        return { success: false, error: 'Internal error after AI parsing.' };
    }

    const toCurrency = 'PLN'; // Hardcoded target currency for now

    // 2. Get the exchange rate (this now throws on error)
    const rate = await exchangeRateService.getRate(parsedCurrency, toCurrency);

    // 3. Calculate the converted amount
    const convertedAmount = parsedAmount * rate;

    console.log(`Background: Conversion successful: ${parsedAmount} ${parsedCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`);

    // 4. Return the successful result
    return {
      success: true,
      originalAmount: parsedAmount,
      originalCurrency: parsedCurrency,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)), // Keep consistent type
      targetCurrency: toCurrency,
      rate: rate,
    };

  } catch (error) {
    console.error('Background: Error during handleCurrencyConversionRequest:', error);

    // Handle specific errors
    if (error instanceof AIAdapterError) {
      return {
        success: false,
        // Provide a user-friendly message based on the error
        error: `AI Service Error: ${error.message}` + (error.details ? ` (${error.details})` : ''),
        // We might still need clarification even if it was an API error (e.g., quota exceeded)
        // needsClarification: ??? // Decide if/how to handle clarification after adapter errors
      };
    } else if (error instanceof ExchangeRateServiceError) {
       // Try to return original parsed info if available, along with the rate error
      return {
        success: false,
        error: `Exchange Rate Service Error: ${error.message}` + (error.details ? ` (${error.details})` : ''),
        originalAmount: parsedAmount,      // Include if parsing succeeded before rate fetch failed
        originalCurrency: parsedCurrency, // Include if parsing succeeded before rate fetch failed
      };
    } else {
      // Handle generic/unexpected errors
      return {
        success: false,
        error: error instanceof Error ? `Unexpected Error: ${error.message}` : 'An unexpected error occurred during conversion.',
      };
    }
  }
}

// Log any unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Background: Unhandled promise rejection:', event.reason);
}); 