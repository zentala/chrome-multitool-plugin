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
     * Parses the given text to extract currency amount and code using an AI model.
     *
     * @param input The input object containing the text to parse.
     * @returns A promise that resolves to a ParseCurrencyOutput object, which includes the parsed data
     *          or information about why parsing failed (e.g., needs clarification, error).
     * @throws {AIAdapterError} If the underlying adapter fails.
     */
    parseCurrency(input: ParseCurrencyInput): Promise<ParseCurrencyOutput>;

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