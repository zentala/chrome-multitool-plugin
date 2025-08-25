import { initializeContextMenu, setupContextMenuOnClickListener, setupRuntimeMessageListener } from './listeners';
import { ConversionResult, ParseCurrencyOutput } from '../interfaces';
import { exchangeRateService } from '../services/exchangeRateService';
import { getAIProvider } from './aiProvider';

console.log('Background script loaded.');

// --- AI Provider Initialization (Lazy Singleton) --- //

// --- Event Listener Setup --- //

// Initialize context menu on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated. Initializing context menu...');
  initializeContextMenu();
  // Optionally pre-initialize AI provider on install?
  // getAIProvider();
});

// Setup other listeners (context menu initialization is now handled by listeners.ts)
setupContextMenuOnClickListener();
setupRuntimeMessageListener();

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
 * Handles the entire currency conversion request process.
 *
 * @param text - The text potentially containing currency information.
 * @param targetCurrency - Optional: The target currency code (ISO 4217). Defaults to PLN.
 * @returns A Promise resolving to a ConversionResult.
 */
export async function handleCurrencyConversionRequest(
  text: string,
  targetCurrency = 'PLN'
): Promise<ConversionResult> {
  console.log(`Handling conversion request for text: "${text}" to ${targetCurrency}`);
  
  const aiProvider = getAIProvider();

  try {
    // Pass only the text field as defined in ParseCurrencyInput
    const parsed: ParseCurrencyOutput = await aiProvider.parseCurrency({ text }); 
    console.log('Parsed AI response:', parsed);

    if (!parsed.success) {
      // Check if clarification is needed and prompt is a string
      if (parsed.needsClarification && typeof parsed.needsClarification === 'string') {
        return {
          success: false,
          needsClarification: true,
          clarificationQuestion: parsed.needsClarification, // Use the needsClarification field as the question
          originalText: text,
          error: 'AI requires clarification.',
        };
      } else {
        // Handle cases where parsing failed without needing clarification, or the prompt is missing/not a string
        console.error('AI parsing failed or clarification prompt invalid:', parsed.error);
        return { success: false, error: `AI parsing error: ${parsed.error || 'Unknown error or invalid/missing prompt'}` };
      }
    }

    const validatedParsed = {
        amount: parsed.amount!,
        currency: parsed.currencyCode! 
    };
    console.log('Parsed response validated:', validatedParsed);

    // Fetch exchange rate using the provided targetCurrency
    const rate = await exchangeRateService.getRate(validatedParsed.currency, targetCurrency);
    console.log(`Fetched exchange rate ${validatedParsed.currency} -> ${targetCurrency}:`, rate);

    const convertedAmount = validatedParsed.amount * rate;
    console.log('Calculated converted amount:', convertedAmount);

    if (typeof rate === 'number' && !isNaN(rate)) {
      return {
        success: true,
        originalAmount: validatedParsed.amount,
        originalCurrency: validatedParsed.currency,
        convertedAmount: convertedAmount, 
        targetCurrency: targetCurrency, // Return the used target currency
        rate: rate,
      };
    } else {
      console.error('Invalid rate received:', rate);
      return {
        success: false,
        error: 'Failed to retrieve a valid exchange rate.',
      };
    }
  } catch (error: unknown) {
    console.error('Error during currency conversion request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error && error.constructor.name === 'AIAdapterError') {
         return { success: false, error: `AI Service Error: ${errorMessage}` };
    }
    if (errorMessage.includes('API key')) {
        return { success: false, error: 'AI Service Error: Invalid or missing API key.' };
    }
    return { success: false, error: `Unhandled exception: ${errorMessage}` };
  }
}

/**
 * Handles a request where the user provided clarification after the AI asked a question.
 *
 * @param originalText - The original text that initiated the conversion request.
 * @param clarification - The user's response to the AI's clarification question.
 * @returns A Promise resolving to a ConversionResult.
 */
export async function handleCurrencyClarificationRequest(
  originalText: string,
  clarification: string
): Promise<ConversionResult> {
  console.log(`Handling clarification request. Original: "${originalText}", Clarification: "${clarification}"`);
  // const aiProvider = getAIProvider(); // Get provider instance
  // TODO: Implement actual logic using aiProvider, potentially needing a clarify method on the adapter
  await new Promise(resolve => setTimeout(resolve, 50));
   return {
     success: true, // Dummy success
     originalAmount: 123, originalCurrency: 'USD', convertedAmount: 456.78, targetCurrency: 'PLN',
     rateDate: new Date().toISOString().split('T')[0],
   };
}

// TODO: Add functions for saving/retrieving API keys via storage
// export async function saveApiKey(provider: string, key: string): Promise<void> { ... }
// export async function getApiKey(provider: string): Promise<string | null> { ... }

// Log any unhandled promise rejections
// Handle unhandled promise rejections (MV2 compatible)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Background: Unhandled promise rejection:', event.reason);
  });
}
