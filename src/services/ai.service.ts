/**
 * AI Service Manager Module
 * Manages different AI providers and their configurations
 */

// Purpose: This file centralizes AI service management, allowing easy switching
// between different AI providers (OpenAI, Claude, Gemini, Grok)

import { AISettings } from '../interfaces/YouTubeCaptionData';

/**
 * Manager for AI service operations across different providers
 */
export class AIServiceManager {
  private static instance: AIServiceManager;
  private currentSettings: AISettings | null = null;

  private constructor() {}

  /**
   * Get singleton instance of the service
   */
  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  /**
   * Configure AI service with provider settings
   */
  public configure(settings: AISettings): void {
    this.currentSettings = settings;
    // TODO: Validate API key and test connection
  }

  /**
   * Get current AI settings
   */
  public getCurrentSettings(): AISettings | null {
    return this.currentSettings;
  }

  /**
   * Test AI service connection
   */
  public async testConnection(): Promise<boolean> {
    // TODO: Implement connection testing for the configured provider
    throw new Error('Connection testing not yet implemented');
  }

  /**
   * Send prompt to AI service
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendPrompt(prompt: string): Promise<string> {
    if (!this.currentSettings) {
      throw new Error('AI service not configured');
    }

    // TODO: Implement AI provider routing based on settings
    throw new Error('AI prompt sending not yet implemented');
  }

  /**
   * Get available AI models for current provider
   */
  public async getAvailableModels(): Promise<string[]> {
    if (!this.currentSettings) {
      throw new Error('AI service not configured');
    }

    // TODO: Implement model fetching based on provider
    throw new Error('Model fetching not yet implemented');
  }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance();
