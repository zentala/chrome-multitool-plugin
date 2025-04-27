interface Settings {
  [key: string]: string | null;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  selected_provider: 'openai' | 'anthropic';
}

interface ModelProviderToken {
  provider: 'openai' | 'anthropic';
  token: string | null;
}

class SettingsService {
  private readonly STORAGE_KEY = 'bookmark_manager_settings';

  async getSettings(): Promise<Settings> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  async getSetting(key: string): Promise<string | null> {
    const settings = await this.getSettings();
    return settings[key] || null;
  }

  async saveSetting(key: string, value: string | null): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  async removeSetting(key: string): Promise<void> {
    const settings = await this.getSettings();
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
    const { provider, token } = await this.getModelProviderTokenSetting();
    return !!token;
  }
}

export const settingsService = new SettingsService(); 