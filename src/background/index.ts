import { initializeContextMenu, setupContextMenuOnClickListener } from './listeners';
import { ConversionResult } from '../interfaces';
import { AIProvider } from '../services/ai/AIProvider';
import { GroqAI } from '../services/ai/GroqAI';
import { getExchangeRates } from '../services/nbp';
import {
  CurrencyClarificationRequest,
  ParsedResponse,
} from '../types';
import {
  buildPrompt,
  parseAIResponse,
  validateParsedResponse,
} from '../utils/aiUtils';
import { convertCurrency } from '../utils/currencyUtils';

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

// Temporary direct initialization for testing Groq
// TODO: Remove this and use the dynamic initialization above
const TEMP_GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_YOUR_GROQ_API_KEY_HERE'; // Replace with your actual key or env var
if (TEMP_GROQ_API_KEY === 'gsk_YOUR_GROQ_API_KEY_HERE') {
  console.warn('Using placeholder Groq API key. AI features may not work.');
}
const aiProvider: AIProvider = new GroqAI(TEMP_GROQ_API_KEY);
console.log('AI Provider TEMPORARILY initialized: Groq');

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
  try {
    const prompt = buildPrompt(text);
    console.log('Generated prompt:', prompt);

    const aiResponse = await aiProvider.generateCompletion(prompt);
    console.log('Received AI response:', aiResponse);

    const parsed: ParsedResponse | CurrencyClarificationRequest =
      parseAIResponse(aiResponse);
    console.log('Parsed AI response:', parsed);

    if (parsed.needsClarification) {
      console.log('AI requires clarification:', parsed.question);
      // TODO: Implement UI interaction to get clarification from the user
      // For now, return a specific state indicating clarification is needed
      return {
        success: false,
        needsClarification: true,
        clarificationQuestion: parsed.question,
        originalText: text, // Include original text for context
        error: 'AI requires clarification.',
      };
    }

    // Type assertion after checking needsClarification
    const validatedParsed = parsed as ParsedResponse;

    // Validate the parsed structure (basic validation)
    const validationError = validateParsedResponse(validatedParsed);
    if (validationError) {
      console.error('Parsed response validation failed:', validationError);
      return { success: false, error: `AI response parsing error: ${validationError}` };
    }

    console.log('Parsed response validated:', validatedParsed);

    // Fetch exchange rates from NBP
    const rates = await getExchangeRates(); // Fetches Table A by default
    console.log('Fetched exchange rates:', rates);

    // Perform currency conversion
    const conversion = convertCurrency(
      validatedParsed.amount,
      validatedParsed.currency,
      'PLN', // Target currency is always PLN for now
      rates
    );

    console.log('Conversion result:', conversion);

    if (conversion.success) {
      return {
        success: true,
        originalAmount: validatedParsed.amount,
        originalCurrency: validatedParsed.currency,
        convertedAmount: conversion.value,
        targetCurrency: 'PLN',
        rateDate: rates.effectiveDate, // Include the date of the rates used
      };
    } else {
      return {
        success: false,
        error: conversion.error, // Pass the specific conversion error
      };
    }
  } catch (error: unknown) {
    console.error('Error during currency conversion request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Consider more specific error handling based on error type
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

  // TODO: Implement the actual logic
  // 1. Validate the clarification (e.g., not empty)
  // 2. Build a new prompt incorporating the original text and the clarification.
  // 3. Call the AI provider again with the new prompt.
  // 4. Parse the new response (hopefully it doesn't ask for clarification again!).
  // 5. Validate the parsed response.
  // 6. Fetch exchange rates.
  // 7. Perform conversion.
  // 8. Return the final ConversionResult.

  // Placeholder implementation:
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work

  // Dummy error for now, indicating it's not implemented
  // return { success: false, error: 'Clarification handling not yet implemented.' };

  // Dummy success for testing flow
   return {
     success: true,
     originalAmount: 123, // Dummy data
     originalCurrency: 'USD', // Dummy data
     convertedAmount: 456.78, // Dummy data
     targetCurrency: 'PLN',
     rateDate: new Date().toISOString().split('T')[0], // Dummy date
   };
}

// TODO: Add functions for saving/retrieving API keys via storage
// export async function saveApiKey(provider: string, key: string): Promise<void> { ... }
// export async function getApiKey(provider: string): Promise<string | null> { ... }

// Log any unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Background: Unhandled promise rejection:', event.reason);
}); 