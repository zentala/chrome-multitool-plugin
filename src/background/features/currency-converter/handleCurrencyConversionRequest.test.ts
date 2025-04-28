// Test file for handleCurrencyConversionRequest
// See decision log: .cursor/decisions/2025-04-28-refactor-mocking-handleCurrencyConversionRequest-test.md

// Import TYPE of the function under test
import type { handleCurrencyConversionRequest as handleCurrencyConversionRequestType } from '../../index';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { ConversionResult, CurrencyParseResult, IAIAdapter } from '../../../interfaces';
// We don't need to import exchangeRateService directly if we mock the module
// import { exchangeRateService } from '../../../services/exchangeRateService';
// We don't import GoogleAIAdapter

// --- Mock Dependencies --- //

// Define mock functions outside the factory
const mockParseCurrency = vi.fn();
const mockGetRate = vi.fn();

// Mock the index module to intercept getAIProvider
vi.mock('../../index', async (importOriginal) => {
  const originalModule = await importOriginal() as typeof import('../../index');
  return {
    // Provide a mocked getAIProvider that returns a simple object with mocked parseCurrency
    getAIProvider: vi.fn(() => ({
      parseCurrency: mockParseCurrency,
    }) as IAIAdapter),
    // Keep the original function that we want to test
    handleCurrencyConversionRequest: originalModule.handleCurrencyConversionRequest,
    // Provide mocks for other functions exported by index if they might be called
    initializeContextMenu: vi.fn(),
    setupContextMenuOnClickListener: vi.fn(),
    setupRuntimeMessageListener: vi.fn(),
    handleCurrencyClarificationRequest: vi.fn(),
  };
});

// Mock the exchangeRateService module
vi.mock('../../../services/exchangeRateService', () => ({
  exchangeRateService: {
    getRate: mockGetRate,
  },
}));

// --- Test Suite --- //

// Dynamically import the function under test AFTER mocks are set up
let handleCurrencyConversionRequest: typeof handleCurrencyConversionRequestType;

describe('handleCurrencyConversionRequest', () => {
  beforeAll(async () => {
    // Import the module (which now has mocked getAIProvider)
    const mod = await import('../../index');
    // Assign the (original) function from the mocked module
    handleCurrencyConversionRequest = mod.handleCurrencyConversionRequest;
  });

  beforeEach(() => {
    // Clear the mock functions directly
    mockParseCurrency.mockClear();
    mockGetRate.mockClear();
    // vi.clearAllMocks() might be too broad if other mocks should persist
    // vi.resetAllMocks() resets implementation, use clear()
  });

  it('should return successful conversion result for valid input', async () => {
    const inputText = '100 USD';
    const mockAiResponse: CurrencyParseResult = {
      success: true,
      amount: 100,
      currencyCode: 'USD',
      originalText: inputText,
    };
    const mockRate = 4.05;
    const expectedResult: ConversionResult = {
      success: true,
      originalAmount: 100,
      originalCurrency: 'USD',
      convertedAmount: 405.00,
      targetCurrency: 'PLN',
      rate: mockRate,
    };

    // Setup mocks
    mockParseCurrency.mockResolvedValue(mockAiResponse);
    mockGetRate.mockResolvedValue(mockRate);

    // Call the function obtained via dynamic import
    const result = await handleCurrencyConversionRequest(inputText);

    // Assertions
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN');
    expect(result).toEqual(expectedResult);
  });

  // FIXME: Mocking issue - Previous attempts failed. This approach tries to mock getAIProvider within index mock.

  it('should return AI parsing error if AI fails to parse', async () => {
    const inputText = 'invalid currency text';
    const mockAiResponse: CurrencyParseResult = {
      success: false,
      error: 'Could not parse amount or currency.',
      originalText: inputText,
    };
    const expectedResult: ConversionResult = {
      success: false,
      error: 'AI parsing error: Could not parse amount or currency.',
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  it('should return clarification needed if AI requests it', async () => {
    const inputText = '100 pesos';
    const clarificationQuestion = 'Which pesos? (MXN, COP, ARS)';
    const mockAiResponse: CurrencyParseResult = {
      success: false,
      needsClarification: true,
      clarificationPrompt: clarificationQuestion,
      originalText: inputText,
    };
    const expectedResult: ConversionResult = {
      success: false,
      needsClarification: true,
      clarificationQuestion: clarificationQuestion,
      originalText: inputText,
      error: 'AI requires clarification.',
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  it('should return rate fetch error if exchangeRateService fails', async () => {
    const inputText = '50 CAD';
    const mockAiResponse: CurrencyParseResult = {
      success: true,
      amount: 50,
      currencyCode: 'CAD',
      originalText: inputText,
    };
    const rateError = new Error('Failed to fetch rate');

    mockParseCurrency.mockResolvedValue(mockAiResponse);
    mockGetRate.mockRejectedValue(rateError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('CAD', 'PLN');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to fetch rate');
  });

 // This test should now work IF the mocking strategy prevents constructor call
 it('should return specific error for AI API key issues if parseCurrency throws it', async () => {
    const inputText = '200 EUR';
    const apiKeyError = new Error('Invalid API key');

    const expectedResult: ConversionResult = {
        success: false,
        error: 'AI Service Error: Invalid or missing API key.',
    };

    mockParseCurrency.mockRejectedValue(apiKeyError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

 // This test should also work
 it('should return generic error for other AI Adapter errors from parseCurrency', async () => {
    const inputText = '300 JPY';
    const genericAiError = new Error('AI service unavailable');

    const expectedResult: ConversionResult = {
        success: false,
        error: 'AI Service Error: AI service unavailable',
    };

    mockParseCurrency.mockRejectedValue(genericAiError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

}); 