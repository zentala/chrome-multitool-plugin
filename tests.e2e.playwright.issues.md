# 🚨 Playwright Chrome Extension Testing - Aktualny Status (2024-12-10)

## 📋 **Kontekst Problemu**

**Projekt**: Chrome Extension "Zentala Chrome Multitool Plugin"
- **Manifest V3** z service worker
- **Content scripts** dla Allegro.pl i YouTube.com
- **Popup interface** z React
- **Background processing** z AI integration
- **Cross-origin communication**

**Cel**: Implementacja kompleksowych E2E testów przy użyciu Playwright

**Środowisko**:
- Windows 11
- Node.js + pnpm
- Playwright 1.55.0
- Chrome extension zbudowana przez Webpack

## 🆕 **Aktualny Status - GRUDZIEŃ 2024**

### ✅ **CO DZIAŁA**
- ✅ Extension buduje się poprawnie (`pnpm build:test`)
- ✅ Wszystkie pliki extension istnieją (manifest.json, background.js, popup.html)
- ✅ Manifest.json jest poprawny (MV3, service worker, popup)
- ✅ Path normalization działa (forward slashes dla Windows)
- ✅ **POPRAWIONE:** Wszystkie pliki mają `headless: false`

### ❌ **CO NIE DZIAŁA**
- ❌ **FUNDAMENTALNY PROBLEM:** Extension się w ogóle nie ładuje w Playwright
- ❌ Nawet minimalna extension się nie ładuje (`Extensions found: 0`)
- ❌ Brak background page, service worker, lub extension na chrome://extensions/
- ❌ `net::ERR_BLOCKED_BY_CLIENT` przy próbie dostępu do extension
- ❌ Problem nie jest związany z headless mode (sprawdzone)

### 🔧 **CO TESTOWAŁEM**

#### **Podejście 1: Różne metody ładowania extension**
```typescript
// Persistent context z userDataDir
const context = await chromium.launchPersistentContext("", {
  headless: false,
  args: [`--load-extension=${pathToExtension}`]
});

// Regular browser z newContext
const browser = await chromium.launch({...});
const context = await browser.newContext();
```

#### **Podejście 2: Detekcja extension ID**
- ✅ Service workers (`context.serviceWorkers()`)
- ❌ Chrome management API (`chrome.management.getAll()`)
- ❌ Chrome extensions page parsowanie
- ❌ Static key w manifest.json

#### **Podejście 3: Współdzielony browser**
```typescript
// Jeden browser dla wszystkich testów
export async function getSharedBrowser(): Promise<Browser>
export async function getSharedContext(): Promise<BrowserContext>
```

#### **Podejście 4: Timeout i czekanie**
- ✅ `waitForEvent('serviceworker')`
- ✅ `setTimeout(3000)` dla inicjalizacji
- ✅ `waitForLoadState('networkidle')`
- ❌ Wszystkie timeouty nie pomagają

### 📊 **Aktualne Błędy**

```
🔧 Loading extension from: C:/code/chrome-multitool-plugin/dist
📊 Found 0 service workers
❌ Could not find extension ID by any method
Error: Extension not loaded properly - no extension ID found
```

```
page.goto: net::ERR_BLOCKED_BY_CLIENT at chrome-extension://...
```

### 🎯 **Aktualne Podejście**

**Współdzielony browser z headless mode:**
```typescript
const sharedBrowser = await chromium.launch({
  headless: true, // Headless dla CI
  args: [`--load-extension=${pathToExtension}`]
});
```

**Dynamiczna detekcja ID:**
```typescript
// Sprawdzamy service workers, chrome.management, chrome://extensions
// W kolejności: service workers -> chrome.management -> probe URLs
```

---

## 🎯 **Chronologia Wdrożenia**

### **Faza 1: Instalacja i Setup (✅ Sukces)**
```bash
✅ pnpm add -D @playwright/test
✅ npx playwright install --with-deps
✅ npm run build (extension buduje się poprawnie)
✅ Dodane skrypty do package.json
✅ Utworzone katalogi testowe
```

**Rezultat**: Wszystkie narzędzia zainstalowane, extension buduje się bez błędów.

### **Faza 2: Konfiguracja Playwright (✅ Sukces)**
```typescript
✅ playwright.config.ts - skonfigurowany
✅ tests/global-setup.ts - utworzony
✅ tests/fixtures/extension-helpers.ts - utworzony
✅ tests/e2e/currency-converter.spec.ts - utworzony
```

**Rezultat**: Pliki konfiguracyjne gotowe, struktura katalogów prawidłowa.

### **Faza 3: Próba Uruchomienia Testów (❌ Porażka)**

#### **Próba 1: Standardowe Ładowanie Extension**
```bash
# Uruchomienie testu
npm run test:e2e:currency -- --grep "extension popup loads correctly"
```

**Rezultat**:
```
🔧 Loading extension from: C:\Users\Lenovo\code\chrome-multitool-plugin\dist
🔍 Looking for extension in chrome://extensions/
📋 Found extensions: []
⚠️ Could not generate extension ID from manifest
⚠️ Using fallback extension ID: test-extension-id
🎯 Extension loaded with ID: test-extension-id
```

**Problem**: Extension nie ładuje się do Playwright, lista extensions jest pusta `[]`.

#### **Próba 2: Debugowanie Ładowania Extension**
```typescript
// Próba różnych podejść w extension-helpers.ts
1. ✅ persistentContext z --load-extension
2. ✅ page.goto('chrome://extensions/')
3. ✅ Wyszukiwanie extension po nazwie
4. ✅ Szukanie background page URL
5. ✅ Generowanie ID z manifest.json
6. ✅ Fallback extension ID
```

**Rezultat**:
```
📋 Found extensions: []
❌ page.goto: net::ERR_BLOCKED_BY_CLIENT at chrome-extension://test-extension-id/popup.html
```

**Problem**: Nawet z fallback ID, próba nawigacji kończy się błędem `net::ERR_BLOCKED_BY_CLIENT`.

#### **Próba 3: Symulacja Bez Extension**
```typescript
// Próba uruchomienia testów bez faktycznego ładowania extension
// Używanie czystego chromium.launch() bez extension
```

**Rezultat**:
```
✅ Browser launches successfully
✅ Context creates successfully
✅ Mock routes work
❌ But no extension functionality to test
```

**Problem**: Testy działają, ale nie testują faktycznej extension.

---

## 🔍 **Szczegółowa Analiza Problemu**

### **1. Extension Loading Problem**

**Objawy**:
- Extension path: `C:\Users\Lenovo\code\chrome-multitool-plugin\dist` ✅ istnieje
- Manifest.json: ✅ istnieje i jest poprawny
- `--load-extension` flag: ✅ przekazywany do Chromium
- `chrome://extensions/` page: ✅ ładuje się
- Extension list: ❌ pusta `[]`

**Możliwe przyczyny**:
1. **Windows Path Issues**: Playwright może mieć problemy z Windows paths zawierającymi spacje/backslashes
2. **Extension ID Resolution**: Problem z generowaniem lub rozpoznawaniem extension ID
3. **Manifest V3 Service Worker**: Playwright może nie obsługiwać poprawnie MV3 service workers
4. **Timing Issues**: Extension może potrzebować więcej czasu na załadowanie
5. **Permission Issues**: Brak wymaganych uprawnień dla extension loading

### **2. Navigation Error Analysis**

**Błąd**: `net::ERR_BLOCKED_BY_CLIENT`
- Występuje przy próbie dostępu do `chrome-extension://[id]/popup.html`
- Sugeruje, że extension nie jest uważana za "zaufaną" lub "zainstalowaną"
- Playwright może blokować dostęp do niezaładowanych extension

### **3. Windows-Specific Issues**

**Potencjalne problemy**:
- Path separator conflicts (`\` vs `/`)
- Permission issues z persistent context
- Windows Defender / Antivirus interference
- Long path names issues

---

## 🛠️ **Podjęte Rozwiązania**

### **Rozwiązanie 1: Poprawione Extension Helpers**
```typescript
// Próba multiple detection methods
1. findByName() - szukanie po nazwie
2. findByBackgroundPage() - szukanie po background page
3. generateFromManifest() - generowanie z manifest
4. fallbackId() - hardcoded fallback
```

**Rezultat**: Wszystkie metody zwróciły puste wyniki lub fallback.

### **Rozwiązanie 2: Debug Screenshots**
```typescript
// Dodano screenshot capabilities
await testPage.screenshot({ path: 'debug-extensions-page.png' });
```

**Rezultat**: Screenshot extensions page pokazuje pustą listę.

### **Rozwiązanie 3: Timing Adjustments**
```typescript
// Zwiększone timeouts
await extensionsPage.waitForTimeout(3000);
await expect(pageTitle).toBeVisible({ timeout: 10000 });
```

**Rezultat**: Problem nie jest związany z timing, extension po prostu się nie ładuje.

### **Rozwiązanie 4: Alternative Loading Methods**
```typescript
// Próba różnych launch options
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--load-extension=${pathToExtension}`,
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled'
  ]
});
```

**Rezultat**: Wszystkie kombinacje args nie pomogły.

---

## 📊 **Zebrane Dane Diagnostyczne**

### **Build Output**
```
✅ Extension builds successfully
✅ popup.html (835 bytes)
✅ popup.js (315 KiB)
✅ background.js (39 KiB)
✅ manifest.json (1.83 KiB)
```

### **Test Output**
```
✅ Playwright detects 11 tests
✅ Global setup runs successfully
✅ Extension path verified
❌ Extension not found in chrome://extensions/
❌ Navigation blocked by client
```

### **System Information**
- **OS**: Windows 11
- **Playwright**: 1.55.0
- **Node.js**: 18.x (potwierdzić)
- **Chrome**: 140.0.7339.16 (Playwright build)

---

## 🎯 **Hipotezy i Podejścia do Rozwiązania**

### **Hipoteza 1: Windows-Specific Path Issues**
**Możliwe rozwiązanie**: Użycie forward slashes, skróconych ścieżek, lub przeniesienie projektu do krótszej ścieżki.

### **Hipoteza 2: Extension ID Generation**
**Możliwe rozwiązanie**: Ręczne wygenerowanie extension ID z manifest key lub użycie development-specific approach.

### **Hipoteza 3: Playwright Extension Loading**
**Możliwe rozwiązanie**: Użycie innego API Playwright lub podejścia do ładowania extension.

### **Hipoteza 4: MV3 Service Worker Compatibility**
**Możliwe rozwiązanie**: Problem z MV3 service worker support w Playwright.

### **Hipoteza 5: Permission/Security Context**
**Możliwe rozwiązanie**: Problem z security context lub permissions w test environment.

---

## 🎯 **Prośba do Eksperta - GRUDZIEŃ 2024**

**Szukamy odpowiedzi na pytania**:

1. **Dlaczego extension ładuje się w global setup ale nie w testach?**
   - Global setup: ✅ `bmgleidfiehfoccmdookecgoifcabkpc`
   - Test contexts: ❌ "no service workers found"

2. **Jak poprawnie współdzielić extension między testami w Playwright?**
   - Czy persistent context może współdzielić extension?
   - Czy jeden browser dla wszystkich testów to dobre rozwiązanie?

3. **Jak debugować "net::ERR_BLOCKED_BY_CLIENT" w Playwright?**
   - Czy to problem z security context?
   - Czy Chrome blokuje dostęp do extension w test environment?

4. **Czy jest sprawdzone rozwiązanie dla MV3 + Windows + Playwright?**
   - Szukamy working example lub best practices

**Aktualny problem - potrzebujemy eksperta**:
```bash
# Problem potwierdzony: extension się nie ładuje
✅ Extension files exist and are valid
✅ headless: false is set everywhere
❌ Extensions found: 0 (even minimal extension)
❌ No background page, service worker, or extension visible
```

**Potrzebne rozwiązanie**:
- 🔍 **Dlaczego extension się nie ładuje** w Playwright na Windows?
- 🔍 **Czy to problem z Playwright 1.55.0** + MV3?
- 🔍 **Jakie są alternatywy** dla testowania extension bez ładowania?

**Preferowane rozwiązania**:
- ✅ **Aktualizacja Playwright** do najnowszej wersji
- ✅ **Test na Linux/CI** gdzie może działać lepiej
- ✅ **Alternatywne podejście** - mock extension zamiast prawdziwego ładowania

---

## 📞 **Next Steps - Oczekiwania**

**Stan projektu**: Mamy działający setup, ale problem z kontekstami testowymi.

**Oczekiwania**: Konkretne rozwiązanie jak współdzielić extension między testami.

**Gotowość**: Możemy natychmiast zaimplementować i przetestować rozwiązanie.

---

## 🎯 **EXPERT FEEDBACK - IMPLEMENTATION PLAN (GRUDZIEŃ 2024)**

### ✅ **ROZWIĄZANIE - PRZESZLIŚMY NA MV2**
- ✅ **Zmieniono manifest z MV3 na MV2** - service_worker → scripts
- ✅ **Background pages zamiast service worker** - widoczne dla Playwright
- ✅ **Wszystkie permissions w jednym miejscu** - bez host_permissions
- ✅ **Headless: false** - potwierdzone jako wymagane dla extensions

### 🚀 **IMPLEMENTATION ROADMAP wg Eksperta**

#### **Faza 1: Upgrade narzędzi**
```bash
# Upgrade Playwright do najnowszej wersji
pnpm up @playwright/test -L
pnpm dlx playwright install chromium

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### **Faza 2: Linux/CI jako primary target**
```yaml
# GitHub Actions z xvfb
- name: Run E2E Tests
  run: xvfb-run -a pnpm test:e2e
  env:
    EXTENSION_PATH: ${{ github.workspace }}/dist
```

#### **Faza 3: Stabilna strategia ładowania**
```typescript
// JEDEN persistent context na cały run
const context = await chromium.launchPersistentContext('', {
  headless: false, // Required for extensions
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
});
```

#### **Faza 4: Testowanie bez SW dependency**
```typescript
// Test popup bezpośrednio
const popup = await context.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`);
// Test UI, messaging, storage bez introspekcji SW
```

#### **Faza 5: Mock fallback dla Windows**
```typescript
// Dla szybkich testów na Windows
test.describe('Mock Extension Tests', () => {
  // Mock chrome.runtime, chrome.storage APIs
  // Test logic bez realnego extension loading
});
```

### 📊 **Macierz testów wg Eksperta**

| Rodzaj testu | Środowisko | Status |
|---|---|---|
| **E2E Popup/UI** | Linux/CI headful (xvfb) | 🔄 Do implementacji |
| **E2E Content Script** | Linux/CI headful | 🔄 Do implementacji |
| **Integracyjne (mock)** | Windows/Linux headless | ✅ Można zacząć |
| **Jednostkowe** | Dowolne | ✅ Istniejące |

### 🎯 **Next Steps wg Eksperta**
1. **Upgrade Playwright** i reinstalacja Chromium
2. **Przenieść E2E na Linux/CI** jako primary path
3. **Implementować testy popup/content** bez SW dependency
4. **Zachować mock-suite** dla krytycznych scenariuszy
5. **Dokumentować znane ograniczenia** MV3 w Playwright

---

*Ten dokument zawiera aktualny status + konkretny plan implementacji wg eksperta - GRUDZIEŃ 2024*
