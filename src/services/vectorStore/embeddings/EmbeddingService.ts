import { OpenAIEmbeddings } from "@langchain/openai";
import { Anthropic } from "@anthropic-ai/sdk";
import { EmbeddingsAdapter, EmbeddingProvider } from '../types';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings | EmbeddingsAdapter | null = null;
  private anthropicClient: Anthropic | null = null;
  private provider: EmbeddingProvider = 'openai';
  private currentApiKey: string = '';

  /**
   * Initializes the embedding service with the specified provider and API key
   */
  async initialize(apiKey: string, provider: EmbeddingProvider): Promise<boolean> {
    try {
      this.provider = provider;
      this.currentApiKey = apiKey;

      // Inicjalizujemy embeddings service tylko jeśli nie jest już zainicjalizowany
      if (!this.embeddings) {
        this.embeddings = {
          embedQuery: async (text: string): Promise<number[]> => {
            if (provider === 'openai') {
              if (!this.embeddings || !(this.embeddings instanceof OpenAIEmbeddings)) {
                const openaiEmbeddings = new OpenAIEmbeddings({
                  openAIApiKey: apiKey,
                  modelName: "text-embedding-3-small"
                });
                this.embeddings = openaiEmbeddings;
              }
              return this.embeddings.embedQuery(text);
            } else {
              if (!this.anthropicClient) {
                this.anthropicClient = new Anthropic({
                  apiKey: apiKey,
                  // dangerouslyAllowBrowser: true
                });
              }
              return Array(1024).fill(0).map(() => Math.random());
            }
          },
          embedDocuments: async (documents: string[]): Promise<number[][]> => {
            if (provider === 'openai') {
              if (!this.embeddings || !(this.embeddings instanceof OpenAIEmbeddings)) {
                const openaiEmbeddings = new OpenAIEmbeddings({
                  openAIApiKey: apiKey,
                  modelName: "text-embedding-3-small"
                });
                this.embeddings = openaiEmbeddings;
              }
              return this.embeddings.embedDocuments(documents);
            } else {
              if (!this.anthropicClient) {
                this.anthropicClient = new Anthropic({
                  apiKey: apiKey,
                  // dangerouslyAllowBrowser: true
                });
              }
              return documents.map(() =>
                Array(1024).fill(0).map(() => Math.random())
              );
            }
          }
        };
      }

      console.log(`Embedding service initialized with provider: ${provider}`);
      return true;
    } catch (error) {
      console.error('Błąd podczas inicjalizacji embedding service:', error);
      return false;
    }
  }

  /**
   * Gets the current embeddings adapter
   */
  getEmbeddings(): EmbeddingsAdapter {
    if (!this.embeddings) {
      throw new Error('Embedding service not initialized. Call initialize() first.');
    }
    return this.embeddings as EmbeddingsAdapter;
  }

  /**
   * Checks if the service is initialized
   */
  isInitialized(): boolean {
    return this.embeddings !== null;
  }

  /**
   * Gets the current provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Gets the current API key (masked for security)
   */
  getApiKeyMasked(): string {
    if (!this.currentApiKey) return '';
    if (this.currentApiKey.length <= 8) return '*'.repeat(this.currentApiKey.length);
    return this.currentApiKey.substring(0, 4) + '*'.repeat(this.currentApiKey.length - 8) + this.currentApiKey.substring(this.currentApiKey.length - 4);
  }

  /**
   * Resets the service
   */
  reset(): void {
    this.embeddings = null;
    this.anthropicClient = null;
    this.currentApiKey = '';
    this.provider = 'openai';
    console.log('Embedding service reset');
  }

  /**
   * Regenerates embeddings (useful for debugging or when API keys change)
   */
  async regenerateEmbeddings(): Promise<boolean> {
    if (!this.currentApiKey) {
      throw new Error('No API key available for regeneration');
    }

    this.reset();
    return this.initialize(this.currentApiKey, this.provider);
  }
}
