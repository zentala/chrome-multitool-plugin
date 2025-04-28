// import { ParsedCurrencyResult } from '../../interfaces/AI'; // Remove unused import
import { IAIAdapter, ParseCurrencyInput, ParseCurrencyOutput, AIAdapterError } from '../../interfaces/IAIAdapter';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';
import { CURRENCY_PARSING_PROMPT } from './prompts';

// Placeholder for the actual Gemini API response structure
// We need to define this based on the expected JSON from the prompt
/*
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
*/

/**
 * Adapter for interacting with the Google Gemini API.
 */
export class GoogleAIAdapter implements IAIAdapter {
  private apiKey: string;
  private genAI: GoogleGenerativeAI; // Add instance of the main AI client
  private model: GenerativeModel; // Add property for the specific model
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
  private safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.error('GoogleAIAdapter: GEMINI_API_KEY is not set in environment variables!');
      // Throw an error or handle appropriately to prevent usage without API key
      throw new AIAdapterError('Google AI API Key not configured.', 500, 'Missing API Key');
    }
    // Initialize the GoogleGenerativeAI client
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    // Get the specific model instance
    this.model = this.genAI.getGenerativeModel({ 
        model: this.modelName, 
        generationConfig: this.generationConfig, 
        safetySettings: this.safetySettings 
    });
  }

  /**
   * Parses the input text to extract currency information.
   *
   * @param input The input object containing the text to parse.
   * @returns A promise resolving to the parsed currency result.
   */
  async parseCurrency(input: ParseCurrencyInput): Promise<ParseCurrencyOutput> {
    const { text } = input;
    if (!text) {
      // Return a failed output directly if text is empty
      return { success: false, error: 'Input text is empty.' };
    }

    console.log('GoogleAIAdapter: Parsing text:', text);
    const fullPrompt = CURRENCY_PARSING_PROMPT.replace('{TEXT}', text);
    // console.log('GoogleAIAdapter: Full prompt:', fullPrompt); // DEBUG

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const responseText = response.text();
      console.log('GoogleAIAdapter: Raw response:', responseText);

      // --- Basic JSON Parsing (Needs Robust Error Handling) ---
      try {
        // Attempt to parse the JSON response
        const parsedJson = JSON.parse(responseText);
        console.log('GoogleAIAdapter: Parsed JSON:', parsedJson);

        // Validate the parsed structure based on expected output
        if (parsedJson.success === true && typeof parsedJson.amount === 'number' && typeof parsedJson.currencyCode === 'string') {
          // Successfully parsed and matches expected structure
          return { 
            success: true, 
            amount: parsedJson.amount, 
            currencyCode: parsedJson.currencyCode.toUpperCase() // Ensure uppercase ISO code
          };
        } else if (parsedJson.success === false) {
           // AI indicated failure or need for clarification
           console.log('AI indicated failure/clarification:', parsedJson.error || parsedJson.needsClarification);
          return { 
             success: false, 
             error: parsedJson.error, // Pass through the error from AI
             needsClarification: parsedJson.needsClarification // Pass through clarification needs
           }; 
        } else {
          // Unexpected JSON structure
          console.error('GoogleAIAdapter: Unexpected JSON structure:', parsedJson);
          return { success: false, error: 'AI returned unexpected JSON structure.' };
        }

      } catch (jsonError) {
        console.error('GoogleAIAdapter: Failed to parse JSON response:', jsonError);
        console.error('GoogleAIAdapter: Raw text that failed parsing:', responseText);
        // Attempt to provide a more specific error if possible
        let errorMessage = 'AI response was not valid JSON.';
        if (responseText.trim().startsWith('{') === false || responseText.trim().endsWith('}') === false) {
          errorMessage += ' Missing braces?';
        }
        // TODO: Add more specific checks if needed (e.g., detect common Gemini error messages)
        return { success: false, error: errorMessage };
      }
      // --- End Basic JSON Parsing ---

    } catch (error: unknown) { // Use unknown instead of any
      console.error('GoogleAIAdapter: Error during generateContent:', error);
      // Check if it's a Google AI specific error or a standard Error
      if (error instanceof Error) {
        // Basic error message extraction
        return { success: false, error: `Gemini API Error: ${error.message}` };
      } else {
        // Generic fallback for non-Error throwables
        return { success: false, error: 'Unknown error communicating with Gemini API.' };
      }
    }
  }

  // TODO: Implement clarify method if needed in IAIAdapter
  /*
  async clarifyInput(originalInput: any, clarification: any): Promise<ParseCurrencyOutput> {
      console.warn('clarifyInput not implemented in GoogleAIAdapter');
      throw new Error('Method not implemented.'); // Or return a specific error structure
      // If implemented, this would take the original input and clarification,
      // formulate a new prompt, call the API, and parse the result similarly to parseCurrency.
  }
  */

} 