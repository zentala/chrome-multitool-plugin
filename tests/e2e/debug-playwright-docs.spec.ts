import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';

test.describe('Debug Playwright Extension Loading', () => {
  test('test official Playwright extension approach', async () => {
    console.log('🔍 Testing official Playwright extension loading approach...');

    const extensionPath = path.resolve('dist');
    console.log(`Extension path: ${extensionPath}`);

    // Try the approach from Playwright documentation
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        // Additional flags that might help
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    console.log('✅ Context created with Playwright recommended flags');

    // Wait longer for extension to initialize
    console.log('⏳ Waiting for extension initialization...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check if extension loaded by checking background pages
    console.log('🔍 Checking background pages...');
    const pages = context.pages();
    console.log(`Total pages: ${pages.length}`);

    for (const page of pages) {
      const pageUrl = page.url();
      console.log(`Page: ${pageUrl}`);

      if (pageUrl.includes('chrome-extension://')) {
        console.log('✅ Found extension page!');
      }
    }

    // Check service workers
    const serviceWorkers = context.serviceWorkers();
    console.log(`Service workers: ${serviceWorkers.length}`);

    for (const worker of serviceWorkers) {
      console.log(`Service worker: ${worker.url()}`);
    }

    // Check background pages specifically
    try {
      console.log('⏳ Waiting for background page...');
      const backgroundPage = await context.waitForEvent('backgroundpage', { timeout: 10000 });
      console.log('✅ Background page found!');
      console.log(`Background page URL: ${backgroundPage.url()}`);

      // Extract extension ID from background page
      const bgUrl = backgroundPage.url();
      const match = bgUrl.match(/chrome-extension:\/\/([^\/]+)\//);
      if (match) {
        const extensionId = match[1];
        console.log(`🆔 Extension ID: ${extensionId}`);

        // Try to open popup
        console.log(`🎯 Testing popup: chrome-extension://${extensionId}/popup.html`);
        const popupPage = await context.newPage();
        await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
        await popupPage.waitForLoadState('networkidle');

        console.log('✅ Popup loaded successfully!');
        await popupPage.screenshot({ path: 'test-results/playwright-docs-popup.png' });

        await popupPage.close();
      }
    } catch (error) {
      console.log(`❌ Background page wait failed: ${error.message}`);
    }

    // Try chrome://extensions as backup
    console.log('🔄 Checking chrome://extensions...');
    const extensionsPage = await context.newPage();
    await extensionsPage.goto('chrome://extensions/');
    await extensionsPage.waitForTimeout(3000);

    const extensionInfo = await extensionsPage.evaluate(() => {
      const extensions = document.querySelectorAll('extensions-item');
      return {
        count: extensions.length,
        extensions: Array.from(extensions).map(ext => ({
          name: ext.getAttribute('name'),
          id: ext.getAttribute('id'),
        }))
      };
    });

    console.log(`Extensions on chrome://extensions/: ${extensionInfo.count}`);
    if (extensionInfo.extensions.length > 0) {
      console.log('Extensions:', extensionInfo.extensions);
    }

    // Take final screenshot
    await extensionsPage.screenshot({ path: 'test-results/playwright-docs-extensions.png' });

    await extensionsPage.close();
    await context.close();

    console.log('🧪 Test completed');
  });
});
