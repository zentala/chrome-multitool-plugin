import { describe, it, expect, vi, beforeEach, Mock, beforeAll } from 'vitest';
// Usuń statyczny import: import { exchangeRateService } from './exchangeRateService';

// --- Define a type for globalThis to allow process.env --- //
type GlobalWithProcess = typeof globalThis & {
  process?: { env: Record<string, string | undefined> }
}

// --- Mock process.env --- //
// Upewnij się, że process i process.env istnieją
if (typeof process === 'undefined') {
  // Use the defined type here
  (globalThis as GlobalWithProcess).process = { env: {} }; // Stwórz, jeśli nie istnieje
} else if (!process.env) {
  process.env = {};
}
// Ustaw zmienną środowiskową
process.env.EXCHANGERATE_API_KEY = 'test-api-key';
// ------------------------ //

// --- Mock storageService using Vitest --- //
vi.mock('./storageService', () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
    // Add remove/clear mocks if needed by the service under test
  },
}));

// Import the mocked service for type safety and access to mock functions
import { storageService } from './storageService';
const mockStorageGet = storageService.get as Mock;
const mockStorageSet = storageService.set as Mock;
// ------------------------- //

// Mock the global fetch function using Vitest
vi.stubGlobal('fetch', vi.fn());
const mockFetch = vi.mocked(global.fetch);

// Deklaracja zmiennej dla instancji serwisu
let exchangeRateService: typeof import('./exchangeRateService').exchangeRateService;

beforeAll(async () => {
  // Dynamiczny import *po* ustawieniu mocków
  const serviceModule = await import('./exchangeRateService');
  exchangeRateService = serviceModule.exchangeRateService;
});

// Helper to mock a successful API response
const mockApiResponseSuccess = (rate: number) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result: 'success', conversion_rate: rate }),
  } as Response);
};

// Helper to mock a failed API response
const mockApiResponseFail = (status: number = 500, errorType: string = 'api-error') => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: status,
    json: async () => ({ result: 'error', 'error-type': errorType }),
    text: async () => `API Error: ${errorType}`
  } as Response);
};

// Clear mocks before each test using Vitest
beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExchangeRateService', () => {
  // Remove vi.stubEnv from here
  // vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');

  // --- Test Case 1: Cache is empty, API success --- //
  it('should fetch from API and update cache when cache is empty', async () => {
    const from = 'USD';
    const to = 'PLN';
    const pairKey = `${from}_${to}`;
    const expectedRate = 4.05;

    // 1. Setup: Mock storage to return null
    mockStorageGet.mockResolvedValueOnce(null);
    // 2. Setup: Mock fetch to return success
    mockApiResponseSuccess(expectedRate);

    // 3. Act
    const rate = await exchangeRateService.getRate(from, to);

    // 4. Assert
    expect(rate).toBe(expectedRate);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`/pair/${from}/${to}`));
    expect(mockStorageGet).toHaveBeenCalledTimes(2);
    expect(mockStorageGet).toHaveBeenCalledWith('currencyRatesCache');
    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).toHaveBeenCalledWith('currencyRatesCache', {
      [pairKey]: { rate: expectedRate, timestamp: expect.any(Number) },
    });
  });

  // --- Test Case 2: Fresh cache exists --- //
  it('should return rate from fresh cache without calling API', async () => {
    const from = 'EUR';
    const to = 'GBP';
    const pairKey = `${from}_${to}`;
    const cachedRate = 0.85;
    const freshTimestamp = Date.now() - 1000 * 60 * 60; // 1 hour ago

    // 1. Setup: Mock storage to return fresh data
    mockStorageGet.mockResolvedValueOnce({
      [pairKey]: { rate: cachedRate, timestamp: freshTimestamp },
    });

    // 2. Act
    const rate = await exchangeRateService.getRate(from, to);

    // 3. Assert
    expect(rate).toBe(cachedRate);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockStorageGet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

   // --- Test Case 3: Stale cache exists, API success --- //
  it('should fetch from API and update cache when cache is stale', async () => {
    const from = 'GBP';
    const to = 'JPY';
    const pairKey = `${from}_${to}`;
    const staleRate = 190.5;
    const staleTimestamp = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago
    const freshRateFromApi = 191.0;

    // 1. Setup: Mock storage to return stale data
    mockStorageGet.mockResolvedValueOnce({
      [pairKey]: { rate: staleRate, timestamp: staleTimestamp },
    });
    // 2. Setup: Mock fetch for success
    mockApiResponseSuccess(freshRateFromApi);

    // 3. Act
    const rate = await exchangeRateService.getRate(from, to);

    // 4. Assert
    expect(rate).toBe(freshRateFromApi);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStorageGet).toHaveBeenCalledTimes(2);
    expect(mockStorageSet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).toHaveBeenCalledWith('currencyRatesCache', {
        [pairKey]: { rate: freshRateFromApi, timestamp: expect.any(Number) },
      });
  });

  // --- Test Case 4: API fails, stale cache exists --- //
  it('should return stale cache rate when API fetch fails', async () => {
    const from = 'CHF';
    const to = 'CAD';
    const pairKey = `${from}_${to}`;
    const staleRate = 1.45;
    const staleTimestamp = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago

    // 1. Setup: Mock storage for stale data
    mockStorageGet.mockResolvedValueOnce({
      [pairKey]: { rate: staleRate, timestamp: staleTimestamp },
    });
    // 2. Setup: Mock fetch for failure
    mockApiResponseFail(503, 'service-unavailable');

    // 3. Act
    const rate = await exchangeRateService.getRate(from, to);

    // 4. Assert
    expect(rate).toBe(staleRate);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStorageGet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  // --- Test Case 5: API fails, no cache exists --- //
  it('should return null when API fetch fails and no cache exists', async () => {
    const from = 'AUD';
    const to = 'NZD';

    // 1. Setup: Mock storage for empty cache
    mockStorageGet.mockResolvedValueOnce(null);
     // 2. Setup: Mock fetch for failure
    mockApiResponseFail(404, 'unknown-code');

    // 3. Act
    const rate = await exchangeRateService.getRate(from, to);

    // 4. Assert
    expect(rate).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStorageGet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
  });

  // TODO: Add more tests for edge cases:
  // - API returns success but invalid data (e.g., no conversion_rate)
  // - Storage get/set errors
  // - Missing API key handling (should return null)
}); 