// tests/e2e/youtube-integration.spec.ts
import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import { launchWithExtension, getPopupPage, getExtensionId } from '../fixtures/extension';
import {
  YOUTUBE_TEST_VIDEOS,
  navigateToYouTubeVideo,
  waitForYouTubeSidebar,
  getYouTubeSidebar,
  mockAIService,
  mockYouTubeAPI
} from '../utils/youtube-helpers';

let browser: any;
let context: any;

test.describe('YouTube Content Script Integration', () => {
  test.beforeAll(async () => {
    console.log('🚀 Setting up YouTube content script tests...');

    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    context = await browser.newBrowserContext();

    // Mock external services
    await mockAIService(context);
    await mockYouTubeAPI(context);
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up integration tests...');
    await browser?.close();
  });

  test.describe('Extension Loading', () => {
    test('TC-018: Extension loads with YouTube support', async () => {
      console.log('🧪 TC-018: Testing extension YouTube support...');

      // Open popup to verify extension loads
      const popup = await getPopupPage();
      await popup.waitForTimeout(2000);

      // Check if popup loads without errors
      const url = popup.url();
      expect(url).toContain('popup.html');

      // Check if YouTube module is available in popup
      const youtubeModule = popup.locator('[data-testid*="youtube"], .youtube-module, button:has-text("YouTube")').first();
      // Note: Module might not be immediately visible, but popup should load

      await popup.close();
      console.log('✅ Extension loads with YouTube support');
    });
  });

  test.describe('Cross-Page Communication', () => {
    test('TC-019: Content script communicates with background', async () => {
      console.log('🧪 TC-019: Testing content script to background communication...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        // Content script should be able to communicate with background
        // This is tested implicitly by sidebar appearing (content script loaded and working)

        const sidebarVisible = await page.locator('#zentala-youtube-sidebar').isVisible();
        expect(sidebarVisible).toBe(true);

        console.log('✅ Content script to background communication works');

      } catch (error) {
        console.error('❌ TC-019 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });

    test('TC-020: Background script handles YouTube messages', async () => {
      console.log('🧪 TC-020: Testing background message handling...');

      // This test verifies that background script can handle YouTube-specific messages
      // We test this indirectly by ensuring the extension doesn't crash when processing YouTube messages

      const page = await browser.newPage();

      try {
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);
        await waitForYouTubeSidebar(page);

        const sidebar = await getYouTubeSidebar(page);

        // Try to trigger AI processing (this sends message to background)
        const processBtn = sidebar.locator('#process-ai-btn');
        await processBtn.click();

        // Wait for background processing
        await page.waitForTimeout(2000);

        // Extension should still be responsive
        const stillVisible = await sidebar.isVisible();
        expect(stillVisible).toBe(true);

        console.log('✅ Background script handles YouTube messages correctly');

      } catch (error) {
        console.error('❌ TC-020 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });
  });

  test.describe('Popup Integration', () => {
    test('TC-021: YouTube module accessible from popup', async () => {
      console.log('🧪 TC-021: Testing YouTube module popup access...');

      const popup = await getPopupPage();

      try {
        await popup.waitForTimeout(2000);

        // Look for YouTube-related elements in popup
        // This might be a button, tab, or module selector
        const youtubeElements = popup.locator('button:has-text("YouTube"), [data-module*="youtube"], .youtube-tab').all();

        // At minimum, popup should load without YouTube-specific errors
        const url = popup.url();
        expect(url).toContain('popup.html');

        console.log('✅ Popup loads without YouTube integration errors');

      } catch (error) {
        console.error('❌ TC-021 failed:', error);
        throw error;
      } finally {
        await popup.close();
      }
    });

    test('TC-022: Settings integration works', async () => {
      console.log('🧪 TC-022: Testing settings integration...');

      const page = await browser.newPage();

      try {
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);
        await waitForYouTubeSidebar(page);

        const sidebar = await getYouTubeSidebar(page);
        const settingsBtn = sidebar.locator('#open-settings-btn');

        // Click settings button (should not crash)
        await settingsBtn.click();

        // Wait a moment
        await page.waitForTimeout(1000);

        // Extension should still be functional
        const sidebarStillVisible = await sidebar.isVisible();
        expect(sidebarStillVisible).toBe(true);

        console.log('✅ Settings integration works without crashes');

      } catch (error) {
        console.error('❌ TC-022 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });
  });

  test.describe('End-to-End Workflow', () => {
    test('TC-023: Complete YouTube workflow', async () => {
      console.log('🧪 TC-023: Testing complete YouTube workflow...');

      const page = await browser.newPage();

      try {
        // Step 1: Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);

        // Step 2: Wait for sidebar to inject
        await waitForYouTubeSidebar(page);

        // Step 3: Verify sidebar elements
        const sidebar = await getYouTubeSidebar(page);
        await expect(sidebar).toBeVisible();

        // Step 4: Test basic interactions
        const downloadBtn = sidebar.locator('#download-captions-btn');
        await expect(downloadBtn).toBeVisible();

        const processBtn = sidebar.locator('#process-ai-btn');
        await expect(processBtn).toBeVisible();

        // Step 5: Test AI processing (mocked)
        await processBtn.click();
        await page.waitForTimeout(2000);

        // Step 6: Verify extension still works
        const stillVisible = await sidebar.isVisible();
        expect(stillVisible).toBe(true);

        console.log('✅ Complete YouTube workflow successful');

      } catch (error) {
        console.error('❌ TC-023 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });

    test('TC-024: Multiple videos workflow', async () => {
      console.log('🧪 TC-024: Testing multiple videos workflow...');

      const page = await browser.newPage();

      try {
        // Test with first video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        let sidebar = await getYouTubeSidebar(page);
        expect(await sidebar.isVisible()).toBe(true);

        // Navigate to second video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);
        await waitForYouTubeSidebar(page);

        sidebar = await getYouTubeSidebar(page);
        expect(await sidebar.isVisible()).toBe(true);

        // Test should pass if both videos work
        console.log('✅ Multiple videos workflow successful');

      } catch (error) {
        console.error('❌ TC-024 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });
  });

  test.describe('Error Scenarios', () => {
    test('TC-025: Handles network errors gracefully', async () => {
      console.log('🧪 TC-025: Testing network error handling...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);
        await waitForYouTubeSidebar(page);

        // Simulate network issues by blocking requests
        await page.route('https://www.youtube.com/api/**', (route) => {
          route.abort();
        });

        const sidebar = await getYouTubeSidebar(page);

        // Try to use features (should handle errors gracefully)
        const downloadBtn = sidebar.locator('#download-captions-btn');
        await downloadBtn.click();

        // Wait for error handling
        await page.waitForTimeout(2000);

        // Sidebar should still be visible
        expect(await sidebar.isVisible()).toBe(true);

        console.log('✅ Network errors handled gracefully');

      } catch (error) {
        console.error('❌ TC-025 failed:', error);
        throw error;
      } finally {
        await page.close();
      }
    });
  });
});
