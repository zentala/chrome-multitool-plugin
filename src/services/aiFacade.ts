// src/services/aiFacade.ts

import { IAIAdapter, ParseCurrencyInput, ParseCurrencyOutput, AIAdapterError } from "../interfaces/IAIAdapter"; // Removed unused AIResponse, AIParseResult
import { GoogleAIAdapter } from "./ai/GoogleAIAdapter";
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
        // TODO: Make adapter selection configurable if needed
        this.googleAdapter = new GoogleAIAdapter();
        // this.currentAdapter = this.googleAdapter;
        console.log('AiFacade initialized with GoogleAIAdapter');
    }

    /**
     * Parses the given text to extract currency amount and code using the configured AI adapter.
     *
     * @param text The text to parse.
     * @returns A promise that resolves to a ParseCurrencyOutput object.
     */
    async parseCurrency(text: string): Promise<ParseCurrencyOutput> {
        console.log(`AiFacade: Parsing text: "${text}"`);
        try {
            // Create the input object required by the adapter
            const input: ParseCurrencyInput = { text }; 
            const result = await this.googleAdapter.parseCurrency(input);
            console.log('AiFacade: Parsing result:', result);
            return result;
        } catch (error) {
            console.error("AiFacade Error parsing currency:", error);
            // Handle specific AIAdapterError or wrap other errors
            if (error instanceof AIAdapterError) {
                // Return a structured error based on the interface
                return { success: false, error: `AI Adapter Error: ${error.message}` };
            } else if (error instanceof Error) {
                return { success: false, error: `Unexpected Facade Error: ${error.message}` };
            } else {
                return { success: false, error: "Unexpected non-Error thrown in Facade" };
            }
        }
    }

    // Remove the clarifyCurrency method as it's not implemented and complicates the interface
    /*
    async clarifyCurrency(originalInput: ParseCurrencyInput, clarification: string): Promise<ParseCurrencyOutput> {
        console.warn('AiFacade: clarifyCurrency called but not implemented.');
        throw new Error('Clarification functionality not yet implemented.');
    }
    */

    // Remove the processText method as parseCurrency serves the main purpose
    /*
    async processText(text: string): Promise<ParseCurrencyOutput> {
        // ... old implementation ...
    }
    */

    // TODO: Add more methods as needed, e.g., generateText, analyzeSentiment, etc.
}

// Export a singleton instance of the facade
export const aiFacade = new AiFacade();