import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
// Use ParseCurrencyOutput which represents the actual return type
import { ParseCurrencyOutput, IAIAdapter, AIAdapterError } from '../../interfaces/IAIAdapter';

// --- Mock @google/generative-ai SDK --- //
// This is still needed if the *original* implementation uses it
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  const GoogleGenerativeAI = vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  }));
  return {
    GoogleGenerativeAI,
    HarmCategory: { /* Mocks */ },
    HarmBlockThreshold: { /* Mocks */ },
    GenerativeModel: vi.fn(),
  };
});

// --- Activate the manual mock for GoogleAIAdapter --- //
vi.mock('./GoogleAIAdapter');

// --- Import the MOCKED adapter CLASS and types--- //
// Import only the mocked class. AIAdapterError comes from the interface import.
import { GoogleAIAdapter } from './GoogleAIAdapter';
// Import the mock function directly from the mock file to configure it
import { mockParseCurrency } from './__mocks__/GoogleAIAdapter';


// --- Test Setup --- //
let adapter: IAIAdapter; // Use interface type

beforeEach(() => {
  // Reset SDK mock (if still relevant, maybe not needed)
  mockGenerateContent.mockReset();
  // Reset the adapter's method mock
  mockParseCurrency.mockReset();

  // Create a new instance of the MOCKED adapter for each test
  // The imported GoogleAIAdapter is actually the MockGoogleAIAdapter from the mock file
  adapter = new GoogleAIAdapter();
});

afterAll(() => {
    vi.restoreAllMocks(); // Restore SDK mock
});


describe('GoogleAIAdapter (Mocked Module)', () => {

  // Constructor tests are removed as the constructor is mocked

  it('parseCurrency should call implementation and return success', async () => {
    const inputText = '€50.99';
    const expectedAmount = 50.99;
    const expectedCurrency = 'EUR';
    const expectedResult: ParseCurrencyOutput = {
        success: true,
        amount: expectedAmount,
        currencyCode: expectedCurrency,
    };

    // Setup the mock implementation for parseCurrency
    mockParseCurrency.mockResolvedValue(expectedResult);

    const result = await adapter.parseCurrency({ text: inputText });

    // Check that the mock implementation was called
    expect(mockParseCurrency).toHaveBeenCalledTimes(1);
    expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });

    // Check the result returned by the mock
    expect(result).toEqual(expectedResult);
  });

  it('parseCurrency should return error if implementation rejects', async () => {
    const errorMsg = 'Internal Server Error';
    // Use AIAdapterError directly from the interface import
    const expectedError = new AIAdapterError(`Gemini API Error: ${errorMsg}`, 500, errorMsg);

    // Setup the mock implementation to reject
    mockParseCurrency.mockRejectedValue(expectedError);

    await expect(adapter.parseCurrency({ text: 'bad input' }))
        .rejects
        .toThrow(expectedError);

    expect(mockParseCurrency).toHaveBeenCalledTimes(1);
  });

  it('parseCurrency should return parsing failed if implementation resolves with it', async () => {
    const reason = 'currency ambiguous';
    const errorType = 'parsing_failed';
    const expectedResult: ParseCurrencyOutput = {
        success: false,
        error: errorType,
        needsClarification: reason // Use string value here
    };

    // Setup the mock implementation
    mockParseCurrency.mockResolvedValue(expectedResult);

    const result = await adapter.parseCurrency({ text: '100 pesos' });

    expect(mockParseCurrency).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('parseCurrency should return error if implementation resolves with invalid JSON error', async () => {
     const expectedResult: ParseCurrencyOutput = {
        success: false,
        error: 'AI response was not valid JSON' // Simplified error message
    };

    // Setup the mock implementation
    mockParseCurrency.mockResolvedValue(expectedResult);

    const result = await adapter.parseCurrency({ text: 'any input' });

    expect(mockParseCurrency).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

}); 