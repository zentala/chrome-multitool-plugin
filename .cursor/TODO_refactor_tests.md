# TODO: Refaktoryzacja testów

Lista zadań związanych z poprawą i refaktoryzacją testów jednostkowych i integracyjnych.

- [x] Poprawić mockowanie w `installation.test.ts`, aby uniknąć inicjalizacji `AIProvider`.
- [x] Rozwiązać problem z logowaniem `Unexpected core logic failure` w `contextMenu.test.ts` (problem rozwiązany przez mockowanie `console.error`).
- [x] Naprawić błąd `Testing environment is not configured to support act(...)` w `CurrencyConverter.test.tsx` (problem rozwiązany przez refaktoryzację do `userEvent`).
- [x] Zbadać i naprawić błąd `No test suite found` w `index.test.ts` i `handleCurrencyConversionRequest.test.ts` (usunięto `index.test.ts`, dodano testy do `handleCurrency...`, ale występuje problem z mockowaniem).
- [ ] Skonfigurować zmienne środowiskowe (np. `EXCHANGERATE_API_KEY`) w środowisku testowym lub zapewnić odpowiednie mocki dla serwisów zewnętrznych.
- [ ] Dodać brakujące importy w plikach testowych (np. `ConversionResult` w `contextMenu.test.ts`).
- [ ] Zaktualizować `./.cursor/TODO.md` dodając link do tego pliku.
- [ ] **FIXME:** Rozwiązać problem z mockowaniem/API key w `handleCurrencyConversionRequest.test.ts` (oznaczony w kodzie). 