import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';

// --- Mock Dependencies --- //

// Mock aiFacade
vi.mock('../services/aiFacade', () => ({
  aiFacade: {
    parseCurrency: vi.fn(),
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

// Mock the listeners module to prevent its auto-execution on import, if needed
// Or ensure its functions are only called when intended within tests.
vi.mock('./listeners', async (importOriginal) => {
  const original = await importOriginal() as typeof import('./listeners');
  return { ...original }; // Keep original exports, but allow listener spying
});

// --- Import Mocks and Tested Module --- //
import { aiFacade } from '../services/aiFacade';
import { exchangeRateService } from '../services/exchangeRateService';
// Import specific things needed, avoid top-level import of './index' for now
import { handleCurrencyConversionRequest } from './index'; 
import * as listeners from './listeners'; // Import the actual module to call its functions

// Import background scripts AFTER mocks are defined to allow capturing addListener calls
import './index';
import './listeners';

// --- Get Typed Mock Functions --- //
const mockParseCurrency = aiFacade.parseCurrency as Mock;
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
    // Re-run listener setup IF it was conditional or needs resetting. 
    // Assuming the top-level imports already added listeners via mocks once.
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
    vi.useRealTimers();
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
      const expectedResult = { success: true, originalAmount: 100, originalCurrency: 'EUR', convertedAmount: 450, targetCurrency: 'PLN', rate: 4.5 };

      mockParseCurrency.mockResolvedValue({ success: true, amount: 100, currency: 'EUR' });
      mockGetRate.mockResolvedValue(rate);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result).toEqual(expectedResult);
      expect(mockParseCurrency).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).toHaveBeenCalledWith('EUR', 'PLN');
    });

    it('should handle AI parsing failure', async () => {
      const inputText = 'invalid text';
      const parsed = { success: false, error: 'Could not parse' };

      mockParseCurrency.mockResolvedValue(parsed);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI parsing failed: Could not parse');
      expect(result.needsClarification).toBe(false); // Default if not specific parsing_failed error
      expect(mockParseCurrency).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).not.toHaveBeenCalled();
    });
    
    it('should handle AI parsing failure requiring clarification', async () => {
      const inputText = '100 pesos';
      // Simulate the specific error structure that triggers needsClarification
      const parsed = { success: false, error: 'parsing_failed: currency ambiguous' }; 

      mockParseCurrency.mockResolvedValue(parsed);

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI parsing failed: parsing_failed: currency ambiguous');
      expect(result.needsClarification).toBe(true); // Check the flag
      expect(mockParseCurrency).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('should handle rate fetching failure', async () => {
      // Arrange
      mockParseCurrency.mockResolvedValue({ success: true, amount: 200, currency: 'CAD' });
      mockGetRate.mockRejectedValue(new Error('API Error'));

      const inputText = '200 CAD';

      const result = await handleCurrencyConversionRequest(inputText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get exchange rate for CAD to PLN');
      expect(result.originalAmount).toBe(200);
      expect(result.originalCurrency).toBe('CAD');
      expect(mockParseCurrency).toHaveBeenCalledWith(inputText);
      expect(mockGetRate).toHaveBeenCalledWith('CAD', 'PLN');
    });

    // TODO: Test unexpected error handling within the try-catch block
  });

  // --- Tests for Listeners --- //

  describe('chrome.runtime.onInstalled Listener', () => {
    it('should setup context menu via initializeContextMenu on install', async () => {
      // 1. Trigger the onInstalled event listener setup code again manually
      // This is needed because mocks are cleared in beforeEach.
      // Ideally, the module import would be managed within the test or describe.
      // Let's directly call the logic that should be triggered by onInstalled.
      // We need to simulate the execution context of the imported background script.
      // Re-importing or re-executing the script's top level is complex.
      
      // Alternative: Test the exported initializer function directly
      mockRemoveContextMenu.mockImplementation((_, cb) => { if(cb) cb(); });
      await listeners.initializeContextMenu(); // Call the exported function directly

      // Verify the effects
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
      // Reset the mock before capturing
      mockContextMenusOnClickedAddListener.mockReset();
      // Manually setup the listener and capture the callback
      await listeners.setupContextMenuOnClickListener();
      if (mockContextMenusOnClickedAddListener.mock.calls.length > 0) {
         onClickedCallback = mockContextMenusOnClickedAddListener.mock.calls[0][0];
      } else {
         // Throw an error if listener wasn't added as expected
         throw new Error('setupContextMenuOnClickListener did not call chrome.contextMenus.onClicked.addListener');
      }
    });

    it('should call handleCurrencyConversionRequest and show success notification on valid click', async () => {
       expect(onClickedCallback).toBeDefined(); // Ensure callback was captured
       if (!onClickedCallback) return; // Add check
       const selectionText = '50 USD';
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       mockParseCurrency.mockResolvedValue({ success: true, amount: 50, currency: 'USD' });
       mockGetRate.mockResolvedValue(4.0);
       await onClickedCallback(mockInfo, undefined);
       expect(mockParseCurrency).toHaveBeenCalledWith(selectionText);
       expect(mockGetRate).toHaveBeenCalledWith('USD', 'PLN');
       expect(mockCreateNotification).toHaveBeenCalledTimes(1);
       expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'ZNTL Konwerter Walut', message: '50 USD = 200.00 PLN' }));
     });

     it('should call handleCurrencyConversionRequest and show error notification on failed conversion', async () => {
        expect(onClickedCallback).toBeDefined();
        if (!onClickedCallback) return; // Ensure the check is present and correct
       const selectionText = 'invalid text';
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       // Mock should return the raw error from the AI service
       const rawAiErrorMessage = 'Could not parse'; 
       mockParseCurrency.mockResolvedValue({ success: false, error: rawAiErrorMessage });
       
       await onClickedCallback(mockInfo, undefined);
       
       await vi.waitFor(() => {
         expect(mockCreateNotification).toHaveBeenCalledTimes(1);
       });
       // Expect the error message *after* being processed by handleCurrencyConversionRequest
       const expectedFormattedErrorMessage = `AI parsing failed: ${rawAiErrorMessage}`;
       expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({
         title: 'Błąd Konwersji ZNTL',
         message: expectedFormattedErrorMessage 
       }));
       expect(mockParseCurrency).toHaveBeenCalledWith(selectionText);
       expect(mockGetRate).not.toHaveBeenCalled();
     });

     it('should not call handleCurrencyConversionRequest if wrong menu item ID', async () => {
        expect(onClickedCallback).toBeDefined();
        if (!onClickedCallback) return; // Add check
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'WRONG_ID', selectionText: '100 EUR', editable: false, pageUrl: 'some_url' };
        await onClickedCallback(mockInfo, undefined);
        expect(mockParseCurrency).not.toHaveBeenCalled();
        expect(mockCreateNotification).not.toHaveBeenCalled();
     });

     it('should not call handleCurrencyConversionRequest if no text selected', async () => {
         expect(onClickedCallback).toBeDefined();
         if (!onClickedCallback) return; // Add check
         const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', editable: false, pageUrl: 'some_url' }; 
         await onClickedCallback(mockInfo, undefined);
         expect(mockParseCurrency).not.toHaveBeenCalled();
         expect(mockCreateNotification).not.toHaveBeenCalled();
     });
  });

  // describe('chrome.runtime.onMessage Listener', () => { ... }); // TODO: Add tests for onMessage
}); 