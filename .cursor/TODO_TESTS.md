# Plan Testów dla Zentala Chrome Multitool

## Wprowadzenie

Ten dokument opisuje strategię testowania dla rozszerzenia Chrome "Zentala Chrome Multitool", ze szczególnym uwzględnieniem modułu konwertera walut i fasady AI.

## Rodzaje Testów

Planujemy wykorzystać kilka rodzajów testów, aby zapewnić jakość i stabilność rozszerzenia:

1.  **Testy Jednostkowe (Unit Tests):**
    *   **Cel:** Weryfikacja poprawności działania małych, izolowanych fragmentów kodu (funkcji, metod klas) bez zależności zewnętrznych (API, `chrome.*`).
    *   **Narzędzia:** `Jest`, `ts-jest`.
    *   **Co testować:**
        *   Funkcje pomocnicze (`src/utils/...`).
        *   Logika czystych funkcji w serwisach (np. obliczenia, formatowanie).
        *   Komponenty React (renderowanie, podstawowa logika) przy użyciu `@testing-library/react` (opcjonalnie).

2.  **Testy Integracyjne (Integration Tests):**
    *   **Cel:** Weryfikacja współpracy między różnymi modułami/komponentami w ramach rozszerzenia, ale wciąż z mockowanymi zależnościami zewnętrznymi (API, `chrome.*`).
    *   **Narzędzia:** `Jest`, `ts-jest`, mockowanie (`jest.fn()`, `jest.spyOn()`).
    *   **Co testować:**
        *   Interakcja między UI (np. `CurrencyConverter`) a background scriptem (przez mock `chrome.runtime.sendMessage`).
        *   Logika orkiestracji w `background/index.ts` (wywołania `aiFacade`, `exchangeRateService` - oba mockowane).
        *   Działanie `aiFacade` z mockowanymi adapterami.
        *   Działanie `exchangeRateService` z mockowanym `storageService` i `fetch`.
        *   Logika cachowania w `exchangeRateService`.

3.  **Testy Usług API (Service / End-to-End for Services):**
    *   **Cel:** Sprawdzenie, czy potrafimy poprawnie komunikować się z **rzeczywistymi** zewnętrznymi API (Gemini i ExchangeRate-API), zakładając, że klucze API są dostępne w środowisku (`.env`). Te testy będą uruchamiane manualnie lub w specyficznym środowisku CI, aby nie zużywać limitów API przy każdym commicie.
    *   **Narzędzia:** `Jest`, `ts-jest` (lub dedykowany skrypt).
    *   **Co testować:**
        *   `googleAiAdapter.parseCurrency()`: Wywołanie API Gemini z przykładowym tekstem i sprawdzenie, czy odpowiedź ma oczekiwaną strukturę (sukces lub błąd parsowania). Nie sprawdzamy tu dokładności wyniku, a jedynie poprawność komunikacji.
        *   `exchangeRateService.fetchRateFromApi()`: Wywołanie API ExchangeRate-API dla konkretnej pary i sprawdzenie, czy zwracany jest poprawny rate (liczba).

4.  **Testy Manualne (Manual / Exploratory Testing):**
    *   **Cel:** Sprawdzenie działania całej aplikacji z perspektywy użytkownika w przeglądarce.
    *   **Narzędzia:** Przeglądarka Chrome z załadowanym rozszerzeniem.
    *   **Co testować:**
        *   Cały przepływ konwersji w popupie (wpisywanie różnych wartości, obsługa błędów, UI dla `needsClarification`).
        *   Działanie menu kontekstowego (wyświetlanie, klikanie, pojawianie się notyfikacji z wynikiem/błędem).
        *   Reakcja na brak kluczy API (czy są sensowne komunikaty o błędach).
        *   Działanie cachowania (sprawdzenie, czy przy kolejnych zapytaniach nie ma requestów do API - zakładka Network w DevTools).
        *   Ogólna responsywność i wygląd UI.

5.  **Testy E2E / UI (Opcjonalnie/Przyszłość):**
    *   **Cel:** Automatyzacja testów manualnych interfejsu użytkownika.
    *   **Narzędzia:** Narzędzia do automatyzacji przeglądarki (np. `Puppeteer`, `Playwright`) zintegrowane z Jestem.
    *   **Co testować:** Symulacja akcji użytkownika w popupie, weryfikacja wyników na ekranie.

## Strategia Implementacji Testów

1.  **Konfiguracja Środowiska Testowego:** Ustawienie `Jest`, `ts-jest`, `@types/jest`, `@testing-library/react` (jeśli potrzebne).
2.  **Mockowanie API Chrome:** Stworzenie mocków dla `chrome.runtime.sendMessage`, `chrome.storage.local`, `chrome.contextMenus`, `chrome.notifications` (np. przy użyciu `jest-chrome`).
3.  **Pisanie Testów Jednostkowych:** Rozpoczęcie od prostych funkcji pomocniczych.
4.  **Pisanie Testów Integracyjnych:** Skupienie się na logice background scriptu i serwisów z mockowanymi zależnościami.
5.  **Pisanie Testów Usług API:** Stworzenie osobnego zestawu testów (np. `*.service.test.ts`) uruchamianego na żądanie.
6.  **Regularne Testy Manualne:** Wykonywanie testów eksploracyjnych po każdej większej zmianie.

## Pokrycie Testami

Dążyć do wysokiego pokrycia kodu testami jednostkowymi i integracyjnymi dla logiki biznesowej (serwisy, background script). Testy usług API zapewnią działanie integracji. Testy manualne/E2E pokryją przepływ użytkownika. 