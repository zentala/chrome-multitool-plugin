/**
 * Currency Converter Settings Component
 * Configuration panel for currency conversion features
 */

// Purpose: This component provides settings for the currency converter module,
// including AI provider selection, target currency preferences, and feature toggles

import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settings.service';
import { AISettings } from '../../interfaces/YouTubeCaptionData';

interface CurrencyConverterSettingsData {
  aiSettings: AISettings;
  defaultTargetCurrency: string;
  autoClarify: boolean;
}

interface CurrencyConverterSettingsProps {
  onSettingsChange?: (settings: CurrencyConverterSettingsData) => void;
}

/**
 * Settings component for Currency Converter module
 */
const CurrencyConverterSettings: React.FC<CurrencyConverterSettingsProps> = ({ onSettingsChange }) => {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-pro',
    temperature: 0.7
  });
  const [defaultTargetCurrency, setDefaultTargetCurrency] = useState('PLN');
  const [autoClarify, setAutoClarify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  // Supported currencies
  const supportedCurrencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY'];

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load AI settings
        const currentAISettings = await settingsService.getAISettings();
        setAiSettings(currentAISettings);

        // Load currency converter specific settings
        const savedTargetCurrency = await settingsService.getSetting('defaultTargetCurrency');
        if (savedTargetCurrency) {
          setDefaultTargetCurrency(savedTargetCurrency);
        }

        const autoClarifySetting = await settingsService.getSetting('autoClarify');
        if (autoClarifySetting !== null) {
          setAutoClarify(autoClarifySetting === 'true');
        }
      } catch (error) {
        console.error('Error loading currency converter settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Handle input changes
  const handleInputChange = (field: keyof AISettings, value: string | number) => {
    setAiSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setConnectionStatus('unknown'); // Reset connection status when settings change
  };

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    setDefaultTargetCurrency(currency);
  };

  // Save all settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Save AI settings
      await settingsService.saveAISettings(aiSettings);

      // Save currency converter specific settings
      await settingsService.saveSetting('defaultTargetCurrency', defaultTargetCurrency);
      await settingsService.saveSetting('autoClarify', autoClarify.toString());

      // Update context menu title if target currency changed
      await updateContextMenuTitle();

      // Notify parent component if callback provided
      if (onSettingsChange) {
        onSettingsChange({
          aiSettings,
          defaultTargetCurrency,
          autoClarify
        });
      }

      alert('Currency converter settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Test AI connection
  const handleTestConnection = async () => {
    if (!aiSettings.apiKey) {
      alert('Please enter an API key first.');
      return;
    }

    try {
      setTestingConnection(true);
      // For now, just simulate a connection test
      // In a real implementation, this would test the AI service
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionStatus('success');
      alert('Connection successful!');
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
      alert('Connection failed. Please check your API key and settings.');
    } finally {
      setTestingConnection(false);
    }
  };

  // Update context menu title
  const updateContextMenuTitle = async () => {
    try {
      // Send message to background script to update context menu
      chrome.runtime.sendMessage({
        action: 'updateContextMenu',
        targetCurrency: defaultTargetCurrency
      });
    } catch (error) {
      console.error('Error updating context menu:', error);
    }
  };

  // Get available models based on provider
  const getAvailableModels = () => {
    switch (aiSettings.provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
      case 'claude':
        return ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'];
      case 'gemini':
        return ['gemini-pro', 'gemini-pro-vision'];
      case 'grok':
        return ['grok-1'];
      default:
        return [];
    }
  };

  return (
    <div className="currency-converter-settings">
      <h3>Currency Converter Settings</h3>

      <div className="settings-section">
        <h4>AI Provider Configuration</h4>

        <div className="setting-group">
          <label htmlFor="ai-provider">AI Provider:</label>
          <select
            id="ai-provider"
            value={aiSettings.provider}
            onChange={(e) => handleInputChange('provider', e.target.value)}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Anthropic Claude</option>
            <option value="grok">xAI Grok</option>
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="api-key">API Key:</label>
          <input
            id="api-key"
            type="password"
            value={aiSettings.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder={`Enter your ${aiSettings.provider} API key`}
          />
        </div>

        <div className="setting-group">
          <label htmlFor="ai-model">Model:</label>
          <select
            id="ai-model"
            value={aiSettings.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
          >
            {getAvailableModels().map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="temperature">Temperature: {aiSettings.temperature}</label>
          <input
            id="temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={aiSettings.temperature}
            onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
          />
          <div className="temperature-hint">
            <small>Lower values = more focused, Higher values = more creative</small>
          </div>
        </div>

        <div className="settings-actions">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection || !aiSettings.apiKey}
            className="test-connection-btn"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {connectionStatus !== 'unknown' && (
          <div className={`connection-status ${connectionStatus}`}>
            Connection: {connectionStatus === 'success' ? '✓ Success' : '✗ Failed'}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h4>Currency Converter Preferences</h4>

        <div className="setting-group">
          <label htmlFor="default-currency">Default Target Currency:</label>
          <select
            id="default-currency"
            value={defaultTargetCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
          >
            {supportedCurrencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={autoClarify}
              onChange={(e) => setAutoClarify(e.target.checked)}
            />
            Automatically request clarification for ambiguous amounts
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={true}
              // TODO: Add context menu toggle setting
            />
            Enable context menu for currency conversion
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={false}
              // TODO: Add notification setting
            />
            Show conversion results in notifications
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h4>Context Menu Enhancement</h4>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={true}
              // TODO: Add quick convert setting
            />
            Enable quick conversion on text selection
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={false}
              // TODO: Add input dialog setting
            />
            Show input dialog for manual currency entry
          </label>
        </div>
      </div>

      <div className="settings-info">
        <p>
          <strong>Note:</strong> The currency converter uses AI to parse various currency formats.
          Make sure to configure your AI provider for the best results.
        </p>
      </div>

      <div className="settings-actions">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="save-settings-btn"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CurrencyConverterSettings;
