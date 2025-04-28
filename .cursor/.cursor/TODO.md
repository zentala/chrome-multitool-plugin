# TODO dla .cursor i @context

- [x] Zbadać i naprawić błąd `TypeError: Cannot convert undefined or null to object` podczas uruchamiania serwera MCP @context (`.cursor/mcp/context/src/index.js`).
- [ ] Rozważyć ulepszenie czyszczenia nazwy pliku w `createEntry.js` (np. użycie `slugify`) dla lepszej obsługi znaków międzynarodowych.
- [ ] Refaktoryzacja `listEntries.js`: Wydzielenie logiki pobierania/formatowania metadanych do funkcji pomocniczej.
- [ ] Rozważyć ulepszenie formatowania metadanych w `listEntries.js` (większa elastyczność).
- [ ] Rozważyć zwracanie ustrukturyzowanej odpowiedzi (JSON) zamiast tekstu w `listEntries.js`.
- [ ] Rozważyć ulepszenie obsługi błędów odczytu plików w `listEntries.js`.
- [ ] Refaktoryzacja `searchEntries.js`: Wydzielenie logiki przetwarzania pojedynczego pliku do funkcji pomocniczej.
- [ ] Poprawić obsługę błędów odczytu/parsowania plików w `searchEntries.js` (nie dodawać ich jako wyników).
- [ ] Rozważyć optymalizację wydajności `searchEntries.js` dla dużej liczby plików (np. Promise.all).
- [ ] Rozważyć dodanie opcji konfiguracji liczby linii kontekstu w `searchEntries.js`.
- [ ] Rozważyć uelastycznienie formatu ID w polu `related` w `getRelatedEntries.js`.
- [ ] Rozważyć optymalizację walidacji powiązanych wpisów w `getRelatedEntries.js` (np. Promise.allSettled).
- [ ] Rozważyć zwracanie ustrukturyzowanej odpowiedzi (np. tablica ID) w `getRelatedEntries.js` zamiast tekstu.
- [ ] Rozważyć użycie bardziej zaawansowanej biblioteki do szablonów w `createFromTemplate.js` (np. Handlebars), jeśli obecna składnia okaże się niewystarczająca.
- [ ] Przeanalizować logikę łączenia metadanych i zmiennych w `createFromTemplate.js` pod kątem potencjalnych konfliktów nazw.
- [ ] Usunąć logikę fallback dla szablonów (do katalogu `TEMPLATES`) w `createFromTemplate.js` po przeniesieniu wszystkich szablonów do `_templates`.
- [ ] Ulepszyć czyszczenie nazwy pliku w `createFromTemplate.js` (podobnie jak w `createEntry.js`).


