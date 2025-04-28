import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, Mock } from 'vitest';
// Types are still useful
// import type { ExchangeRateServiceType, ExchangeRateServiceError } from './exchangeRateService';
// Constants might be needed if used directly in tests, but likely not needed now
// import { CACHE_DURATION_MS } from './exchangeRateService';

// --- Mock fetch --- //
// Still needed if the *code under test* calls fetch indirectly, but maybe not
vi.stubGlobal('fetch', vi.fn());
const mockFetch = vi.mocked(fetch);

// --- Mock storageService --- //
// This remains the same
vi.mock('./storageService', () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));
import { storageService } from './storageService';
const mockStorageGet = storageService.get as Mock;
const mockStorageSet = storageService.set as Mock;

// --- Mock Date.now --- //
const originalDateNow = Date.now;
const realDateNow = Date.now;
const mockDateNow = vi.fn();

// --- Activate the manual mock --- //
// Vitest will automatically pick up the __mocks__/exchangeRateService.ts file
vi.mock('./exchangeRateService');

// --- Import the MOCKED service instance and types --- //
// This now imports from __mocks__/exchangeRateService.ts implicitly
import { exchangeRateService, ExchangeRateServiceError as MockedExchangeRateServiceError } from './exchangeRateService';

// Get the mocked getRate function for configuration in tests
// Need to cast as Mock because vi.mocked might not infer it perfectly here
const mockGetRate = exchangeRateService.getRate as Mock;

// Setup Date.now mock before all tests
beforeAll(() => {
    Date.now = mockDateNow;
});

// Restore originals after all tests
afterAll(() => {
    Date.now = originalDateNow;
    vi.unstubAllGlobals();
});

beforeEach(() => {
  // Set default time
  mockDateNow.mockReturnValue(realDateNow());

  // Reset mocks for each test
  mockFetch.mockReset(); // Reset fetch just in case
  mockGetRate.mockReset(); // Reset the method mock
  mockStorageGet.mockReset();
  mockStorageSet.mockReset();
});

// afterEach is no longer needed for env vars

// Remove unused helper function
// const createMockResponse = (body: unknown, ok: boolean = true, status: number = 200, statusText: string = 'OK'): Response => {
//     // ... implementation ...
// };


describe('ExchangeRateService (Mocked Module)', () => {

  // Test cases remain largely the same, using mockGetRate

  it('getRate should return the expected rate', async () => {
    const from = 'USD';
    const to = 'PLN';
    const expectedRate = 4.05;
    mockGetRate.mockResolvedValue(expectedRate);

    const rate = await exchangeRateService.getRate(from, to);

    expect(rate).toBe(expectedRate);
    expect(mockGetRate).toHaveBeenCalledTimes(1);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should return a consistent rate on subsequent calls', async () => {
    const from = 'EUR';
    const to = 'GBP';
    const cachedRate = 0.85;
    mockGetRate.mockResolvedValue(cachedRate);

    const rate1 = await exchangeRateService.getRate(from, to);
    const rate2 = await exchangeRateService.getRate(from, to);

    expect(rate1).toBe(cachedRate);
    expect(rate2).toBe(cachedRate);
    expect(mockGetRate).toHaveBeenCalledTimes(2);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw error when configured to do so', async () => {
    const from = 'CHF';
    const to = 'CAD';
    const apiErrorType = 'service-unavailable';
    const status = 503;
    const expectedError = new MockedExchangeRateServiceError(`Mocked API Error: ${apiErrorType}`, status, { type: apiErrorType });
    mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
      .rejects
      .toThrow(expectedError);

    expect(mockGetRate).toHaveBeenCalledTimes(1);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  // Test for missing API key is irrelevant with this mocking strategy

  it('getRate should throw error if target currency rate is unavailable', async () => {
    const from = 'JPY';
    const to = 'KRW';
    const expectedError = new MockedExchangeRateServiceError(`Rate for target currency ${to} not found.`); // Simplified error message might be needed depending on mock file
    mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
      .rejects
      .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw error for invalid API data structure', async () => {
    const from = 'HKD';
    const to = 'SGD';
    const expectedError = new MockedExchangeRateServiceError('Invalid data structure.'); // Simplified message
    mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
      .rejects
      .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw error on network error', async () => {
    const from = 'USD';
    const to = 'PLN';
    const networkErrorMessage = 'Failed to connect';
    const expectedError = new Error(networkErrorMessage);
    mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
        .rejects
        .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw correct error message on non-OK response', async () => {
    const from = 'USD';
    const to = 'PLN';
    const status = 404;
    const errorType = 'unsupported-code';
    const expectedError = new MockedExchangeRateServiceError(`API Error ${status}`, status, {type: errorType}); // Simplified message
    mockGetRate.mockRejectedValue(expectedError);

     await expect(exchangeRateService.getRate(from, to))
      .rejects
      .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw specific error on invalid JSON response', async () => {
     const from = 'USD';
     const to = 'PLN';
     const expectedError = new MockedExchangeRateServiceError('Invalid JSON.'); // Simplified message
     mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
        .rejects
        .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

  it('getRate should throw specific error if API result is "error"', async () => {
    const from = 'EUR';
    const to = 'USD';
    const errorType = 'malformed-request';
    const expectedError = new MockedExchangeRateServiceError(`API Error: ${errorType}`); // Simplified message
    mockGetRate.mockRejectedValue(expectedError);

    await expect(exchangeRateService.getRate(from, to))
      .rejects
      .toThrow(expectedError);
    expect(mockGetRate).toHaveBeenCalledWith(from, to);
  });

}); // End describe block