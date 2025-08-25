// tests/e2e/youtube-sidebar.spec.ts
import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import {
  YOUTUBE_TEST_VIDEOS,
  navigateToYouTubeVideo,
  isYouTubeSidebarVisible,
  waitForYouTubeSidebar,
  getYouTubeSidebar,
  takeYouTubeScreenshot,
  isYouTubeContentScriptLoaded,
  mockAIService,
  mockYouTubeAPI
} from '../utils/youtube-helpers';

let browser: any;
let context: any;

test.describe('YouTube Sidebar Integration', () => {
  test.beforeAll(async () => {
    console.log('🚀 Setting up YouTube extension tests...');

    // Launch browser with extension
    browser = await chromium.launch({
      headless: false, // Extensions wymagają headful mode!
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    console.log('✅ YouTube test setup complete');
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up YouTube tests...');
    await browser?.close();
  });

  test.describe('Content Script Loading', () => {
    test('TC-001: Content script loads on YouTube pages', async () => {
      console.log('🧪 TC-001: Testing content script loading...');

      context = await browser.newBrowserContext();

      // Mock external services
      await mockAIService(context);
      await mockYouTubeAPI(context);

      const page = await context.newPage();

      try {
        // Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);

        // Check if content script is loaded
        const isLoaded = await isYouTubeContentScriptLoaded(page);
        expect(isLoaded).toBe(true);

        console.log('✅ Content script loaded successfully');

      } catch (error) {
        console.error('❌ TC-001 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });

    test('TC-002: Content script does not load on non-YouTube pages', async () => {
      console.log('🧪 TC-002: Testing content script on non-YouTube pages...');

      const page = await browser.newPage();

      try {
        // Navigate to non-YouTube page
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

        // Content script should not inject sidebar
        const sidebarVisible = await isYouTubeSidebarVisible(page);
        expect(sidebarVisible).toBe(false);

        console.log('✅ Content script correctly ignored non-YouTube page');

      } catch (error) {
        console.error('❌ TC-002 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });
  });

  test.describe('Sidebar Functionality', () => {
    test('TC-003: Sidebar injects correctly on YouTube', async () => {
      console.log('🧪 TC-003: Testing sidebar injection...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);

        // Wait for sidebar to appear
        await waitForYouTubeSidebar(page);

        // Verify sidebar is visible
        const sidebarVisible = await isYouTubeSidebarVisible(page);
        expect(sidebarVisible).toBe(true);

        // Take screenshot
        await takeYouTubeScreenshot(page, 'sidebar-injected');

        console.log('✅ Sidebar injected successfully');

      } catch (error) {
        console.error('❌ TC-003 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });

    test('TC-004: Sidebar has correct UI elements', async () => {
      console.log('🧪 TC-004: Testing sidebar UI elements...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        const sidebar = await getYouTubeSidebar(page);

        // Check for header
        const header = sidebar.locator('.zentala-sidebar-header');
        await expect(header).toBeVisible();

        // Check for title
        const title = header.locator('h3');
        await expect(title).toHaveText('🎬 YouTube AI');

        // Check for close button
        const closeButton = sidebar.locator('#zentala-sidebar-toggle');
        await expect(closeButton).toBeVisible();

        // Check for content sections
        const sections = sidebar.locator('.zentala-section');
        await expect(sections).toHaveCount(4); // Video Info, Captions, AI Analysis, Settings

        // Check for buttons
        const downloadBtn = sidebar.locator('#download-captions-btn');
        await expect(downloadBtn).toBeVisible();

        const processBtn = sidebar.locator('#process-ai-btn');
        await expect(processBtn).toBeVisible();

        const sendToAIBtn = sidebar.locator('#send-to-ai-btn');
        await expect(sendToAIBtn).toBeVisible();

        console.log('✅ All sidebar UI elements present');

      } catch (error) {
        console.error('❌ TC-004 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });

    test('TC-005: Sidebar close button works', async () => {
      console.log('🧪 TC-005: Testing sidebar close functionality...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        // Verify sidebar is visible
        expect(await isYouTubeSidebarVisible(page)).toBe(true);

        // Click close button
        const sidebar = await getYouTubeSidebar(page);
        const closeButton = sidebar.locator('#zentala-sidebar-toggle');
        await closeButton.click();

        // Wait a bit for animation
        await page.waitForTimeout(500);

        // Verify sidebar is hidden
        expect(await isYouTubeSidebarVisible(page)).toBe(false);

        console.log('✅ Sidebar close button works correctly');

      } catch (error) {
        console.error('❌ TC-005 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });
  });

  test.describe('Video Detection', () => {
    test('TC-006: Video ID is correctly extracted', async () => {
      console.log('🧪 TC-006: Testing video ID extraction...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        const sidebar = await getYouTubeSidebar(page);

        // Check if video ID is displayed
        const videoInfo = sidebar.locator('#video-info');
        const infoText = await videoInfo.textContent();

        expect(infoText).toContain('Video ID:');
        expect(infoText).toMatch(/Video ID: [a-zA-Z0-9_-]{11}/);

        console.log('✅ Video ID extracted correctly:', infoText);

      } catch (error) {
        console.error('❌ TC-006 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });

    test('TC-007: Sidebar reinitializes on navigation', async () => {
      console.log('🧪 TC-007: Testing navigation handling...');

      const page = await browser.newPage();

      try {
        // Navigate to first video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.shortVideo.url);
        await waitForYouTubeSidebar(page);

        // Get first video info
        let sidebar = await getYouTubeSidebar(page);
        let videoInfo1 = await sidebar.locator('#video-info').textContent();

        // Navigate to second video
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.autoCaptions.url);
        await waitForYouTubeSidebar(page);

        // Get second video info
        sidebar = await getYouTubeSidebar(page);
        let videoInfo2 = await sidebar.locator('#video-info').textContent();

        // Video IDs should be different
        expect(videoInfo1).not.toBe(videoInfo2);

        console.log('✅ Sidebar reinitialized on navigation');

      } catch (error) {
        console.error('❌ TC-007 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('TC-008: Graceful handling of videos without captions', async () => {
      console.log('🧪 TC-008: Testing no-captions scenario...');

      const page = await browser.newPage();

      try {
        // Navigate to video without captions
        await navigateToYouTubeVideo(page, YOUTUBE_TEST_VIDEOS.noCaptions.url);
        await waitForYouTubeSidebar(page);

        // Buttons should still be present but may show appropriate messages
        const sidebar = await getYouTubeSidebar(page);
        const downloadBtn = sidebar.locator('#download-captions-btn');
        await expect(downloadBtn).toBeVisible();

        // Take screenshot for manual verification
        await takeYouTubeScreenshot(page, 'no-captions-scenario');

        console.log('✅ No-captions scenario handled gracefully');

      } catch (error) {
        console.error('❌ TC-008 failed:', error);
        throw error;
      } finally {
        await page.close();
        await context?.close();
      }
    });
  });
});
