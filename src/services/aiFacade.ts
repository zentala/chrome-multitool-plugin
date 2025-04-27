// src/services/aiFacade.ts

import { ParsedCurrencyResult } from '../interfaces/AI';
import { GoogleAiAdapter } from './ai/googleAiAdapter';

/**
 * Interface for the AI Facade.
 * Defines the available AI operations.
 */
interface IAiFacade {
  /**
   * Parses a natural language text input to extract currency amount and code.
   * @param text The input text (e.g., "100 dollars", "fifty euros and 25 cents").
   * @returns A promise resolving to the parsed currency result or an error indicator.
   */
  parseCurrencyInput(text: string): Promise<ParsedCurrencyResult>;

  // Add other AI operations here in the future (e.g., summarizeText)
}

/**
 * AI Facade implementation.
 * Acts as a single point of entry for AI functionalities,
 * delegating tasks to specific adapters based on configuration.
 */
class AiFacade implements IAiFacade {
  private googleAdapter: GoogleAiAdapter;
  // Add other adapters here (e.g., private openAiAdapter: OpenAiAdapter;)

  constructor() {
    // Initialize adapters
    this.googleAdapter = new GoogleAiAdapter();
    // TODO: Add logic to select adapter based on configuration
  }

  /**
   * Parses currency input using the currently configured AI adapter (initially Google).
   * @param text The input text.
   * @returns A promise resolving to the parsed result.
   */
  async parseCurrencyInput(text: string): Promise<ParsedCurrencyResult> {
    console.log('AiFacade: Parsing currency input:', text);
    // For now, always delegate to Google Adapter
    // TODO: Implement adapter selection logic
    try {
      const result = await this.googleAdapter.parseCurrency(text);
      console.log('AiFacade: Parsing successful:', result);
      return result;
    } catch (error) {
      console.error('AiFacade: Error parsing currency input:', error);
      // Return a structured error result
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI parsing error',
      };
    }
  }

  // Implement other facade methods here...
}

// Export a singleton instance of the facade
export const aiFacade = new AiFacade(); 