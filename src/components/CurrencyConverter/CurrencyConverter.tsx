// src/components/CurrencyConverter/CurrencyConverter.tsx

import React, { useState, useCallback } from 'react';
import { ConversionResult } from '../../interfaces'; // Import the interface

export const CurrencyConverter: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  // State for clarification UI
  const [showClarificationInput, setShowClarificationInput] = useState<boolean>(false);
  const [clarificationValue, setClarificationValue] = useState<string>('');

  const resetState = () => {
    setIsLoading(false);
    setResult(null);
    setShowClarificationInput(false);
    setClarificationValue('');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    resetState(); // Reset everything on new input
  };

  const handleClarificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClarificationValue(event.target.value);
  };

  // Handles the initial conversion request
  const handleConvertClick = useCallback(async () => {
    if (!inputValue.trim()) {
      setResult({ success: false, error: 'Please enter a value to convert.' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setShowClarificationInput(false);
    setClarificationValue('');

    try {
      console.log('Sending message to background:', { action: 'parseAndConvertCurrency', text: inputValue });
      const response: ConversionResult = await chrome.runtime.sendMessage({
        action: 'parseAndConvertCurrency',
        text: inputValue,
      });
      console.log('Received response from background:', response);
      setResult(response);
      // Show clarification input if needed
      if (!response.success && response.needsClarification) {
        setShowClarificationInput(true);
      }
    } catch (error) {
      console.error('Error sending message to background or receiving response:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Communication error with background script.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue]);

  // Handles submitting the clarification
  const handleClarificationSubmit = useCallback(async () => {
      if (!clarificationValue.trim()) {
        // Optionally show an error message here
        return;
      }
      setIsLoading(true);
      // Keep previous error message visible while clarifying
      // setResult(null);
      setShowClarificationInput(false); // Hide clarification input while processing

      try {
        console.log('Sending clarification message:', { action: 'clarifyAndConvertCurrency', originalText: inputValue, clarification: clarificationValue });
        // Send a different message type for clarification
        const response: ConversionResult = await chrome.runtime.sendMessage({
          action: 'clarifyAndConvertCurrency',
          originalText: inputValue, // Send original text again
          clarification: clarificationValue // Send user's clarification
        });
        console.log('Received response after clarification:', response);
        setResult(response);
        // Reset clarification input value after successful submission
        if (response.success) {
             setClarificationValue('');
        } else if (response.needsClarification) {
            // If it still needs clarification, show input again
            setShowClarificationInput(true);
        }
      } catch (error) {
        console.error('Error sending clarification message:', error);
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Communication error during clarification.',
        });
      } finally {
        setIsLoading(false);
      }

  }, [inputValue, clarificationValue]);

  // Allow pressing Enter in the main input field
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConvertClick();
    }
  };

  // Allow pressing Enter in the clarification input field
  const handleClarificationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleClarificationSubmit();
      }
  };

  return (
    <div style={{ padding: '10px', borderTop: '1px solid #ccc', marginTop: '10px' }}>
      <h4>Currency Converter</h4>
      {/* Main Input */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 100 USD, €50.99, 3.5M IDR"
          disabled={isLoading}
          style={{ flexGrow: 1, padding: '5px' }}
        />
        <button onClick={handleConvertClick} disabled={isLoading || showClarificationInput}>
          {isLoading ? 'Processing...' : 'Convert to PLN'}
        </button>
      </div>

      {/* Result Display */}
      {result && !showClarificationInput && (
         <div style={{ marginTop: '10px', padding: '8px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: result.success ? '#e8f5e9' : '#ffebee' }}>
          {result.success ? (
             <p style={{ margin: 0 }}>
              {result.originalAmount} {result.originalCurrency} ≈
              <strong>{result.convertedAmount?.toFixed(2)} {result.targetCurrency}</strong>
              <span style={{ fontSize: '0.8em', color: '#555' }}> (Rate: {result.rate?.toFixed(4)})</span>
            </p>
          ) : (
            <p style={{ margin: 0, color: '#c62828' }}>
              Error: {result.error}
            </p>
          )}
        </div>
      )}

      {/* Clarification Input Area */}
      {showClarificationInput && (
          <div style={{ marginTop: '5px', border: '1px dashed #ffcc80', padding: '8px', backgroundColor: '#fff9c4' }}>
              <label htmlFor="clarificationInput" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#777' }}>
                 AI couldn&apos;t recognize the currency. Please provide the ISO code (e.g., USD, EUR):
              </label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                    id="clarificationInput"
                    type="text"
                    value={clarificationValue}
                    onChange={handleClarificationChange}
                    onKeyDown={handleClarificationKeyDown}
                    placeholder="e.g., USD"
                    disabled={isLoading}
                    maxLength={3}
                    style={{ flexGrow: 1, padding: '5px' }}
                />
                <button onClick={handleClarificationSubmit} disabled={isLoading || !clarificationValue.trim()}>
                    {isLoading ? 'Processing...' : 'Retry'}
                </button>
             </div>
          </div>
      )}
    </div>
  );
}; 