import { IAIAdapter } from "./IAIAdapter";
import { CurrencyParseResult } from "../../interfaces/CurrencyParseResult";

/**
 * Interface specific to the Google AI Adapter.
 * Extends the general IAIAdapter and can add Google-specific methods.
 */
export interface IGoogleAIAdapter extends IAIAdapter {
  // Google-specific methods can be added here if needed
  // For now, it just inherits from IAIAdapter
  parseCurrency(text: string): Promise<CurrencyParseResult>; // Re-declare to ensure it's present
} 