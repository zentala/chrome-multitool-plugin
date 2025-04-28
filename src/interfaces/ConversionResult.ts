/**
 * Represents the final result of a currency conversion operation,
 * typically sent back to the UI.
 */
export interface ConversionResult {
  success: boolean;
  originalAmount?: number;      // Parsed amount from input
  originalCurrency?: string;    // Parsed currency code from input (uppercase ISO 4217)
  convertedAmount?: number;     // The calculated converted amount
  targetCurrency?: string;      // The currency code it was converted to (e.g., "PLN")
  rate?: number;                // The exchange rate used for conversion
  rateDate?: string;            // Optional: The date of the exchange rate used (YYYY-MM-DD)
  error?: string;               // Error message if any step failed
  needsClarification?: boolean; // Flag indicating AI needs more input from the user
  clarificationQuestion?: string; // Optional: Question from AI if clarification is needed
  originalText?: string;        // Optional: Original text for context during clarification
} 