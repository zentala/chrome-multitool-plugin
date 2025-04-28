import { vi } from 'vitest';

// Import the original module to get the actual Error class
// Use dynamic import inside the mock file if needed, or adjust path
// For simplicity, assuming direct import works or copying the error class definition

// Re-define or import the actual error class structure if needed for type checks in tests
export class ExchangeRateServiceError extends Error {
    public readonly status?: number;
    public readonly details?: unknown;
    constructor(message: string, status?: number, details?: unknown) {
        super(message);
        this.name = 'ExchangeRateServiceError';
        this.status = status;
        this.details = details;
    }
}

// Create a mock function for the getRate method
export const mockGetRate = vi.fn();

// Mock the class implementation
export const MockExchangeRateService = vi.fn(() => ({
  getRate: mockGetRate,
  // Add other methods if the original class has them
}));

// Export an instance of the mocked class
export const exchangeRateService = new MockExchangeRateService();

// Export constants if they are used by the code under test
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; 