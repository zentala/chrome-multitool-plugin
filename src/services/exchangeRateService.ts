import { storageService } from './storageService';
import { RateLimiter } from 'limiter';

// Define a simple type for RateLimiter options
interface RateLimiterOptions {
  tokensPerInterval: number;
  interval: number | 'second' | 'minute' | 'hour' | 'day';
  fireImmediately?: boolean;
}

// --- Custom Error Type --- //

export class ExchangeRateServiceError extends Error {
    public readonly status?: number; // Optional HTTP status code from API
    public readonly details?: unknown;   // Optional details (e.g., API error type)

    constructor(message: string, status?: number, details?: unknown) {
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

export const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours - optimize for API limits

// Define structure for API response (adjust based on actual API)
interface ExchangeRateApiResponse {
  base_code?: string;
  conversion_rates?: { [currencyCode: string]: number };
  // Add other potential fields like 'result', 'error-type' if applicable
  result?: string;
  'error-type'?: string;
}

// Define structure for cached data
interface CachedRateData {
  timestamp: number;
  data: ExchangeRateApiResponse;
}

/**
 * Service for fetching and caching currency exchange rates from exchangerate-api.com.
 */
class ExchangeRateService {
  private readonly apiUrl = 'https://v6.exchangerate-api.com/v6';
  private apiKey: string; // Add apiKey property
  private readonly cacheDurationMs = CACHE_DURATION_MS; // Add cacheDurationMs property
  private readonly limiter: RateLimiter; 

  constructor() {
    // Initialize apiKey from environment or throw error
    this.apiKey = process.env.EXCHANGERATE_API_KEY || '';
    if (!this.apiKey) {
      console.error('ExchangeRateService Error: EXCHANGERATE_API_KEY environment variable is not set.');
      // Optionally throw an error to prevent service usage without API key
      // throw new Error('ExchangeRate API Key not configured.');
    }
    // Initialize the limiter with typed options
    const limiterOptions: RateLimiterOptions = { tokensPerInterval: 15, interval: 'minute' };
    this.limiter = new RateLimiter(limiterOptions);
  }

  /**
   * Retrieves the exchange rate between two currencies.
   * @param baseCurrency The base currency code (e.g., 'USD').
   * @param targetCurrency The target currency code (e.g., 'PLN').
   * @returns A promise resolving to the exchange rate number.
   * @throws {Error} If the rate cannot be retrieved.
   */
  async getRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    const cacheKey = `rate_${baseCurrency}_${targetCurrency}`;
    const cachedData = await this.getFromCache(cacheKey);

    if (cachedData && cachedData.conversion_rates && cachedData.conversion_rates[targetCurrency]) {
      return cachedData.conversion_rates[targetCurrency];
    }

    console.log(`ExchangeRateService: Cache miss or invalid for ${baseCurrency} -> ${targetCurrency}, fetching from API.`);
    const apiData = await this.fetchFromApi(baseCurrency);

    // Store the full response in cache for potential future use of other rates
    const baseCacheKey = `rates_${baseCurrency}`;
    await this.storeInCache(baseCacheKey, apiData);

    // Also cache the specific requested pair for faster access next time
    if (apiData.conversion_rates && apiData.conversion_rates[targetCurrency]) {
        const rate = apiData.conversion_rates[targetCurrency];
        const pairCacheData: ExchangeRateApiResponse = { 
            base_code: baseCurrency,
            conversion_rates: { [targetCurrency]: rate }
        };
        await this.storeInCache(cacheKey, pairCacheData); 
        return rate;
    } else {
      console.error('Target currency rate not found in API response:', { baseCurrency, targetCurrency, apiData });
      throw new Error(`Rate for target currency ${targetCurrency} not found in API response for base ${baseCurrency}.`);
    }
  }

  private async fetchFromApi(baseCurrency: string): Promise<ExchangeRateApiResponse> {
    await this.limiter.removeTokens(1);
    console.log(`ExchangeRateService: Fetching rates from API for base: ${baseCurrency}`);

    const url = `${this.apiUrl}/${this.apiKey}/latest/${baseCurrency.toUpperCase()}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorDetails = `Status: ${response.status}`;
        try {
          const errorText = await response.text();
          errorDetails += `, Body: ${errorText}`;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_textError: unknown) { // Disable lint rule for this line
          // Ignore error reading body
        }
        throw new Error(`Failed to fetch exchange rates: ${response.statusText} (${errorDetails})`);
      }

      const data: unknown = await response.json();
      if (this.isValidApiResponse(data)) {
        if (data.result === 'error') {
          // Use bracket notation for property name with hyphen
          throw new Error(`Exchange Rate API Error: ${data['error-type'] || 'Unknown error'}`);
        }
        return data;
      } else {
        console.error("Invalid API response structure:", data);
        throw new Error('Invalid or incomplete data structure received from API.');
      }
    } catch (error) {
      console.error(`ExchangeRateService: Error fetching from API: ${error}`);
      throw error instanceof Error ? error : new Error('Failed to fetch or parse API response');
    }
  }

  private isValidApiResponse(data: unknown): data is ExchangeRateApiResponse {
      if (typeof data !== 'object' || data === null) return false;
      const potentialResponse = data as Partial<ExchangeRateApiResponse>;
      if (potentialResponse.result !== 'error' && typeof potentialResponse.conversion_rates === 'object' && potentialResponse.conversion_rates !== null) {
          return true;
      }
      if (potentialResponse.result === 'error') {
          return true;
      }
      return false;
  }

  private async getFromCache(cacheKey: string): Promise<ExchangeRateApiResponse | null> {
    try {
      const cachedResult: unknown = await storageService.get(cacheKey);
      if (this.isValidCachedData(cachedResult)) {
        const now = Date.now();
        if (now - cachedResult.timestamp < this.cacheDurationMs) { // Use class property
          console.log(`ExchangeRateService: Cache hit for key: ${cacheKey}`);
          return cachedResult.data;
        } else {
          console.log(`ExchangeRateService: Cache expired for key: ${cacheKey}`);
        }
      } else if (cachedResult) {
        console.warn(`ExchangeRateService: Invalid data structure in cache for key ${cacheKey}:`, cachedResult);
      }
    } catch (error) {
      console.error(`ExchangeRateService: Error reading from cache for key ${cacheKey}:`, error);
    }
    return null;
  }

  private isValidCachedData(data: unknown): data is CachedRateData {
    if (typeof data !== 'object' || data === null) return false;
    const potentialCache = data as Partial<CachedRateData>;
    return typeof potentialCache.timestamp === 'number' && this.isValidApiResponse(potentialCache.data);
  }

  private async storeInCache(cacheKey: string, data: ExchangeRateApiResponse): Promise<void> {
    const cacheEntry: CachedRateData = {
      timestamp: Date.now(),
      data: data,
    };
    try {
      await storageService.set(cacheKey, cacheEntry);
      console.log(`ExchangeRateService: Stored data in cache for key: ${cacheKey}`);
    } catch (error) {
      console.error(`ExchangeRateService: Error writing to cache for key ${cacheKey}:`, error);
    }
  }
}

// Export a singleton instance
export const exchangeRateService = new ExchangeRateService();

/**
 * Type definition for the ExchangeRateService class.
 * Used for dynamic imports in tests.
 */
export type ExchangeRateServiceType = typeof exchangeRateService; 