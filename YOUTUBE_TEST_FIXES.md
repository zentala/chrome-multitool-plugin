# 🔧 **NAPRAWIANIE PROBLEMÓW Z TESTAMI YOUTUBE**

## 📊 **IDENTYFIKOWANE PROBLEMY**

### **1. Cookies YouTube**
- **Problem**: YouTube wymaga akceptacji cookies przed dostępem do treści
- **Wpływ**: Testy nie mogą przejść bez interakcji użytkownika
- **Rozwiązanie**: Automatyczna obsługa cookies consent

### **2. Niedostępne Filmy**
- **Problem**: Filmy testowe stają się niedostępne z powodu:
  - Roszczeń praw autorskich (copyright claims)
  - Blokad regionalnych
  - Usunięcia przez twórców
- **Wpływ**: Testy zawodzą z powodu zewnętrznych czynników
- **Rozwiązanie**: Stabilne, publiczne filmy testowe + fallback

### **3. Content Script Loading**
- **Problem**: Content script może nie ładować się poprawnie
- **Wpływ**: Sidebar nie pojawia się, testy zawodzą
- **Rozwiązanie**: Lepsza detekcja i diagnostyka

### **4. Browser Context Issues**
- **Problem**: `browser.newBrowserContext is not a function`
- **Wpływ**: Testy nie mogą się uruchomić
- **Rozwiązanie**: Poprawne API Playwright

## 🚀 **PLAN NAPRAW**

### **FAZA 1: Poprawki Krytyczne (1-2 dni)**

#### **1.1 Obsługa Cookies**
```typescript
// Dodać do helper functions
export async function handleYouTubeCookies(page: Page): Promise<void> {
  // Automatyczne kliknięcie "Accept All" lub "Reject All"
  // Obsługa różnych języków i layoutów
}
```

#### **1.2 Stabilne Filmy Testowe**
- Znaleźć publiczne, stabilne filmy YouTube
- Dodać fallback dla niedostępnych filmów
- Użyć filmów z kanałów jak TED, Kurzgesagt, etc.

#### **1.3 Poprawka Browser Context**
```typescript
// Zamiast browser.newBrowserContext() użyć
const context = await browser.newContext();
// Lub sprawdzić czy browser jest poprawnie zainicjalizowany
```

#### **1.4 Diagnostyka Content Script**
```typescript
// Dodać więcej logów i sprawdzeń
export async function debugContentScriptLoading(page: Page): Promise<void> {
  // Sprawdź czy script jest injected
  // Sprawdź console logs
  // Sprawdź czy sidebar element istnieje
}
```

### **FAZA 2: Ulepszenia Testów (2-3 dni)**

#### **2.1 Retry Mechanisms**
- Retry dla flaky testów
- Timeout handling dla wolnych operacji
- Recovery po błędach

#### **2.2 Mock Improvements**
- Lepsze mocki dla AI i YouTube API
- Mock dla cookies consent
- Mock dla niedostępnych filmów

#### **2.3 Test Data Management**
- Dynamiczne znajdowanie dostępnych filmów
- Cache dla test data
- Fallback strategies

## 🛠️ **IMPLEMENTATION ROADMAP**

### **TYDZIEŃ 1: Krytyczne Poprawki**

| Zadanie | Priorytet | Status | Szacowany czas |
|---------|-----------|--------|----------------|
| Obsługa cookies | Wysoki | 🚀 In Progress | 2-3h |
| Stabilne filmy testowe | Wysoki | 📋 Planned | 1-2h |
| Poprawka browser context | Krytyczny | 📋 Planned | 1h |
| Diagnostyka content script | Wysoki | 📋 Planned | 2-3h |

### **TYDZIEŃ 2: Ulepszenia**

| Zadanie | Priorytet | Status | Szacowany czas |
|---------|-----------|--------|----------------|
| Retry mechanisms | Średni | 📋 Planned | 2-3h |
| Mock improvements | Średni | 📋 Planned | 2-3h |
| Test data management | Niski | 📋 Planned | 2-3h |

## 🎯 **SUCCESS METRICS**

### **Functional Goals:**
- ✅ **Cookie Handling**: Automatyczna obsługa wszystkich consent dialogs
- ✅ **Stable Videos**: 95%+ filmów testowych dostępnych
- ✅ **Content Script**: 100% reliable loading detection
- ✅ **Browser Context**: Zero API errors

### **Quality Goals:**
- 📊 **Test Stability**: 90%+ testów przechodzi za pierwszym razem
- ⏱️ **Test Speed**: < 30s na test (bez setup)
- 🛡️ **Error Recovery**: Automatic recovery z 80% błędów

### **Coverage Goals:**
- ✅ **Cookies**: Wszystkie główne języki i layouty
- ✅ **Videos**: Minimum 5 stabilnych filmów testowych
- ✅ **Errors**: Obsługa 10+ typów błędów

## 🚀 **PILOT IMPLEMENTATION**

Zacznę od krytycznych poprawek:

### **Krok 1: Obsługa Cookies**
```typescript
export async function handleYouTubeCookies(page: Page): Promise<void> {
  try {
    // Czekaj na consent dialog (max 5s)
    const consentDialog = page.locator('[aria-label*="consent"], [data-purpose="consent"]').first();

    if (await consentDialog.isVisible({ timeout: 5000 })) {
      console.log('🍪 Found YouTube consent dialog, accepting...');

      // Szukaj przycisków w kolejności preferencji
      const buttons = [
        page.locator('button:has-text("Accept all")'),
        page.locator('button:has-text("Akceptuj wszystkie")'),
        page.locator('button:has-text("I agree")'),
        page.locator('button:has-text("Zgadzam się")'),
        page.locator('button:has-text("Accept")'),
        page.locator('button:has-text("Akceptuj")')
      ];

      for (const button of buttons) {
        if (await button.isVisible()) {
          await button.click();
          console.log('✅ Clicked accept button');
          await page.waitForTimeout(1000); // Daj czas na zamknięcie dialogu
          return;
        }
      }

      console.log('⚠️ No accept button found, trying to close dialog...');
      // Jeśli nie ma accept button, spróbuj zamknąć dialog
      const closeButton = page.locator('button[aria-label="Close"], .close-button').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  } catch (error) {
    console.log('🍪 No consent dialog found or already accepted');
  }
}
```

### **Krok 2: Stabilne Filmy Testowe**
```typescript
export const STABLE_YOUTUBE_VIDEOS = {
  // Filmy TED Talks - zwykle stabilne
  tedTalk: {
    url: 'https://www.youtube.com/watch?v=6Af6b_wyiwI', // "The power of vulnerability" - popularne
    title: 'TED Talk - stable test video',
    hasCaptions: true,
    captionType: 'manual'
  },

  // Kurzgesagt - edukacyjne filmy
  kurzgesagt: {
    url: 'https://www.youtube.com/watch?v=0Z760bYny9c', // "The Egg" - krótkie i stabilne
    title: 'Kurzgesagt - stable educational content',
    hasCaptions: true,
    captionType: 'manual'
  },

  // Vsauce - popularny kanał edukacyjny
  vsauce: {
    url: 'https://www.youtube.com/watch?v=9C2-GcggqbQ', // "Is Your Red The Same as My Red?"
    title: 'Vsauce - stable science content',
    hasCaptions: true,
    captionType: 'manual'
  },

  // Khan Academy - edukacyjne
  khanAcademy: {
    url: 'https://www.youtube.com/watch?v=h6cVyoMH4Ec', // "Introduction to limits"
    title: 'Khan Academy - stable educational',
    hasCaptions: true,
    captionType: 'manual'
  },

  // Fallback - bardzo popularny film
  fallback: {
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Despacito - bardzo popularny
    title: 'Fallback - highly stable video',
    hasCaptions: true,
    captionType: 'asr'
  }
};
```

### **Krok 3: Poprawiona Nawigacja**
```typescript
export async function navigateToYouTubeVideoStable(page: Page, videoUrl: string): Promise<boolean> {
  try {
    console.log(`🎬 Navigating to: ${videoUrl}`);

    // Przejdź do URL
    await page.goto(videoUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Obsłuż cookies
    await handleYouTubeCookies(page);

    // Sprawdź czy film jest dostępny
    const unavailableMessage = page.locator('h1:has-text("Video unavailable")').first();
    if (await unavailableMessage.isVisible({ timeout: 5000 })) {
      console.log('❌ Video is unavailable due to copyright or other issues');
      return false;
    }

    // Czekaj na ładowanie YouTube player
    await page.waitForSelector('ytd-player, #player', { timeout: 15000 });

    // Sprawdź czy player się załadował
    const player = page.locator('ytd-player').first();
    await expect(player).toBeVisible({ timeout: 10000 });

    // Czekaj na tytuł filmu
    await page.waitForSelector('h1.ytd-video-primary-info-renderer', { timeout: 10000 });

    // Dodatkowy czas na inicjalizację content script
    await page.waitForTimeout(3000);

    console.log('✅ YouTube video loaded successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to navigate to YouTube video:', error);
    return false;
  }
}
```

## 📋 **NASTĘPNE KROKI**

1. **Implementacja poprawek** - zacznę od obsługi cookies
2. **Testowanie z różnymi filmami** - sprawdzę które filmy są stabilne
3. **Poprawka content script** - lepsza detekcja ładowania
4. **Retry mechanisms** - automatyczne ponawianie po błędach

---

**🎯 STATUS: PLAN GOTOWY DO IMPLEMENTACJI**

Problemy zidentyfikowane i rozwiązania zaproponowane. Zaczynam implementację!
