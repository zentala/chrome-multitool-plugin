# TODO dla .cursor i @context

## Kluczowe Usprawnienia i Refaktoryzacja (Priorytetyzowane)

- [ ] przygotouj to do commitowania jako osbny projekt: stworz porzadne README .gitignore oraz ew inne niezbdne rzeczy przed commitem jako osobne repo aby to prozadnie wygladalo - po ang rzecz jasna
- [ ] **Architektura:** Rozważyć i zaprojektować obsługę wielu lokalizacji kontekstu/szablonów (np. kontekst narzędzia vs. kontekst w katalogu projektu użytkownika, np. `<proj>/app/src/..`). Może wymagać przeprojektowania `contextDataPath` i/lub dodania parametrów do narzędzi.
- [ ] dodaj lintowanie npm run lint
- [ ] dodaj coverage test jesli mozliwe czy licz pokrycie kodu jesli sie da latwo lokalnie


**P1: Zwiększenie Elastyczności i Użyteczności Narzędzi**
- [x] **Implementacja Argumentu Linii Poleceń:** Dodać argument `--context-data-path` do `mcp/context/src/index.js`, aby umożliwić używanie serwera @context z danymi z różnych projektów. Dodać logowanie używanej ścieżki.
- [x] **Ustrukturyzowane Odpowiedzi:** Zmodyfikować `listEntries.js`, aby zwracał JSON zamiast tekstu.
- [x] **Ustrukturyzowane Odpowiedzi:** Zmodyfikować `getRelatedEntries.js`, aby zwracał tablicę ID (JSON) zamiast tekstu.
- [x] **Poprawa Obsługi Błędów:** Zmodyfikować `searchEntries.js`, aby błędy odczytu/parsowania nie były dodawane do wyników wyszukiwania.

**P2: Stabilność, Utrzymanie i Niezawodność**
- [x] **Naprawa Testów:** Naprawić testy dla `listEntries` i `searchEntries` po zmianach w `parseFrontMatter`.
- [x] **Refaktoryzacja:** Wydzielić logikę przetwarzania/formatowania metadanych w `listEntries.js` do funkcji pomocniczej.
- [x] **Refaktoryzacja:** Wydzielić logikę przetwarzania pojedynczego pliku w `searchEntries.js` do funkcji pomocniczej.
- [x] **Analiza Konfliktów:** Przeanalizować logikę łączenia metadanych i zmiennych w `createFromTemplate.js`.
- [ ] **Poprawa Obsługi Błędów:** Ulepszyć obsługę błędów odczytu plików w `listEntries.js`.

**P3: Dalsze Ulepszenia i Sprzątanie**
- [ ] **Optymalizacja Wydajności:** Rozważyć optymalizację `searchEntries.js` (np. Promise.all).
- [ ] **Optymalizacja Wydajności:** Rozważyć optymalizację walidacji w `getRelatedEntries.js` (np. Promise.allSettled).
- [ ] **Ulepszenie Nazw Plików:** Rozważyć ulepszenie czyszczenia nazw plików w `createEntry.js` (np. `slugify`).
- [ ] **Ulepszenie Nazw Plików:** Rozważyć ulepszenie czyszczenia nazw plików w `createFromTemplate.js` (np. `slugify`).
- [ ] **Sprzątanie Kodu:** Usunąć logikę fallback dla szablonów w `createFromTemplate.js` po migracji.
- [ ] **Konfiguracja Snippetów:** Rozważyć dodanie opcji konfiguracji liczby linii kontekstu w `searchEntries.js`.


## Mniej Priorytetowe / "Nice-to-have"

- [ ] Rozważyć ulepszenie formatowania metadanych w `listEntries.js` (większa elastyczność).
- [ ] Rozważyć uelastycznienie formatu ID w polu `related` w `getRelatedEntries.js`.
- [ ] Rozważyć użycie bardziej zaawansowanej biblioteki do szablonów w `createFromTemplate.js` (np. Handlebars), jeśli obecna składnia okaże się niewystarczająca.


