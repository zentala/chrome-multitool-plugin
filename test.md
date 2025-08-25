# Strategia Testowania Wtyczki Chrome - Zentala Multitool Plugin

## Analiza Obecnego Stanu Testowania

### Istniejące Testy

**✅ Unit Testy:**
- `CurrencyConverter.test.tsx` - Kompletny test komponentu React (12 test cases)
- `exchangeRateService.test.ts` - Testy mock usługi kursów walut
- `GoogleAIAdapter.test.ts` - Testy mock adaptera AI
- `storage.test.ts` - Testy utility funkcji storage
- `contextMenu.test.ts` - Testy listenera menu kontekstowego
- `handleCurrencyConversionRequest.test.ts` - Testy logiki konwersji walut

**✅ Konfiguracja:**
- Vitest z jsdom environment
- Obszerne mocki Chrome API w `setupTests.ts`
- Coverage reporting z v8 provider

**❌ Brakujące Obszary:**
- End-to-end testy
- Testy integracyjne
- Testy content scripts
- Testy popup interface
- Testy background service worker
- Testy cross-origin communication
- Performance testy
- Security testy
- Accessibility testy

---

## Rekomendowana Strategia Testowania

### 1. Warstwowa Architektura Testów (Testing Pyramid)

```
          E2E Tests (5-10%)
       Integration Tests (15-25%)
    Component/Unit Tests (70-80%)
```

### 2. Narzędzia Testowe

**Podstawowe (istniejące):**
- ✅ Vitest (unit/component testing)
- ✅ React Testing Library (component testing)
- ✅ jsdom (DOM simulation)

**Rekomendowane do dodania:**
- 🔴 Puppeteer/Playwright (E2E testing)
- 🔴 Chrome Extension Testing Library
- 🔴 WebDriverIO (cross-browser testing)

---

## Szczegółowy Plan Implementacji Testów

### Faza 1: Uzupełnienie Unit Testów (2-3 dni)

#### 1.1 Testy Komponentów React
```typescript
// Priorytetowe komponenty do testowania:
- [ ] BookmarkManagerApp.tsx (główny komponent)
- [ ] BookmarksTree.tsx (drzewo zakładek)
- [ ] SearchResults.tsx (wyniki wyszukiwania)
- [ ] YouTubeModule.tsx (moduł YouTube)
- [ ] FavouritesWrapper.tsx (Allegro)
- [ ] ModuleList.tsx (lista modułów w popup)
```

#### 1.2 Testy Serwisów
```typescript
// Krytyczne serwisy:
- [ ] vectorStore.service.ts (główna logika AI)
- [ ] ai.service.ts (integracja z AI)
- [ ] youtube.service.ts (YouTube API)
- [ ] favourites.service.ts (Allegro)
- [ ] notification.service.ts
- [ ] settings.service.ts
```

#### 1.3 Testy Background Scripts
```typescript
- [ ] aiProvider.ts (zarządzanie AI)
- [ ] listeners.ts (wszystkie event listeners)
- [ ] installation.test.ts (rozszerzony)
```

### Faza 2: Testy Integracyjne (3-5 dni)

#### 2.1 Storage Integration Tests
```typescript
// Testy integracji storage:
- [ ] Cross-storage communication (local ↔ sync)
- [ ] IndexedDB ↔ Chrome Storage sync
- [ ] Vector store persistence
- [ ] Settings synchronization
```

#### 2.2 AI Pipeline Integration Tests
```typescript
// Testy pipeline AI:
- [ ] AI Adapter → Exchange Rate Service
- [ ] Context Menu → AI → Notification
- [ ] Bookmark processing pipeline
- [ ] Error handling across services
```

#### 2.3 Content Script Integration
```typescript
// Testy content scripts:
- [ ] Allegro content script integration
- [ ] YouTube content script integration
- [ ] Global injector functionality
```

### Faza 3: End-to-End Testy (5-7 dni)

#### 3.1 Puppeteer Setup
```typescript
// Konfiguracja:
- [ ] Chrome extension loading
- [ ] Service worker communication
- [ ] Content script injection
- [ ] Popup interaction
```

#### 3.2 Krytyczne User Flows
```typescript
// Główne scenariusze:
- [ ] Currency conversion via context menu
- [ ] Currency conversion via popup
- [ ] Bookmark search with AI
- [ ] YouTube integration
- [ ] Allegro favourites management
```

#### 3.3 Cross-Origin Scenarios
```typescript
// Testy międzydomenowe:
- [ ] Allegro.pl integration
- [ ] YouTube.com integration
- [ ] External API calls (AI, exchange rates)
```

### Faza 4: Advanced Testing (3-5 dni)

#### 4.1 Performance & Load Testing
```typescript
- [ ] Vector store performance with 1000+ bookmarks
- [ ] AI request/response times
- [ ] Memory usage monitoring
- [ ] Storage limits handling
```

#### 4.2 Security Testing
```typescript
- [ ] XSS prevention in content scripts
- [ ] CSP compliance
- [ ] API key security
- [ ] Data sanitization
```

#### 4.3 Accessibility Testing
```typescript
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus management
```

---

## Specyficzne Wyzwania Chrome Extensions

### 1. Chrome API Mocking Strategy

**Obecna implementacja jest dobra:**
```typescript
// ✅ Dobra strategia mockowania Chrome API
vi.stubGlobal('chrome', {
  runtime: { sendMessage: vi.fn() },
  storage: { local: { get: vi.fn() } },
  // ... comprehensive mocks
});
```

**Rekomendacje ulepszeń:**
- Mock dynamicznych API responses
- Symulacja różnych permission states
- Testy error conditions

### 2. Content Script Testing

**Strategia:**
```typescript
// Testy content scripts wymagają specjalnego setupu
- [ ] Isolated DOM testing
- [ ] Message passing simulation
- [ ] Cross-origin communication
```

### 3. Service Worker Testing

**Specyficzne wyzwania:**
```typescript
// Service worker ma inne lifecycle niż regularne strony
- [ ] Background script initialization
- [ ] Event-driven architecture
- [ ] Persistence across browser sessions
```

---

## Metryki Jakości Testów

### Coverage Goals
```
- Unit Tests: 80%+ statement coverage
- Integration Tests: 90%+ critical path coverage
- E2E Tests: 100% user journey coverage
- Overall: 85%+ total coverage
```

### Test Categories Distribution
```
- Unit Tests: 70%
- Integration Tests: 20%
- E2E Tests: 10%
```

### CI/CD Integration
```yaml
# GitHub Actions example:
- Run unit tests on every PR
- Run integration tests on main branch
- Run E2E tests nightly
- Archive coverage reports
```

---

## Priorytetowe Test Cases

### Must-Have (Krytyczne)
1. **Currency Converter Flow**
   - Context menu → AI parsing → Exchange rate → Notification
   - Error handling for all failure points

2. **Bookmark AI Search**
   - Vector store indexing
   - Semantic search functionality
   - AI-powered bookmark categorization

3. **Cross-Origin Content Scripts**
   - Allegro.pl favourites extraction
   - YouTube content enhancement
   - Secure message passing

### Should-Have (Ważne)
4. **Settings Management**
   - Storage synchronization
   - Settings validation
   - Module enable/disable

5. **Error Recovery**
   - Network failure handling
   - API quota exceeded
   - Storage corruption recovery

### Nice-to-Have (Dodatkowe)
6. **Performance Monitoring**
   - AI response times
   - Storage operation performance
   - Memory usage optimization

---

## Rekomendacje Implementacyjne

### 1. Test Organization
```
src/
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── test-utils/
│   ├── chrome-mocks.ts
│   ├── test-helpers.ts
│   └── fixtures/
```

### 2. Test Data Management
```typescript
// Centralized test data
export const mockBookmarks = [/* ... */];
export const mockExchangeRates = { /* ... */ };
export const mockAIResponses = { /* ... */ };
```

### 3. Custom Matchers
```typescript
// Chrome extension specific matchers
expect.extend({
  toHaveSentMessage: (mock, expectedMessage) => {
    // Custom assertion for Chrome message passing
  }
});
```

---

## Podsumowanie i Szacunkowe Nakłady

### Szacowany Czas Implementacji:
- **Faza 1 (Unit Tests):** 2-3 dni
- **Faza 2 (Integration):** 3-5 dni
- **Faza 3 (E2E):** 5-7 dni
- **Faza 4 (Advanced):** 3-5 dni
- **Total:** 13-20 dni pracy

### Korzyści:
1. **Zwiększona niezawodność** - mniej bugów w produkcji
2. **Łatwiejsze refactoring** - bezpieczne zmiany kodu
3. **Dokumentacja** - testy jako living documentation
4. **CI/CD gotowość** - automatyczne testowanie przy deployment
5. **Wsparcie rozwoju** - łatwiejsze debugowanie

### Rekomendacja:
Rozpocząć od **Fazy 1** (unit tests) jako fundamentu, następnie stopniowo dodawać integration i E2E testy. Priorytetować testy krytycznych user flows związanych z currency converter i bookmark AI search.
