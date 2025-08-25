import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';

test.describe('Debug Extension Loading', () => {
  test('check if extension loads in browser', async () => {
    console.log('🔍 Debug: Testing extension loading...');

    const extensionPath = path.resolve('dist').replace(/\\/g, '/');
    console.log(`Extension path: ${extensionPath}`);

    // Launch browser with extension
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    console.log('✅ Browser launched with extension');

    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check chrome://extensions
    const extensionsPage = await browser.newPage();
    await extensionsPage.goto('chrome://extensions/');
    await extensionsPage.waitForTimeout(3000);

    // Take screenshot
    await extensionsPage.screenshot({ path: 'test-results/debug-extensions.png' });

    // Get page content
    const content = await extensionsPage.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText,
        hasExtensions: document.querySelectorAll('extensions-item').length > 0,
        extensionElements: Array.from(document.querySelectorAll('extensions-item')).map(el => ({
          name: el.getAttribute('name'),
          id: el.getAttribute('id'),
        }))
      };
    });

    console.log('Page content:', content);

    // Check service workers
    const serviceWorkers = browser.serviceWorkers();
    console.log(`Service workers: ${serviceWorkers.length}`);
    serviceWorkers.forEach((sw, i) => {
      console.log(`  SW ${i}: ${sw.url()}`);
    });

    // Check all pages
    const pages = browser.pages();
    console.log(`Pages: ${pages.length}`);
    pages.forEach((page, i) => {
      console.log(`  Page ${i}: ${page.url()}`);
    });

    // Try to access extension popup directly with a known ID pattern
    const testPage = await browser.newPage();

    // Test different possible extension ID patterns
    const possibleIds = [
      'abcdefghijklmnop', // placeholder
      'mfgccidlmgmcellpkjhepnhmfgdmnhae', // expected from key
    ];

    for (const testId of possibleIds) {
      try {
        console.log(`Testing popup with ID: ${testId}`);
        await testPage.goto(`chrome-extension://${testId}/popup.html`, {
          timeout: 5000,
          waitUntil: 'domcontentloaded'
        });
        console.log(`✅ Popup loaded with ID: ${testId}`);
        console.log(`URL: ${testPage.url()}`);
        await testPage.screenshot({ path: `test-results/popup-${testId}.png` });
        break;
      } catch (error) {
        console.log(`❌ Popup failed with ID ${testId}: ${error.message}`);
      }
    }

    await testPage.close();
    await extensionsPage.close();
    await browser.close();
  });
});
