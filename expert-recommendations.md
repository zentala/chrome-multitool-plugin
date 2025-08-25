# 🔧 Rekomendacje dla Eksperta Playwright

## 🎯 **Kluczowe Problemy do Rozwiązania**

### **Problem Główny**
Extension nie ładuje się w Playwright na Windows - `chrome://extensions/` pokazuje pustą listę.

### **Manifest V3 Specific**
- Service worker zamiast background page
- Nowe permission model
- Content scripts z dynamic imports

### **Windows Environment**
- Long paths: `C:\Users\Lenovo\code\chrome-multitool-plugin\dist`
- Path separators (`\` vs `/`)
- Permission contexts

---

## 🛠️ **Propozycje Rozwiązań do Sprawdzenia**

### **1. Extension Loading Strategies**

```typescript
// Spróbować alternatywne podejścia:

// A) Użyj launch() zamiast launchPersistentContext()
const browser = await chromium.launch();
const context = await browser.newBrowserContext({
  permissions: ['extensions']
});

// B) Dodaj extension programmaticznie
await context.addInitScript(() => {
  // Inject extension loading code
});
```

### **2. Windows-Specific Fixes**

```typescript
// A) Skróć ścieżki
const shortPath = await import('fs').then(fs =>
  fs.realpathSync.native(pathToExtension)
);

// B) Użyj forward slashes
const normalizedPath = pathToExtension.replace(/\\/g, '/');
```

### **3. Extension ID Resolution**

```typescript
// A) Ręczne wygenerowanie ID z manifest
const crypto = require('crypto');
const manifestKey = manifest.key || crypto.randomBytes(16).toString('hex');
const extensionId = crypto.createHash('sha256')
  .update(manifestKey)
  .digest('hex')
  .substring(0, 32);
```

### **4. MV3 Service Worker Handling**

```typescript
// A) Poczekaj na service worker activation
await page.waitForFunction(() => {
  return chrome.runtime?.getManifest() !== undefined;
});
```

---

## 🔍 **Debug Steps**

### **Step 1: Verify Extension Files**
```bash
# Sprawdź czy wszystkie pliki są obecne
ls -la dist/
# Sprawdź czy manifest jest prawidłowy
cat dist/manifest.json | jq .
```

### **Step 2: Test Manual Loading**
```typescript
// Stwórz minimalny test bez framework
const browser = await chromium.launch();
const context = await browser.newBrowserContext();
const page = await context.newPage();

// Spróbuj ręcznie załadować extension
// Sprawdź chrome://extensions/
```

### **Step 3: Check Playwright Logs**
```bash
# Uruchom z maksymalnym logowaniem
DEBUG=pw:api,pw:browser npm run test:e2e
```

### **Step 4: Alternative Approaches**
```typescript
// 1. Użyj puppeteer-core zamiast playwright
// 2. Użyj selenium-webdriver z chrome extension
// 3. Symuluj extension behavior bez faktycznego ładowania
```

---

## 📋 **Test Cases do Sprawdzenia**

### **Minimal Extension Test**
```typescript
// Stwórz minimalną extension do testowania
// - Tylko manifest.json
// - Prosty popup.html z "Hello World"
// - Brak service worker
```

### **Path Testing**
```typescript
// Testuj różne ścieżki:
// - C:\temp\extension
// - C:/temp/extension
// - .\dist (relative path)
```

### **Permission Testing**
```typescript
// Testuj z różnymi permissions
context = await browser.newBrowserContext({
  permissions: [
    'extensions',
    'tabs',
    'storage',
    'activeTab'
  ]
});
```

---

## 🎯 **Oczekiwane Rezultaty**

Po zaimplementowaniu rozwiązania, test powinien:

1. ✅ **Załaduje extension** do Playwright
2. ✅ **Wyświetli popup** `chrome-extension://[id]/popup.html`
3. ✅ **Pozwoli na interakcję** z extension UI
4. ✅ **Obsłuży background scripts** i service worker
5. ✅ **Współpracuje z content scripts**

---

## 📊 **Success Criteria**

- Extension widoczna w `chrome://extensions/`
- Popup otwiera się bez błędów
- Chrome runtime API dostępne
- Service worker aktywny
- Content scripts injectowane

---

## 🚀 **Ready for Implementation**

Po otrzymaniu rozwiązania od eksperta, możemy natychmiast:

- ✅ Zaimplementować poprawki
- ✅ Przetestować solution
- ✅ Rozszerzyć na pełne E2E testy
- ✅ Dodać CI/CD integration

*Ten plik zawiera konkretne propozycje dla eksperta do szybkiego rozwiązania problemu.*
