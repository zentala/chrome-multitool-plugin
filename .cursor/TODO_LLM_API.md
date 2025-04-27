# Specyfikacja Fasady AI/LLM

## Wprowadzenie

Celem tej fasady jest stworzenie ujednoliconego interfejsu do interakcji z różnymi modelami AI (początkowo LLM, potencjalnie inne w przyszłości, np. audio) od różnych dostawców (Google, Anthropic, OpenAI, itp.). Umożliwi to łatwą wymianę modeli i centralizację logiki związanej z AI w rozszerzeniu.

*Strategia integracji z API Google (w tym Gemini) jest opisana w [SPEC_GOOGLE.md](SPEC_GOOGLE.md).*

## Wymagania Funkcjonalne

1.  **Abstrakcyjny Interfejs:**
    *   Zdefiniowanie wspólnego interfejsu dla różnych zadań AI, np. `parseCurrencyInput(text: string): Promise<ParsedCurrencyResult>`, `summarizeText(text: string): Promise<string>`.
    *   Interfejs powinien ukrywać szczegóły implementacyjne konkretnych modeli i dostawców.

2.  **Obsługa Dostawców i Modeli:**
    *   Możliwość konfiguracji i przełączania między różnymi dostawcami (np. Google Gemini, OpenAI GPT, Anthropic Claude).
    *   Możliwość wyboru konkretnych modeli (np. `gemini-2.5-flash-preview-04-17`, GPT-4o mini, Claude 3 Haiku) dla różnych zadań, uwzględniając koszty i możliwości.
    *   **Początkowo zaimplementujemy wsparcie dla modelu Google Gemini: `gemini-2.5-flash-preview-04-17`**. *Metoda uwierzytelniania opisana poniżej oraz w [SPEC_GOOGLE.md](SPEC_GOOGLE.md).*

3.  **Konfiguracja:**
    *   **Klucz API Google Gemini:**
        *   Klucz API będzie zarządzany poprzez plik `.env` w głównym katalogu projektu (plik ten musi być w `.gitignore`).
        *   Podczas procesu budowania (Webpack), klucz API zostanie wstrzyknięty do kodu rozszerzenia jako zmienna środowiskowa (np. `process.env.GEMINI_API_KEY`).
        *   Deweloperzy budujący lokalnie muszą utworzyć własny plik `.env` z kluczem.
    *   **(Przyszłość):** Dodać możliwość konfiguracji klucza API Gemini przez użytkownika w ustawieniach rozszerzenia (UI). Klucz podany przez użytkownika nadpisywałby ten wstrzyknięty w buildzie i byłby przechowywany w `chrome.storage`.
    *   Mechanizm zarządzania innymi ustawieniami konfiguracyjnymi (np. przez `chrome.storage` lub opcje rozszerzenia).

4.  **Obsługa Błędów:**
    *   Ujednolicona obsługa błędów API (np. limity zapytań, błędy sieci, błędy modeli).

## Architektura (Propozycja)

-   **Moduł Fasady (`src/services/aiFacade.ts`):**
    *   Główny punkt wejścia dla reszty aplikacji.
    *   Implementacja interfejsu fasady.
    *   Logika wyboru dostawcy/modelu.
-   **Moduły Adapterów (`src/services/ai/googleAiAdapter.ts`, `src/services/ai/openaiAdapter.ts`, etc.):**
    *   Implementacje specyficzne dla każdego dostawcy/SDK.
    *   Obsługa komunikacji z API danego dostawcy.
    *   Transformacja danych wejściowych/wyjściowych do/z formatu fasady.
-   **Konfiguracja (`src/config/aiConfig.ts`, `chrome.storage`):**
    *   Przechowywanie ustawień, kluczy API.

## Dalsze Kroki

1.  Potwierdzenie dostępności SDK w projekcie (mamy `langchain`, `@langchain/anthropic`, `@langchain/openai`, `@anthropic-ai/sdk` - można je wykorzystać lub dodać np. `@google/generative-ai` dla Gemini, lub użyć bezpośrednio `fetch`).
2.  Implementacja podstawowej struktury fasady (`src/services/aiFacade.ts`) i adaptera dla Google (`src/services/ai/googleAiAdapter.ts`) używając modelu `gemini-2.5-flash-preview-04-17` i klucza API wstrzykiwanego z `.env`.
3.  Integracja fasady z modułem konwertera walut dla parsowania inputu.
4.  ~~Zaprojektowanie mechanizmu bezpiecznego przechowywania kluczy API~~ (**Wybrano strategię:** `.env` + wstrzykiwanie w buildzie, docelowo konfiguracja UI). 