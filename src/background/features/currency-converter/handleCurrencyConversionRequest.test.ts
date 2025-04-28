// Test file for handleCurrencyConversionRequest
// See decision log: .cursor/decisions/2025-04-28-refactor-mocking-handleCurrencyConversionRequest-test.md

// Import the function TYPE, but the actual function will come from the mock factory
import type { handleCurrencyConversionRequest as handleCurrencyConversionRequestType } from '../../index';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { ConversionResult, CurrencyParseResult, IAIAdapter } from '../../../interfaces'; // Use type imports
import { exchangeRateService } from '../../../services/exchangeRateService';

// --- Mock Dependencies --- //

// Mock the getAIProvider function within ../../index using a factory
const mockParseCurrency = vi.fn();
const mockGetRate = vi.fn();

vi.mock('../../index', async (importOriginal) => {
  // Dynamically import the original module to get the real function
  const originalModule = await importOriginal() as typeof import('../../index');
  return {
    // Mock getAIProvider
    getAIProvider: vi.fn(() => ({
      parseCurrency: mockParseCurrency,
    }) as IAIAdapter),
    // Keep the original function under test
    handleCurrencyConversionRequest: originalModule.handleCurrencyConversionRequest,
    // Mock or provide defaults for other exports if needed by the test setup
    initializeContextMenu: vi.fn(),
    setupContextMenuOnClickListener: vi.fn(),
    setupRuntimeMessageListener: vi.fn(),
    handleCurrencyClarificationRequest: vi.fn(), // Mock this too if needed
  };
});

// Mock the exchangeRateService directly (no factory needed if simple)
vi.mock('../../../services/exchangeRateService', () => ({
  exchangeRateService: {
    getRate: mockGetRate,
  },
}));

// --- Test Suite --- //

// Need to dynamically import the mocked function AFTER vi.mock has run
let handleCurrencyConversionRequest: typeof handleCurrencyConversionRequestType;

describe('handleCurrencyConversionRequest', () => {

  beforeAll(async () => {
    // Import the potentially mocked function here
    const mod = await import('../../index');
    handleCurrencyConversionRequest = mod.handleCurrencyConversionRequest;
  });

  beforeEach(() => {
    mockParseCurrency.mockClear();
    mockGetRate.mockClear();
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

    // Call the function
    const result = await handleCurrencyConversionRequest(inputText);

    // Assertions
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN');
    expect(result).toEqual(expectedResult);
  });

  // FIXME: Mocking issue - Tests below might fail due to vi.mock hoisting/dependency problems
  // and the original GoogleAIAdapter constructor being called, leading to API key errors.
  // See decision: .cursor/decisions/2025-04-28-refactor-mocking-handleCurrencyConversionRequest-test.md

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
    const expectedResult: ConversionResult = {
      success: false,
      // Error message might depend on how exchangeRateService throws
      // Assuming it throws a standard Error
      error: 'Unhandled exception: Failed to fetch rate',
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);
    mockGetRate.mockRejectedValue(rateError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('CAD', 'PLN');
    // Check only relevant fields as the exact error message might vary
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to fetch rate');
  });

  it('should return specific error for AI API key issues', async () => {
    const inputText = '200 EUR';
    const apiKeyError = new Error('Invalid API key'); // Simulate AI provider throwing
    // Manually set a constructor name or similar property if needed for specific error check
    // apiKeyError.constructor.name = 'AIAdapterError'; // Example

    const expectedResult: ConversionResult = {
        success: false,
        error: 'AI Service Error: Invalid or missing API key.', // Match error handling in index.ts
    };

    // Mock parseCurrency to throw the API key error
    mockParseCurrency.mockRejectedValue(apiKeyError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  it('should return generic error for other AI Adapter errors', async () => {
    const inputText = '300 JPY';
    const genericAiError = new Error('AI service unavailable');
    // Ensure it's treated as a generic AI error
    (genericAiError as any).constructor = { name: 'AIAdapterError' }; // Simulate custom error type

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