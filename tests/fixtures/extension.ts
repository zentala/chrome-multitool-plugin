import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

let context: BrowserContext;
let extensionId: string;

export async function launchWithExtension() {
  const extensionPath = process.env.EXTENSION_PATH || path.join(__dirname, '../../dist');

  console.log(`🔧 Launching extension from: ${extensionPath}`);

  context = await chromium.launchPersistentContext('', {
    headless: false, // 🚨 Extensions wymagają headful mode!
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  console.log('✅ Persistent context created with extension');

  // 🔑 Extension ID detekcja - próba backgroundpage (MV2) lub service worker (MV3)
  try {
    console.log('⏳ Waiting for background page/service worker...');

    // Spróbuj najpierw backgroundpage (MV2)
    const bgPage = await context.waitForEvent('backgroundpage', { timeout: 5000 }).catch(() => null);
    if (bgPage) {
      const url = bgPage.url();
      extensionId = url.split('/')[2];
      console.log(`🆔 Extension ID from background page: ${extensionId}`);
      return { context, extensionId };
    }

    // Jeśli nie ma backgroundpage, sprawdź service workers (MV3)
    console.log('⚠️ No background page found, checking service workers...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Daj czas na inicjalizację

    const serviceWorkers = context.serviceWorkers();
    console.log(`📊 Found ${serviceWorkers.length} service workers`);

    for (const worker of serviceWorkers) {
      const url = worker.url();
      console.log(`  - Worker: ${url}`);

      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          extensionId = match[1];
          console.log(`🆔 Extension ID from service worker: ${extensionId}`);
          return { context, extensionId };
        }
      }
    }

    // Fallback - spróbuj znaleźć przez chrome://extensions
    console.log('⚠️ No service workers found, trying chrome://extensions...');
    const extensionsPage = await context.newPage();

    try {
      await extensionsPage.goto('chrome://extensions/');
      await extensionsPage.waitForTimeout(3000);

      // Take screenshot to see what's there
      await extensionsPage.screenshot({ path: 'test-results/chrome-extensions-page.png' });

      // Spróbuj wyciągnąć ID przez shadow DOM (może nie działać w Playwright)
      const extensionInfo = await extensionsPage.evaluate(() => {
        try {
          // Look for extension elements
          const extensions = document.querySelectorAll('extensions-item');
          const extensionList = [];

          extensions.forEach(ext => {
            const name = ext.getAttribute('name') || 'Unknown';
            const id = ext.getAttribute('id') || 'No ID';
            extensionList.push({ name, id });
          });

          return extensionList;
        } catch (e) {
          return { error: e.message };
        }
      }).catch(() => ({ error: 'Could not evaluate page' }));

      console.log('Extensions found:', extensionInfo);

      // Look for our extension
      if (Array.isArray(extensionInfo)) {
        const ourExtension = extensionInfo.find(ext =>
          ext.name.includes('Zentala') || ext.name.includes('Multitool')
        );

        if (ourExtension) {
          extensionId = ourExtension.id;
          console.log(`🆔 Extension ID from chrome://extensions: ${extensionId}`);
        }
      }

    } catch (error) {
      console.log('Could not access chrome://extensions:', error.message);
    }

    await extensionsPage.close();

  } catch (error) {
    console.error('❌ Error during extension ID detection:', error);
  }

  if (!extensionId) {
    console.error('❌ Could not detect extension ID');
    console.log('🔍 Available pages and workers:');
    console.log('Pages:', context.pages().map(p => p.url()));
    console.log('Workers:', context.serviceWorkers().map(w => w.url()));
    throw new Error('Extension ID not found');
  }

  return { context, extensionId };
}

export async function getPopupPage(): Promise<Page> {
  if (!extensionId) {
    throw new Error('Extension not initialized - call launchWithExtension() first');
  }

  console.log(`🎯 Opening popup: chrome-extension://${extensionId}/popup.html`);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('networkidle');
  return page;
}

export async function getContext(): Promise<BrowserContext> {
  if (!context) {
    throw new Error('Context not initialized - call launchWithExtension() first');
  }
  return context;
}

export async function getExtensionId(): Promise<string> {
  if (!extensionId) {
    throw new Error('Extension ID not found - call launchWithExtension() first');
  }
  return extensionId;
}

export async function closeExtension(): Promise<void> {
  if (context) {
    await context.close();
    context = null as any;
    extensionId = '';
  }
}
