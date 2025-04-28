import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';
import { ConversionResult } from '../interfaces';
import { AIAdapterError } from '../interfaces/IAIAdapter';

// --- Mock Dependencies --- //

// Mock aiFacade
vi.mock('../services/aiFacade', () => ({
  aiFacade: {
    parseCurrency: vi.fn(),
    // Add other methods if aiFacade expands
  },
}));

// Mock exchangeRateService to use the __mocks__ directory
// Remove the factory function, Vitest will find the mock automatically
vi.mock('../services/exchangeRateService');

// Mock the listeners module to prevent its auto-execution on import, if needed
// Or ensure its functions are only called when intended within tests.
vi.mock('./listeners', async (importOriginal) => {
  const original = await importOriginal() as typeof import('./listeners');
  return { ...original }; // Keep original exports, but allow listener spying
});

// --- Import Mocks and Tested Module --- //
import { aiFacade } from '../services/aiFacade';
// Import the MOCKED exchangeRateService instance
import { exchangeRateService } from '../services/exchangeRateService';
// Import specific things needed, avoid top-level import of './index' for now
import { handleCurrencyConversionRequest } from './index'; 
import * as listeners from './listeners'; // Import the actual module to call its functions

// Import background scripts AFTER mocks are defined to allow capturing addListener calls
import './index';
import './listeners';

// --- Get Typed Mock Functions --- //
const mockParseCurrency = aiFacade.parseCurrency as Mock;
// Get the mock function from the mocked service instance
const mockGetRate = exchangeRateService.getRate as Mock;

// Mock chrome APIs (relying on setupTests.ts stubs)
const mockCreateContextMenu = chrome.contextMenus.create as Mock;
const mockRemoveContextMenu = chrome.contextMenus.remove as Mock;
const mockCreateNotification = chrome.notifications.create as Mock;
// const mockSendMessage = chrome.runtime.sendMessage as Mock; // Remove unused variable
const mockOnMessageAddListener = chrome.runtime.onMessage.addListener as Mock;
const mockOnInstalledAddListener = chrome.runtime.onInstalled.addListener as Mock;
const mockContextMenusOnClickedAddListener = chrome.contextMenus.onClicked.addListener as Mock;

describe('Background Script Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks, including addListener calls from previous tests if any
    vi.clearAllMocks();
    // Reset mocks used in tests
    mockParseCurrency.mockReset();
    mockGetRate.mockReset();
    mockRemoveContextMenu.mockReset();
    mockCreateContextMenu.mockReset();
    mockCreateNotification.mockReset();
    // Reset addListener mocks to check calls within specific tests
    mockOnInstalledAddListener.mockReset();
    mockContextMenusOnClickedAddListener.mockReset();
    mockOnMessageAddListener.mockReset();
  });

  afterEach(() => {
    // Removed vi.useRealTimers() as it might interfere if timers are used elsewhere
    // vi.useRealTimers(); 
  });

  // --- Test handleCurrencyConversionRequest (Core Logic) --- //
  describe('handleCurrencyConversionRequest', () => {
    it('should return error for empty input', async () => {
      const result = await handleCurrencyConversionRequest('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input text is empty.');
      expect(mockParseCurrency).not.toHaveBeenCalled();
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle successful parsing and rate fetching', async () => {
      const inputText = '100 EUR';
      const rate = 4.5;
      const parsedAmount = 100;
      const parsedCurrencyCode = 'EUR';
      const targetCurrency = 'PLN';
      const expectedResult: ConversionResult = {
        success: true,
        originalAmount: parsedAmount,
        originalCurrency: parsedCurrencyCode,
        convertedAmount: parseFloat((parsedAmount * rate).toFixed(2)),
        targetCurrency: targetCurrency,
        rate: rate,
      };

      // Mock parseCurrency to return success with currencyCode
      mockParseCurrency.mockResolvedValue({ success: true, amount: parsedAmount, currencyCode: parsedCurrencyCode });
      // Mock getRate to return the rate
      mockGetRate.mockResolvedValue(rate);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result).toEqual(expectedResult);
      expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText }); // Expect object
      expect(mockGetRate).toHaveBeenCalledWith(parsedCurrencyCode, targetCurrency);
    });

    it('should handle AI parsing failure', async () => {
      const inputText = 'invalid text';
      const aiErrorMsg = 'Could not parse';
      // Mock parseCurrency returning a failure object
      const parsedResult = { success: false, error: aiErrorMsg };
      mockParseCurrency.mockResolvedValue(parsedResult);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      // Check the error message formatting from handleCurrencyConversionRequest
      expect(result.error).toBe(`AI Error: ${aiErrorMsg}`);
      expect(result.needsClarification).toBeUndefined(); // No clarification needed here
      expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle AI parsing failure requiring clarification', async () => {
      const inputText = '100 pesos';
      const aiErrorMsg = 'parsing_failed: currency ambiguous';
      // Mock parseCurrency returning failure + needsClarification
      const parsedResult = { success: false, error: aiErrorMsg, needsClarification: true };
      mockParseCurrency.mockResolvedValue(parsedResult);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toBe(`AI Error: ${aiErrorMsg}`); // Check formatted error
      expect(result.needsClarification).toBe(true);
      expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle rate fetching failure', async () => {
      const inputText = '200 CAD';
      const parsedAmount = 200;
      const parsedCurrencyCode = 'CAD';
      const rateErrorMsg = 'Exchange Rate API Error - Mocked';
      // Mock successful parsing
      mockParseCurrency.mockResolvedValue({ success: true, amount: parsedAmount, currencyCode: parsedCurrencyCode });
      // Mock getRate throwing a generic Error (not ExchangeRateServiceError)
      mockGetRate.mockRejectedValue(new Error(rateErrorMsg)); 

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      // Expect the 'Unexpected Error' format because a generic Error was thrown
      expect(result.error).toBe(`Unexpected Error: ${rateErrorMsg}`); 
      // Original parsed data should NOT be included for generic errors in current logic
      expect(result.originalAmount).toBeUndefined(); 
      expect(result.originalCurrency).toBeUndefined();
      expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
      expect(mockGetRate).toHaveBeenCalledWith(parsedCurrencyCode, 'PLN');
    });

    it('should handle AI service failure (AIAdapterError)', async () => {
       const inputText = '100 USD';
       const aiAdapterErrorMsg = 'AI Service Quota Exceeded';
       const aiAdapterErrorDetails = 'Quota Details';
       mockParseCurrency.mockRejectedValue(new AIAdapterError(aiAdapterErrorMsg, 429, aiAdapterErrorDetails));

       const result = await handleCurrencyConversionRequest(inputText);

       expect(result.success).toBe(false);
       expect(result.error).toContain(`AI Service Error: ${aiAdapterErrorMsg}`);
       expect(result.error).toContain(aiAdapterErrorDetails);
       expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
       expect(mockGetRate).not.toHaveBeenCalled();
   });

    it('should handle unexpected generic error during processing', async () => {
       const inputText = '100 USD';
       const genericErrorMsg = 'Something completely unexpected happened';
       // Mock parsing to succeed, but getRate to throw a generic error
       mockParseCurrency.mockResolvedValue({ success: true, amount: 100, currencyCode: 'USD' });
       mockGetRate.mockRejectedValue(new Error(genericErrorMsg));

       const result = await handleCurrencyConversionRequest(inputText);

       expect(result.success).toBe(false);
       // Check the specific error format for generic errors
       expect(result.error).toBe(`Unexpected Error: ${genericErrorMsg}`); 
       expect(mockParseCurrency).toHaveBeenCalledWith({ text: inputText });
       expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN');
   });

  });

  // --- Tests for Listeners --- //

  describe('chrome.runtime.onInstalled Listener', () => {
    it('should setup context menu via initializeContextMenu on install', async () => {
        // Direct test of the initializer function
        // We need to ensure mocks are ready before calling it.
        mockRemoveContextMenu.mockImplementation((_, cb) => { if(cb) cb(); });
        await listeners.initializeContextMenu();

        expect(mockRemoveContextMenu).toHaveBeenCalledWith('ZNTL_CONVERT_CURRENCY', expect.any(Function));
        expect(mockCreateContextMenu).toHaveBeenCalledTimes(1);
        expect(mockCreateContextMenu).toHaveBeenCalledWith({
            id: 'ZNTL_CONVERT_CURRENCY',
            title: 'ZNTL: Przelicz walutę na PLN',
            contexts: ['selection'],
        });
    });
  });

  describe('chrome.contextMenus.onClicked Listener', () => {
    let onClickedCallback: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) | undefined;

    beforeEach(async () => {
      mockContextMenusOnClickedAddListener.mockReset();
      // Call the setup function from the imported listeners module
      listeners.setupContextMenuOnClickListener(); 
      if (mockContextMenusOnClickedAddListener.mock.calls.length > 0) {
         onClickedCallback = mockContextMenusOnClickedAddListener.mock.calls[0][0];
      } else {
         throw new Error('setupContextMenuOnClickListener did not add listener');
      }
    });

    it('should call handleCurrencyConversionRequest and show success notification on valid click', async () => {
       expect(onClickedCallback).toBeDefined();
       if (!onClickedCallback) return;
       const selectionText = '50 USD';
       const rate = 4.0;
       const convertedAmount = 200.00;
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       // Mock successful parsing and rate fetching
       mockParseCurrency.mockResolvedValue({ success: true, amount: 50, currencyCode: 'USD' });
       mockGetRate.mockResolvedValue(rate);
       
       // Act: Simulate the click event
       await onClickedCallback(mockInfo, undefined);
       
       // Assertions
       expect(mockParseCurrency).toHaveBeenCalledWith({ text: selectionText }); // Expect object
       expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN');
       await vi.waitFor(() => { // Wait for async notification
            expect(mockCreateNotification).toHaveBeenCalledTimes(1);
       });
       expect(mockCreateNotification).toHaveBeenCalledWith(expect.stringContaining('zntl-conversion-'), expect.objectContaining({ 
           type: 'basic',
           iconUrl: 'icons/icon128.png',
           title: 'ZNTL Konwerter Walut',
           message: `${selectionText} = ${convertedAmount.toFixed(2)} PLN` 
        }));
     });

     it('should call handleCurrencyConversionRequest and show error notification on failed conversion', async () => {
        expect(onClickedCallback).toBeDefined();
        if (!onClickedCallback) return;
       const selectionText = 'invalid text';
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       const aiErrorMsg = 'Could not parse';
       // Mock parse failure
       mockParseCurrency.mockResolvedValue({ success: false, error: aiErrorMsg });
       
       await onClickedCallback(mockInfo, undefined);
       
       expect(mockParseCurrency).toHaveBeenCalledWith({ text: selectionText }); // Expect object
       expect(mockGetRate).not.toHaveBeenCalled();
       await vi.waitFor(() => { // Wait for async notification
         expect(mockCreateNotification).toHaveBeenCalledTimes(1);
       });
       // Expect the error message formatted by the background script
       const expectedFormattedErrorMessage = `AI Error: ${aiErrorMsg}`;
       expect(mockCreateNotification).toHaveBeenCalledWith(expect.stringContaining('zntl-conversion-'), expect.objectContaining({
         title: 'Błąd Konwersji ZNTL', 
         message: expectedFormattedErrorMessage 
       }));
     });

     it('should not call handleCurrencyConversionRequest if wrong menu item ID', async () => {
        expect(onClickedCallback).toBeDefined();
        if (!onClickedCallback) return;
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'WRONG_ID', selectionText: '100 EUR', editable: false, pageUrl: 'some_url' };
        await onClickedCallback(mockInfo, undefined);
        expect(mockParseCurrency).not.toHaveBeenCalled();
        expect(mockCreateNotification).not.toHaveBeenCalled();
     });

     it('should show specific notification if no text selected', async () => {
         expect(onClickedCallback).toBeDefined();
         if (!onClickedCallback) return;
         const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', editable: false, pageUrl: 'some_url' }; 
         await onClickedCallback(mockInfo, undefined);
         expect(mockParseCurrency).not.toHaveBeenCalled();
         // Expect the specific no-selection notification
         await vi.waitFor(() => { // Wait for async notification
            expect(mockCreateNotification).toHaveBeenCalledTimes(1);
        });
         expect(mockCreateNotification).toHaveBeenCalledWith(expect.stringContaining('zntl-noselection-'), expect.objectContaining({
            title: 'ZNTL Konwerter Walut',
            message: 'Zaznacz tekst zawierający kwotę i walutę, aby dokonać konwersji.'
         }));
     });
  });

  // describe('chrome.runtime.onMessage Listener', () => { ... }); // TODO: Add tests for onMessage
}); 