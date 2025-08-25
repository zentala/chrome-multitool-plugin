/**
 * YouTube Test Helpers
 * Helper functions for YouTube plugin E2E testing
 */

// Purpose: This file provides utility functions for YouTube plugin testing,
// including navigation, sidebar detection, and caption testing

import { Page, BrowserContext } from '@playwright/test';

/**
 * Test data for YouTube videos with different caption types
 */
export const YOUTUBE_TEST_VIDEOS = {
  // Video with auto-generated English captions (ASR)
  autoCaptions: {
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // TED Talk with auto captions
    title: 'Auto-generated captions test',
    hasCaptions: true,
    captionType: 'asr'
  },

  // Video with manual English captions
  manualCaptions: {
    url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ', // Short video with manual captions
    title: 'Manual captions test',
    hasCaptions: true,
    captionType: 'manual'
  },

  // Video without captions
  noCaptions: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll (may not have captions)
    title: 'No captions test',
    hasCaptions: false
  },

  // Short video for quick testing
  shortVideo: {
    url: 'https://www.youtube.com/watch?v=BROWqjuTM0g', // Very short video
    title: 'Short video test',
    hasCaptions: false
  }
};

/**
 * Navigate to YouTube video and wait for it to load
 */
export async function navigateToYouTubeVideo(page: Page, videoUrl: string): Promise<void> {
  console.log(`🎬 Navigating to YouTube video: ${videoUrl}`);

  await page.goto(videoUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for YouTube player to load
  await page.waitForSelector('ytd-player', { timeout: 15000 });

  // Wait for video title to appear (indicates page is fully loaded)
  await page.waitForSelector('h1.ytd-video-primary-info-renderer', { timeout: 10000 });

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
 * Check if content script is loaded by looking for global functions
 */
export async function isYouTubeContentScriptLoaded(page: Page): Promise<boolean> {
  try {
    const result = await page.evaluate(() => {
      // Check if our content script has injected elements
      return document.querySelector('#zentala-youtube-sidebar') !== null;
    });
    return result;
  } catch (error) {
    console.log('❌ Error checking content script:', error);
    return false;
  }
}
