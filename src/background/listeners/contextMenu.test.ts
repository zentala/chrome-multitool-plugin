import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { ConversionResult } from '../../interfaces';

// Mock the core logic function
import { handleCurrencyConversionRequest } from '../index'; 
vi.mock('../index', () => ({
  handleCurrencyConversionRequest: vi.fn(),
}));

// Import the function being tested
import { setupContextMenuOnClickListener } from '../listeners';

// Remove import - rely on global chrome mocked by setupTests.ts
// import { chrome } from 'vitest-chrome';

// --- Get Typed Mock Function --- //
const mockHandleCurrencyConversionRequest = handleCurrencyConversionRequest as Mock;

describe('Context Menu Listener Tests', () => {
    let onClickedCallback: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset mocks on the global chrome object
        (chrome.contextMenus.create as ReturnType<typeof vi.fn>).mockClear();
        (chrome.contextMenus.remove as ReturnType<typeof vi.fn>).mockClear();
        (chrome.notifications.create as ReturnType<typeof vi.fn>).mockClear();
        // Use vi.mocked() for the event listener
        vi.mocked(chrome.contextMenus.onClicked.addListener).mockClear();
        // Use type assertion for storage.sync.get - no longer needs @ts-expect-error
        (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockClear().mockResolvedValue({}); 

        // Setup listener and capture callback
        setupContextMenuOnClickListener(); 
        // Use vi.mocked() to access mock properties safely
        if (vi.mocked(chrome.contextMenus.onClicked.addListener).mock.calls.length > 0) {
            onClickedCallback = vi.mocked(chrome.contextMenus.onClicked.addListener).mock.calls[0][0];
        } else {
            console.error('Context menu listener was not added in beforeEach');
            onClickedCallback = undefined; 
        }
    });

    it('should add onClicked listener during setup', () => {
        // Use vi.mocked() for assertion
        expect(vi.mocked(chrome.contextMenus.onClicked.addListener)).toHaveBeenCalledTimes(1);
        expect(typeof vi.mocked(chrome.contextMenus.onClicked.addListener).mock.calls[0][0]).toBe('function');
    });

    it('should call handleCurrencyConversionRequest and show success notification on valid click', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = '50 USD';
       const mockResult: ConversionResult = { success: true, originalAmount: 50, originalCurrency: 'USD', convertedAmount: 200.00, targetCurrency: 'PLN', rate: 4.0 };
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);
       
       await onClickedCallback(mockInfo, undefined);
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText, 'PLN');
       await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
       expect(chrome.notifications.create).toHaveBeenCalledWith(
           expect.stringContaining('zntl-conversion-'), 
           expect.objectContaining({ message: `${selectionText} = 200.00 PLN` })
       );
    });

    it('should call handleCurrencyConversionRequest and show error notification on failed conversion', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = 'invalid text';
       const mockResult: ConversionResult = { success: false, error: 'Parsing failed badly' };
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);

       await onClickedCallback(mockInfo, undefined);
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText, 'PLN');
       await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
       expect(chrome.notifications.create).toHaveBeenCalledWith(
           expect.stringContaining('zntl-error-'),
           expect.objectContaining({ message: mockResult.error })
       );
    });

     it('should show generic error notification if handleCurrencyConversionRequest throws', async () => {
       if (!onClickedCallback) throw new Error('Callback not captured');
       const selectionText = 'trigger throw';
       const thrownError = new Error('Unexpected core logic failure');
       const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText: selectionText, editable: false, pageUrl: 'some_url' };
       
       mockHandleCurrencyConversionRequest.mockRejectedValue(thrownError);

       const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

       try {
            await onClickedCallback(mockInfo, undefined);
       } catch (e) {
            console.warn('Error propagated to test scope:', e);
       }
       
       expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText, 'PLN');
       await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
       expect(chrome.notifications.create).toHaveBeenCalledWith(
           expect.stringContaining('zntl-generic-error-'),
           expect.objectContaining({ title: 'Błąd Rozszerzenia ZNTL', message: 'Wystąpił nieoczekiwany błąd.' })
       );

       consoleErrorSpy.mockRestore();
    });

    it('should not call handleCurrencyConversionRequest if wrong menu item ID', async () => {
        if (!onClickedCallback) throw new Error('Callback not captured');
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'WRONG_ID', selectionText: '100 EUR', editable: false, pageUrl: 'some_url' };
        await onClickedCallback(mockInfo, undefined);
        expect(mockHandleCurrencyConversionRequest).not.toHaveBeenCalled();
        expect(chrome.notifications.create).not.toHaveBeenCalled();
    });

    it('should show specific notification if no text selected', async () => {
        if (!onClickedCallback) throw new Error('Callback not captured');
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', editable: false, pageUrl: 'some_url' }; 
        await onClickedCallback(mockInfo, undefined);
        expect(mockHandleCurrencyConversionRequest).not.toHaveBeenCalled();
        await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
        expect(chrome.notifications.create).toHaveBeenCalledWith(
           expect.stringContaining('zntl-noselection-'),
           expect.objectContaining({ message: expect.stringContaining('Zaznacz tekst') })
       );
    });

    it('should use default target currency (PLN) when none is saved', async () => {
        if (!onClickedCallback) throw new Error('Callback not captured');
        const selectionText = '50 USD';
        const mockResult: ConversionResult = { success: true, originalAmount: 50, originalCurrency: 'USD', convertedAmount: 200.00, targetCurrency: 'PLN', rate: 4.0 };
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText, editable: false, pageUrl: 'some_url' };
        
        mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);
        
        await onClickedCallback(mockInfo, undefined);
        
        expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText, 'PLN');
        await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.stringContaining('zntl-conversion-'), 
            expect.objectContaining({ message: `${selectionText} = 200.00 PLN` })
        );
        expect(chrome.storage.sync.get).toHaveBeenCalledWith('targetCurrency');
    });

    it('should use saved target currency from storage', async () => {
        // Mock global chrome.storage.sync.get using type assertion
        (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ targetCurrency: 'EUR' });

        if (!onClickedCallback) throw new Error('Callback not captured');
        const selectionText = '100 CAD';
        const mockResult: ConversionResult = { success: true, originalAmount: 100, originalCurrency: 'CAD', convertedAmount: 70.00, targetCurrency: 'EUR', rate: 0.7 };
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText, editable: false, pageUrl: 'some_url' };

        mockHandleCurrencyConversionRequest.mockResolvedValue(mockResult);

        await onClickedCallback(mockInfo, undefined);

        expect(chrome.storage.sync.get).toHaveBeenCalledWith('targetCurrency');
        expect(mockHandleCurrencyConversionRequest).toHaveBeenCalledWith(selectionText, 'EUR');
        await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.stringContaining('zntl-conversion-'), 
            expect.objectContaining({ message: `${selectionText} = 70.00 EUR` })
        );
    });

    it('should show generic error if storage.sync.get rejects', async () => {
        // Mock global chrome.storage.sync.get using type assertion
        const storageError = new Error('Storage failed');
        (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockRejectedValue(storageError);

        if (!onClickedCallback) throw new Error('Callback not captured');
        const selectionText = '100 USD';
        const mockInfo: chrome.contextMenus.OnClickData = { menuItemId: 'ZNTL_CONVERT_CURRENCY', selectionText, editable: false, pageUrl: 'some_url' };
        
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await onClickedCallback(mockInfo, undefined);
        
        expect(mockHandleCurrencyConversionRequest).not.toHaveBeenCalled(); 
        await vi.waitFor(() => { expect(chrome.notifications.create).toHaveBeenCalledTimes(1); });
        expect(chrome.notifications.create).toHaveBeenCalledWith(
           expect.stringContaining('zntl-generic-error-'),
           expect.objectContaining({ title: 'Błąd Rozszerzenia ZNTL', message: 'Wystąpił nieoczekiwany błąd.' })
       );
       expect(consoleErrorSpy).toHaveBeenCalledWith('Context Menu: Error reading target currency from storage:', storageError);

       consoleErrorSpy.mockRestore();
    });
}); 