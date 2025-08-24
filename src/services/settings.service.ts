import { ModuleSettings } from '../interfaces/ModuleSettings';
import { AISettings } from '../interfaces/YouTubeCaptionData';

interface Settings {
  [key: string]: string | null | ModuleSettings[] | AISettings;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  selected_provider: 'openai' | 'anthropic' | 'google';
  // New module-based settings
  modules: ModuleSettings[];
  ai_settings: AISettings;
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
        // Return the saved settings or provide defaults
        const savedSettings = result[this.STORAGE_KEY] || {};
        const settings: Settings = {
          openai_api_key: savedSettings.openai_api_key || '',
          anthropic_api_key: savedSettings.anthropic_api_key || '',
          selected_provider: savedSettings.selected_provider || 'google',
          modules: savedSettings.modules || [],
          ai_settings: savedSettings.ai_settings || {
            provider: 'gemini',
            apiKey: '',
            model: 'gemini-pro',
            temperature: 0.7
          }
        };
        resolve(settings);
      });
    });
  }

  async getSetting(key: string): Promise<string | null> {
    const settings = await this.get();
    const value = settings[key];
    return typeof value === 'string' ? value : null;
  }

  async getModuleSettings(): Promise<ModuleSettings[]> {
    const settings = await this.get();
    return settings.modules || [];
  }

  async getAISettings(): Promise<AISettings> {
    const settings = await this.get();
    return settings.ai_settings || {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-pro',
      temperature: 0.7
    };
  }

  async saveModuleSettings(modules: ModuleSettings[]): Promise<void> {
    const settings = await this.get();
    settings.modules = modules;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: settings }, resolve);
    });
  }

  async saveAISettings(aiSettings: AISettings): Promise<void> {
    const settings = await this.get();
    settings.ai_settings = aiSettings;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: settings }, resolve);
    });
  }

  async getModuleSetting(moduleId: string): Promise<ModuleSettings | null> {
    const modules = await this.getModuleSettings();
    return modules.find(module => module.id === moduleId) || null;
  }

  async saveModuleSetting(moduleId: string, moduleSettings: ModuleSettings): Promise<void> {
    const modules = await this.getModuleSettings();
    const existingIndex = modules.findIndex(module => module.id === moduleId);

    if (existingIndex >= 0) {
      modules[existingIndex] = moduleSettings;
    } else {
      modules.push(moduleSettings);
    }

    await this.saveModuleSettings(modules);
  }

  async saveSetting(key: string, value: string | null): Promise<void> {
    const settings = await this.get();
    settings[key] = value;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: settings }, resolve);
    });
  }

  async removeSetting(key: string): Promise<void> {
    const settings = await this.get();
    delete settings[key];
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: settings }, resolve);
    });
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
