# 🚀 **PLAN DZIAŁANIA - NAPRAWA TESTÓW YOUTUBE**

## 📊 **AKTUALNY STATUS PROBLEMÓW**

### ❌ **KRYTYCZNE BŁĘDY TESTÓW**
1. `browser.newBrowserContext is not a function` - **NAJWAŻNIEJSZY**
2. `page.waitForSelector: Timeout 15000ms exceeded` - YouTube player detection
3. `Target page, context or browser has been closed` - Premature closing
4. `context is not defined` - Variable scope issues

### ✅ **JUŻ NAPRAWIONE**
- Obsługa cookies YouTube (handleYouTubeCookies)
- Stabilne filmy testowe (TED, Kurzgesagt, Khan Academy)
- Diagnostyka content script (debugContentScriptLoading)
- Fallback navigation (navigateToYouTubeVideoWithFallback)

## 🎯 **STRATEGIA NAPRAW**

### **Etap 1: Krytyczne Poprawki API (1-2 dni)**

#### **1.1 Naprawić Browser Context API**
```typescript
// PROBLEM: browser.newBrowserContext is not a function
// SOLUTION: Użyć poprawnego Playwright API

// ZAMIENIĆ TO:
const context = await browser.newBrowserContext();

// NA TO:
const context = await browser.newContext();
// lub dla extension tests:
const context = await browser.newContext({ ...extensionOptions });
```

#### **1.2 Poprawić YouTube Player Detection**
```typescript
// PROBLEM: Timeout waiting for ytd-player
// SOLUTION: Ulepszona logika czekania

// ZAMIENIĆ TO:
await page.waitForSelector('ytd-player', { timeout: 15000 });

// NA TO:
await page.waitForFunction(() => {
  const players = document.querySelectorAll('ytd-player');
  return Array.from(players).some(player => player.offsetWidth > 0);
}, { timeout: 15000 });
```

#### **1.3 Naprawić Zarządzanie Context**
```typescript
// PROBLEM: context is not defined, premature closing
// SOLUTION: Proper context lifecycle management

test.describe('YouTube Tests', () => {
  let browser: any;
  let context: any;
  let page: any;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    // Setup mocks and navigation
  });

  test.afterEach(async () => {
    await page?.close();
    await context?.close();
  });

  test.afterAll(async () => {
    await browser?.close();
  });
});
```

### **Etap 2: Test Infrastructure (2-3 dni)**

#### **2.1 Mock Services Integration**
```typescript
// PROBLEM: Mock services not properly integrated
// SOLUTION: Proper mock setup per test

test.beforeEach(async () => {
  // Mock AI services
  await context.route('https://*.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: '{"success": true, "analysis": "Test analysis"}' }]
          }
        }]
      })
    });
  });

  // Mock YouTube API
  await context.route('https://www.youtube.com/api/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ /* mock response */ })
    });
  });
});
```

#### **2.2 Video Fallback System**
```typescript
// PROBLEM: Single video failures break all tests
// SOLUTION: Smart fallback system

const STABLE_VIDEOS = [
  'https://www.youtube.com/watch?v=6Af6b_wyiwI', // TED Talk
  'https://www.youtube.com/watch?v=0Z760bYny9c', // Kurzgesagt
  'https://www.youtube.com/watch?v=h6cVyoMH4Ec', // Khan Academy
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk'  // Despacito
];

async function findWorkingVideo(page: Page): Promise<string> {
  for (const videoUrl of STABLE_VIDEOS) {
    try {
      console.log(`🎬 Testing video: ${videoUrl}`);
      await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check if video is available
      const unavailable = await page.locator('h1:has-text("Video unavailable")').count();
      if (unavailable > 0) {
        console.log(`❌ Video unavailable: ${videoUrl}`);
        continue;
      }

      // Check if player loads
      await page.waitForSelector('ytd-player', { timeout: 10000 });
      console.log(`✅ Video working: ${videoUrl}`);
      return videoUrl;

    } catch (error) {
      console.log(`❌ Failed to load: ${videoUrl} - ${error.message}`);
      continue;
    }
  }

  throw new Error('No working test videos found');
}
```

#### **2.3 Content Script Verification**
```typescript
// PROBLEM: Unreliable content script detection
// SOLUTION: Multi-level verification

async function verifyContentScriptReady(page: Page): Promise<boolean> {
  // Level 1: Check if script is injected
  const scriptInjected = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(script =>
      script.src.includes('youtube') ||
      script.textContent?.includes('zentala')
    );
  });

  if (!scriptInjected) {
    console.log('❌ Content script not injected');
    return false;
  }

  // Level 2: Check if sidebar element exists
  const sidebarExists = await page.evaluate(() => {
    return document.querySelector('#zentala-youtube-sidebar') !== null;
  });

  if (!sidebarExists) {
    console.log('⚠️ Content script injected but sidebar not visible');
    // Wait a bit more for initialization
    await page.waitForTimeout(2000);

    // Check again
    const retryCheck = await page.evaluate(() => {
      return document.querySelector('#zentala-youtube-sidebar') !== null;
    });

    if (!retryCheck) {
      console.log('❌ Sidebar still not visible after retry');
      return false;
    }
  }

  // Level 3: Check if sidebar is functional
  const sidebar = page.locator('#zentala-youtube-sidebar');
  await expect(sidebar).toBeVisible({ timeout: 5000 });

  // Check key elements
  await expect(sidebar.locator('#download-captions-btn')).toBeVisible();
  await expect(sidebar.locator('#process-ai-btn')).toBeVisible();

  console.log('✅ Content script fully functional');
  return true;
}
```

### **Etap 3: Retry Mechanisms (1-2 dni)**

#### **3.1 Automatic Test Retries**
```typescript
// PROBLEM: Flaky tests fail randomly
// SOLUTION: Smart retry logic

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
}

// Usage in tests:
test('YouTube sidebar loads', async () => {
  await withRetry(async () => {
    const page = await browser.newPage();
    try {
      await navigateToYouTubeVideoWithFallback(page);
      await verifyContentScriptReady(page);
      expect(await isYouTubeSidebarVisible(page)).toBe(true);
    } finally {
      await page?.close();
    }
  });
});
```

#### **3.2 Error Recovery**
```typescript
// PROBLEM: Tests fail completely on single errors
// SOLUTION: Graceful degradation and recovery

async function navigateWithRecovery(page: Page, videoUrl: string): Promise<boolean> {
  try {
    // Primary navigation
    await page.goto(videoUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Handle cookies
    await handleYouTubeCookies(page);

    // Check for common error conditions
    const errorSelectors = [
      'h1:has-text("Video unavailable")',
      '.error-message',
      '[data-error="unavailable"]'
    ];

    for (const selector of errorSelectors) {
      if (await page.locator(selector).count() > 0) {
        console.log(`⚠️ Video error detected: ${selector}`);
        return false;
      }
    }

    // Verify player loads
    await page.waitForFunction(() => {
      const players = document.querySelectorAll('ytd-player');
      return Array.from(players).some(player => {
        const rect = player.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }, { timeout: 15000 });

    return true;

  } catch (error) {
    console.log(`❌ Navigation failed: ${error.message}`);

    // Try to recover by refreshing
    try {
      console.log('🔄 Attempting recovery - refreshing page');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await handleYouTubeCookies(page);

      // Quick check if recovery worked
      const player = page.locator('ytd-player').first();
      await expect(player).toBeVisible({ timeout: 5000 });
      return true;

    } catch (recoveryError) {
      console.log(`❌ Recovery failed: ${recoveryError.message}`);
      return false;
    }
  }
}
```

## 📋 **IMPLEMENTATION ROADMAP**

### **Tydzień 1: Krytyczne Poprawki**

| Dzień | Zadania | Status | Priorytet |
|-------|---------|--------|-----------|
| 1 | Naprawić Browser Context API | 🚀 In Progress | Critical |
| 1 | Poprawić YouTube player detection | 📋 Planned | Critical |
| 2 | Naprawić context management | 📋 Planned | High |
| 2 | Zaimplementować basic retry logic | 📋 Planned | High |

### **Tydzień 2: Infrastruktura Testów**

| Dzień | Zadania | Status | Priorytet |
|-------|---------|--------|-----------|
| 3 | Mock services integration | 📋 Planned | High |
| 3 | Video fallback system | 📋 Planned | High |
| 4 | Content script verification | 📋 Planned | Medium |
| 4 | Error recovery mechanisms | 📋 Planned | Medium |

### **Tydzień 3: Rozszerzenia i Optymalizacje**

| Dzień | Zadania | Status | Priorytet |
|-------|---------|--------|-----------|
| 5 | Test coverage expansion | 📋 Planned | Medium |
| 5 | Performance optimizations | 📋 Planned | Low |
| 6 | Documentation updates | 📋 Planned | Low |
| 6 | Final validation | 📋 Planned | High |

## 🎯 **SUCCESS METRICS**

### **Test Stability**
- ✅ **90%+ tests pass** on first run
- ✅ **< 2% flaky tests** with retry mechanisms
- ✅ **< 30s average test time**

### **Error Recovery**
- ✅ **80%+ error recovery** for common issues
- ✅ **Zero crashes** from unhandled exceptions
- ✅ **Graceful degradation** when services unavailable

### **Test Coverage**
- ✅ **100% basic functionality** covered
- ✅ **95%+ stable videos** available for testing
- ✅ **All critical paths** tested

## 🚀 **PILOT IMPLEMENTATION**

Zaczynam od **krytycznej poprawki Browser Context API**:

```typescript
// W tests/e2e/youtube-sidebar.spec.ts

test.describe('YouTube Sidebar Integration', () => {
  let browser: any;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  });

  test.afterAll(async () => {
    await browser?.close();
  });

  test.describe('Basic Functionality', () => {
    test('TC-001: Navigate to YouTube successfully', async () => {
      const context = await browser.newContext(); // Poprawione API
      const page = await context.newPage();

      try {
        // Użyj fallback navigation
        const videoUrl = await withRetry(
          () => navigateToYouTubeVideoWithFallback(page),
          3, // max retries
          2000 // delay between retries
        );

        console.log(`✅ Successfully loaded: ${videoUrl}`);

        // Verify basic elements
        await expect(page.locator('ytd-player')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('h1.ytd-video-primary-info-renderer')).toBeVisible();

      } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
      } finally {
        await page?.close();
        await context?.close();
      }
    });
  });
});
```

---

**🎯 STATUS: PLAN GOTOWY DO IMPLEMENTACJI**

Rozpocznę pracę nad krytycznymi poprawkami już teraz!
