// tests/e2e/youtube-sidebar.spec.ts
import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import {
  navigateToYouTubeVideoWithFallback,
  isYouTubeSidebarVisible,
  waitForYouTubeSidebar,
  getYouTubeSidebar
} from '../utils/youtube-helpers';

let browser: any;
let context: any;

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
    test('TC-001: Navigate to YouTube and check basic functionality', async () => {
      console.log('🧪 TC-001: Testing basic YouTube navigation...');

      const page = await browser.newPage();

      try {
        // Navigate to YouTube video with fallback
        const videoUrl = await navigateToYouTubeVideoWithFallback(page);
        console.log(`✅ Successfully loaded video: ${videoUrl}`);

        // Check if we're on YouTube
        const url = page.url();
        expect(url).toContain('youtube.com');
        console.log(`📍 Current URL: ${url}`);

        // Check if YouTube player is loaded
        const player = page.locator('ytd-player, #player').first();
        await expect(player).toBeVisible({ timeout: 10000 });
        console.log('🎬 YouTube player is visible');

        // Check if video title is loaded
        const title = page.locator('h1.ytd-video-primary-info-renderer').first();
        await expect(title).toBeVisible({ timeout: 10000 });
        console.log('📝 Video title is visible');

        console.log('✅ Basic YouTube navigation successful');

      } catch (error) {
        console.error('❌ TC-001 failed:', error);
        throw error;
      } finally {
        await page?.close();
      }
    });

    test('TC-002: Test navigation to different YouTube videos', async () => {
      console.log('🧪 TC-002: Testing multiple YouTube videos...');

      const page = await browser.newPage();

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

          // Check if video loads (basic check)
          const player = page.locator('ytd-player, #player').first();
          await expect(player).toBeVisible({ timeout: 15000 });
          console.log(`✅ Video ${videoUrl} loaded successfully`);
        }

        console.log('✅ Multiple videos test successful');

      } catch (error) {
        console.error('❌ TC-002 failed:', error);
        throw error;
      } finally {
        await page?.close();
      }
    });
});
