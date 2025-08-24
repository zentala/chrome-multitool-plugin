import { IAIAdapter } from '../interfaces';
import { GoogleAIAdapter } from '../services/ai/GoogleAIAdapter';

// --- AI Provider Initialization (Lazy Singleton) --- //
let aiProviderInstance: IAIAdapter | null = null;

/**
 * Gets the singleton instance of the AI provider.
 * Initializes it on the first call.
 * 
 * @returns The AI adapter instance.
 */
export function getAIProvider(): IAIAdapter {
  if (!aiProviderInstance) {
    console.log('Initializing AI Provider...');
    try {
      aiProviderInstance = new GoogleAIAdapter(); 
      console.log('AI Provider Initialized: Google AI');
    } catch (error) {
        console.error("Failed to initialize AI Provider:", error);
        // Fallback to a dummy provider that always returns errors
        aiProviderInstance = {
            parseCurrency: async () => ({ success: false, error: 'AI Provider not initialized correctly.' })
        };
    }
  }
  return aiProviderInstance;
} 