import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParsedCurrencyResult } from '../../interfaces/AI';
import { GoogleAIAdapter } from './GoogleAIAdapter';

// Mock fetch using Vitest
vi.stubGlobal('fetch', vi.fn());
const mockFetch = vi.mocked(global.fetch); // Use vi.mocked for type safety

// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
  // Reset fetch mock
  mockFetch.mockReset(); // Use mockReset for Vitest mocks
  // Reset process.env
  process.env = { ...originalEnv };
});

afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
});

// Helper to mock successful Gemini API response with valid JSON
const mockGeminiSuccess = (amount: number, currency: string) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ amount, currency }) }],
          },
        },
      ],
    }),
  } as Response);
};

// Helper to mock successful Gemini API response with parsing error JSON
const mockGeminiParsingFailed = (reason: string = 'test reason') => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ error: 'parsing_failed', reason }) }],
            },
          },
        ],
      }),
    } as Response);
  };

// Helper to mock successful Gemini API response with invalid/malformed JSON text
const mockGeminiInvalidJsonText = () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'this is not json' }],
            },
          },
        ],
      }),
    } as Response);
  };

// Helper to mock Gemini API failure (e.g., 4xx, 5xx)
const mockGeminiApiError = (status: number = 500, errorBody: string = 'Server Error') => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: status,
    json: async () => ({ error: { message: errorBody } }), // Example error structure
    text: async () => errorBody,
  } as Response);
};

// Helper to mock fetch network error
const mockFetchNetworkError = () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failed'));
};

describe('GoogleAIAdapter', () => {
  it('constructor should read API key from process.env', () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();
    expect(adapter).toBeDefined();
  });

  it('parseCurrency should return error if API key is missing', async () => {
    delete process.env.GEMINI_API_KEY; // Ensure key is not set
    const adapter = new GoogleAIAdapter();
    const result = await adapter.parseCurrency({ text: '100 USD' });
    expect(result).toEqual<ParsedCurrencyResult>({
      success: false,
      error: 'Google AI API Key not configured.',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('parseCurrency should call fetch with correct URL and body, and return success on valid response', async () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();
    const inputText = '€50.99';
    const expectedAmount = 50.99;
    const expectedCurrency = 'EUR';

    mockGeminiSuccess(expectedAmount, expectedCurrency);

    const result = await adapter.parseCurrency({ text: inputText });

    expect(result).toEqual<ParsedCurrencyResult>({
      success: true,
      amount: expectedAmount,
      currency: expectedCurrency,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    const url = fetchCall[0] as string;
    const options = fetchCall[1] as RequestInit;

    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain(adapter['modelName']); // Access private member for test
    expect(url).toContain('key=test-key-123');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBeDefined();
    const body = JSON.parse(options.body as string);
    expect(body.contents[0].parts[0].text).toContain(inputText);
  });

  it('parseCurrency should return error if API returns an error status', async () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();

    mockGeminiApiError(400, 'Invalid request');

    await expect(adapter.parseCurrency({ text: 'bad input' })).rejects.toThrow(/API request failed with status 400/);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('parseCurrency should return parsing failed if LLM returns error JSON', async () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();
    const reason = 'currency ambiguous';
    mockGeminiParsingFailed(reason);

    const result = await adapter.parseCurrency({ text: '100 pesos' });

    expect(result).toEqual<ParsedCurrencyResult>({
      success: false,
      error: `LLM could not parse input: parsing_failed`,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('parseCurrency should throw error if LLM returns invalid JSON text', async () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();
    mockGeminiInvalidJsonText();

    await expect(adapter.parseCurrency({ text: 'any input' })).rejects.toThrow('LLM returned invalid JSON');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('parseCurrency should throw error on fetch network error', async () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    const adapter = new GoogleAIAdapter();
    mockFetchNetworkError();

    await expect(adapter.parseCurrency({ text: 'any input' })).rejects.toThrow('Network failed');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
}); 