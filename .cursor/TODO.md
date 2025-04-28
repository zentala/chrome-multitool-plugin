# Główny Plik TODO dla Projektu ZNTL Chrome Multitool

## Ogólne

- [x] Zdefiniować podstawową strukturę projektu (manifest, webpack, typescript)
- [x] Skonfigurować ESLint i Prettier dla spójności kodu.
- [ ] Dodać podstawowe testy jednostkowe przy użyciu Vitest.
- [x] Skonfigurować CI/CD (np. GitHub Actions) do automatycznego budowania i testowania.
- [x] Stworzyć plik `.cursor/CURSOR.md` z ogólnym opisem projektu.
- [x] Stworzyć `.cursor/WHY.md` do dokumentowania decyzji architektonicznych.
- [x] Utworzyć ten plik (`TODO.md`).

## Funkcjonalności

### Konwerter Walut

- [x] Dodać menu kontekstowe do zaznaczonego tekstu.
- [x] Zaimplementować logikę do wyciągania kwoty i waluty z zaznaczonego tekstu.
- [x] Zintegrować z zewnętrznym API do pobierania kursów walut (np. NBP API lub inny darmowy).
  - [x] Obsługa podstawowych przypadków (np. "100 EUR", "50 USD").
  - [ ] Obsługa bardziej złożonych przypadków (np. "$50.50", "100 złotych").
- [x] Wyświetlanie wyniku konwersji (początkowo w konsoli, potem jako powiadomienie).
- [x] Ulepszyć obsługę błędów (np. gdy tekst nie zawiera kwoty, problem z API).
- [x] Refaktoryzacja logiki powiadomień w `background/listeners.ts` i poprawa typowania `NotificationOptions`.
- [ ] Dodanie opcji w Popupie do ustawienia domyślnej waluty docelowej.
- [ ] Dodanie testów dla logiki parsowania i konwersji.
- [ ] Utworzenie `.usage.md` dla modułu konwertera.

### Notatki

- [ ] Zaimplementować prosty system notatek w Popupie.
- [ ] Zapisywanie notatek w `chrome.storage.local`.
- [ ] Możliwość dodawania, edycji i usuwania notatek.

### Czytnik RSS (Opcjonalnie)

- [ ] Dodanie funkcjonalności czytnika RSS w Popupie.
- [ ] Możliwość dodawania i zarządzania subskrypcjami RSS.
- [ ] Wyświetlanie najnowszych wpisów.

## Dokumentacja i Metadane

- [ ] [Implementacja generowania dokumentacji](.cursor/TODO_docs_generation.md)
- [x] Utworzyć `.meta.md` dla głównych folderów (`src`, `background`, `components`, `services` itp.).
- [ ] Regularnie aktualizować `.cursor/CURSOR.md`, `.cursor/WHY.md`.
- [ ] Prowadzić log decyzji w `.cursor/DECISIONS_<date>.md`.
- [ ] Logować nieudane eksperymenty w `.cursor/failedexperiments/`.
- [ ] Prowadzić log błędów w `.cursor/ERRORS.md`.
- [ ] Dokumentować `CODE_SMELLS` w `.cursor/CODE_SMELLS.md`.
- [ ] Cotygodniowy log nastroju w `.cursor/DEV_MOOD_TRACKER.md`.
- [ ] Zdefiniować filozofię projektu w `.cursor/PHILOSOPHY.md`.
- [ ] Zapisywać mądrości programistyczne w `.cursor/RANDOM_WISDOM.md`.

## Poprawki i Refaktoryzacja

- [ ] Przejrzeć kod pod kątem potencjalnych optymalizacji.
- [ ] Zidentyfikować i naprawić wszelkie `TODO` i `FIXME` w kodzie.
- [ ] Upewnić się, że zależności są aktualne.
- [ ] Zbadać i rozwiązać problemy z PSReadLine (zobacz `.cursor/PWSH_ISSUES.md`).
- [ ] **[Przyszłość]** Zbadać i znaleźć **prawdziwe rozwiązanie** problemu wrażliwości terminala AI (`run_terminal_cmd`) na konfigurację profilu PowerShell, aby uniknąć konieczności utrzymywania czystego profilu jako obejścia (zobacz `.cursor/PWSH_ISSUES.md`).

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