/// <reference types="chrome" />

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';


import { CurrencyConverter } from './CurrencyConverter';

// Remove import - rely on global chrome mocked by setupTests.ts
// import { chrome } from 'vitest-chrome';

describe('CurrencyConverter Component', () => {
  beforeEach(() => {
    // Reset mocks on the *global* chrome object
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockClear();
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockClear().mockResolvedValue({}); 
    (chrome.storage.sync.set as ReturnType<typeof vi.fn>).mockClear();
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockClear(); 
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockClear(); 
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

  it('renders initial state correctly with target currency select', () => {
    render(<CurrencyConverter />);
    // Check for target currency select (defaulting to PLN)
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // MUI Select renders as combobox
    // Check the displayed text content instead of value for MUI Select
    expect(screen.getByRole('combobox')).toHaveTextContent('PLN');
  });

  it('updates input value on change', async () => {
    // Initialize userEvent
    const user = userEvent.setup();
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i) as HTMLInputElement;

    // Clear before typing
    await user.clear(input);
    await user.type(input, '150 EUR');
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
    // Mock the global chrome object
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSuccessResponse);

    // Initialize userEvent
    const user = userEvent.setup();

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    // Perform actions using userEvent - no explicit act needed here
    await user.clear(input); // Clear before typing
    await user.type(input, '150 EUR');
    await user.click(convertButton);

    // Wait for the result to appear (implies loading finished)
    await waitFor(() => {
        expect(screen.getByText(/150 EUR ≈/i)).toBeInTheDocument();
        expect(screen.getByText(/650.25 PLN/i)).toBeInTheDocument();
        expect(screen.getByText(/\(Rate: 4.3350\)/i)).toBeInTheDocument();
    });

    // Verify sendMessage call on global chrome mock
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    // Add targetCurrency to the expected message
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'parseAndConvertCurrency',
      text: '150 EUR',
      targetCurrency: 'PLN', // Add default target currency
    });

    // Check loading state finished (button enabled)
    expect(convertButton).toBeEnabled();
  });

  it('displays error message on failed conversion', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'AI parsing failed: currency not recognized',
    };
    // Mock the global chrome object
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockErrorResponse);

    // Initialize userEvent
    const user = userEvent.setup();

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    // Perform actions using userEvent - no explicit act needed here
    await user.clear(input); // Clear before typing
    await user.type(input, 'only 200');
    await user.click(convertButton);

    // Wait for error message
    await waitFor(() => {
        expect(screen.getByText(/Error: AI parsing failed: currency not recognized/i)).toBeInTheDocument();
    });

    // Verify sendMessage call on global chrome mock
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    // Add targetCurrency to the expected message
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'parseAndConvertCurrency',
        text: 'only 200',
        targetCurrency: 'PLN', // Add default target currency
      });
  });

  it('shows clarification input when needsClarification is true', async () => {
    const clarificationText = 'AI could not determine currency';
    const mockClarifyResponse = {
      success: false,
      error: 'AI parsing failed', // Keep error simple
      needsClarification: clarificationText, // Pass the string message
    };
    // Mock the global chrome object
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockClarifyResponse);

    // Initialize userEvent
    const user = userEvent.setup();

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    // Perform actions using userEvent - no explicit act needed here
    await user.clear(input); // Clear before typing
    await user.type(input, '100 pesos');
    await user.click(convertButton);

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
    const mockSuccessAfterClarify = {
        success: true,
        originalAmount: 100,
        originalCurrency: 'MXN',
        convertedAmount: 30.50,
        targetCurrency: 'PLN',
        rate: 0.305,
      };

    // Mock the global chrome object
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockClarifyResponse) // First call
        .mockImplementationOnce(async () => { // Second call (clarification)
            await new Promise(resolve => setTimeout(resolve, 10)); 
            return mockSuccessAfterClarify;
        });

    // Initialize userEvent
    const user = userEvent.setup();

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    // Perform initial actions using userEvent
    await user.clear(input); // Clear before typing
    await user.type(input, '100 pesos');
    await user.click(convertButton);

    // Wait for clarification UI
    // Find the label by its exact text content
    const clarificationLabelElement = await screen.findByText(clarificationText);
    expect(clarificationLabelElement).toBeInTheDocument();
    // Find input by its placeholder or association with the found label
    const clarificationInput = screen.getByPlaceholderText(/e.g., USD/i);
    const retryButton = await screen.findByRole('button', { name: /Retry/i });

    // 2. User provides clarification and clicks retry
    await user.clear(clarificationInput); // Clear before typing
    await user.type(clarificationInput, 'MXN');
    await user.click(retryButton);

    // Wait for successful result after clarification
    await waitFor(() => {
        expect(screen.getByText(/100 MXN ≈/i)).toBeInTheDocument();
        expect(screen.getByText(/30.50 PLN/i)).toBeInTheDocument();
        // Ensure clarification input is gone
        expect(screen.queryByText(clarificationText)).not.toBeInTheDocument();
    });

    // Verify calls directly on global chrome mock
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    // First call - add targetCurrency
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'parseAndConvertCurrency',
        text: '100 pesos',
        targetCurrency: 'PLN', // Add default target currency
    });
    // Second call (clarification) - remains the same
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'clarifyAndConvertCurrency',
        originalText: '100 pesos',
        clarification: 'MXN',
    });
    // Check retry button is enabled again (wait for it explicitly)
    await waitFor(() => expect(retryButton).toBeEnabled());
  });

  it('triggers conversion on Enter key press in main input', async () => {
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true, originalAmount: 50, originalCurrency: 'GBP', convertedAmount: 250, targetCurrency:'PLN', rate: 5 });
    
    // Initialize userEvent
    const user = userEvent.setup();

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);

    // Perform actions using userEvent
    await user.clear(input); // Clear before typing
    await user.type(input, '50 GBP{enter}'); // Simulate typing and pressing Enter

    await waitFor(() => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
        // Add targetCurrency to the expected message
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
            action: 'parseAndConvertCurrency', 
            text: '50 GBP',
            targetCurrency: 'PLN' // Add default target currency
        });
    });
  });

  it('triggers retry on Enter key press in clarification input', async () => {
    // Setup state to show clarification input
    const clarificationText = 'Specify currency code';
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: false, needsClarification: clarificationText });
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    await userEvent.clear(input); // Clear before typing
    await userEvent.type(input, '200 something');
    await userEvent.click(convertButton);

    const clarificationInput = await screen.findByLabelText(new RegExp(clarificationText, 'i'));
    
    await userEvent.clear(clarificationInput); // Clear before typing
    await userEvent.type(clarificationInput, 'CAD');

    // Mock the response for the retry call
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true, originalAmount: 200, originalCurrency: 'CAD', convertedAmount: 600, targetCurrency: 'PLN', rate: 3 });

    // Press Enter in clarification input
    await userEvent.type(clarificationInput, '{enter}');

    await waitFor(() => {
        // Should have been called twice: once initial, once for clarification
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'clarifyAndConvertCurrency', originalText: '200 something', clarification: 'CAD' });
        // Check if result is displayed after Enter press
        expect(screen.getByText(/200 CAD ≈/i)).toBeInTheDocument(); 
    });
  });

  it('loads default target currency from storage on mount', async () => {
    // Arrange: Use mockImplementationOnce to control the callback value
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementationOnce((keys, callback) => {
      // Simulate async callback with the desired data
      if (callback) {
        setTimeout(() => callback({ targetCurrency: 'EUR' }), 0); 
      }
      // Return a promise (can resolve with anything, as component uses callback)
      return Promise.resolve({ targetCurrency: 'EUR' }); 
    });

    // Act
    render(<CurrencyConverter />);

    // Assert: Wait specifically for the combobox text to update
    const comboBox = await screen.findByRole('combobox');
    await waitFor(() => expect(comboBox).toHaveTextContent('EUR')); 
    expect(await screen.findByRole('button', { name: /Convert to EUR/i })).toBeInTheDocument();
    
    // Verify call on global chrome mock with the correct key
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['targetCurrency'], expect.any(Function)); // Check key and that callback was passed
  });

  it('saves selected target currency to storage on change', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<CurrencyConverter />);
    const select = screen.getByRole('combobox');
    
    // Verify initial state (PLN) using text content and clear mocks for set
    expect(select).toHaveTextContent('PLN'); 
    // Clear the global mock
    (chrome.storage.sync.set as ReturnType<typeof vi.fn>).mockClear();

    // Act: Change the selection using userEvent
    await user.click(select);
    // Wait for the dropdown menu to appear and click the 'GBP' option
    const optionGBP = await screen.findByRole('option', { name: /GBP/i });
    await user.click(optionGBP);

    // Assert
    await waitFor(() => {
        // Check text content again
        expect(select).toHaveTextContent('GBP'); 
        expect(screen.getByRole('button', { name: /Convert to GBP/i })).toBeInTheDocument();
    });

    // Verify call on global mock
    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    // Correct the key to 'targetCurrency' and expect a callback function
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ targetCurrency: 'GBP' }, expect.any(Function)); 
  });

  it('sends correct target currency in message on convert click', async () => {
    const user = userEvent.setup();
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to/i }); // More generic name
    const select = screen.getByRole('combobox');

    // Change target currency to USD
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'USD' }));

    // Mock response for the conversion call
    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true, convertedAmount: 55 });

    // Perform conversion
    await user.clear(input);
    await user.type(input, '50 EUR');
    await user.click(convertButton);

    // Verify sendMessage call includes the selected target currency
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'parseAndConvertCurrency',
        text: '50 EUR',
        targetCurrency: 'USD', // Check for selected currency
    });
  });
});
