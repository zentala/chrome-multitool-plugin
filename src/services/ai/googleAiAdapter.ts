import { ParsedCurrencyResult } from '../../interfaces/AI';
import { IAIAdapter, ParseCurrencyInput, ParseCurrencyOutput, AIAdapterError } from '../../interfaces/IAIAdapter';
import { CURRENCY_PARSING_PROMPT } from './prompts';

// Placeholder for the actual Gemini API response structure
// We need to define this based on the expected JSON from the prompt
interface GeminiApiResponse {
  // Example structure - needs refinement based on prompt design
  candidates?: [
    {
      content: {
        parts: [
          {
            text: string; // This should contain the JSON string
          }
        ];
      };
    }
  ];
  // Add potential error fields if the API returns structured errors
}

/**
 * Adapter for interacting with the Google Gemini API.
 */
export class GoogleAIAdapter implements IAIAdapter {
  private apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta'; // Using generativelanguage endpoint as it's simpler with API key
  private modelName: string = 'gemini-1.5-flash'; // Use modelName consistently
  // Default generation configuration
  private generationConfig: object = {
    temperature: 0.1,
    top_p: 0.95,
    top_k: 64,
    maxOutputTokens: 150, // Limit output size
    responseMimeType: "application/json", // Request JSON directly
  };


  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.error('GoogleAIAdapter: GEMINI_API_KEY is not set in environment variables!');
      // Potentially throw an error or set a state indicating misconfiguration
    }
  }

  /**
   * Calls the Gemini API to parse currency from text.
   * @param input The ParseCurrencyInput object containing the text to parse.
   * @returns A promise resolving to the parsed currency result.
   * @throws {AIAdapterError} If there is an API error or parsing issue.
   */
  async parseCurrency(input: ParseCurrencyInput): Promise<ParseCurrencyOutput> {
    if (!this.apiKey) {
      console.error('GoogleAIAdapter: GEMINI_API_KEY is not set!');
      // Throw specific error for missing configuration
      throw new AIAdapterError('Google AI API Key not configured.', 400, 'Missing API Key'); 
    }

    const prompt = CURRENCY_PARSING_PROMPT.replace('{TEXT_TO_PARSE}', input.text);

    // Use the generativelanguage endpoint which typically works directly with API Key
    const endpoint = `${this.apiUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
          ],
        },
      ],
      generationConfig: this.generationConfig,
      // TODO: Add safety settings if necessary
      // safetySettings: [...]
    };

    console.log('GoogleAIAdapter: Sending request to Gemini...', { model: this.modelName }); // Log model name

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('GoogleAIAdapter: Received response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('GoogleAIAdapter: API error response:', errorBody);
        // Throw specific error type
        throw new AIAdapterError(`API request failed with status ${response.status}`, response.status, errorBody);
      }

      const responseData: GeminiApiResponse = await response.json();
      // console.log('GoogleAIAdapter: Received data:', responseData); // Log raw data only if needed for debugging

      // Extract the JSON text from the response
      // When responseMimeType: "application/json" is used, the result *should* be directly in text
      // However, structure might still be nested based on API version/behavior.
      const jsonText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!jsonText) {
        console.error('GoogleAIAdapter: Could not extract JSON text from response', responseData);
        throw new AIAdapterError('Invalid response structure from AI API: Missing text part');
      }

      // Parse the JSON text
      let parsedJson: any; // Use any initially for flexible parsing
      try {
        // The API might return the JSON string *or* already parsed JSON if mime type is respected
        if (typeof jsonText === 'string') {
             // Remove potential markdown code fences if present
            const cleanedJsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            parsedJson = JSON.parse(cleanedJsonText);
        } else {
            console.warn("GoogleAIAdapter: Response part was not a string, assuming pre-parsed JSON:", jsonText);
            parsedJson = jsonText; // Assume it's already an object/json
        }

      } catch (parseError) {
        console.error('GoogleAIAdapter: Failed to parse JSON response from LLM:', jsonText, parseError);
        throw new AIAdapterError('LLM returned invalid JSON', undefined, jsonText);
      }

      // console.log('GoogleAIAdapter: Parsed JSON:', parsedJson); // Log parsed JSON for debugging

      // Validate the parsed JSON structure based on the prompt requirements
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        // Check for error property
        if ('error' in parsedJson && typeof parsedJson.error === 'string') {
          console.log('GoogleAIAdapter: LLM reported parsing error:', parsedJson.error);
          // Return structured error according to ParseCurrencyOutput
          return { success: false, error: `LLM Error: ${parsedJson.error}` };
        }
        // Check for needsClarification property
        else if ('needsClarification' in parsedJson && typeof parsedJson.needsClarification === 'string') {
             console.log('GoogleAIAdapter: LLM needs clarification:', parsedJson.needsClarification);
             return { success: false, needsClarification: parsedJson.needsClarification };
        }
        // Check for success properties (using currencyCode)
        else if ('amount' in parsedJson && typeof parsedJson.amount === 'number' &&
                 'currencyCode' in parsedJson && typeof parsedJson.currencyCode === 'string') {
          // Return success structure according to ParseCurrencyOutput
          return {
            success: true,
            amount: parsedJson.amount,
            currencyCode: parsedJson.currencyCode.toUpperCase(), // Ensure uppercase ISO code
          };
        }
      }

      // If structure is not as expected
      console.error('GoogleAIAdapter: Unexpected JSON structure from LLM:', parsedJson);
      throw new AIAdapterError('LLM returned unexpected JSON structure', undefined, parsedJson);

    } catch (error) {
      console.error('GoogleAIAdapter: Error during API call or processing:', error);
      // If it's already our specific error, rethrow it
      if (error instanceof AIAdapterError) {
        throw error;
      }
      // Otherwise, wrap it
      throw new AIAdapterError('Network or processing error', undefined, error instanceof Error ? error.message : String(error));
    }
  }
} 