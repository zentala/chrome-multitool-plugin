import { test, expect } from '@playwright/test';
import { setupBrowser, openPopup, closeBrowser } from '../fixtures/extension-helpers-simple';

test.describe('Simple Extension Test', () => {
  test.beforeAll(async () => {
    await setupBrowser();
  });
  
  test.afterAll(async () => {
    await closeBrowser();
  });
  
  test('can open extension popup', async () => {
    const popup = await openPopup();
    
    // Check URL
    expect(popup.url()).toContain('chrome-extension://');
    expect(popup.url()).toContain('/popup.html');
    
    // Wait for content
    await popup.waitForTimeout(2000);
    
    // Take screenshot
    await popup.screenshot({ path: 'test-results/popup-screenshot.png' });
    
    // Check for any content
    const body = popup.locator('body');
    await expect(body).toBeVisible();
    
    // Look for React root
    const root = popup.locator('#root, [id="root"], .app, [class*="app"]').first();
    await expect(root).toBeVisible({ timeout: 10000 });
    
    await popup.close();
  });
});
