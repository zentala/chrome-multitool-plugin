/**
 * @file Defines the structure for the result of parsing currency text using AI.
 */

/**
 * Represents the outcome of attempting to parse currency information from text.
 *
 * - `success`: Indicates if parsing was successful.
 * - `amount`: The numeric amount parsed (if successful).
 * - `currencyCode`: The ISO 4217 currency code (e.g., "USD", "EUR") (if successful).
 * - `needsClarification`: If true, the AI needs more information from the user.
 * - `clarificationPrompt`: A question or prompt for the user if clarification is needed.
 * - `error`: An error message if parsing failed for other reasons.
 * - `originalText`: The original text that was parsed.
 */
export interface CurrencyParseResult {
    success: boolean;
    amount?: number;
    currencyCode?: string; // ISO 4217 code
    needsClarification?: boolean;
    clarificationPrompt?: string;
    error?: string;
    originalText: string; // Always include the original text for context
} 