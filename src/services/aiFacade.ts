// src/services/aiFacade.ts

import { IAIAdapter, ParseCurrencyInput, ParseCurrencyOutput, AIAdapterError } from '../interfaces/IAIAdapter';
import { GoogleAIAdapter } from './ai/GoogleAIAdapter';
import { IAiFacade } from '../interfaces/IAiFacade';
// Remove unused ConversionResult if the facade methods only return ParseCurrencyOutput
// import { ConversionResult } from '../interfaces'; 

/**
 * Facade for interacting with different AI models/providers.
 * Implements the IAiFacade interface.
 */
export class AiFacade implements IAiFacade {
    private googleAdapter: IAIAdapter;
    // private openAiAdapter: IOpenAiAdapter; // Example for future extension
    // private currentAdapter: IAiAdapter; // Interface for the currently selected adapter

    constructor() {
        // TODO: Implement adapter selection logic (e.g., based on settings)
        // For now, defaulting to Google AI
        this.googleAdapter = new GoogleAIAdapter();
        // this.currentAdapter = this.googleAdapter;
        console.log('AiFacade initialized with GoogleAIAdapter');
    }

    /**
     * Parses currency information from text using the configured AI adapter.
     * @param input The ParseCurrencyInput object.
     * @returns A Promise resolving to a ParseCurrencyOutput.
     * @throws {AIAdapterError} If the underlying adapter throws an error.
     */
    async parseCurrency(input: ParseCurrencyInput): Promise<ParseCurrencyOutput> {
        // TODO: Use this.currentAdapter when multiple adapters are implemented
        // For now, delegate directly to the Google adapter
        console.log('AiFacade: Delegating parseCurrency to GoogleAIAdapter');
        try {
            const result = await this.googleAdapter.parseCurrency(input);
            console.log('AiFacade: Received result from adapter:', result);
            return result;
        } catch (error) {
            // Log the error at the facade level as well
            console.error('AiFacade: Error during parseCurrency delegation:', error);
            // Re-throw the error to be handled by the caller (e.g., background script)
            // This allows the caller to access specific error details (AIAdapterError)
            throw error;
        }
    }

    /**
     * Attempts to clarify a previous parsing attempt based on user input.
     * This method is currently not implemented in the adapter.
     * @param originalInput The original input object.
     * @param clarification The clarification text.
     * @returns A promise resolving to a ParseCurrencyOutput.
     * @throws {Error} Throws error indicating it's not implemented.
     */
    async clarifyCurrency(originalInput: ParseCurrencyInput, clarification: string): Promise<ParseCurrencyOutput> {
        console.warn('AiFacade: clarifyCurrency called but not implemented.');
        // TODO: Implement clarification logic in the adapter and call it here.
        // Example structure:
        // try {
        //     return await this.googleAdapter.clarifyCurrency(originalInput, clarification);
        // } catch (error) { ... }
        throw new Error('Clarification functionality not yet implemented.');
    }

    // TODO: Add more methods as needed, e.g., generateText, analyzeSentiment, etc.
}

// Export a singleton instance of the facade
export const aiFacade = new AiFacade();