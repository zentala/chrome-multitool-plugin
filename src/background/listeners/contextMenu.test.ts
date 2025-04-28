import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { ConversionResult } from '../../interfaces'; // Add missing import

// Mock the core logic function that the listener is supposed to call
import { handleCurrencyConversionRequest } from '../index'; // Correct path to background index
vi.mock('../index', () => ({
  handleCurrencyConversionRequest: vi.fn(),
}));

// Mock the listeners module itself to spy on addListener without execution?
// Or import directly and ensure setup is called correctly.
import * as listeners from '../listeners'; // Adjust path
vi.mock('../listeners', async (importOriginal) => {
    const original = await importOriginal() as typeof import('../listeners');
    // Spy on setup functions without modifying their behavior initially
    return {
      ...original,
      initializeContextMenu: vi.fn(original.initializeContextMenu),
      setupContextMenuOnClickListener: vi.fn(original.setupContextMenuOnClickListener),
      // Mock other listener setups if they exist
    };
});

// Mock chrome APIs needed for these tests
const mockCreateContextMenu = chrome.contextMenus.create as Mock;
const mockRemoveContextMenu = chrome.contextMenus.remove as Mock;
const mockCreateNotification = chrome.notifications.create as Mock;
const mockContextMenusOnClickedAddListener = chrome.contextMenus.onClicked.addListener as Mock;

// --- Get Typed Mock Functions --- //
const mockHandleCurrencyConversionRequest = handleCurrencyConversionRequest as Mock;

describe('Context Menu Listener Tests', () => {
    let onClickedCallback: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        mockHandleCurrencyConversionRequest.mockReset();
        mockCreateNotification.mockReset();
        mockContextMenusOnClickedAddListener.mockReset();
        mockCreateContextMenu.mockReset(); // Reset this too if checking init
        mockRemoveContextMenu.mockReset();

        // Ensure the listener setup function is called for each relevant test group
        // We need to capture the added listener callback
        listeners.setupContextMenuOnClickListener(); 
        if (mockContextMenusOnClickedAddListener.mock.calls.length > 0) {
            onClickedCallback = mockContextMenusOnClickedAddListener.mock.calls[0][0];
        } else {
            // Fallback or error if listener wasn't added as expected
            console.error('Context menu listener was not added in beforeEach');
            onClickedCallback = undefined; 
        }
    });

    it('should add onClicked listener during setup', () => {
        // Setup was called in beforeEach
        expect(listeners.setupContextMenuOnClickListener).toHaveBeenCalled();
        expect(mockContextMenusOnClickedAddListener).toHaveBeenCalledTimes(1);
        expect(typeof mockContextMenusOnClickedAddListener.mock.calls[0][0]).toBe('function');
    });

    it('should call handleCurrencyConversionRequest and show success notification on valid click', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = '50 USD';
       const mockResult: ConversionResult = { success: true, originalAmount: 50, originalCurrency: 'USD', convertedAmount: 200.00, targetCurrency: 'PLN', rate: 4.0 };
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       // Mock the core logic function to return success
       mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);
       
       await onClickedCallback(mockInfo, undefined);
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText);
       await vi.waitFor(() => { expect(mockCreateNotification).toHaveBeenCalledTimes(1); });
       expect(mockCreateNotification).toHaveBeenCalledWith(
           expect.stringContaining('zntl-conversion-'), 
           expect.objectContaining({ message: `${selectionText} = 200.00 PLN` })
       );
    });

    it('should call handleCurrencyConversionRequest and show error notification on failed conversion', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = 'invalid text';
       const mockResult: ConversionResult = { success: false, error: 'Parsing failed badly' };
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       // Mock the core logic function to return failure
       mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);

       await onClickedCallback(mockInfo, undefined);
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText);
       await vi.waitFor(() => { expect(mockCreateNotification).toHaveBeenCalledTimes(1); });
       expect(mockCreateNotification).toHaveBeenCalledWith(
           expect.stringContaining('zntl-error-'),
           expect.objectContaining({ message: mockResult.error })
       );
    });

     it('should show generic error notification if handleCurrencyConversionRequest throws', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = 'trigger throw';
       const thrownError = new Error('Unexpected core logic failure');
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       // Mock the core logic function to throw an error
       mockHandleCurrencyConversionRequest.mockRejectedValue(thrownError);

       // Temporarily suppress console.error for this specific test case
       const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

       // Wrap the call in try-catch within the test to observe behavior
       try {
            await onClickedCallback(mockInfo, undefined);
       } catch (e) {
            // We expect an error to be thrown by the mock, but the listener should catch it internally.
            // Log if the error propagates out to the test scope unexpectedly.
            console.warn('Error propagated to test scope:', e);
       }
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText);
       // Wait for the notification to be created, which should happen in the listener's catch block
       await vi.waitFor(() => { expect(mockCreateNotification).toHaveBeenCalledTimes(1); });
       expect(mockCreateNotification).toHaveBeenCalledWith(
           expect.stringContaining('zntl-generic-error-'),
           expect.objectContaining({ title: 'Błąd Rozszerzenia ZNTL', message: 'Wystąpił nieoczekiwany błąd.' })
       );

       // Restore console.error
       consoleErrorSpy.mockRestore();
    });

    it('should not call handleCurrencyConversionRequest if wrong menu item ID', async () => {
        if (!onClickedCallback) throw new Error('Callback not captured');
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'WRONG_ID', selectionText: '100 EUR', editable: false, pageUrl: 'some_url' };
        await onClickedCallback(mockInfo, undefined);
        expect(mockHandleCurrencyConversionRequest).not.toHaveBeenCalled();
        expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('should show specific notification if no text selected', async () => {
        if (!onClickedCallback) throw new Error('Callback not captured');
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', editable: false, pageUrl: 'some_url' }; // No selectionText
        await onClickedCallback(mockInfo, undefined);
        expect(mockHandleCurrencyConversionRequest).not.toHaveBeenCalled();
        await vi.waitFor(() => { expect(mockCreateNotification).toHaveBeenCalledTimes(1); });
        expect(mockCreateNotification).toHaveBeenCalledWith(
           expect.stringContaining('zntl-noselection-'),
           expect.objectContaining({ message: expect.stringContaining('Zaznacz tekst') })
       );
    });
}); 