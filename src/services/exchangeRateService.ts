import { storageService } from './storageService';
import { ExchangeRates, CurrencyRate } from '../interfaces/Currency';

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
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    // Read API key directly from process.env inside the method
    const apiKey = process.env.EXCHANGERATE_API_KEY || '';

    // Check for API key existence and valid currencies FIRST
    if (!apiKey) {
      console.error('ExchangeRateService: Cannot get rate, API Key is missing.');
      return null;
    }
    if (!fromCurrency || !toCurrency) {
      console.error('ExchangeRateService: fromCurrency and toCurrency must be provided.');
      return null;
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
        if (cachedData) {
          console.warn(`ExchangeRateService: API fetch failed for ${pairKey}, returning stale cached rate:`, cachedData.rate);
          return cachedData.rate;
        }
        console.error(`ExchangeRateService: API fetch failed for ${pairKey} and no stale cache available.`);
        return null;
      }
    } catch (error) {
      console.error(`ExchangeRateService: Unhandled error getting rate for ${pairKey}:`, error instanceof Error ? error.message : error);
       if (cachedData) {
        console.warn(`ExchangeRateService: Unhandled error occurred for ${pairKey}, returning stale cached rate:`, cachedData.rate);
        return cachedData.rate;
       }
      return null;
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
  ): Promise<number | null> {
    // Use the passed apiKey
    const url = `${this.apiUrl}/${apiKey}/pair/${fromCurrency}/${toCurrency}`;
    console.log(`ExchangeRateService: Fetching URL: ${url}`);

    try {
      const response = await fetch(url);

      // Check for network errors or non-OK status codes
      if (!response.ok) {
        let errorInfo = `Status ${response.status}`;
        try {
          const errorBody: ExchangeRateApiResponse = await response.json();
          errorInfo += `: ${errorBody.result === 'error' ? errorBody.error_type : 'Unknown API structure'}`;
          console.error(
            `ExchangeRateService: API error response for ${fromCurrency}/${toCurrency}:`, errorBody
          );
        } catch {
            // If parsing error body fails, use text
            errorInfo += `: ${await response.text()}`;
            console.error(`ExchangeRateService: Non-JSON API error for ${fromCurrency}/${toCurrency}: Status ${response.status}`, errorInfo);
        }
        throw new Error(`API request failed with ${errorInfo}`);
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
        // Treat this as a failure, could be an API change or unexpected data
        return null;
      }
    } catch (error) {
      // Catch fetch errors (network issues) or errors thrown from response handling
      console.error(
        `ExchangeRateService: Failed to fetch or process rate for ${fromCurrency}/${toCurrency}:`, error instanceof Error ? error.message : error
      );
      return null;
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