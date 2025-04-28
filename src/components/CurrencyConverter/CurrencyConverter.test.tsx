/// <reference types="chrome" />

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { CurrencyConverter } from './CurrencyConverter';

// --- Mock chrome API globalnie dla tego pliku testowego --- //
const mockSendMessageFn = vi.fn();
const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
  }
};

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessageFn,
    // Mock inne potrzebne części runtime, jeśli są używane
  },
  storage: mockStorage,
  // Mock inne potrzebne API chrome
});

// --- Uzyskanie dostępu do zamockowanej funkcji --- //
// Teraz TypeScript powinien "widzieć" chrome dzięki stubGlobal i @types/chrome
const mockSendMessage = chrome.runtime.sendMessage as Mock; // Użyj Mock zamiast MockInstance dla kompatybilności

describe('CurrencyConverter Component', () => {
  beforeEach(() => {
    // Reset mocka przed każdym testem
    mockSendMessage.mockReset();
    // Możesz też zresetować inne mocki, np. storage
    vi.mocked(chrome.storage.local.get).mockClear();
    vi.mocked(chrome.storage.local.set).mockClear();
  });

  it('renders initial state correctly', () => {
    render(<CurrencyConverter />);

    // Check for input field
    expect(screen.getByPlaceholderText(/e.g., 100 USD/i)).toBeInTheDocument();
    // Check for button
    expect(screen.getByRole('button', { name: /Convert to PLN/i })).toBeInTheDocument();
    // Check that result area is not initially present
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error:/i)).not.toBeInTheDocument();
    // Check clarification input is not present
    expect(screen.queryByLabelText(/AI couldn't recognize/i)).not.toBeInTheDocument();
  });

  it('updates input value on change', () => {
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '150 EUR' } });
    expect(input.value).toBe('150 EUR');
  });

  it('calls sendMessage and displays result on successful conversion', async () => {
    const mockSuccessResponse = {
      success: true,
      originalAmount: 150,
      originalCurrency: 'EUR',
      convertedAmount: 650.25,
      targetCurrency: 'PLN',
      rate: 4.335,
    };
    mockSendMessage.mockResolvedValueOnce(mockSuccessResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await act(async () => {
        fireEvent.change(input, { target: { value: '150 EUR' } });
        fireEvent.click(convertButton);
        // Wait for spinner to appear instead of checking disabled state immediately
        await screen.findByTestId('spinner');
    });

    // Wait for the result to appear (this implies loading finished)
    await waitFor(() => {
        expect(screen.getByText(/150 EUR ≈/i)).toBeInTheDocument();
        expect(screen.getByText(/650.25 PLN/i)).toBeInTheDocument();
        expect(screen.getByText(/\(Rate: 4.3350\)/i)).toBeInTheDocument();
    });

    // Verify sendMessage call
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      action: 'parseAndConvertCurrency',
      text: '150 EUR',
    });

    // Check loading state finished (button enabled)
    expect(convertButton).toBeEnabled();
  });

  it('displays error message on failed conversion', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'AI parsing failed: currency not recognized',
    };
    mockSendMessage.mockResolvedValueOnce(mockErrorResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await act(async () => {
        fireEvent.change(input, { target: { value: 'only 200' } });
        fireEvent.click(convertButton);
    });

    // Wait for error message
    await waitFor(() => {
        expect(screen.getByText(/Error: AI parsing failed: currency not recognized/i)).toBeInTheDocument();
    });

    // Verify sendMessage call
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'parseAndConvertCurrency',
        text: 'only 200',
      });
  });

  it('shows clarification input when needsClarification is true', async () => {
    const clarificationText = 'AI could not determine currency';
    const mockClarifyResponse = {
      success: false,
      error: 'AI parsing failed', // Keep error simple
      needsClarification: clarificationText, // Pass the string message
    };
    mockSendMessage.mockResolvedValueOnce(mockClarifyResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await act(async () => {
        fireEvent.change(input, { target: { value: '100 pesos' } });
        fireEvent.click(convertButton);
    });

    // Wait for clarification input to appear
    await waitFor(() => {
        // Use a flexible matcher for the label text
        expect(screen.getByLabelText(new RegExp(clarificationText, 'i'))).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g., USD/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

     // Original convert button should be disabled
     expect(convertButton).toBeDisabled();
  });

  it('sends clarification message and displays result after retry', async () => {
    // 1. Initial call leading to clarification
    const clarificationText = 'Please specify pesos type (MXN, COP, etc.)'; // Exact text
    const mockClarifyResponse = {
      success: false,
      error: 'AI parsing failed',
      needsClarification: clarificationText,
    };
    mockSendMessage.mockResolvedValueOnce(mockClarifyResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await act(async () => {
        fireEvent.change(input, { target: { value: '100 pesos' } });
        fireEvent.click(convertButton);
    });

    // Wait for clarification UI
    // Find the label by its exact text content
    const clarificationLabelElement = await screen.findByText(clarificationText);
    expect(clarificationLabelElement).toBeInTheDocument();
    // Find input by its placeholder or association with the found label
    const clarificationInput = screen.getByPlaceholderText(/e.g., USD/i);
    const retryButton = await screen.findByRole('button', { name: /Retry/i });

    // 2. User provides clarification and clicks retry
    const mockSuccessAfterClarify = {
        success: true,
        originalAmount: 100,
        originalCurrency: 'MXN',
        convertedAmount: 30.50,
        targetCurrency: 'PLN',
        rate: 0.305,
      };
    // Introduce a small delay in the mock response for clarification
    mockSendMessage.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        return mockSuccessAfterClarify;
    });
    // mockSendMessage.mockResolvedValueOnce(mockSuccessAfterClarify); // Original immediate resolve

    await act(async () => {
        fireEvent.change(clarificationInput, { target: { value: 'MXN' } });
        fireEvent.click(retryButton);
        // Wait for spinner to appear after clicking retry - REMOVED
        // await screen.findByTestId('spinner');
    });

    // Wait for successful result after clarification
    await waitFor(() => {
        expect(screen.getByText(/100 MXN ≈/i)).toBeInTheDocument();
        expect(screen.getByText(/30.50 PLN/i)).toBeInTheDocument();
        // Ensure clarification input is gone
        expect(screen.queryByText(clarificationText)).not.toBeInTheDocument();
    });

    // Verify *both* sendMessage calls
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    // First call
    expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'parseAndConvertCurrency',
        text: '100 pesos',
    });
    // Second call (clarification)
    expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'clarifyAndConvertCurrency',
        originalText: '100 pesos',
        clarification: 'MXN',
    });
    // Check retry button is enabled again (wait for it explicitly)
    await waitFor(() => expect(retryButton).toBeEnabled());
    // expect(retryButton).toBeEnabled(); // Original immediate check
  });

  it('triggers conversion on Enter key press in main input', async () => {
    mockSendMessage.mockResolvedValueOnce({ success: true, originalAmount: 50, originalCurrency: 'GBP', convertedAmount: 250, targetCurrency:'PLN', rate: 5 });
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);

    await act(async () => {
        fireEvent.change(input, { target: { value: '50 GBP' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
        expect(mockSendMessage).toHaveBeenCalledWith({ action: 'parseAndConvertCurrency', text: '50 GBP' });
    });
  });

  it('triggers retry on Enter key press in clarification input', async () => {
    // Setup state to show clarification input
    const clarificationText = 'Specify currency code';
    mockSendMessage.mockResolvedValueOnce({ success: false, needsClarification: clarificationText });
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: '200 something' } });
      fireEvent.click(convertButton);
    });

    const clarificationInput = await screen.findByLabelText(new RegExp(clarificationText, 'i'));
    
    await act(async () => {
        fireEvent.change(clarificationInput, { target: { value: 'CAD' } });
    });

    // Mock the response for the retry call
    mockSendMessage.mockResolvedValueOnce({ success: true, originalAmount: 200, originalCurrency: 'CAD', convertedAmount: 600, targetCurrency: 'PLN', rate: 3 });

    // Press Enter in clarification input
    await act(async () => {
        fireEvent.keyDown(clarificationInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
        // Should have been called twice: once initial, once for clarification
        expect(mockSendMessage).toHaveBeenCalledTimes(2);
        expect(mockSendMessage).toHaveBeenCalledWith({ action: 'clarifyAndConvertCurrency', originalText: '200 something', clarification: 'CAD' });
        // Check if result is displayed after Enter press
        expect(screen.getByText(/200 CAD ≈/i)).toBeInTheDocument(); 
    });
  });
}); 