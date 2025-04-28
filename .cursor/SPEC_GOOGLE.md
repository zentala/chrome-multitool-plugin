# Specyfikacja Integracji z Google Cloud Platform (GCP) API

## Wprowadzenie

Ta specyfikacja opisuje sposób integracji rozszerzenia Chrome z usługami Google Cloud Platform (GCP), w tym Google Identity (dla uwierzytelniania), Gemini API (dla LLM) oraz potencjalnie innymi API Google (np. jeśli istnieje odpowiednie API do kursów walut).

Celem jest wykorzystanie ekosystemu Google do realizacji kluczowych funkcjonalności rozszerzenia, zgodnie z preferencjami.

## Podstawy Integracji (na podstawie INFO_GCLOUD.md i Best Practices)

Integracja z API Google w rozszerzeniu Chrome (Manifest V3) wymaga kilku kluczowych elementów:

1.  **Projekt Google Cloud:**
    *   Niezbędne jest posiadanie projektu w [Google Cloud Console](https://console.cloud.google.com/).
    *   W projekcie należy włączyć odpowiednie API (np. Gemini API, ewentualne inne potrzebne API).

2.  **Uwierzytelnianie (OAuth 2.0):**
    *   **Najbezpieczniejszą i zalecaną metodą** dla rozszerzeń Chrome jest użycie `chrome.identity.getAuthToken`.
    *   Wymaga to skonfigurowania ekranu zgody OAuth i utworzenia identyfikatora klienta OAuth 2.0 typu "Aplikacja Chrome" w Google Cloud Console.
    *   **Manifest (`manifest.json`):**
        *   Dodanie uprawnienia `identity`.
        *   Zdefiniowanie sekcji `oauth2` z `client_id` (uzyskanym z GCP) i wymaganymi `scopes` (np. `https://www.googleapis.com/auth/userinfo.email` dla podstawowych informacji, plus dodatkowe zakresy dla konkretnych API, jeśli są potrzebne).
        *   Dodanie klucza `key` (generowanego przez Chrome podczas pakowania) do konfiguracji klienta OAuth w GCP dla opublikowanego rozszerzenia.
    *   **Background Script:** Wywołanie `chrome.identity.getAuthToken({ interactive: true })` pobierze token dostępowy, który następnie można dołączać do nagłówka `Authorization: Bearer <token>` w żądaniach do API Google.

3.  **Klucze API (Alternatywa/Dodatek):**
    *   Niektóre API Google (jak Gemini) mogą być używane z kluczami API zamiast OAuth.
    *   **Bezpieczeństwo:** Klucze API **nie powinny być osadzane bezpośrednio w kodzie** rozszerzenia (frontend/background). Są one łatwe do wyodrębnienia.
    *   **Zalecane podejścia:**
        *   Wymaganie od użytkownika podania własnego klucza API w opcjach rozszerzenia, przechowywanego bezpiecznie w `chrome.storage`.
        *   Stworzenie własnego serwera pośredniczącego (backend proxy), który bezpiecznie przechowuje klucz API i pośredniczy w zapytaniach od rozszerzenia do API Google. (To bardziej złożone, ale najbezpieczniejsze).
    *   Na potrzeby tego projektu, jeśli zdecydujemy się na klucz API dla Gemini, rozważymy opcję z kluczem podawanym przez użytkownika.

4.  **Uprawnienia w Manifeście (`manifest.json`):**
    *   Oprócz `identity` i `storage`, potrzebne będą uprawnienia `host_permissions` do komunikacji z domenami API Google, np. `https://generativelanguage.googleapis.com/` dla Gemini, `https://www.googleapis.com/` ogólnie.
    *   Należy dążyć do jak najbardziej szczegółowych uprawnień hosta.

5.  **Obsługa Żądań (Background Script):**
    *   Większość logiki związanej z wywoływaniem API Google (pobieranie tokenu/klucza, wysyłanie żądań `fetch`, obsługa odpowiedzi i błędów) powinna znajdować się w background skrypcie, aby oddzielić ją od UI i zarządzać cyklem życia.
    *   Komunikacja między popupem/content scriptem a background skryptem odbywa się za pomocą `chrome.runtime.sendMessage` i `chrome.runtime.onMessage`.

## Zastosowanie w Projekcie

### A. Fasada AI/LLM (Gemini)

*   **API:** Użyjemy [Gemini API](https://ai.google.dev/).
*   **Model:** **`gemini-2.5-flash-preview-04-17`** (dostępny w Vertex AI Preview).
*   **Uwierzytelnianie:** **Klucz API**. Klucz będzie zarządzany lokalnie przez plik `.env` (niecommitowany do repo) i wstrzykiwany do builda przez Webpack. Deweloperzy muszą dostarczyć własny klucz. Docelowo możliwa konfiguracja klucza w UI rozszerzenia.
*   **Endpoint:** Prawdopodobnie przez Vertex AI API, np. `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.5-flash-preview-04-17:streamGenerateContent` (lub odpowiednik dla non-streaming, lub przez SDK jak `@google/generative-ai`).

### B. Konwerter Walut

*   **Poszukiwanie API Google:** Należy zbadać, czy Google oferuje publiczne, darmowe lub rozsądnie wycenione API do pobierania aktualnych kursów walut, które można by wykorzystać w rozszerzeniu Chrome.
    *   *Wstępne wyszukiwanie sugeruje, że Google nie udostępnia dedykowanego, publicznego API do kursów walut. Funkcja konwersji w wyszukiwarce Google niekoniecznie przekłada się na dostępne API.*
*   **Decyzja:** Używamy zewnętrznego dostawcy **exchangerate-api.com**. Klucz API jest wymagany i zarządzany przez `.env` oraz Webpack.
*   **Integracja:** Logika pobierania i cachowania kursów znajduje się w `exchangeRateService.ts` wywoływanym z background scriptu.

## Dalsze Kroki

1.  **Utworzenie projektu w Google Cloud Console.**
2.  **Skonfigurowanie ekranu zgody OAuth.**
3.  **Utworzenie identyfikatora klienta OAuth 2.0 typu "Aplikacja Chrome".**
4.  **Zaktualizowanie `manifest.json` o odpowiednie uprawnienia (`identity`, `storage`, `host_permissions` dla `aiplatform.googleapis.com`) i potencjalnie sekcję `oauth2` (jeśli inne API Google będą jej wymagać).**
5.  **Dogłębne zbadanie dostępności API Google do kursów walut.** 