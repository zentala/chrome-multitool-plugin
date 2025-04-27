# TODO List

## Sprint 1: Konwerter Walut z AI

### Faza 0: Konfiguracja i Przygotowanie Środowiska (Przed kodowaniem)

-   [ ] Utworzenie projektu Google Cloud (jeśli nie istnieje).
-   [ ] Włączenie API: Vertex AI API (dla Gemini) w Google Cloud.
-   [ ] Wygenerowanie klucza API dla Google Gemini (Vertex AI).
-   [ ] Rejestracja na `exchangerate-api.com` i uzyskanie klucza API.
-   [ ] Utworzenie lokalnego pliku `.env` i wstawienie obu kluczy API (`GEMINI_API_KEY`, `EXCHANGERATE_API_KEY`).
-   [ ] Potwierdzenie działania wstrzykiwania klucza Gemini przez Webpack (próba `npm run build` i sprawdzenie kodu wynikowego lub test w konsoli).

### Faza 1: Podstawy Serwisów (Backend Logic)

-   [ ] Implementacja podstawowej struktury Fasady AI (`src/services/aiFacade.ts`) - Interfejs.
-   [ ] Implementacja adaptera Google AI (`src/services/ai/googleAiAdapter.ts`):
    -   [ ] Odczyt klucza API (`process.env.GEMINI_API_KEY`).
    -   [ ] Podstawowa funkcja wysyłania zapytania do `gemini-2.5-flash-preview-04-17` (bez konkretnego promptu na razie).
-   [ ] Zaprojektowanie **konkretnego promptu** dla LLM do parsowania kwoty i waluty (z uwzględnieniem formatu wejściowego i oczekiwanego JSON-a wyjściowego, w tym błędów).
-   [ ] Implementacja serwisu kursów walut (`src/services/exchangeRateService.ts`):
    -   [ ] Funkcja pobierania kursu dla pary z `exchangerate-api.com` (użycie klucza API).
    -   [ ] Implementacja logiki cachowania kursów w `chrome.storage.local` (per para walutowa, z timestampem).
    -   [ ] Implementacja logiki odświeżania cache (sprawdzanie wieku, pobieranie jeśli > 24h).
-   [ ] Implementacja serwisu storage (`src/services/storageService.ts`) - prosty wrapper dla `chrome.storage.local` i `sync`.

### Faza 2: Logika Background Scriptu

-   [x] Struktura `src/background/index.ts`.
-   [x] Implementacja nasłuchiwania na wiadomości z popupa (`chrome.runtime.onMessage` dla `parseAndConvertCurrency`).
-   [x] Implementacja logiki orkiestracji dla konwersji z popupa (`handleCurrencyConversionRequest`).
-   [ ] Implementacja nasłuchiwania na wiadomości z popupa (`chrome.runtime.onMessage` dla `clarifyAndConvertCurrency`).
    -   [ ] Logika przekazania klaryfikacji do Fasady AI (np. przez modyfikację promptu lub nową metodę w adapterze).
-   [x] Implementacja dodawania opcji do menu kontekstowego (`chrome.contextMenus.create` w `background/listeners.ts`).
-   [x] Implementacja obsługi kliknięcia w menu kontekstowe (wywołanie `handleCurrencyConversionRequest`).
-   [ ] Wyświetlenie wyniku z menu kontekstowego (Decyzja: `chrome.notifications` czy inaczej? Naprawienie błędu typu). // Błąd typu nierozwiązany

### Faza 3: Interfejs Użytkownika (Frontend - Popup)

-   [ ] **Projekt szczegółowego UI/UX** dla popupa (layout, przepływ przy błędzie LLM, stany ładowania).
-   [x] Utworzenie komponentu `src/components/CurrencyConverter/CurrencyConverter.tsx`.
-   [x] Implementacja UI (input, przycisk, miejsce na wynik/błędy).
-   [x] Zarządzanie stanem komponentu (input, ładowanie, wynik, błędy - `useState`).
-   [x] Implementacja wysyłania wiadomości do background scriptu (`parseAndConvertCurrency`).
-   [x] Implementacja odbierania i wyświetlania wyników/błędów z background scriptu.
-   [x] Implementacja UI i logiki do obsługi `needsClarification` (dodatkowy input, wysłanie `clarifyAndConvertCurrency`).

### Faza 4: Integracja, Finalizacja i Testy

-   [ ] Finalizacja pliku `manifest.json` (sprawdzenie uprawnień `bookmarks`, `tabs`).
-   [ ] Implementacja **szczegółowej obsługi błędów** (sieciowych, API, parsowania) w serwisach i background skrypcie.
-   [ ] **Implementacja Testów** (zgodnie z [.cursor/TODO_TESTS.md](.cursor/TODO_TESTS.md)):
    -   [ ] Konfiguracja środowiska testowego (Jest, ts-jest, @types/jest).
    -   [ ] Mockowanie API Chrome (`jest-chrome`?).
    -   [ ] Pisanie testów jednostkowych.
    -   [ ] Pisanie testów integracyjnych.
    -   [ ] Pisanie testów usług API (manualnie uruchamianych).
-   [ ] Testowanie manualne całego przepływu.

### Faza 5: Przyszłe Ulepszenia (Backlog)

-   [ ] Możliwość konfiguracji klucza API Gemini w UI rozszerzenia.
-   [ ] Możliwość wyboru waluty docelowej (nie tylko PLN).
-   [ ] Ulepszenie obsługi błędów LLM (np. bardziej interaktywne podpowiedzi).
-   [ ] Optymalizacje wydajności / użycia API.
-   [ ] Dodanie innych modeli AI do Fasady.

---
*(Starsze TODO poniżej, można je potem włączyć w nowy plan lub usunąć)*

-   [ ] Skonfigurowanie integracji z Google Cloud Platform (zobacz [.cursor/SPEC_GOOGLE.md](.cursor/SPEC_GOOGLE.md) po szczegóły). 