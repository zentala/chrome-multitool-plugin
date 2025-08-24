/**
 * Currency Context Menu Enhancement Component
 * Provides enhanced context menu functionality for currency conversion
 */

// Purpose: This component enhances the context menu functionality by providing
// an input dialog for manual currency entry and better integration with web pages

import React, { useState, useEffect } from 'react';
import { ConversionResult } from '../../interfaces/ConversionResult';
import { settingsService } from '../../services/settings.service';

interface CurrencyContextMenuProps {
  selectedText?: string;
  onClose?: () => void;
  onConvert?: (result: ConversionResult) => void;
}

/**
 * Enhanced context menu component for currency conversion
 */
const CurrencyContextMenu: React.FC<CurrencyContextMenuProps> = ({
  selectedText = '',
  onClose,
  onConvert
}) => {
  const [inputValue, setInputValue] = useState(selectedText);
  const [targetCurrency, setTargetCurrency] = useState('PLN');
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationValue, setClarificationValue] = useState('');

  // Supported currencies
  const supportedCurrencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'];

  // Load default target currency on mount
  useEffect(() => {
    const loadDefaultCurrency = async () => {
      try {
        const savedCurrency = await settingsService.getSetting('defaultTargetCurrency');
        if (savedCurrency) {
          setTargetCurrency(savedCurrency);
        }
      } catch (error) {
        console.error('Error loading default currency:', error);
      }
    };
    loadDefaultCurrency();
  }, []);

  // Handle conversion
  const handleConvert = async () => {
    if (!inputValue.trim()) {
      alert('Please enter a currency amount to convert.');
      return;
    }

    try {
      setIsConverting(true);
      setResult(null);
      setShowClarification(false);

      const response: ConversionResult = await chrome.runtime.sendMessage({
        action: 'parseAndConvertCurrency',
        text: inputValue,
        targetCurrency: targetCurrency,
      });

      setResult(response);

      if (response.success) {
        // Notify parent component
        if (onConvert) {
          onConvert(response);
        }
      } else if (response.needsClarification) {
        setShowClarification(true);
      }
    } catch (error) {
      console.error('Error converting currency:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Handle clarification submission
  const handleClarificationSubmit = async () => {
    if (!clarificationValue.trim()) {
      return;
    }

    try {
      setIsConverting(true);

      const response: ConversionResult = await chrome.runtime.sendMessage({
        action: 'clarifyAndConvertCurrency',
        originalText: inputValue,
        clarification: clarificationValue
      });

      setResult(response);
      setShowClarification(false);

      if (response.success && onConvert) {
        onConvert(response);
      }
    } catch (error) {
      console.error('Error with clarification:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Clarification failed',
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showClarification) {
        handleClarificationSubmit();
      } else {
        handleConvert();
      }
    } else if (e.key === 'Escape') {
      if (onClose) onClose();
    }
  };

  return (
    <div className="currency-context-menu-overlay" onClick={onClose}>
      <div className="currency-context-menu" onClick={(e) => e.stopPropagation()}>
        <div className="currency-context-header">
          <h3>💱 Currency Converter</h3>
          <button
            className="close-button"
            onClick={onClose}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        <div className="currency-context-content">
          {!showClarification ? (
            <>
              <div className="input-group">
                <label htmlFor="currency-input">Convert:</label>
                <input
                  id="currency-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 100 USD, €50.99, 3.5M IDR"
                  autoFocus={!selectedText}
                />
              </div>

              <div className="input-group">
                <label htmlFor="target-currency">To:</label>
                <select
                  id="target-currency"
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                >
                  {supportedCurrencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>

              <div className="button-group">
                <button
                  className="convert-button"
                  onClick={handleConvert}
                  disabled={isConverting || !inputValue.trim()}
                >
                  {isConverting ? 'Converting...' : `Convert to ${targetCurrency}`}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="clarification-group">
                <label htmlFor="clarification-input">
                  {result?.clarificationQuestion || "Please specify the currency code:"}
                </label>
                <input
                  id="clarification-input"
                  type="text"
                  value={clarificationValue}
                  onChange={(e) => setClarificationValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., USD"
                  maxLength={3}
                  autoFocus
                />
              </div>

              <div className="button-group">
                <button
                  className="clarify-button"
                  onClick={handleClarificationSubmit}
                  disabled={isConverting || !clarificationValue.trim()}
                >
                  {isConverting ? 'Processing...' : 'Submit'}
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowClarification(false)}
                  disabled={isConverting}
                >
                  Back
                </button>
              </div>
            </>
          )}

          {result && (
            <div className={`result-area ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <div className="success-result">
                  <p className="result-text">
                    {result.originalAmount} {result.originalCurrency} =
                  </p>
                  <p className="result-amount">
                    <strong>{result.convertedAmount?.toFixed(2)} {result.targetCurrency}</strong>
                  </p>
                  {result.rate && (
                    <p className="result-rate">
                      Rate: {result.rate.toFixed(4)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="error-text">{result.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="currency-context-footer">
          <small>
            Press Enter to convert, Esc to close.
            {selectedText && (
              <span className="selected-text-hint">
                Selected: &ldquo;{selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText}&rdquo;
              </span>
            )}
          </small>
        </div>
      </div>
    </div>
  );
};

export default CurrencyContextMenu;
