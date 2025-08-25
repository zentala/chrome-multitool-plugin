/**
 * Transcription Service Module
 * Handles processing and AI-powered analysis of transcriptions
 */

// Purpose: This file manages transcription processing, AI integration,
// and analysis of YouTube video captions

/* eslint-disable @typescript-eslint/no-unused-vars */

import { AISettings } from '../../interfaces/YouTubeCaptionData';

/**
 * Service for processing transcriptions with AI
 */
export class TranscriptionService {
  private static instance: TranscriptionService;

  private constructor() {}

  /**
   * Get singleton instance of the service
   */
  public static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  /**
   * Process transcription with AI using specified settings
   */
  public async processTranscription(
    transcription: string,
    aiSettings: AISettings,
    prompt?: string
  ): Promise<string> {
    // Import AI service dynamically to avoid circular dependencies
    const { aiServiceManager } = await import('../ai.service');

    // Configure AI service with the provided settings
    aiServiceManager.configure(aiSettings);

    // Use default prompt if none provided
    const defaultPrompt = prompt || 'Please analyze and summarize this YouTube video transcription, highlighting the key points and main topics discussed.';

    try {
      const result = await aiServiceManager.processWithAI(transcription, defaultPrompt);
      return result;
    } catch (error) {
      console.error('Error processing transcription with AI:', error);
      throw new Error('Failed to process transcription with AI');
    }
  }

  /**
   * Summarize transcription content
   */
  public async summarizeTranscription(
    transcription: string,
    aiSettings: AISettings,
    maxLength?: number
  ): Promise<string> {
    const prompt = maxLength
      ? `Please provide a concise summary of this YouTube video transcription in no more than ${maxLength} words, capturing the main points and key topics.`
      : 'Please provide a concise summary of this YouTube video transcription, highlighting the main points and key topics.';

    return this.processTranscription(transcription, aiSettings, prompt);
  }

  /**
   * Extract key points from transcription
   */
  public async extractKeyPoints(
    transcription: string,
    aiSettings: AISettings
  ): Promise<string[]> {
    const prompt = 'Please extract the key points from this YouTube video transcription as a numbered list. Each key point should be concise and capture an important idea or topic discussed in the video.';

    const result = await this.processTranscription(transcription, aiSettings, prompt);

    // Parse the result into an array of key points
    const lines = result.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  /**
   * Translate transcription to target language
   */
  public async translateTranscription(
    transcription: string,
    targetLanguage: string,
    aiSettings: AISettings
  ): Promise<string> {
    const prompt = `Please translate this YouTube video transcription to ${targetLanguage}. Maintain the original meaning and structure as much as possible while ensuring the translation is natural and fluent in the target language.`;

    return this.processTranscription(transcription, aiSettings, prompt);
  }
}

// Export singleton instance
export const transcriptionService = TranscriptionService.getInstance();
