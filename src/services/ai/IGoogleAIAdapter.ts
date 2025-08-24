import { IAIAdapter, ParseCurrencyInput, ParseCurrencyOutput } from "../../interfaces/IAIAdapter";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/**
 * @file Defines the interface for Google AI Adapter with Gemini-specific functionality.
 */

/**
 * Configuration options for Google AI (Gemini) models.
 */
export interface GoogleAIOptions {
  /** The Gemini model to use (e.g., 'gemini-1.5-flash', 'gemini-1.5-pro') */
  modelName?: string;

  /** Generation configuration parameters */
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };

  /** Safety settings for content filtering */
  safetySettings?: Array<{
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }>;
}

/**
 * Model information returned by Google AI API.
 */
export interface GoogleAIModelInfo {
  name: string;
  displayName: string;
  description: string;
  version: string;
  supportedGenerationMethods: string[];
  inputTokenLimit: number;
  outputTokenLimit: number;
}

/**
 * Streaming response chunk for Google AI.
 */
export interface GoogleAIStreamChunk {
  text: string;
  isComplete: boolean;
  usageInfo?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Interface specific to the Google AI Adapter.
 * Extends the general IAIAdapter with Google Gemini-specific functionality.
 */
export interface IGoogleAIAdapter extends IAIAdapter {
  /**
   * Updates the Google AI configuration at runtime.
   * @param options New configuration options to apply
   */
  updateConfiguration(options: GoogleAIOptions): void;

  /**
   * Gets the current Google AI configuration.
   * @returns Current configuration options
   */
  getConfiguration(): GoogleAIOptions;

  /**
   * Retrieves information about available Gemini models.
   * @returns Promise resolving to array of available models
   */
  getAvailableModels(): Promise<GoogleAIModelInfo[]>;

  /**
   * Gets information about the currently configured model.
   * @returns Promise resolving to current model information
   */
  getCurrentModelInfo(): Promise<GoogleAIModelInfo>;

  /**
   * Validates the API key by making a test request.
   * @returns Promise resolving to true if API key is valid
   * @throws AIAdapterError if API key is invalid or network error occurs
   */
  validateApiKey(): Promise<boolean>;

  /**
   * Parses currency with streaming response for real-time updates.
   * @param input The input object containing the text to parse
   * @param onChunk Callback function called for each streaming chunk
   * @returns Promise resolving to final parsed currency result
   */
  streamParseCurrency(
    input: ParseCurrencyInput,
    onChunk: (chunk: GoogleAIStreamChunk) => void
  ): Promise<ParseCurrencyOutput>;

  /**
   * Gets usage statistics for the current session.
   * @returns Object containing token usage information
   */
  getUsageStats(): {
    totalRequests: number;
    totalTokensUsed: number;
    estimatedCost: number; // in USD
  };
}
