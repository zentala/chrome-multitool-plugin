/**
 * @file Defines the core interface for AI Adapters and related types.
 */

/**
 * Represents the structured output when parsing is successful.
 */
export interface SuccessfulParseOutput {
    success: true;
    amount: number;
    currencyCode: string; // ISO 4217 code
}

/**
 * Represents the structured output when parsing fails or needs clarification.
 */
export interface FailedParseOutput {
    success: false;
    error?: string;             // Error message if parsing failed definitively
    needsClarification?: string; // Message if more info is needed from the user
}

/**
 * Union type for the result of the parseCurrency operation.
 */
export type ParseCurrencyOutput = SuccessfulParseOutput | FailedParseOutput;

/**
 * Input structure for the parseCurrency method.
 */
export interface ParseCurrencyInput {
    text: string; // The text selected or entered by the user
    // Potentially add context later, like target currency? locale?
}

/**
 * Defines the contract for any AI Adapter used by the AiFacade.
 */
export interface IAIAdapter {
    /**
     * Parses the given text to extract currency amount and code using the specific AI model.
     *
     * @param input The input object containing the text to parse.
     * @returns A promise that resolves to a ParseCurrencyOutput object.
     * @throws {AIAdapterError} May throw a specific error type for critical API or configuration issues.
     */
    parseCurrency(input: ParseCurrencyInput): Promise<ParseCurrencyOutput>;

    // TODO: Define other common methods if needed, e.g., clarify, generate text, etc.
    // clarify?(originalInput: ParseCurrencyInput, clarification: string): Promise<ParseCurrencyOutput>;
}

/**
 * Custom error class for AI Adapter specific errors.
 */
export class AIAdapterError extends Error {
    public readonly status?: number; // Optional HTTP status code
    public readonly details?: any;   // Optional additional details (e.g., API error response)

    constructor(message: string, status?: number, details?: any) {
        super(message);
        this.name = 'AIAdapterError';
        this.status = status;
        this.details = details;

        // Maintains proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AIAdapterError);
        }
    }
} 