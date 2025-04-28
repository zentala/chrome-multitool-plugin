interface Settings {
  [key: string]: string | null;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  selected_provider: 'openai' | 'anthropic' | 'google';
}

interface ModelProviderToken {
  provider: 'openai' | 'anthropic';
  token: string | null;
}

class SettingsService {
  private readonly STORAGE_KEY = 'bookmark_manager_settings';

  async get(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.STORAGE_KEY, (result) => {
        // Return the saved settings or an empty object if none exist
        // Provide default values to satisfy the Settings type
        const settings: Settings = result[this.STORAGE_KEY] || {
          openai_api_key: '', // Default empty string
          anthropic_api_key: '', // Default empty string
          selected_provider: 'google' // Default provider
        };
        resolve(settings);
      });
    });
  }

  async getSetting(key: string): Promise<string | null> {
    const settings = await this.get();
    return settings[key] || null;
  }

  async saveSetting(key: string, value: string | null): Promise<void> {
    const settings = await this.get();
    settings[key] = value;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  async removeSetting(key: string): Promise<void> {
    const settings = await this.get();
    delete settings[key];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  async getModelProviderTokenSetting(): Promise<ModelProviderToken> {
    const [openaiApiKey, anthropicApiKey, selectedProvider] = await Promise.all([
      this.getSetting('openai_api_key'),
      this.getSetting('anthropic_api_key'),
      this.getSetting('selected_provider')
    ]);

    const provider = (selectedProvider || 'openai') as 'openai' | 'anthropic';
    const token = provider === 'openai' ? openaiApiKey : anthropicApiKey;

    return { provider, token };
  }

  async validateModelProviderSettings(): Promise<boolean> {
    const { token } = await this.getModelProviderTokenSetting();
    return !!token;
  }
}

export const settingsService = new SettingsService(); 