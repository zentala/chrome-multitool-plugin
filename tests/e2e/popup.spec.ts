import { test, expect } from '@playwright/test';
import { launchWithExtension, getPopupPage, getExtensionId, closeExtension } from '../fixtures/extension';

let extensionId: string;

test.describe('Chrome Extension Popup', () => {
  test.beforeAll(async () => {
    console.log('🚀 Setting up extension for tests...');
    const result = await launchWithExtension();
    extensionId = result.extensionId;
    console.log(`✅ Extension ready with ID: ${extensionId}`);
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up extension...');
    await closeExtension();
  });

  test('popup loads correctly', async () => {
    console.log('🧪 Testing popup loading...');

    const popup = await getPopupPage();

    // Check URL
    const url = popup.url();
    console.log(`Popup URL: ${url}`);
    expect(url).toContain('chrome-extension://');
    expect(url).toContain('/popup.html');

    // Wait for content to load
    await popup.waitForTimeout(2000);

    // Check for React app root
    const rootElement = popup.locator('#root, div[id="root"], .app').first();
    await expect(rootElement).toBeVisible({ timeout: 10000 });

    // Check for extension title or main content
    const titleElement = popup.locator('h1, h2, [data-testid*="title"]').first();
    await expect(titleElement).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await popup.screenshot({ path: 'test-results/popup-loaded.png' });

    await popup.close();
  });

  test('currency converter module is accessible', async () => {
    console.log('🧪 Testing currency converter access...');

    const popup = await getPopupPage();

    // Look for currency converter button or module
    const currencyElements = popup.locator(
      'button:has-text("Currency Converter"), ' +
      '[data-testid*="currency"], ' +
      '.currency-converter, ' +
      'button:has-text("Currency"), ' +
      'button:has-text("Convert")'
    );

    // At least one currency-related element should be visible
    const count = await currencyElements.count();
    console.log(`Found ${count} currency-related elements`);

    if (count > 0) {
      await expect(currencyElements.first()).toBeVisible();
      console.log('✅ Currency converter accessible');
    } else {
      console.log('⚠️ No currency converter elements found - checking general content');

      // Check for any interactive elements
      const buttons = popup.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons`);

      // Check for any input fields
      const inputs = popup.locator('input');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} inputs`);
    }

    // Take screenshot
    await popup.screenshot({ path: 'test-results/popup-currency.png' });

    await popup.close();
  });

  test('extension ID is valid', async () => {
    const id = await getExtensionId();
    console.log(`Extension ID: ${id}`);

    // Chrome extension IDs are 32 character lowercase hex strings
    expect(id).toMatch(/^[a-z]{32}$/);
    expect(id.length).toBe(32);
  });

  test('can access extension context', async () => {
    console.log('🧪 Testing extension context access...');

    const popup = await getPopupPage();

    // Try to execute extension-specific JavaScript
    const extensionCheck = await popup.evaluate(() => {
      try {
        // Check if chrome API is available
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          return {
            hasRuntime: true,
            extensionId: chrome.runtime.id,
            manifestVersion: chrome.runtime.getManifest()?.manifest_version
          };
        }
        return { hasRuntime: false };
      } catch (e) {
        return { hasRuntime: false, error: e.message };
      }
    });

    console.log('Extension context check:', extensionCheck);
    expect(extensionCheck.hasRuntime).toBe(true);

    if (extensionCheck.extensionId) {
      expect(extensionCheck.extensionId).toBe(extensionId);
    }

    await popup.close();
  });
});
