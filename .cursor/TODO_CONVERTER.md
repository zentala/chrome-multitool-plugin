\
# Specyfikacja Modułu Konwertera Walut

## Wprowadzenie

Moduł konwertera walut ma na celu umożliwienie użytkownikom szybkiego przeliczania wartości walutowych bezpośrednio w przeglądarce Chrome. Funkcjonalność będzie dostępna zarówno z poziomu popupu rozszerzenia, jak i z menu kontekstowego na stronach internetowych.

## Wymagania Funkcjonalne

### 1. Konwersja z Popupu Rozszerzenia

-   **Interfejs:**
    -   W popupie rozszerzenia, poniżej istniejących sekcji (Bookmark Manager, Allegro Bookmarks), powinna pojawić się nowa sekcja "Konwerter Walut".
    -   Sekcja powinna zawierać pole tekstowe (input), do którego użytkownik może wkleić lub wpisać wartość walutową (np. "100 USD", "€50", "25 GBP").
    -   Poniżej pola wejściowego powinien wyświetlać się wynik konwersji na PLN (docelowo na wybraną walutę, na razie tylko PLN).
    -   Format wejściowy może być dowolny, np. "100 dollars", "fifty euros", "25 фунтів". Parsowanie będzie realizowane przez LLM.
-   **Logika:**
    -   Po wprowadzeniu wartości, tekst jest wysyłany do Fasady AI/LLM (zobacz [TODO_LLM_API.md](TODO_LLM_API.md)) w celu sparsowania kwoty i waluty źródłowej.
    -   LLM powinien zwrócić strukturę JSON, np. `{ amount: 100, currency: "USD" }` lub `{ error: "currency_not_recognized" }`.
    -   Jeśli LLM rozpozna kwotę i walutę, system pobiera odpowiedni kurs wymiany (np. USD -> PLN) z cache lub API kursów.
    -   Wynik konwersji jest wyświetlany użytkownikowi.
    -   **Obsługa nierozpoznanej waluty przez LLM:**
        -   Jeśli LLM nie rozpozna waluty (zwróci błąd), wyświetlany jest komunikat dla użytkownika z prośbą o podanie kodu waluty źródłowej (np. "Nie rozpoznano waluty. Podaj kod ISO (np. USD, EUR):").
        -   Użytkownik wprowadza kod w dodatkowym polu input.
        -   Oryginalny tekst wejściowy wraz z podpowiedzią użytkownika (np. "użytkownik podał, że to USD") jest ponownie wysyłany do LLM w celu ponownego sparsowania kwoty i potwierdzenia waluty.

### 2. Konwersja z Menu Kontekstowego

-   **Interfejs:**
    -   Po zaznaczeniu tekstu na dowolnej stronie internetowej, użytkownik powinien mieć możliwość kliknięcia prawym przyciskiem myszy.
    -   W menu kontekstowym powinna pojawić się nowa opcja, np. "ZNTL: Przelicz walutę na PLN".
    -   Po wybraniu tej opcji, powinien pojawić się (np. w formie notyfikacji lub małego popupu) wynik przeliczenia zaznaczonej kwoty na PLN.
-   **Logika:**
    -   Zaznaczony tekst jest wysyłany do Fasady AI/LLM w celu sparsowania kwoty i waluty źródłowej (podobnie jak w popupie).
    -   Jeśli parsowanie się powiedzie, kwota jest przeliczana na PLN przy użyciu aktualnego kursu (z cache lub API).
    -   Należy obsłużyć przypadki, gdy LLM nie rozpozna kwoty/waluty w zaznaczonym tekście (np. wyświetlić komunikat o błędzie w notyfikacji).

### 3. Zarządzanie Kursami Walut

-   **Pobieranie Kursów:**
    -   Należy wybrać **międzynarodowe, darmowe lub niedrogie API** do pobierania kursów walut (**Wybrano: ExchangeRate-API (exchangerate-api.com)** ze względu na limit 1500 req/miesiąc, możliwość zmiany bazy i endpoint `/pair`). *Sprawdzono, że Google API nie jest dostępne ([SPEC_GOOGLE.md](SPEC_GOOGLE.md)).*
    -   Kursy powinny być pobierane dla **różnych par walutowych**, nie tylko względem PLN. API powinno umożliwiać pobranie kursów względem np. USD lub EUR jako bazy.
-   **Cache:**
    -   Pobrane kursy walut powinny być przechowywane w lokalnym cache (`chrome.storage.local`) jako obiekt, gdzie kluczami są pary walutowe (np. "USD_PLN", "EUR_PLN", "GBP_USD").
    -   Każda para walutowa w cache powinna mieć **osobny timestamp** ostatniej aktualizacji.
    -   Cache powinien być odświeżany automatycznie, ale tylko wtedy, gdy użytkownik aktywnie korzysta z funkcji konwertera **dla danej pary walutowej**.
    -   **Mechanizm odświeżania (dla konkretnej pary, np. USD -> PLN):**
        -   Przy próbie konwersji USD -> PLN, sprawdzić timestamp dla pary "USD_PLN" w cache.
        -   Jeśli dane dla "USD_PLN" są starsze niż 24 godziny (lub brak danych), spróbować pobrać nowy kurs dla tej pary (lub wszystkie kursy, jeśli API na to pozwala efektywnie) z API.
        -   Jeśli pobranie nowych kursów się powiedzie, zaktualizować odpowiednie wpisy w cache wraz z nowym timestampem.
        -   Jeśli pobranie się nie powiedzie, użyć starych danych z cache dla "USD_PLN" (jeśli istnieją).
        -   Jeśli użytkownik nie używa konwersji dla danej pary, nie wykonywać dla niej żądań do API.
-   **API Kursów Walut:** **ExchangeRate-API (exchangerate-api.com)**.
-   **Fasada AI:** Zdefiniowana w [TODO_LLM_API.md](TODO_LLM_API.md), używana do parsowania inputu. *Integracja z Google (Gemini) opisana w [SPEC_GOOGLE.md](SPEC_GOOGLE.md).*

## Wymagania Niefunkcjonalne

-   **Wydajność:** Minimalizować liczbę zapytań do API (LLM i kursów walut) przez efektywne cachowanie.
-   **Obsługa Błędów:** Należy obsłużyć sytuacje błędne: nierozpoznana waluta przez LLM (z interakcją użytkownika), błąd API kursów, błąd API LLM, niepoprawny format wejściowy.
-   **Prywatność:** Rozważyć, jakie dane są wysyłane do zewnętrznego LLM (tylko niezbędne minimum).
-   **UI/UX:** Interfejs powinien być prosty, intuicyjny i spójny z resztą rozszerzenia. Wyniki LLM i konwersji powinny być jasno prezentowane.

## Architektura (Propozycja)

-   **Frontend (Popup & Content Script):** React, TypeScript, SASS/CSS.
-   **Backend (Background Script):** TypeScript.
    -   Orkiestracja: przyjmowanie zapytań z UI, wywoływanie Fasady AI, wywoływanie serwisu kursów walut.
    -   Serwis Kursów Walut (`src/services/exchangeRateService.ts`):
        -   Logika pobierania i cachowania kursów walut (zgodnie z wymaganiami cache per para).
        -   Komunikacja z wybranym API kursów walut.
-   **Storage:** `chrome.storage.local` do przechowywania cache kursów i potencjalnie konfiguracji AI.
-   **API Kursów Walut:** **ExchangeRate-API (exchangerate-api.com)**.
-   **Fasada AI:** Zdefiniowana w [TODO_LLM_API.md](TODO_LLM_API.md), używana do parsowania inputu. *Integracja z Google (Gemini) opisana w [SPEC_GOOGLE.md](SPEC_GOOGLE.md).*

## Dalsze Kroki

1.  ~~Wybór i analiza API kursów walut~~ (**Wybrano: ExchangeRate-API (exchangerate-api.com)**).
2.  **Wybór początkowego modelu LLM** i implementacja podstawowej Fasady AI (zgodnie z [TODO_LLM_API.md](TODO_LLM_API.md)).
3.  Projekt szczegółowego interfejsu użytkownika (popup z obsługą inputu LLM i ewentualnym pytaniem o walutę, notyfikacje z menu kontekstowego).
4.  Implementacja `exchangeRateService.ts` (pobieranie, cachowanie per para).
5.  Implementacja logiki w background script integrującej UI, Fasadę AI i `exchangeRateService`.
6.  Implementacja UI w React.
7.  Testowanie (jednostkowe, integracyjne, manualne).

## Proponowana Struktura Plików

```markdown
chrome-multitool-plugin/
├── .cursor/
│   ├── TODO.md
│   ├── TODO_CONVERTER.md
│   └── TODO_LLM_API.md
├── .github/
│   └── workflows/
│       └── build-test.yml  # (Optional CI/CD)
├── dist/                   # Build output (generated by Webpack)
├── public/
│   ├── icons/
│   │   └── icon128.png     # Extension icons
│   ├── manifest.json       # Extension manifest
│   └── popup.html          # HTML for the popup
├── src/
│   ├── background/
│   │   └── index.ts        # Main background script entry point
│   │   └── listeners.ts    # Event listeners (e.g., context menu)
│   │   └── ...
│   ├── components/         # Reusable React components (UI)
│   │   ├── CurrencyConverter/
│   │   │   └── CurrencyConverter.tsx
│   │   ├── BookmarkManager/
│   │   │   └── ...
│   │   └── common/         # Common UI elements (Buttons, Inputs)
│   │   └── ...
│   ├── content/
│   │   └── index.ts        # Content script entry point (if needed for context menu interaction beyond basic text selection)
│   ├── hooks/              # Custom React hooks
│   ├── interfaces/         # TypeScript interfaces and types
│   │   ├── index.ts
│   │   └── Currency.ts
│   │   └── AI.ts
│   │   └── ...
│   ├── popup/
│   │   ├── index.tsx       # React entry point for the popup
│   │   └── Popup.tsx       # Main popup component
│   │   └── ...
│   ├── services/           # Business logic, API communication
│   │   ├── ai/             # AI Facade adapters
│   │   │   └── googleAiAdapter.ts
│   │   │   └── ...
│   │   ├── aiFacade.ts     # AI Facade implementation
│   │   ├── exchangeRateService.ts # Currency conversion logic & caching
│   │   └── storageService.ts      # Wrapper for chrome.storage
│   │   └── ...
│   ├── styles/             # SASS/CSS files
│   │   ├── main.scss
│   │   └── variables.scss
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   └── parsingUtils.ts # (Maybe less needed if LLM handles most parsing)
│   │   └── ...
│   └── config/             # Configuration files
│       └── aiConfig.ts
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── .prettierignore
├── .prettierrc.js
├── jest.config.js
├── package.json
├── README.md
├── tsconfig.json
└── webpack.config.js
```

*(Tutaj możemy dalej rozwijać specyfikację)* 