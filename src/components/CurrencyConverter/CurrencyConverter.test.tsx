import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest'; // Import vitest functions explicitly
import '@testing-library/jest-dom/vitest'; // Import vitest extensions for jest-dom

import { CurrencyConverter } from './CurrencyConverter';

// --- Mock chrome.runtime.sendMessage --- //
// Define the mock function first
const mockSendMessageFn = vi.fn();

// Mock the chrome API - this needs to be outside describe typically
vi.mock('../../../chrome', () => { // Adjust path if needed, assuming chrome is available globally
  // This mock might be tricky if chrome isn't treated as a standard module.
  // Alternative: Mock directly on globalThis if needed, but vi.mock is preferred.
  return {
    runtime: {
      sendMessage: mockSendMessageFn
    }
    // Mock other chrome properties if necessary within the test file scope
  };
});

// Now TypeScript should recognize mockSendMessageFn as MockInstance
const mockSendMessage: MockInstance = mockSendMessageFn; 
// -------------------------------------- //

describe('CurrencyConverter Component', () => {
  beforeEach(() => {
    // Reset the local mock
    mockSendMessage.mockReset();
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

    fireEvent.change(input, { target: { value: '150 EUR' } });
    fireEvent.click(convertButton);

    // Check loading state (optional but good)
    expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();

    // Wait for the result to appear
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

    // Check loading state finished
    expect(screen.getByRole('button', { name: /Convert to PLN/i })).toBeEnabled();
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

    fireEvent.change(input, { target: { value: 'only 200' } });
    fireEvent.click(convertButton);

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
    const mockClarifyResponse = {
      success: false,
      error: 'AI parsing failed: Could not determine currency',
      needsClarification: true,
    };
    mockSendMessage.mockResolvedValueOnce(mockClarifyResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    fireEvent.change(input, { target: { value: '100 pesos' } });
    fireEvent.click(convertButton);

    // Wait for clarification input to appear
    await waitFor(() => {
        expect(screen.getByLabelText(/AI couldn't recognize/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g., USD/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

     // Original convert button should be disabled
     expect(convertButton).toBeDisabled();
  });

  it('sends clarification message and displays result after retry', async () => {
    // 1. Initial call leading to clarification
    const mockClarifyResponse = {
      success: false,
      error: 'AI parsing failed: Could not determine currency',
      needsClarification: true,
    };
    mockSendMessage.mockResolvedValueOnce(mockClarifyResponse);

    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    const convertButton = screen.getByRole('button', { name: /Convert to PLN/i });

    fireEvent.change(input, { target: { value: '100 pesos' } });
    fireEvent.click(convertButton);

    // Wait for clarification UI
    const clarificationInput = await screen.findByLabelText(/AI couldn't recognize/i);
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
    // Mock the *second* sendMessage call (for clarification)
    mockSendMessage.mockResolvedValueOnce(mockSuccessAfterClarify);

    fireEvent.change(clarificationInput, { target: { value: 'MXN' } });
    fireEvent.click(retryButton);

    // Check loading state for retry button
    expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();

    // Wait for successful result after clarification
    await waitFor(() => {
        expect(screen.getByText(/100 MXN ≈/i)).toBeInTheDocument();
        expect(screen.getByText(/30.50 PLN/i)).toBeInTheDocument();
        // Ensure clarification input is gone
        expect(screen.queryByLabelText(/AI couldn't recognize/i)).not.toBeInTheDocument();
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
  });

  it('triggers conversion on Enter key press in main input', async () => {
    mockSendMessage.mockResolvedValueOnce({ success: true /* ... other fields */ });
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);

    fireEvent.change(input, { target: { value: '50 GBP' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
        expect(mockSendMessage).toHaveBeenCalledWith({ action: 'parseAndConvertCurrency', text: '50 GBP' });
    });
  });

  it('triggers retry on Enter key press in clarification input', async () => {
    // Setup state to show clarification input
    mockSendMessage.mockResolvedValueOnce({ success: false, needsClarification: true });
    render(<CurrencyConverter />);
    const input = screen.getByPlaceholderText(/e.g., 100 USD/i);
    fireEvent.change(input, { target: { value: '200 something' } });
    fireEvent.click(screen.getByRole('button', { name: /Convert to PLN/i }));

    const clarificationInput = await screen.findByLabelText(/AI couldn't recognize/i);
    fireEvent.change(clarificationInput, { target: { value: 'CAD' } });

    // Mock the response for the retry call
    mockSendMessage.mockResolvedValueOnce({ success: true /* ... */ });

    // Press Enter in clarification input
    fireEvent.keyDown(clarificationInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
        // Should have been called twice: once initial, once for clarification
        expect(mockSendMessage).toHaveBeenCalledTimes(2);
        expect(mockSendMessage).toHaveBeenCalledWith({ action: 'clarifyAndConvertCurrency', originalText: '200 something', clarification: 'CAD' });
    });
  });
}); 