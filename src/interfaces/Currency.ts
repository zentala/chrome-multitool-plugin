/**
 * Represents a single cached currency rate with its timestamp.
 */
export interface CurrencyRate {
  rate: number;       // The exchange rate
  timestamp: number;  // Timestamp (ms since epoch) when the rate was fetched
}

/**
 * Represents the structure of the entire exchange rates cache.
 * Keys are currency pair strings (e.g., "USD_PLN").
 */
export interface ExchangeRates {
  [pairKey: string]: CurrencyRate;
} 