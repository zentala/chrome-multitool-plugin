import { initializeContextMenu, setupContextMenuOnClickListener, setupRuntimeMessageListener } from './listeners';
import { ConversionResult, IAIAdapter, ParseCurrencyOutput } from '../interfaces';
import { GoogleAIAdapter } from '../services/ai/GoogleAIAdapter';
import { exchangeRateService } from '../services/exchangeRateService';
import {
  CurrencyClarificationRequest,
} from '../types';

console.log('Background script loaded.');

// --- AI Provider Initialization (Lazy Singleton) --- //
let aiProviderInstance: IAIAdapter | null = null;

function getAIProvider(): IAIAdapter {
  if (!aiProviderInstance) {
    console.log('Initializing AI Provider...');
    try {
      aiProviderInstance = new GoogleAIAdapter(); 
      console.log('AI Provider Initialized: Google AI');
    } catch (error) {
        console.error("Failed to initialize AI Provider:", error);
        // Fallback to a dummy provider that always returns errors?
        // Or rethrow/handle differently based on desired behavior without API key
        aiProviderInstance = {
            parseCurrency: async () => ({ success: false, error: 'AI Provider not initialized correctly.' })
        };
    }
  }
  return aiProviderInstance;
}

// --- Event Listener Setup --- //

// Initialize context menu on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated. Initializing context menu...');
  initializeContextMenu();
  // Optionally pre-initialize AI provider on install? 
  // getAIProvider(); 
});

// Setup other listeners
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

// Temporary direct initialization for testing Google
// TODO: Remove this and use the dynamic initialization above
console.warn('Using placeholder Google API key. AI features may not work.');
// Initialize GoogleAIAdapter without passing the key
const aiProvider: IAIAdapter = new GoogleAIAdapter(); // Constructor reads from env var
console.log('AI Provider TEMPORARILY initialized: Google AI');

/**
 * Handles the entire currency conversion request process.
 *
 * @param text - The text potentially containing currency information.
 * @returns A Promise resolving to a ConversionResult.
 */
export async function handleCurrencyConversionRequest(
  text: string
): Promise<ConversionResult> {
  console.log(`Handling conversion request for text: "${text}"`);
  
  // Get the AI provider instance (initializes on first call)
  const aiProvider = getAIProvider();

  try {
    // Use the adapter's parseCurrency method directly
    const parsed: ParseCurrencyOutput = await aiProvider.parseCurrency({ text });
    console.log('Parsed AI response:', parsed);

    if (!parsed.success) {
      // Handle cases where parsing failed or needs clarification
      if (parsed.needsClarification) {
        console.log('AI requires clarification:', parsed.error); // Use error field for clarification message?
        return {
          success: false,
          needsClarification: true,
          clarificationQuestion: parsed.error || 'Unknown clarification needed.', // Assuming error holds the question
          originalText: text,
          error: 'AI requires clarification.',
        };
      } else {
        // General parsing failure
        console.error('AI parsing failed:', parsed.error);
        return { success: false, error: `AI parsing error: ${parsed.error || 'Unknown error'}` };
      }
    }

    // If parsing succeeded, we have amount and currencyCode
    const validatedParsed = {
        amount: parsed.amount!,
        currency: parsed.currencyCode! // Use currencyCode from ParseCurrencyOutput
    };
    console.log('Parsed response validated:', validatedParsed);

    // Fetch exchange rate using exchangeRateService
    const rate = await exchangeRateService.getRate(validatedParsed.currency, 'PLN');
    console.log(`Fetched exchange rate ${validatedParsed.currency} -> PLN:`, rate);

    // Perform currency conversion directly
    const convertedAmount = validatedParsed.amount * rate;
    console.log('Calculated converted amount:', convertedAmount);

    // Check if conversion was successful (rate is a valid number)
    if (typeof rate === 'number' && !isNaN(rate)) {
      return {
        success: true,
        originalAmount: validatedParsed.amount,
        originalCurrency: validatedParsed.currency,
        convertedAmount: convertedAmount, // Use the calculated amount
        targetCurrency: 'PLN',
        rate: rate, // Include the rate used
        // rateDate is not available here
      };
    } else {
      // Handle cases where rate might not be valid (though getRate should throw)
      console.error('Invalid rate received:', rate);
      return {
        success: false,
        error: 'Failed to retrieve a valid exchange rate.',
      };
    }
  } catch (error: unknown) {
    console.error('Error during currency conversion request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Consider more specific error handling based on error type
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
self.addEventListener('unhandledrejection', (event) => {
  console.error('Background: Unhandled promise rejection:', event.reason);
}); 