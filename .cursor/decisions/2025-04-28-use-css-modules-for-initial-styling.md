# Decision Log

## 2025-04-28 — Use CSS Modules for Initial Styling of CurrencyConverter

- **Context:** 
  Potrzeba ostylowania komponentu `CurrencyConverter.tsx`, który wcześniej używał stylów inline. Wymagana jest poprawa organizacji i czytelności kodu stylów.

- **Options considered:** 
  1.  **Inline Styles:** Kontynuacja obecnego podejścia (odrzucone jako nieczytelne i trudne w utrzymaniu).
  2.  **CSS Modules:** Standardowe rozwiązanie w ekosystemie React/Webpack, zapewniające lokalny scope klas CSS.
  3.  **Styled Components / Emotion:** Popularne biblioteki CSS-in-JS, oferujące dynamiczne stylowanie.
  4.  **Tailwind CSS:** Framework utility-first, wymagający konfiguracji i nauki klas.
  5.  **Inne biblioteki UI (Chakra, Material UI):** Wprowadzenie gotowych komponentów i systemu designu.

- **Decision taken:** 
  Wybrano **CSS Modules** jako początkowe rozwiązanie do ostylowania komponentu `CurrencyConverter`.

- **Why this choice:** 
  *   **Prostota i Standard:** Jest to funkcja wspierana przez używany Webpack, nie wymaga dodawania dużych, nowych zależności.
  *   **Krok Pośredni:** Stanowi znaczącą poprawę względem stylów inline bez wprowadzania dużej złożoności na tym etapie.
  *   **Skupienie na Funkcjonalności:** Pozwala szybko poprawić wygląd komponentu i wrócić do implementacji kluczowych funkcji konwertera walut.
  *   **Łatwość Refaktoryzacji:** Nie blokuje przejścia na bardziej zaawansowane rozwiązania (np. Tailwind, Styled Components) w przyszłości, gdy projekt będzie bardziej dojrzały.

- **Risks or alternatives noted:** 
  *   CSS Modules mogą być mniej elastyczne niż CSS-in-JS dla dynamicznych stylów.
  *   Nie dostarczają gotowego systemu designu jak biblioteki UI.
  *   Potrzeba późniejszego potencjalnego refactoringu, jeśli zdecydujemy się na inne globalne rozwiązanie do stylowania (co zostało dodane do `TODO.md`).
