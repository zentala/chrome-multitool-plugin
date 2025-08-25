/**
 * YouTube Service Module
 * Handles YouTube API interactions and transcription management
 */

// Purpose: This file manages YouTube API integration and transcription functionality
// for the Chrome extension's YouTube features

import { YouTubeCaptionData } from '../../interfaces/YouTubeCaptionData';

/**
 * Service for handling YouTube API operations and transcription
 */
export class YouTubeTranscriptionService {
  private static instance: YouTubeTranscriptionService;

  private constructor() {}

  /**
   * Get singleton instance of the service
   */
  public static getInstance(): YouTubeTranscriptionService {
    if (!YouTubeTranscriptionService.instance) {
      YouTubeTranscriptionService.instance = new YouTubeTranscriptionService();
    }
    return YouTubeTranscriptionService.instance;
  }

  /**
   * Extract video ID from YouTube URL
   */
  public extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get available captions for a YouTube video
   */
  public async getAvailableCaptions(videoId: string): Promise<YouTubeCaptionData[]> {
    // For now, we'll extract captions directly from the YouTube page
    // This is a simplified implementation that works with the content script
    try {
      // This will be called from the content script, so we'll implement it there
      return [];
    } catch (error) {
      console.error('Error getting captions:', error);
      return [];
    }
  }

  /**
   * Download captions for a specific language
   */
  public async downloadCaptions(videoId: string, language: string): Promise<string> {
    // This method will be called from the content script
    // The actual implementation is in the content script's findCaptionUrl method
    throw new Error('Caption download should be called from content script');
  }

  /**
   * Process transcription with AI
   */
  public async processTranscriptionWithAI(captions: string, prompt?: string): Promise<string> {
    // Import AI service dynamically to avoid circular dependencies
    const { aiServiceManager } = await import('../ai.service');

    const defaultPrompt = prompt || 'Please analyze and summarize this YouTube video transcription, highlighting the key points and main topics discussed.';

    try {
      const result = await aiServiceManager.processWithAI(captions, defaultPrompt);
      return result;
    } catch (error) {
      console.error('Error processing transcription with AI:', error);
      throw new Error('Failed to process transcription with AI');
    }
  }
}

// Export singleton instance
export const youtubeTranscriptionService = YouTubeTranscriptionService.getInstance();
