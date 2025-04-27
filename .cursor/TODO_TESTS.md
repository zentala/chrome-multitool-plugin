# Plan Testów i Postęp Prac dla Zentala Chrome Multitool

## Wprowadzenie

Ten dokument opisuje strategię testowania dla rozszerzenia Chrome "Zentala Chrome Multitool" oraz śledzi postęp implementacji testów.

## Rodzaje Testów (Strategia)

Planujemy wykorzystać kilka rodzajów testów, aby zapewnić jakość i stabilność rozszerzenia:

1.  **Testy Jednostkowe (Unit Tests):**
    *   **Cel:** Weryfikacja poprawności działania małych, izolowanych fragmentów kodu.
    *   **Narzędzia:** `Vitest`, `@testing-library/react`.
    *   **Co testować:** Funkcje pomocnicze (`utils`), logika czystych funkcji w serwisach, komponenty React.

2.  **Testy Integracyjne (Integration Tests):**
    *   **Cel:** Weryfikacja współpracy między modułami z mockowanymi zależnościami zewnętrznymi.
    *   **Narzędzia:** `Vitest`, mockowanie (`vi.fn()`, `vi.spyOn()`).
    *   **Co testować:** Interakcja UI-background, logika orkiestracji w `background`, serwisy (`aiFacade`, `exchangeRateService`) z mockowanymi zależnościami.

3.  **Testy Usług API (Service / End-to-End for Services):**
    *   **Cel:** Sprawdzenie komunikacji z **rzeczywistymi** zewnętrznymi API (manualnie/CI).
    *   **Narzędzia:** `Vitest`.
    *   **Co testować:** Poprawność zapytań i struktury odpowiedzi dla API Gemini i ExchangeRate-API.

4.  **Testy Manualne (Manual / Exploratory Testing):**
    *   **Cel:** Sprawdzenie działania aplikacji z perspektywy użytkownika.
    *   **Narzędzia:** Przeglądarka Chrome.
    *   **Co testować:** Główne przepływy użytkownika, obsługa błędów, UI.

5.  **Testy E2E / UI (Opcjonalnie/Przyszłość):**
    *   **Cel:** Automatyzacja testów manualnych UI.
    *   **Narzędzia:** `Puppeteer`/`Playwright`.

## Lista Zadań Implementacyjnych Testów

- [x] **Konfiguracja Środowiska Testowego:**
    - [x] Ustawienie `Vitest` (`vitest.config.ts`).
    - [x] Instalacja zależności (`@vitest/coverage-v8`, `jsdom`).
    - [x] Konfiguracja `setupFiles` (`src/setupTests.ts`).
    - [x] Aktualizacja skryptu `test` w `package.json`.
    - [x] Usunięcie konfiguracji i zależności Jest.
- [x] **Mockowanie API Chrome:**
    - [x] Stworzenie mocków dla `chrome.*` API w `src/setupTests.ts` przy użyciu `vi.stubGlobal`.
- [ ] **Pisanie Testów Jednostkowych:**
    - [x] `src/utils/storage.ts`
    - [ ] TODO: Dodać testy dla przyszłych funkcji w `src/utils`.
    - [ ] TODO: Przejrzeć i ewentualnie uzupełnić testy dla `src/services/ai/googleAiAdapter.ts`.
    - [ ] TODO: Przejrzeć i ewentualnie uzupełnić testy dla `src/services/exchangeRateService.ts`.
    - [ ] TODO: Przejrzeć i ewentualnie uzupełnić testy dla komponentów React (`src/components/...`), np. `CurrencyConverter.tsx`.
- [ ] **Pisanie Testów Integracyjnych:**
    - [ ] `src/background/index.ts`: Testowanie logiki orkiestracji (wywołania serwisów, obsługa wiadomości) z mockowanymi serwisami.
    - [ ] Testowanie interakcji Popup (`CurrencyConverter`) -> Background Script (przez mock `chrome.runtime.sendMessage`).
    - [ ] Testowanie interakcji Content Script -> Background Script (jeśli dotyczy).
    - [ ] Testowanie interakcji Context Menu -> Background Script (przez mock `chrome.contextMenus.onClicked`).
- [ ] **Pisanie Testów Usług API:**
    - [ ] `src/services/ai/googleAiAdapter.service.test.ts`: Test rzeczywistego zapytania do API Gemini (uruchamiany manualnie).
    - [ ] `src/services/exchangeRateService.service.test.ts`: Test rzeczywistego zapytania do ExchangeRate-API (uruchamiany manualnie).
- [ ] **Regularne Testy Manualne:**
    - [ ] Wykonywać testy eksploracyjne po każdej większej zmianie.

## Pokrycie Testami (Stan Aktualny)

- **Utils:** Podstawowe pokrycie (`storage.ts`).
- **Services:** Istnieją testy dla `googleAiAdapter.ts` i `exchangeRateService.ts` (do przejrzenia).
- **Components:** Istnieją testy dla `CurrencyConverter.tsx` (do przejrzenia).
- **Background:** Brak testów integracyjnych.
- **API Services:** Brak testów.
- **E2E:** Brak testów.

**Cel:** Dążyć do wysokiego pokrycia kodu testami jednostkowymi i integracyjnymi dla logiki biznesowej (serwisy, background script, utils, kluczowe komponenty). Testy usług API zapewnią działanie integracji. Testy manualne/E2E pokryją przepływ użytkownika.