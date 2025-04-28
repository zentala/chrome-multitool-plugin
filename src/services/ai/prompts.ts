/**
 * @file Defines prompts used for interacting with AI models.
 */

// TODO: Add more examples for edge cases (e.g., different separators, currency symbols before/after amount)
// TODO: Consider adding negative examples (text that *shouldn't* be parsed)
// TODO: Refine error messages returned by the LLM for better clarity.
export const CURRENCY_PARSING_PROMPT = `
Analyze the following text provided by the user and extract the currency amount and its ISO 4217 currency code.

Input Text:
"{TEXT_TO_PARSE}"

Output Format:
Return ONLY a valid JSON object with one of the following structures:

1.  If you successfully identify a single amount and a recognized currency code:
    \`{ \"amount\": number, \"currencyCode\": \"string\" }\`
    (Example: \`{ \"amount\": 150.75, \"currencyCode\": \"EUR\" }\`)

2.  If the text does not seem to contain any currency information or is ambiguous (e.g., multiple amounts/currencies without clear context) and you cannot confidently extract a single value:
    \`{ \"error\": \"string\" }\`
    (Example: \`{ \"error\": \"No currency amount found.\" }\` or \`{ \"error\": \"Ambiguous input: multiple amounts found.\" }\`)
    Be specific about the reason for the error.

3.  If you *partially* understand but need more information (e.g., amount found but currency is unclear, or multiple plausible interpretations exist):
    \`{ \"needsClarification\": \"string\" }\`
    (Example: \`{ \"needsClarification\": \"Found amount 100, but currency 'pounds' is ambiguous. Specify GBP, EGP, etc.\" }\`)

Constraints:
-   The "amount" must be a numeric value (integer or float). Remove any thousands separators (like commas). Use a period (.) as the decimal separator if needed.
-   The "currencyCode" must be a standard 3-letter ISO 4217 code (e.g., "USD", "EUR", "PLN", "GBP"). Infer the code from common names (e.g., "dollars" -> "USD", "euro" -> "EUR", "złotych" -> "PLN", "pounds" -> "GBP", "francs" -> "CHF"). If a symbol like '$' or '£' is used, try to infer the most likely currency based on common usage (e.g., '$' often implies 'USD', '£' often implies 'GBP'), but if it's ambiguous, prefer returning an error or requesting clarification.
-   Do NOT include any explanation or commentary outside the JSON object. Your entire response must be only the JSON.

Examples:

Input Text: "Can you convert 100 EUR to PLN?"
Output: \`{ "amount": 100, "currencyCode": "EUR" }\`

Input Text: "Price is $49.99"
Output: \`{ "amount": 49.99, "currencyCode": "USD" }\`

Input Text: "How much is 50 pounds?"
Output: \`{ "amount": 50, "currencyCode": "GBP" }\`

Input Text: "I need 2,500 Japanese Yen"
Output: \`{ "amount": 2500, "currencyCode": "JPY" }\`

Input Text: "The budget is around ten thousand zlotys"
Output: \`{ "amount": 10000, "currencyCode": "PLN" }\`

Input Text: "Just a regular sentence without money."
Output: \`{ "error": "No currency information found in the text." }\`

Input Text: "Is it 50 bucks or 60?"
Output: \`{ "error": "Ambiguous input: multiple amounts found." }\`

Input Text: "Need 100 franks."
Output: \`{ "needsClarification": "Found amount 100, but currency 'franks' is ambiguous. Specify CHF, XAF, XPF, etc." }\`

Now, analyze the input text provided above and return the corresponding JSON object.
`;

// TODO: Define a prompt for clarification if needed
// export const CURRENCY_CLARIFICATION_PROMPT = `...`; 