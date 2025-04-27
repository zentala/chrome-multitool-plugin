/**
 * Represents the result of parsing currency input using the AI Facade.
 */
export interface ParsedCurrencyResult {
  success: boolean;
  amount?: number;      // The detected amount
  currency?: string;    // The detected ISO 4217 currency code (uppercase)
  error?: string;       // Error message if parsing failed or API error occurred
} 