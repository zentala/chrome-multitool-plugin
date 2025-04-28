// src/components/CurrencyConverter/CurrencyConverter.tsx

import React, { useState, useCallback } from 'react';
import { ConversionResult } from '../../interfaces'; // Import the interface
import styles from './CurrencyConverter.module.css'; // Import CSS module

export const CurrencyConverter: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClarifying, setIsClarifying] = useState<boolean>(false); // Separate loading state for clarification
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [showClarificationInput, setShowClarificationInput] = useState<boolean>(false);
  const [clarificationValue, setClarificationValue] = useState<string>('');

  const resetState = (keepInput = false) => {
    setIsLoading(false);
    setIsClarifying(false);
    setResult(null);
    setShowClarificationInput(false);
    setClarificationValue('');
    if (!keepInput) {
      setInputValue('');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    resetState(true); // Reset results/clarification but keep input
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
      // Show clarification input if needed - check specific property from new interface
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
      setIsClarifying(true); // Use separate loading state
      setIsLoading(true); // Also set general loading to disable main button
      // Keep previous error message visible while clarifying
      setShowClarificationInput(false); // Hide clarification input while processing

      try {
        console.log('Sending clarification message:', { action: 'clarifyAndConvertCurrency', originalText: inputValue, clarification: clarificationValue });
        const response: ConversionResult = await chrome.runtime.sendMessage({
          action: 'clarifyAndConvertCurrency',
          originalText: inputValue, // Send original text again
          clarification: clarificationValue // Send user's clarification
        });
        console.log('Received response after clarification:', response);
        setResult(response);

        if (response.success) {
             setClarificationValue(''); // Clear clarification input on success
             // Optionally reset main input too?
             // setInputValue(''); 
        } else if (response.needsClarification) {
            // If it still needs clarification, show input again
            setShowClarificationInput(true);
        } else {
             // If it failed for another reason after clarification, keep input shown but clear clarification
             setShowClarificationInput(false);
             setClarificationValue(''); 
        }

      } catch (error) {
        console.error('Error sending clarification message:', error);
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Communication error during clarification.',
        });
        setShowClarificationInput(false); // Hide input on error
        setClarificationValue('');
      } finally {
        setIsLoading(false);
        setIsClarifying(false);
      }

  }, [inputValue, clarificationValue]);

  // Allow pressing Enter in the main input field
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading && !showClarificationInput) {
      handleConvertClick();
    }
  };

  // Allow pressing Enter in the clarification input field
  const handleClarificationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !isClarifying) {
        handleClarificationSubmit();
      }
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Currency Converter</h4>
      {/* Main Input */}
      <div className={styles.inputRow}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 100 USD, €50.99, 3.5M IDR"
          disabled={isLoading || isClarifying} // Disable if any loading
          className={styles.inputField}
        />
        <button onClick={handleConvertClick} disabled={isLoading || isClarifying || showClarificationInput} className={styles.button}>
          {isLoading && !isClarifying ? <span className={styles.spinner}></span> : 'Convert to PLN'}
        </button>
      </div>

      {/* Result Display */}
      {result && !showClarificationInput && (
         <div className={`${styles.resultArea} ${result.success ? styles.resultSuccess : styles.resultError}`}>
          {result.success ? (
             <p className={styles.resultText}>
              {result.originalAmount} {result.originalCurrency} ≈
              <strong> {result.convertedAmount?.toFixed(2)} {result.targetCurrency}</strong>
              <span className={styles.rateText}>(Rate: {result.rate?.toFixed(4)})</span>
            </p>
          ) : (
            <p className={styles.resultText}>
              Error: {result.error}
            </p>
          )}
        </div>
      )}

      {/* Clarification Input Area */}
      {showClarificationInput && (
          <div className={styles.clarificationArea}>
              <label htmlFor="clarificationInput" className={styles.clarificationLabel}>
                 {/* Make message dynamic based on result.needsClarification string if available */}
                 {result?.needsClarification || "AI needs clarification. Please provide the currency code (e.g., USD, EUR):"}
              </label>
              <div className={styles.inputRow}> {/* Reuse inputRow style */}
                <input
                    id="clarificationInput"
                    type="text"
                    value={clarificationValue}
                    onChange={handleClarificationChange}
                    onKeyDown={handleClarificationKeyDown}
                    placeholder="e.g., USD"
                    disabled={isLoading || isClarifying}
                    maxLength={3} // Keep max length for ISO codes
                    className={styles.inputField}
                    autoFocus // Focus clarification input when it appears
                />
                <button onClick={handleClarificationSubmit} disabled={isLoading || isClarifying || !clarificationValue.trim()} className={styles.button}>
                    {isClarifying ? <span className={styles.spinner}></span> : 'Retry'}
                </button>
             </div>
          </div>
      )}
    </div>
  );
}; 