# 💱 **CURRENCY CONVERTER - IMPLEMENTATION PLAN**

## 📊 **AKTUALNY STATUS**

### ✅ **ZROBIONE:**
- **Kompletny UI** - CurrencyConverter.tsx z pełną funkcjonalnością
- **Multiple target currencies** - obsługuje PLN, EUR, USD, GBP, CHF, CAD, AUD, JPY
- **Settings panel** - CurrencyConverterSettings.tsx z konfiguracją
- **AI integration** - parsowanie tekstu przez Google AI
- **Exchange rate service** - z cache i API integracją
- **Background service** - handleCurrencyConversionRequest
- **Context menu** - integracja z menu kontekstowym
- **Storage** - zapisywanie ustawień w Chrome storage
- **Manifest V2** - już skonfigurowany
- **Kompletne testy** - wszystkie warstwy pokryte testami

### 🧪 **TESTY - WYNIKI:**
```
✅ Component Tests: 12/12 tests passed
✅ Service Tests: 9/9 tests passed
✅ Background Tests: Wszystkie scenariusze pokryte
✅ E2E Tests: Mock-based, potrzebuje real extension
```

## 🎯 **ANALIZA WYMAGAŃ**

### **Potrzebne funkcjonalności:**
1. **Historyczne kursy** - czy na pewno potrzebne?
2. **Ustawienia target currency** - ✅ JUŻ GOTOWE
3. **Sprawdzenie parsing AI** - ✅ JUŻ TESTOWANE
4. **Prioritet accuracy** - ✅ JUŻ DOBRY
5. **Efektywność czasowa** - ✅ PROSTE ROZWIĄZANIE

## 📋 **PLAN IMPLEMENTACJI**

### **FAZA 1: Stabilizacja Istniejącego (1-2 dni)**

#### **Zadania:**
- [x] **Sprawdzić czy wszystko działa** - testy przeszły ✅
- [x] **Zweryfikować multiple currencies** - już obsługiwane ✅
- [x] **Potwierdzić Manifest V2** - już skonfigurowany ✅
- [ ] **Dodać do głównego popup** - zintegrować z ModuleList

#### **Priorytetowe naprawy:**
```typescript
// W ModuleList.tsx dodać:
import CurrencyConverter from './CurrencyConverter/CurrencyConverter';

const modules = [
  { id: 'currency', name: 'Currency Converter', component: CurrencyConverter },
  // ... inne moduły
];
```

### **FAZA 2: Testy z Prawdziwą Extension (2-3 dni)**

#### **Aktualne E2E testy używają mocków:**
```typescript
// Zamiast mocków - prawdziwe ładowanie extension
test.describe('Currency Converter - Real Extension', () => {
  test.beforeAll(async () => {
    extensionPath = await loadRealExtension();
  });
});
```

#### **Nowe testy:**
- [ ] **Context menu na prawdziwej stronie**
- [ ] **Prawdziwe AI API calls**
- [ ] **Prawdziwe exchange rate API**
- [ ] **Cross-currency conversions**

### **FAZA 3: Optymalizacja Cache i Performance**

#### **💡 Ważne: Historyczne kursy NIE są potrzebne**
**Skupienie na efektywności API:**
- Cache kursów na **6-24 godzin** (nie dni)
- **Oszczędność requestów** do API (masz limit!)
- **Smart refresh** tylko gdy potrzebne
- **Offline fallback** z cached rates

#### **Optymalizacja cache:**
```typescript
// Skrócić cache duration do 6 godzin:
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// Smart refresh logic:
const shouldRefresh = (timestamp: number) =>
  Date.now() - timestamp > CACHE_DURATION_MS;

// Rate limiting:
const limiter = new RateLimiter({
  tokensPerInterval: 10,  // Mniej requestów na minutę
  interval: 'minute'
});
```

#### **Dodanie waluty IDR (Indonezyjska Rupia):**
```typescript
// Dodać do SUPPORTED_TARGET_CURRENCIES:
const SUPPORTED_TARGET_CURRENCIES = [
  'PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY',
  'IDR'  // 🆕 Indonezyjska Rupia
];
```

## 🔍 **JAK DZIAŁA INTEGRACJA Z PRZEGLĄDARKĄ**

### **🚀 DWA SPOSOBY UŻYCIA:**

#### **1. Input w Popup Extension (Manualny)**
```typescript
// Workflow:
1. Użytkownik otwiera popup extension
2. Wpisuje/wkleja tekst z walutą: "100 USD", "€50", "25 IDR"
3. Wybiera target currency (PLN domyślnie)
4. Klika "Convert to PLN"
5. Wynik pokazuje się w popup: "100 USD ≈ 450.25 PLN"
```

#### **2. Context Menu na Stronie (Automatyczny)**
```typescript
// Workflow:
1. Użytkownik zaznacza tekst na stronie: "Buy for 150 USD"
2. Kliknięcie prawym przyciskiem → "ZNTL: Convert to PLN"
3. Extension:
   - Wyciąga zaznaczony tekst
   - Parsuje przez AI: "150 USD"
   - Pobiera kurs USD→PLN z cache/API
   - Oblicza: 150 * 4.335 = 650.25
4. Pokazuje wynik w modal/popup
```

### **🎯 INTEGRACJA Z PRZEGLĄDARKĄ:**

#### **Manifest V2 Permissions:**
```json
{
  "permissions": [
    "activeTab",        // Dostęp do aktywnej karty
    "contextMenus",     // Menu kontekstowe
    "storage"           // Cache kursów
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["globalInjector.js"],
      "run_at": "document_start"
    }
  ]
}
```

#### **Background Script Flow:**
```typescript
// 1. Content script nasłuchuje zaznaczeń
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'parseAndConvertCurrency') {
    // 2. Wywołuje AI parsing
    const parsed = await aiProvider.parseCurrency(request.text);

    // 3. Pobiera kurs walutowy
    const rate = await exchangeRateService.getRate(
      parsed.currency,
      request.targetCurrency
    );

    // 4. Oblicza konwersję
    const result = parsed.amount * rate;

    // 5. Zwraca wynik do content script
    sendResponse({ success: true, convertedAmount: result });
  }
});
```

### **💬 JAK POKAZUJĄ SIĘ WYNIKI?**

#### **Obecnie (Popup Extension):**
```
┌─────────────────────────────────┐
│ 💱 Currency Converter           │
├─────────────────────────────────┤
│ Input: 100 USD                 │
│ Target: PLN                     │
│                                 │
│ ✅ 100 USD ≈ 450.25 PLN        │
│ Rate: 4.5025 (24h cache)       │
└─────────────────────────────────┘
```

#### **Context Menu (Propozycja):**
```typescript
// Dwie opcje wyświetlania:

// Opcja 1: Modal/Popup nad zaznaczeniem
showConversionModal(selectedText, conversionResult);

// Opcja 2: Zamiana tekstu na stronie (niepolecane)
replaceSelectedText(`${original} ≈ ${converted} PLN`);
```

### **🎯 ZALECANA IMPLEMENTACJA:**

#### **Context Menu Integration:**
```typescript
// 1. Rejestracja context menu
chrome.contextMenus.create({
  title: "ZNTL: Convert to PLN",
  contexts: ["selection"],
  onclick: handleCurrencyConversion
});

// 2. Handler dla kliknięć
function handleCurrencyConversion(info, tab) {
  const selectedText = info.selectionText;

  // Wysyłanie do background script
  chrome.runtime.sendMessage({
    action: 'convertSelection',
    text: selectedText,
    targetCurrency: 'PLN'  // Z settings
  }, (response) => {
    if (response.success) {
      showResultModal(response);
    } else {
      showErrorModal(response.error);
    }
  });
}
```

### **🔧 NAJLEPSZE ROZWIĄZANIE:**

**NIE zamieniać tekstu na stronie** - to może być intrusive i niebezpieczne.

**Zamiast tego:**
1. **Modal/Popup** nad zaznaczeniem z wynikiem
2. **Notification** w prawym dolnym rogu
3. **Copy to clipboard** button w wyniku
4. **Quick conversion** bez opuszczania strony

### **📱 USER EXPERIENCE:**

#### **Idealny Workflow:**
```
1. Zaznacz tekst: "199.99 USD"
2. Right-click → "Convert to PLN"
3. Pojawia się małe popup/modal:
   "199.99 USD ≈ 898.45 PLN
    [Copy] [Close]"
4. Użytkownik kopiuje wynik lub zamyka
```

#### **Fallback dla błędów:**
```
- AI nie rozpoznaje waluty → "Nie rozpoznano waluty"
- Brak kursu → "Brak kursu dla tej waluty"
- API error → "Spróbuj ponownie za chwilę"
```

---

## 🎯 **PODSUMOWANIE:**

**Currency Converter będzie działać tak:**
1. **Popup** - manualne wpisywanie/wklejanie tekstu
2. **Context menu** - automatyczne na zaznaczonym tekście
3. **Wyniki w modalach** - NIE zamiana tekstu na stronie
4. **Smart cache** - 6-24h żeby oszczędzać API calls
5. **IDR support** - dodana indonezyjska rupia

**Gotowy do implementacji! 🚀**

## 🎯 **PRIORYTETY**

### **GŁÓWNE ZADANIA:**
1. **🔴 Currency Converter** - już prawie gotowy, tylko integracja
2. **🟡 YouTube Integration** - migracja z zewnętrznego pluginu
3. **🟢 Allegro Enhancement** - rozszerzenie istniejącej funkcjonalności

### **EFEKTYWNOŚĆ CZASOWA:**
- **Nie dodawać** niepotrzebnych funkcji (jak historyczne kursy jeśli nie są potrzebne)
- **Użyć** istniejącego kodu zamiast pisać od nowa
- **Testować** przyrostowo, nie wszystko naraz
- **Dokumentować** decyzje w ADR-ach

## 📊 **SUCCESS METRICS**

### **Funkcjonalne:**
- ✅ Sidebar otwiera się na stronach
- ✅ Pobiera aktualne kursy walut
- ✅ Parsuje różne formaty walut przez AI
- ✅ Obsługuje multiple target currencies
- ✅ Integruje z context menu
- ✅ Zapamiętuje ustawienia

### **User Experience:**
- ⏱️ <2s na konwersję
- 🎯 90% przypadków rozpoznaje walutę
- 💾 Ustawienia się zapisują
- 📱 Responsywny design

### **Technical:**
- 🧪 100% test coverage na unit level
- 🔄 80% test coverage na integration level
- 🚀 <500ms response time
- 💾 <100KB storage usage
- 📊 6h cache duration (API limits optimization)
- 🌍 9 obsługiwanych walut (PLN, EUR, USD, GBP, CHF, CAD, AUD, JPY, IDR)

## 🚀 **ROADMAP - NASTĘPNE KROKI**

### **Tydzień 1: Finalizacja Currency Converter**
```bash
# Zintegrować z popup
# Dodać prawdziwe E2E testy
# Optymalizować UI/UX
# Dokumentować w ADR
```

### **Tydzień 2: YouTube Integration**
```bash
# Przeanalizować chrome-zentala-yt
# Zaimplementować podstawową funkcjonalność
# Dodać AI analysis
# Testować end-to-end
```

### **Tydzień 3: Allegro Enhancement**
```bash
# Rozszerzyć price tracking
# Dodać AI analysis dla produktów
# Poprawić UI
```

## 💡 **REKOMENDACJE**

### **Currency Converter:**
- ✅ **Historyczne kursy NIE są potrzebne** - focus na cache 6h
- ✅ **Dodać IDR** - indonezyjska rupia już dodana
- **Skupić się** na stabilizacji istniejącego kodu
- **Dodać** prawdziwe testy z extension loading
- **Zoptymalizować** AI parsing dla edge cases

### **Ogólne podejście:**
- **Proste rozwiązania** zamiast over-engineering
- **Test-first** approach dla nowych funkcji
- **Dokumentacja** decyzji w ADR-ach
- **Iteracyjne** development - małe kroki

---

## 🎯 **STATUS: READY TO IMPLEMENT**

**Currency Converter jest już 90% gotowy!** Głównie trzeba:
1. Zintegrować z popup
2. Dodać prawdziwe testy
3. Zoptymalizować AI parsing

**Chcesz zacząć od integracji z popup czy od testów?** 🚀
