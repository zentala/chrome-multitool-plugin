/**
 * YouTube Test Helpers
 * Helper functions for YouTube plugin E2E testing
 */

// Purpose: This file provides utility functions for YouTube plugin testing,
// including navigation, sidebar detection, and caption testing

import { Page, BrowserContext } from '@playwright/test';

/**
 * Stable YouTube videos for testing - these should be more reliable
 * Using TED Talks, educational content, and popular stable videos
 */
export const YOUTUBE_TEST_VIDEOS = {
  // TED Talk - usually very stable with good captions
  tedTalk: {
    url: 'https://www.youtube.com/watch?v=6Af6b_wyiwI', // "The power of vulnerability" by Brené Brown
    title: 'TED Talk - The power of vulnerability',
    hasCaptions: true,
    captionType: 'manual',
    duration: '20:00'
  },

  // Kurzgesagt - educational content, usually stable
  kurzgesagt: {
    url: 'https://www.youtube.com/watch?v=0Z760bYny9c', // "The Egg" - very short and stable
    title: 'Kurzgesagt - The Egg',
    hasCaptions: true,
    captionType: 'manual',
    duration: '3:00'
  },

  // Khan Academy - educational, stable
  khanAcademy: {
    url: 'https://www.youtube.com/watch?v=h6cVyoMH4Ec', // "Introduction to limits"
    title: 'Khan Academy - Introduction to limits',
    hasCaptions: true,
    captionType: 'manual',
    duration: '8:00'
  },

  // Vsauce - science content, usually stable
  vsauce: {
    url: 'https://www.youtube.com/watch?v=9C2-GcggqbQ', // "Is Your Red The Same as My Red?"
    title: 'Vsauce - Is Your Red The Same as My Red?',
    hasCaptions: true,
    captionType: 'manual',
    duration: '12:00'
  },

  // Very popular stable video as fallback
  fallback: {
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Despacito - extremely stable and popular
    title: 'Luis Fonsi - Despacito (Fallback)',
    hasCaptions: true,
    captionType: 'asr',
    duration: '4:00'
  },

  // Keep the original short video as backup
  shortVideo: {
    url: 'https://www.youtube.com/watch?v=BROWqjuTM0g',
    title: 'Backup short video',
    hasCaptions: false,
    captionType: 'none',
    duration: '0:30'
  }
};

/**
 * Handle YouTube cookies consent dialog
 */
export async function handleYouTubeCookies(page: Page): Promise<void> {
  try {
    console.log('🍪 Checking for YouTube consent dialog...');

    // Czekaj na consent dialog (max 5s)
    const consentDialog = page.locator('[aria-label*="consent"], [data-purpose="consent"], .consent-dialog').first();

    if (await consentDialog.isVisible({ timeout: 5000 })) {
      console.log('🍪 Found YouTube consent dialog, handling...');

      // Szukaj przycisków akceptacji w różnych językach
      const acceptButtons = [
        page.locator('button:has-text("Accept all")'),
        page.locator('button:has-text("Akceptuj wszystkie")'),
        page.locator('button:has-text("I agree")'),
        page.locator('button:has-text("Zgadzam się")'),
        page.locator('button:has-text("Accept")'),
        page.locator('button:has-text("Akceptuj")'),
        page.locator('button:has-text("Agree")'),
        page.locator('button:has-text("Wyrażam zgodę")')
      ];

      // Szukaj przycisków odrzucenia jako fallback
      const rejectButtons = [
        page.locator('button:has-text("Reject all")'),
        page.locator('button:has-text("Odrzuć wszystkie")'),
        page.locator('button:has-text("Reject")'),
        page.locator('button:has-text("Odrzuć")')
      ];

      // Najpierw próbuj znaleźć przycisk akceptacji
      for (const button of acceptButtons) {
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log('✅ Clicked accept button');
          await page.waitForTimeout(1000); // Daj czas na zamknięcie dialogu
          return;
        }
      }

      // Jeśli nie ma akceptacji, spróbuj odrzucenia (mniej tracking)
      for (const button of rejectButtons) {
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log('⚠️ Clicked reject button (fallback)');
          await page.waitForTimeout(1000);
          return;
        }
      }

      // Jeśli nie ma przycisków, spróbuj zamknąć dialog krzyżykiem
      console.log('⚠️ No buttons found, trying to close dialog...');
      const closeButton = page.locator('button[aria-label="Close"], .close-button, [aria-label*="close"]').first();
      if (await closeButton.isVisible({ timeout: 1000 })) {
        await closeButton.click();
        console.log('✅ Closed consent dialog');
      } else {
        console.log('⚠️ Could not find way to close consent dialog');
      }

      await page.waitForTimeout(1000);
    } else {
      console.log('🍪 No consent dialog found');
    }
  } catch (error) {
    console.log('🍪 No consent dialog found or already handled');
  }
}

/**
 * Navigate to YouTube video and wait for it to load
 */
export async function navigateToYouTubeVideo(page: Page, videoUrl: string): Promise<void> {
  console.log(`🎬 Navigating to YouTube video: ${videoUrl}`);

  await page.goto(videoUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Handle YouTube cookies
  await handleYouTubeCookies(page);

  // Check if video is available
  const unavailableMessage = page.locator('h1:has-text("Video unavailable"), .unavailable-message').first();
  if (await unavailableMessage.isVisible({ timeout: 3000 })) {
    const errorText = await unavailableMessage.textContent();
    throw new Error(`Video unavailable: ${errorText}`);
  }

  // Wait for YouTube player to load
  await page.waitForSelector('ytd-player, #player', { timeout: 15000 });

  // Wait for video title to appear (indicates page is fully loaded)
  await page.waitForSelector('h1.ytd-video-primary-info-renderer, .title', { timeout: 10000 });

  // Wait additional time for content script to initialize
  await page.waitForTimeout(3000);

  console.log('✅ YouTube video loaded successfully');
}

/**
 * Check if YouTube sidebar is injected
 */
export async function isYouTubeSidebarVisible(page: Page): Promise<boolean> {
  try {
    const sidebar = await page.locator('#zentala-youtube-sidebar');
    return await sidebar.isVisible({ timeout: 5000 });
  } catch (error) {
    console.log('❌ YouTube sidebar not found');
    return false;
  }
}

/**
 * Get YouTube sidebar element
 */
export async function getYouTubeSidebar(page: Page) {
  return page.locator('#zentala-youtube-sidebar');
}

/**
 * Wait for YouTube sidebar to appear
 */
export async function waitForYouTubeSidebar(page: Page, timeout = 10000): Promise<void> {
  console.log('⏳ Waiting for YouTube sidebar...');

  const sidebar = page.locator('#zentala-youtube-sidebar');
  await sidebar.waitFor({ state: 'visible', timeout });

  console.log('✅ YouTube sidebar is visible');
}

/**
 * Click YouTube sidebar button
 */
export async function clickYouTubeSidebarButton(page: Page, buttonText: string): Promise<void> {
  const sidebar = await getYouTubeSidebar(page);
  const button = sidebar.locator(`button:has-text("${buttonText}")`);

  await button.click();
  console.log(`🔘 Clicked button: ${buttonText}`);
}

/**
 * Check if caption download button is enabled
 */
export async function isDownloadCaptionsEnabled(page: Page): Promise<boolean> {
  try {
    const button = page.locator('#download-captions-btn');
    const isVisible = await button.isVisible();
    const isEnabled = await button.isEnabled();
    return isVisible && isEnabled;
  } catch {
    return false;
  }
}

/**
 * Check if AI processing button is enabled
 */
export async function isProcessWithAIEnabled(page: Page): Promise<boolean> {
  try {
    const button = page.locator('#process-ai-btn');
    const isVisible = await button.isVisible();
    const isEnabled = await button.isEnabled();
    return isVisible && isEnabled;
  } catch {
    return false;
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Mock AI service responses for testing
 */
export async function mockAIService(context: BrowserContext): Promise<void> {
  // Mock Gemini AI API
  await context.route('https://generativelanguage.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                success: true,
                analysis: 'This is a test video about an interesting topic. Key points include: 1) Main concept explanation, 2) Practical examples, 3) Conclusion and recommendations.',
                summary: 'Test video summary for automated testing purposes.',
                keyPoints: [
                  'Main concept is well explained',
                  'Practical examples provided',
                  'Clear conclusion with actionable insights'
                ]
              })
            }]
          }
        }]
      })
    });
  });

  console.log('🤖 AI service mocked for testing');
}

/**
 * Mock YouTube API responses for testing
 */
export async function mockYouTubeAPI(context: BrowserContext): Promise<void> {
  // Mock YouTube player response for captions
  await context.route('https://www.youtube.com/youtubei/v1/get_transcript**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        actions: [{
          updateEngagementPanelAction: {
            targetId: 'engagement-panel-searchable-transcript',
            content: {
              transcriptRenderer: {
                content: {
                  transcriptSearchPanelRenderer: {
                    body: {
                      transcriptSegmentListRenderer: {
                        initialSegments: [
                          {
                            transcriptSegmentRenderer: {
                              startMs: '0',
                              endMs: '3000',
                              snippet: {
                                runs: [{ text: 'This is a test transcript for automated testing.' }]
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }]
      })
    });
  });

  console.log('📺 YouTube API mocked for testing');
}

/**
 * Take screenshot of YouTube page with sidebar
 */
export async function takeYouTubeScreenshot(page: Page, name: string): Promise<void> {
  const screenshotPath = `test-results/youtube-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
}

/**
 * Wait for console messages from YouTube content script
 */
export async function waitForYouTubeConsoleMessage(page: Page, message: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for console message: ${message}`));
    }, timeout);

    page.on('console', (msg) => {
      if (msg.text().includes(message)) {
        clearTimeout(timer);
        console.log(`📝 Console message received: ${msg.text()}`);
        resolve();
      }
    });
  });
}

/**
 * Debug content script loading with detailed diagnostics
 */
export async function debugContentScriptLoading(page: Page): Promise<boolean> {
  console.log('🔍 Debugging content script loading...');

  try {
    // Check if sidebar element exists
    const sidebarExists = await page.evaluate(() => {
      const sidebar = document.querySelector('#zentala-youtube-sidebar');
      if (sidebar) {
        console.log('✅ Sidebar element found');
        return true;
      } else {
        console.log('❌ Sidebar element not found');
        return false;
      }
    });

    if (sidebarExists) {
      console.log('✅ Content script loaded successfully');
      return true;
    }

    // Check if content script is injected by looking for script tags
    const scripts = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      const youtubeScripts = scriptTags.filter(script =>
        script.src.includes('youtube') ||
        script.textContent?.includes('zentala') ||
        script.textContent?.includes('Zentala')
      );
      return youtubeScripts.length;
    });

    console.log(`📊 Found ${scripts} YouTube-related scripts`);

    // Check console logs for our content script
    const logs = await page.evaluate(() => {
      // This is a simplified check - in real scenario we'd need to capture console logs
      return document.readyState;
    });

    console.log(`📄 Document readyState: ${logs}`);

    // Check if we're on the right domain
    const url = page.url();
    const isYouTube = url.includes('youtube.com');
    console.log(`🌐 Current URL: ${url} (YouTube: ${isYouTube})`);

    if (!isYouTube) {
      console.log('❌ Not on YouTube domain');
      return false;
    }

    console.log('⚠️ Content script may not have loaded yet');
    return false;

  } catch (error) {
    console.error('❌ Error debugging content script:', error);
    return false;
  }
}

/**
 * Enhanced content script detection with retry
 */
export async function isYouTubeContentScriptLoaded(page: Page, maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await page.evaluate(() => {
        // Check if our content script has injected elements
        return document.querySelector('#zentala-youtube-sidebar') !== null;
      });

      if (result) {
        console.log('✅ Content script loaded successfully');
        return true;
      }

      if (i < maxRetries - 1) {
        console.log(`⏳ Content script not found, retrying... (${i + 1}/${maxRetries})`);
        await page.waitForTimeout(1000);
      }

    } catch (error) {
      console.log(`❌ Error checking content script (attempt ${i + 1}):`, error);
    }
  }

  // Run detailed diagnostics
  await debugContentScriptLoading(page);
  return false;
}

/**
 * Navigate with fallback videos
 */
export async function navigateToYouTubeVideoWithFallback(page: Page): Promise<string> {
  const videos = [
    YOUTUBE_TEST_VIDEOS.kurzgesagt, // Short and stable
    YOUTUBE_TEST_VIDEOS.tedTalk,
    YOUTUBE_TEST_VIDEOS.khanAcademy,
    YOUTUBE_TEST_VIDEOS.vsauce,
    YOUTUBE_TEST_VIDEOS.fallback // Most stable fallback
  ];

  for (const video of videos) {
    try {
      console.log(`🎬 Trying video: ${video.title}`);
      await navigateToYouTubeVideo(page, video.url);
      console.log(`✅ Successfully loaded: ${video.title}`);
      return video.url;
    } catch (error) {
      console.log(`❌ Failed to load ${video.title}:`, error.message);
      continue;
    }
  }

  throw new Error('All test videos failed to load');
}
