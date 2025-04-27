import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';

// --- Mock Dependencies --- //

// Mock aiFacade
vi.mock('../services/aiFacade', () => ({
  aiFacade: {
    parseCurrencyInput: vi.fn(),
    // Add other methods if aiFacade expands
  },
}));

// Mock exchangeRateService
vi.mock('../services/exchangeRateService', () => ({
  exchangeRateService: {
    getRate: vi.fn(),
    // Add other methods if exchangeRateService expands
  },
}));

// --- Import Mocks and Tested Module --- //
import { aiFacade } from '../services/aiFacade';
import { exchangeRateService } from '../services/exchangeRateService';
// Import the functions/listeners we want to test from background script
// Note: Directly importing index.ts might execute top-level code like addListener calls.
// It might be better to export specific handlers if possible, or structure tests carefully.
// For now, let's assume importing index is okay and we can trigger listeners manually.
// We might need to spy on the `addListener` methods.

// Import the function to test directly
import { handleCurrencyConversionRequest } from './index'; 

// --- Get Typed Mock Functions --- //
const mockParseCurrencyInput = aiFacade.parseCurrencyInput as Mock;
const mockGetRate = exchangeRateService.getRate as Mock;

// Mock chrome APIs (relying on setupTests.ts stubs)
const mockCreateContextMenu = chrome.contextMenus.create as Mock;
const mockRemoveContextMenu = chrome.contextMenus.remove as Mock;
const mockCreateNotification = chrome.notifications.create as Mock;
const mockSendMessage = chrome.runtime.sendMessage as Mock;
const mockOnMessageAddListener = chrome.runtime.onMessage.addListener as Mock;
const mockOnInstalledAddListener = chrome.runtime.onInstalled.addListener as Mock;
const mockContextMenusOnClickedAddListener = chrome.contextMenus.onClicked.addListener as Mock;

describe('Background Script Integration Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset specific mocks if needed
    mockParseCurrencyInput.mockReset();
    mockGetRate.mockReset();
  });

  afterEach(() => {
    // Ensure any stray timeouts or promises resolve if necessary
    vi.useRealTimers(); // Reset timers if vi.useFakeTimers() was used
  });

  // --- Test handleCurrencyConversionRequest (Core Logic) --- //
  describe('handleCurrencyConversionRequest', () => {
    it('should return error for empty input', async () => {
      const result = await handleCurrencyConversionRequest('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input text is empty.');
      expect(mockParseCurrencyInput).not.toHaveBeenCalled();
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle successful parsing and rate fetching', async () => {
      const inputText = '100 EUR';
      const parsed = { success: true, amount: 100, currency: 'EUR' };
      const rate = 4.5;
      const expectedResult = { success: true, originalAmount: 100, originalCurrency: 'EUR', convertedAmount: 450, targetCurrency: 'PLN', rate: 4.5 };

      mockParseCurrencyInput.mockResolvedValue(parsed);
      mockGetRate.mockResolvedValue(rate);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result).toEqual(expectedResult);
      expect(mockParseCurrencyInput).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).toHaveBeenCalledWith('EUR', 'PLN');
    });

    it('should handle AI parsing failure', async () => {
      const inputText = 'invalid text';
      const parsed = { success: false, error: 'Could not parse' };

      mockParseCurrencyInput.mockResolvedValue(parsed);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI parsing failed: Could not parse');
      expect(result.needsClarification).toBe(false); // Default if not specific parsing_failed error
      expect(mockParseCurrencyInput).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).not.toHaveBeenCalled();
    });
    
    it('should handle AI parsing failure requiring clarification', async () => {
      const inputText = '100 pesos';
      // Simulate the specific error structure that triggers needsClarification
      const parsed = { success: false, error: 'parsing_failed: currency ambiguous' }; 

      mockParseCurrencyInput.mockResolvedValue(parsed);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI parsing failed: parsing_failed: currency ambiguous');
      expect(result.needsClarification).toBe(true); // Check the flag
      expect(mockParseCurrencyInput).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle rate fetching failure', async () => {
      const inputText = '200 CAD';
      const parsed = { success: true, amount: 200, currency: 'CAD' };

      mockParseCurrencyInput.mockResolvedValue(parsed);
      mockGetRate.mockResolvedValue(null); // Simulate rate service failure

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get exchange rate for CAD to PLN');
      expect(result.originalAmount).toBe(200);
      expect(result.originalCurrency).toBe('CAD');
      expect(mockParseCurrencyInput).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).toHaveBeenCalledWith('CAD', 'PLN');
    });

    // TODO: Test unexpected error handling within the try-catch block
  });

  // --- Tests for Listeners (Need careful setup) --- //
  // describe('onInstalled Listener', () => { ... });
  // describe('onMessage Listener', () => { ... });
  // describe('contextMenus.onClicked Listener', () => { ... });

}); 