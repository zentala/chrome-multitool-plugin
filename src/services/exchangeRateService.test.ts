import { describe, it, expect, vi, beforeEach, Mock, beforeAll } from 'vitest';
// Usuń statyczny import: import { exchangeRateService } from './exchangeRateService';

// --- Define a type for globalThis to allow process.env --- //
type GlobalWithProcess = typeof globalThis & {
  process?: {
    env: Record<string, string | undefined>;
    // Add other process properties if needed by the code, though unlikely here
  };
};

// --- Backup and Mock process.env --- //
const originalEnv = (globalThis as GlobalWithProcess).process?.env;
// Ensure process.env exists for mocking, creating minimally if needed
if ((globalThis as GlobalWithProcess).process && !(globalThis as GlobalWithProcess).process!.env) {
  (globalThis as GlobalWithProcess).process!.env = {}; // Create env object if process exists but env doesn't
}

// Set the test API key only if process.env exists
if ((globalThis as GlobalWithProcess).process?.env) {
  (globalThis as GlobalWithProcess).process!.env.EXCHANGERATE_API_KEY = 'test-api-key';
}
// --------------------------------- //

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
  // Import service - assumes env might be read here or later
  const serviceModule = await import('./exchangeRateService');
  exchangeRateService = serviceModule.exchangeRateService;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs(); // Clear environment stubs before each test
  mockStorageGet.mockResolvedValue(null); // Reset storage mock
});

// --- Restore Mock API Response Helpers --- //
const mockApiResponseSuccess = (rate: number) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result: 'success', conversion_rate: rate }),
  } as Response);
};

const mockApiResponseFail = (status: number = 500, errorType: string = 'api-error') => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: status,
    json: async () => ({ result: 'error', 'error-type': errorType }),
    text: async () => `API Error: ${errorType}`
  } as Response);
};
// --------------------------------------- //

describe('ExchangeRateService', () => {
  // Remove vi.stubEnv from here
  // vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');

  // --- Test Case 1: Cache is empty, API success --- //
  it('should fetch from API and update cache when cache is empty', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key'); // Stub env for this test
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
    vi.unstubAllEnvs(); // Clean up env stub
  });

  // --- Test Case 2: Fresh cache exists --- //
  it('should return rate from fresh cache without calling API', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key'); // Stub env for this test
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
    vi.unstubAllEnvs(); // Clean up env stub
  });

   // --- Test Case 3: Stale cache exists, API success --- //
  it('should fetch from API and update cache when cache is stale', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key'); // Stub env for this test
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
    vi.unstubAllEnvs(); // Clean up env stub
  });

  // --- Test Case 4: API fails, stale cache exists --- //
  it('should return stale cache rate when API fetch fails', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key'); // Stub env for this test
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
    vi.unstubAllEnvs(); // Clean up env stub
  });

  // --- Test Case 5: API fails, no cache exists --- //
  it('should return null when API fetch fails and no cache exists', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key'); // Stub env for this test
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
    vi.unstubAllEnvs(); // Clean up env stub
  });

  // --- Test Case 6: Missing API Key --- //
  it('should return null and not call fetch or storage if API key is missing (using stubEnv)', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', undefined);
    const from = 'USD';
    const to = 'CAD';
    // No need to mock storage get/set as they shouldn't be called
    const rate = await exchangeRateService.getRate(from, to);
    expect(rate).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    // After refactor, storage should NOT be called if API key is missing
    expect(mockStorageGet).not.toHaveBeenCalled();
    expect(mockStorageSet).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  // --- Test Case 7: API returns success but invalid data --- //
  it('should return null if API returns success but data lacks conversion_rate', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');
    const from = 'JPY'; const to = 'KRW';
    mockStorageGet.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'success', /* conversion_rate missing */ }),
    } as Response);
    const rate = await exchangeRateService.getRate(from, to);
    expect(rate).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Should only be called once when fetching and API returns invalid data
    expect(mockStorageGet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('should return null if API returns success but conversion_rate is not a number', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');
    const from = 'JPY'; const to = 'KRW';
    mockStorageGet.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'success', conversion_rate: 'not-a-number' }),
    } as Response);
    const rate = await exchangeRateService.getRate(from, to);
    expect(rate).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
     // Should only be called once when fetching and API returns invalid data
    expect(mockStorageGet).toHaveBeenCalledTimes(1);
    expect(mockStorageSet).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  // --- Test Case 8: Storage errors --- //
  it('should fetch from API if storageService.get fails', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');
    const from = 'NZD'; const to = 'SGD'; const expectedRate = 0.88;

    // Mock storage get to throw an error
    mockStorageGet.mockRejectedValueOnce(new Error('Failed to read cache'));
    // Mock API success
    mockApiResponseSuccess(expectedRate);

    const rate = await exchangeRateService.getRate(from, to);

    expect(rate).toBe(expectedRate); // Should return rate from API
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStorageGet).toHaveBeenCalledTimes(2); // Original attempt + attempt before set
    expect(mockStorageSet).toHaveBeenCalledTimes(1); // Should still attempt to set cache
    vi.unstubAllEnvs();
  });

  it('should return API rate even if storageService.set fails', async () => {
    vi.stubEnv('EXCHANGERATE_API_KEY', 'test-api-key');
    const from = 'SGD'; const to = 'HKD'; const expectedRate = 5.8;

    // Mock storage get success (no cache)
    mockStorageGet.mockResolvedValue(null);
    // Mock API success
    mockApiResponseSuccess(expectedRate);
    // Mock storage set to throw an error
    mockStorageSet.mockRejectedValueOnce(new Error('Failed to write cache'));

    const rate = await exchangeRateService.getRate(from, to);

    expect(rate).toBe(expectedRate); // Should return rate from API despite set failure
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockStorageGet).toHaveBeenCalledTimes(2);
    expect(mockStorageSet).toHaveBeenCalledTimes(1); // Attempted to set
    vi.unstubAllEnvs();
  });

  // TODO: Add more tests for edge cases:
  // - API returns success but invalid data (e.g., no conversion_rate) <-- Covered by TC7
  // - Storage get/set errors <-- Covered by TC8
  // - Missing API key handling (should return null) <-- Covered by TC6
  // - REFACTOR: Optimize getRate to check apiKey *before* checking cache <-- DONE
}); 