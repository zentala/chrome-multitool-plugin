// Test file for handleCurrencyConversionRequest
// See decision log: .cursor/decisions/2025-04-28-refactor-mocking-handleCurrencyConversionRequest-test.md

// Import TYPE of the function under test
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ConversionResult, CurrencyParseResult, IAIAdapter } from '../../../interfaces';
// We don't need to import exchangeRateService directly if we mock the module
// import { exchangeRateService } from '../../../services/exchangeRateService';
// We don't import GoogleAIAdapter

// --- Mock Dependencies --- //

// Define mock functions for AI Provider
const mockParseCurrency = vi.fn();
// Remove mockGetRate definition from here
// const mockGetRate = vi.fn(); 

// Mock the aiProvider module directly
vi.mock('../../aiProvider', () => ({
  getAIProvider: vi.fn(() => ({
    parseCurrency: mockParseCurrency,
  }) as IAIAdapter),
}));

// Mock the exchangeRateService module
vi.mock('../../../services/exchangeRateService', () => ({
  // Define the mock function directly inside the factory
  exchangeRateService: {
    getRate: vi.fn(), // Create the mock function here
  },
}));

// --- Test Suite --- //

// Import AFTER mocks
import { handleCurrencyConversionRequest } from '../../index'; // Corrected path
import { getAIProvider } from '../../aiProvider';
// Import the mocked service to access the inner mock
import { exchangeRateService } from '../../../services/exchangeRateService';

describe('handleCurrencyConversionRequest', () => {
  // Get a reference to the inner mock function for clearing and expectations
  const mockGetRate = vi.mocked(exchangeRateService.getRate);

  beforeEach(() => {
    // Clear the inner mocks
    mockParseCurrency.mockClear();
    mockGetRate.mockClear(); // Use the reference obtained above
    vi.mocked(getAIProvider).mockClear(); 
  });

  it('should return successful conversion result for valid input with default target currency (PLN)', async () => {
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
      targetCurrency: 'PLN', // Default target
      rate: mockRate,
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);
    mockGetRate.mockResolvedValue(mockRate); // Use the reference

    const result = await handleCurrencyConversionRequest(inputText);

    // Check that the mocked getAIProvider was called 
    expect(getAIProvider).toHaveBeenCalled(); // Direct check on the imported mock
    // Check that the inner mock was called
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN'); // Use the reference
    expect(result).toEqual(expectedResult);
  });

  it('should return successful conversion result for valid input with specified target currency', async () => {
    const inputText = '100 USD';
    const targetCurrency = 'EUR';
    const mockAiResponse: CurrencyParseResult = {
      success: true,
      amount: 100,
      currencyCode: 'USD',
      originalText: inputText,
    };
    const mockRate = 0.92;
    const expectedResult: ConversionResult = {
      success: true,
      originalAmount: 100,
      originalCurrency: 'USD',
      convertedAmount: 92.00,
      targetCurrency: targetCurrency, // Specified target
      rate: mockRate,
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);
    mockGetRate.mockResolvedValue(mockRate); // Use the reference

    const result = await handleCurrencyConversionRequest(inputText, targetCurrency);

    // Check that the mocked getAIProvider was called
    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('USD', targetCurrency); // Use the reference
    expect(result).toEqual(expectedResult);
  });

  // FIXME: Mocking issue - Previous attempts failed. This approach tries to mock getAIProvider within index mock.
  // Update comment: Mocking getAIProvider directly via its module now.

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
    
    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  it('should return clarification needed if AI requests it', async () => {
    const inputText = 'convert $50';
    const expectedClarification = "Currency is ambiguous (e.g., 'dollar', 'peso'). Please specify (USD, CAD, MXN, etc.).";
    // Use CurrencyParseResult for the AI mock response
    const mockAiResponse: CurrencyParseResult = {
      success: false,
      needsClarification: true, // Indicate clarification is needed
      clarificationPrompt: expectedClarification, // Use the correct property name
      originalText: inputText,
    };
    const expectedResult: ConversionResult = {
      success: false,
      needsClarification: true,
      clarificationQuestion: expectedClarification, // The function should map clarificationPrompt to clarificationQuestion
      originalText: inputText,
      error: 'AI requires clarification.',
    };

    mockParseCurrency.mockResolvedValue(mockAiResponse);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(getAIProvider).toHaveBeenCalled();
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
    mockGetRate.mockRejectedValue(rateError); // Use the reference

    const result = await handleCurrencyConversionRequest(inputText);
    
    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).toHaveBeenCalledWith('CAD', 'PLN'); // Use the reference
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unhandled exception: Failed to fetch rate'); 
  });

 // This test should now work IF the mocking strategy prevents constructor call
 it('should return specific error for AI Adapter errors if parseCurrency throws it', async () => {
    const inputText = '200 EUR';
    // Simulate an error structure potentially thrown by the adapter
    class AIAdapterError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AIAdapterError'; 
      }
    }
    const aiError = new AIAdapterError('AI service unavailable');


    const expectedResult: ConversionResult = {
        success: false,
        // Error message comes from the catch block in handleCurrencyConversionRequest
        error: 'AI Service Error: AI service unavailable', 
    };

    mockParseCurrency.mockRejectedValue(aiError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

 // This test should also work
 it('should return specific error for API key issues if parseCurrency throws it', async () => {
    const inputText = '300 JPY';
    // Simulate an error that contains 'API key' text
    const apiKeyError = new Error('Invalid or missing API key provided.'); 

    const expectedResult: ConversionResult = {
        success: false,
        // Specific handling for 'API key' in the error message
        error: 'AI Service Error: Invalid or missing API key.',
    };

    mockParseCurrency.mockRejectedValue(apiKeyError);

    const result = await handleCurrencyConversionRequest(inputText);

    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  // Add test for generic errors from parseCurrency if needed
  it('should return generic unhandled error for other errors from parseCurrency', async () => {
    const inputText = '400 GBP';
    const genericError = new Error('Some unexpected internal error');

    const expectedResult: ConversionResult = {
      success: false,
      error: 'Unhandled exception: Some unexpected internal error', // The generic catch block
    };

    mockParseCurrency.mockRejectedValue(genericError);

    const result = await handleCurrencyConversionRequest(inputText);
    
    expect(getAIProvider).toHaveBeenCalled();
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
    expect(mockGetRate).not.toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

}); 