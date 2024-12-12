interface Settings {
  [key: string]: string;
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

  async saveSetting(key: string, value: string): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  async removeSetting(key: string): Promise<void> {
    const settings = await this.getSettings();
    delete settings[key];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }
}

export const settingsService = new SettingsService(); 