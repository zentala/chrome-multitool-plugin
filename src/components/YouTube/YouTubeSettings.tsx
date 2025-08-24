/**
 * YouTube Settings Component
 * Configuration panel for YouTube transcription and AI features
 */

// Purpose: This component provides settings for YouTube functionality,
// including AI provider configuration and transcription preferences

import React, { useState, useEffect } from 'react';
import { AISettings } from '../../interfaces/YouTubeCaptionData';
import { aiServiceManager } from '../../services/ai.service';
import { settingsService } from '../../services/settings.service';

/**
 * Settings component for YouTube module
 */
const YouTubeSettings: React.FC = () => {
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-pro',
    temperature: 0.7
  });
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      const currentSettings = await settingsService.getAISettings();
      setAiSettings(currentSettings);
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

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await settingsService.saveAISettings(aiSettings);
      aiServiceManager.configure(aiSettings);
      alert('Settings saved successfully!');
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
      aiServiceManager.configure(aiSettings);
      const isConnected = await aiServiceManager.testConnection();

      setConnectionStatus(isConnected ? 'success' : 'error');
      alert(isConnected ? 'Connection successful!' : 'Connection failed. Please check your API key and settings.');
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
      alert('Error testing connection. Please try again.');
    } finally {
      setTestingConnection(false);
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
    <div className="youtube-settings">
      <h3>YouTube Module Settings</h3>

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

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="save-settings-btn"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {connectionStatus !== 'unknown' && (
          <div className={`connection-status ${connectionStatus}`}>
            Connection: {connectionStatus === 'success' ? '✓ Success' : '✗ Failed'}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h4>YouTube Features</h4>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={true}
              // TODO: Add auto-inject sidebar setting
            />
            Automatically show sidebar on YouTube pages
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={true}
              // TODO: Add download preference setting
            />
            Prefer auto-generated captions when available
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              defaultChecked={false}
              // TODO: Add AI processing setting
            />
            Automatically process captions with AI
          </label>
        </div>
      </div>

      <div className="settings-info">
        <p>
          <strong>Note:</strong> Make sure to get your API keys from the respective provider:
        </p>
        <ul>
          <li><strong>Gemini:</strong> <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
          <li><strong>OpenAI:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
          <li><strong>Claude:</strong> <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></li>
          <li><strong>Grok:</strong> <a href="https://x.ai/" target="_blank" rel="noopener noreferrer">xAI</a></li>
        </ul>
      </div>
    </div>
  );
};

export default YouTubeSettings;
