import { ParsedCurrencyResult } from '../../interfaces/AI';

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
export class GoogleAiAdapter {
  private apiKey: string;
  private readonly apiUrl = 'https://us-central1-aiplatform.googleapis.com/v1'; // Base Vertex AI URL
  private readonly modelId = 'gemini-2.5-flash-preview-04-17'; // Chosen model
  // TODO: Get PROJECT_ID from .env as well or find a way to determine it?
  // Hardcoding project ID is not ideal. For extensions, maybe not needed if using only API key?
  // The curl example uses gcloud auth token *and* project ID in URL, but SDK example uses only API key...
  // Let's assume API key is sufficient for now for ai.google.dev endpoint, or needs project ID for Vertex.
  // Will need to clarify based on actual API endpoint/SDK used.

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.error('GoogleAiAdapter: GEMINI_API_KEY is not set in environment variables!');
      // Potentially throw an error or set a state indicating misconfiguration
    }
  }

  /**
   * Creates the prompt for the Gemini API to parse currency.
   * @param inputText The raw text input from the user.
   * @returns The formatted prompt string.
   */
  private createPrompt(inputText: string): string {
    // Escape potential issues in inputText if needed, e.g., quotes
    const escapedInput = inputText.replace(/"/g, '"');

    return `
Your task is to parse the following text to extract a monetary amount and its ISO 4217 currency code.

The input text might be messy, contain various separators, or have the currency code directly attached.

Instructions:
1. Identify the numeric value. Handle separators like '.', ',', or spaces.
2. Identify the currency code (e.g., "IDR", "USD", "EUR") or symbol (e.g., "€", "$"). Convert it to the 3-letter uppercase ISO 4217 code.
3. Respond ONLY with a valid JSON object.
4. On success, respond with: {"amount": <number>, "currency": "<code>"}
5. On failure (cannot confidently determine both amount and currency), respond with: {"error": "parsing_failed", "reason": "<brief English explanation>"}

Examples:

Input text: "3.500.555IDR"
JSON response:
{"amount": 3500555, "currency": "IDR"}

Input text: "€50,99"
JSON response:
{"amount": 50.99, "currency": "EUR"}

Input text: "$1,250.75"
JSON response:
{"amount": 1250.75, "currency": "USD"}

Input text: "PLN 25 000"
JSON response:
{"amount": 25000, "currency": "PLN"}

Input text: "100dollars"
JSON response:
{"amount": 100, "currency": "USD"}

Input text: "Just 100"
JSON response:
{"error": "parsing_failed", "reason": "currency not provided"}

Input text: "Random text"
JSON response:
{"error": "parsing_failed", "reason": "no amount or currency found"}

---

Input text: "${escapedInput}"
JSON response:
`;
  }

  /**
   * Calls the Gemini API to parse currency from text.
   * @param text The natural language input text.
   * @returns A promise resolving to the parsed currency result.
   * @throws Throws an error if the API call fails or the API key is missing.
   */
  async parseCurrency(text: string): Promise<ParsedCurrencyResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Google AI API Key not configured.',
      };
    }

    const prompt = this.createPrompt(text);

    // TODO: Construct the correct API endpoint URL and request body
    // This depends on whether we use Vertex AI endpoint or ai.google.dev / specific SDK
    // Assuming a structure similar to the curl example for Vertex AI (needs project ID):
    // const endpoint = `${this.apiUrl}/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/${this.modelId}:generateContent?key=${this.apiKey}`;
    // Or for ai.google.dev (simpler, uses API key directly?):
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      // Add generationConfig if needed (temperature, max output tokens etc.)
      // generationConfig: {
      //   temperature: 0.2,
      //   maxOutputTokens: 100,
      //   responseMimeType: "application/json", // Request JSON directly if supported
      // }
    };

    console.log('GoogleAiAdapter: Sending request to Gemini...', { endpoint, requestBody });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('GoogleAiAdapter: Received response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('GoogleAiAdapter: API error response:', errorBody);
        throw new Error(`Google AI API request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData: GeminiApiResponse = await response.json();
      console.log('GoogleAiAdapter: Received data:', responseData);

      // Extract the JSON text from the response
      // This structure might vary based on the actual API response!
      const jsonText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!jsonText) {
        console.error('GoogleAiAdapter: Could not extract JSON text from response', responseData);
        throw new Error('Invalid response structure from Google AI API');
      }

      // Parse the JSON text
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('GoogleAiAdapter: Failed to parse JSON response from LLM:', jsonText, parseError);
        throw new Error('LLM returned invalid JSON');
      }

      // Validate the parsed JSON structure
      if (parsedJson.error) {
        console.log('GoogleAiAdapter: LLM reported parsing error:', parsedJson.error);
        return { success: false, error: `LLM could not parse input: ${parsedJson.error}` };
      } else if (typeof parsedJson.amount === 'number' && typeof parsedJson.currency === 'string') {
        return {
          success: true,
          amount: parsedJson.amount,
          currency: parsedJson.currency.toUpperCase(), // Ensure uppercase ISO code
        };
      } else {
        console.error('GoogleAiAdapter: Unexpected JSON structure from LLM:', parsedJson);
        throw new Error('LLM returned unexpected JSON structure');
      }

    } catch (error) {
      console.error('GoogleAiAdapter: Error during API call or processing:', error);
      // Rethrow or handle specific errors
      throw error; // Let the facade handle wrapping this into a ParsedCurrencyResult error
    }
  }
} 