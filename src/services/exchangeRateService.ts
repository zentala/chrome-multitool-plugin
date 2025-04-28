import { storageService } from './storageService';
import { ExchangeRates, CurrencyRate } from '../interfaces/Currency';

// --- Custom Error Type --- //

export class ExchangeRateServiceError extends Error {
    public readonly status?: number; // Optional HTTP status code from API
    public readonly details?: any;   // Optional details (e.g., API error type)

    constructor(message: string, status?: number, details?: any) {
        super(message);
        this.name = 'ExchangeRateServiceError';
        this.status = status;
        this.details = details;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ExchangeRateServiceError);
        }
    }
}

// --- Constants --- //

const CACHE_KEY = 'currencyRatesCache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ExchangeRateApiResponse {
  result: string; // "success" or "error"
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  target_code?: string;
  conversion_rate?: number;
  error_type?: string; // e.g., "invalid-key", "unknown-code"
}

/**
 * Service for fetching and caching currency exchange rates from exchangerate-api.com.
 */
class ExchangeRateService {
  private readonly apiUrl = 'https://v6.exchangerate-api.com/v6';

  constructor() {
    // No need to read API key here anymore
    // const key = process.env.EXCHANGERATE_API_KEY || '';
    // if (!key) {
    //   console.error('ExchangeRateService: EXCHANGERATE_API_KEY is not set at construction!');
    // }
    // this.apiKey = key;
  }

  /**
   * Gets the exchange rate for a specific currency pair (e.g., USD to PLN).
   * Uses cache if available and not expired, otherwise fetches from API.
   *
   * @param fromCurrency - ISO 4217 code of the base currency.
   * @param toCurrency - ISO 4217 code of the target currency.
   * @returns A promise resolving to the rate (number) or null if an error occurs and no stale cache exists.
   * @throws {ExchangeRateServiceError} If fetching fails and no stale cache is available.
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    // Read API key directly from process.env inside the method
    const apiKey = process.env.EXCHANGERATE_API_KEY || '';

    // Check for API key existence and valid currencies FIRST
    if (!apiKey) {
      console.error('ExchangeRateService: Cannot get rate, API Key is missing.');
      // Throw error if API key is missing
      throw new ExchangeRateServiceError('ExchangeRate API Key is missing.', 400, 'Missing API Key');
    }
    if (!fromCurrency || !toCurrency) {
      console.error('ExchangeRateService: fromCurrency and toCurrency must be provided.');
      // Throw error for invalid input
      throw new ExchangeRateServiceError('Base and target currency codes must be provided.', 400, 'Invalid Input');
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const pairKey = `${from}_${to}`;
    console.log(`ExchangeRateService: Getting rate for ${pairKey}`);

    let cachedData: CurrencyRate | null = null;
    try {
       cachedData = await this.getCachedRate(pairKey);
    } catch (cacheError) {
        console.error(`ExchangeRateService: Failed to read cache for ${pairKey}:`, cacheError);
        // Continue without cache if read fails
    }

    // Check if cache is valid
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
      console.log(`ExchangeRateService: Using fresh cached rate for ${pairKey}:`, cachedData.rate);
      return cachedData.rate;
    }

    // Check only needed if cache is invalid or missing
    console.log(`ExchangeRateService: Cache miss or expired for ${pairKey}. Fetching from API.`);

    try {
      // Pass the apiKey read within this method call
      const rate = await this.fetchRateFromApi(from, to, apiKey);
      if (rate !== null) {
        await this.setCachedRate(pairKey, rate);
        return rate;
      } else {
        // Error occurred during fetchRateFromApi (it now throws)
        // This path should theoretically not be reached if fetchRateFromApi throws
        // Kept for safety, but should rely on catch block primarily
        if (cachedData) {
          console.warn(`ExchangeRateService: API fetch failed for ${pairKey}, returning stale cached rate:`, cachedData.rate);
          return cachedData.rate;
        }
        console.error(`ExchangeRateService: API fetch failed for ${pairKey} and no stale cache available.`);
        // If fetch failed and no cache, re-throw or throw a new specific error
        // Re-throwing the original error might be better if fetchRateFromApi adds details
        // For now, throw a generic error indicating failure without cache
        throw new ExchangeRateServiceError(`Failed to get rate for ${pairKey} and no cache available.`, 500, 'Fetch Failed No Cache');
      }
    } catch (error) {
      console.error(`ExchangeRateService: Unhandled error getting rate for ${pairKey}:`, error instanceof Error ? error.message : error);
       if (cachedData) {
        console.warn(`ExchangeRateService: Unhandled error occurred for ${pairKey}, returning stale cached rate:`, cachedData.rate);
        return cachedData.rate;
       }
      // If an error occurred (including from fetchRateFromApi) and there's no stale cache, throw.
      // If it's already our custom error, re-throw it. Otherwise, wrap it.
      if (error instanceof ExchangeRateServiceError) {
          throw error;
      } else {
          throw new ExchangeRateServiceError(`Failed to process rate for ${pairKey}: ${error instanceof Error ? error.message : String(error)}`, undefined, error);
      }
    }
  }

  /**
   * Fetches the conversion rate for a specific pair directly from the API.
   *
   * @param fromCurrency Uppercase base currency code.
   * @param toCurrency Uppercase target currency code.
   * @returns The conversion rate, or null if an error occurs.
   */
  private async fetchRateFromApi(
    fromCurrency: string,
    toCurrency: string,
    apiKey: string // Accept apiKey as parameter
  ): Promise<number> { // Return number or throw
    const url = `${this.apiUrl}/${apiKey}/pair/${fromCurrency}/${toCurrency}`;
    console.log(`ExchangeRateService: Fetching URL: ${url}`);
    let response: Response | null = null; // Define response variable here to access status in catch

    try {
      response = await fetch(url);

      // Check for network errors or non-OK status codes
      if (!response.ok) {
         // Throw a generic error to be caught below, status will be available on response object
        throw new Error(`API request failed`); 
      }

      // Parse the successful response
      const data: ExchangeRateApiResponse = await response.json();
      console.log(`ExchangeRateService: API response for ${fromCurrency}/${toCurrency}:`, data);

      // Check the structure and result field of the successful response
      if (data.result === 'success' && typeof data.conversion_rate === 'number') {
        return data.conversion_rate;
      } else {
        console.error(
          `ExchangeRateService: API returned 'success' but missing/invalid rate for ${fromCurrency}/${toCurrency}:`, data
        );
        // Throw custom error for invalid success response structure
        throw new ExchangeRateServiceError(`API returned success but rate was invalid for ${fromCurrency}/${toCurrency}`, 500, 'Invalid Success Response');
      }
    } catch (error) {
       // Handle all errors (fetch, non-ok status, JSON parsing, invalid success structure)
      const status = response?.status; // Get status if response object exists
      let details: any = error instanceof Error ? error.message : String(error);
      let message = `Failed to fetch or process rate for ${fromCurrency}/${toCurrency}`;

      // Try to get more specific details if it was an API error (non-ok status)
      if (!response?.ok && response?.text) { 
          try {
              // Try parsing as JSON first
              const errorBody: ExchangeRateApiResponse = await response.json();
              details = errorBody?.error_type || 'Unknown API Error Structure';
              message = `API request failed with status ${status}`; 
          } catch (jsonError) {
              // If parsing error body as JSON fails, try reading as text
              try { 
                const textBody = await response.text(); 
                details = textBody;
                message = `API request failed with status ${status}`; 
              } catch (textError) {
                  // If reading text also fails
                  details = "Failed to read error response body";
              }
          }
      }
      
      console.error(
        `ExchangeRateService: ${message}:`, details
      );

      // If it's already our custom error (e.g., from invalid success structure), re-throw it.
      if (error instanceof ExchangeRateServiceError) {
          throw error;
      } else {
          // Otherwise, wrap the error with collected info.
          throw new ExchangeRateServiceError(message, status, details);
      }
    }
  }

  // --- Cache Management --- //

  private async getCache(): Promise<ExchangeRates | null> {
    return storageService.get<ExchangeRates>(CACHE_KEY);
  }

  private async setCache(cache: ExchangeRates): Promise<void> {
    // Add error handling for set operation
    try {
        await storageService.set(CACHE_KEY, cache);
    } catch(error) {
        console.error('ExchangeRateService: Failed to write to cache:', error);
    }
  }

  private async getCachedRate(pairKey: string): Promise<CurrencyRate | null> {
    const cache = await this.getCache();
    return cache?.[pairKey] || null;
  }

  private async setCachedRate(pairKey: string, rate: number): Promise<void> {
    const cache = (await this.getCache()) || {};
    cache[pairKey] = {
      rate: rate,
      timestamp: Date.now(),
    };
    await this.setCache(cache);
    console.log(`ExchangeRateService: Updated cache for ${pairKey}`);
  }
}

// Export a singleton instance
export const exchangeRateService = new ExchangeRateService(); 