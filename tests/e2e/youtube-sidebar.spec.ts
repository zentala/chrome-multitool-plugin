// tests/e2e/youtube-sidebar.spec.ts
import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import {
  navigateToYouTubeVideoWithFallback,
  handleYouTubeCookies
} from '../utils/youtube-helpers';

let browser: any;
let context: any;
let page: any;

test.describe('YouTube Sidebar Integration', () => {
  test.beforeAll(async () => {
    console.log('🚀 Setting up YouTube extension tests...');

    browser = await chromium.launch({
      headless: false,
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

  test.describe('Basic YouTube Integration', () => {
    test.beforeEach(async () => {
      console.log('🔄 Setting up test context...');

      // Create fresh context for each test
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });

      // Mock external services
      await context.route('https://*.googleapis.com/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    success: true,
                    analysis: 'Test AI analysis successful',
                    summary: 'Test video summary'
                  })
                }]
              }
            }]
          })
        });
      });

      await context.route('https://www.youtube.com/api/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            responseContext: { visitorData: 'test' },
            contents: { test: 'data' }
          })
        });
      });

      page = await context.newPage();
      console.log('✅ Test context ready');
    });

    test.afterEach(async () => {
      console.log('🧹 Cleaning up test context...');
      await page?.close();
      await context?.close();
    });

    test('TC-001: Navigate to YouTube and check basic functionality', async () => {
      console.log('🧪 TC-001: Testing basic YouTube navigation...');

      try {
        // Navigate to YouTube video with fallback
        const videoUrl = await navigateToYouTubeVideoWithFallback(page);
        console.log(`✅ Successfully loaded video: ${videoUrl}`);

        // Check if we're on YouTube
        const url = page.url();
        expect(url).toContain('youtube.com');
        console.log(`📍 Current URL: ${url}`);

        // Check if YouTube player is loaded (improved detection)
        await page.waitForFunction(() => {
          const players = document.querySelectorAll('ytd-player');
          return Array.from(players).some(player => {
            const rect = player.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        }, { timeout: 15000 });

        console.log('🎬 YouTube player is visible and functional');

        // Check if video title is loaded
        const title = page.locator('h1.ytd-video-primary-info-renderer').first();
        await expect(title).toBeVisible({ timeout: 10000 });
        console.log('📝 Video title is visible');

        // Take screenshot for verification
        await page.screenshot({ path: 'test-results/youtube-basic-test.png' });

        console.log('✅ Basic YouTube navigation successful');

      } catch (error) {
        console.error('❌ TC-001 failed:', error);

        // Take error screenshot
        await page.screenshot({ path: 'test-results/youtube-error.png' });
        throw error;
      }
    });

    test('TC-002: Test navigation to different YouTube videos', async () => {
      console.log('🧪 TC-002: Testing multiple YouTube videos...');

      try {
        // Test with different videos to ensure stability
        const videos = [
          'https://www.youtube.com/watch?v=0Z760bYny9c', // Kurzgesagt
          'https://www.youtube.com/watch?v=h6cVyoMH4Ec', // Khan Academy
          'https://www.youtube.com/watch?v=kJQP7kiw5Fk'  // Despacito (fallback)
        ];

        for (const videoUrl of videos) {
          console.log(`🎬 Testing video: ${videoUrl}`);
          await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // Handle cookies
          await handleYouTubeCookies(page);

          // Check for unavailable video
          const unavailable = await page.locator('h1:has-text("Video unavailable")').count();
          if (unavailable > 0) {
            console.log(`⚠️ Video unavailable, skipping: ${videoUrl}`);
            continue;
          }

          // Check if video loads (improved check)
          await page.waitForFunction(() => {
            const players = document.querySelectorAll('ytd-player');
            return Array.from(players).some(player => player.offsetWidth > 0);
          }, { timeout: 15000 });

          console.log(`✅ Video ${videoUrl} loaded successfully`);
        }

        console.log('✅ Multiple videos test successful');

      } catch (error) {
        console.error('❌ TC-002 failed:', error);

        // Take error screenshot
        await page.screenshot({ path: 'test-results/youtube-multi-error.png' });
        throw error;
      }
    });
});
