import { test, expect } from '@playwright/test';
import { getSharedContext, getExtensionId, openExtensionPopup, closeSharedBrowser } from '../fixtures/shared-browser';

test.describe('Shared Browser Extension Test', () => {
  test.beforeAll(async () => {
    // Setup is done in getSharedContext()
  });

  test.afterAll(async () => {
    await closeSharedBrowser();
  });

  test('extension popup loads correctly', async () => {
    console.log('🧪 Testing popup loading...');

    const popup = await openExtensionPopup();

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

    // Take screenshot
    await popup.screenshot({ path: 'test-results/shared-popup.png' });

    // Check for any content
    const body = popup.locator('body');
    await expect(body).toBeVisible();

    await popup.close();
  });

  test('can access extension ID', async () => {
    const extensionId = await getExtensionId();
    console.log(`Extension ID: ${extensionId}`);

    expect(extensionId).toMatch(/^[a-z]{32}$/); // Chrome extension IDs are 32 chars
    expect(extensionId).toBeTruthy();
  });

  test('context has service workers', async () => {
    const context = await getSharedContext();
    const serviceWorkers = context.serviceWorkers();

    console.log(`Service workers count: ${serviceWorkers.length}`);
    expect(serviceWorkers.length).toBeGreaterThan(0);

    // Check that one is our extension
    const extensionWorker = serviceWorkers.find(w => w.url().includes('chrome-extension://'));
    expect(extensionWorker).toBeTruthy();
  });
});
