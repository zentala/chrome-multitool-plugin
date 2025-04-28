import { ParseCurrencyInput, ParseCurrencyOutput } from "./IAIAdapter";

/**
 * @file Defines the interface for the AI Facade service.
 * This facade provides a unified way to interact with different AI models/providers
 * for tasks like text parsing, generation, etc.
 */

/**
 * Interface for the AI Facade.
 * Defines the contract for AI-related operations within the extension.
 */
export interface IAiFacade {
    /**
     * Parses currency information from a given text string.
     *
     * @param text The text string to parse.
     * @returns A Promise resolving to a ParseCurrencyOutput.
     */
    parseCurrency(text: string): Promise<ParseCurrencyOutput>;

    /**
     * Attempts to clarify a previous parsing attempt based on user input.
     *
     * @param originalInput The original input object that was attempted to be parsed.
     * @param clarification The additional information provided by the user.
     * @returns A promise that resolves to a ParseCurrencyOutput, hopefully with successful parsing this time.
     * // TODO: Define a more specific input/output structure for clarification if needed.
     */
    clarifyCurrency?(originalInput: ParseCurrencyInput, clarification: string): Promise<ParseCurrencyOutput>;

    // TODO: Add other AI-related methods as needed (e.g., text summarization, etc.)
} 