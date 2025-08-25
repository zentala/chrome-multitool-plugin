// tests/fixtures/youtube-test-data.ts
/**
 * YouTube Test Data
 * Static test data for YouTube plugin testing
 */

// Purpose: This file provides static test data and configurations
// for YouTube plugin E2E testing, including video URLs and expected results

export interface YouTubeTestVideo {
  url: string;
  title: string;
  hasCaptions: boolean;
  captionType?: 'asr' | 'manual' | 'none';
  expectedDuration?: number; // in seconds
  tags?: string[];
}

/**
 * Stable YouTube videos for testing
 * These videos should remain available and have consistent content
 */
export const STABLE_TEST_VIDEOS: Record<string, YouTubeTestVideo> = {
  // Very short video for quick testing
  shortVideo: {
    url: 'https://www.youtube.com/watch?v=BROWqjuTM0g',
    title: 'Short test video',
    hasCaptions: false,
    captionType: 'none'
  },

  // Video with auto-generated captions (if available)
  autoCaptions: {
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    title: 'TED Talk with auto captions',
    hasCaptions: true,
    captionType: 'asr',
    tags: ['technology', 'innovation', 'education']
  },

  // Classic video that should remain stable
  classic: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    hasCaptions: false,
    captionType: 'none'
  },

  // Educational content with potential captions
  educational: {
    url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
    title: 'Educational content',
    hasCaptions: true,
    captionType: 'manual',
    tags: ['education', 'tutorial']
  }
};

/**
 * Mock caption data for testing
 */
export const MOCK_CAPTION_DATA = {
  vttContent: `WEBVTT

00:00:00.000 --> 00:00:03.000
This is a test caption for automated testing.

00:00:03.000 --> 00:00:06.000
It demonstrates the caption extraction functionality.

00:00:06.000 --> 00:00:09.000
Multiple lines of text are properly handled.`,

  extractedText: `This is a test caption for automated testing. It demonstrates the caption extraction functionality. Multiple lines of text are properly handled.`,

  keyPoints: [
    'Test caption extraction',
    'Automated testing demonstration',
    'Multiple lines handling'
  ]
};

/**
 * Expected AI analysis results for testing
 */
export const EXPECTED_AI_RESULTS = {
  summary: 'This video demonstrates automated testing capabilities and caption extraction functionality.',
  sentiment: 'neutral',
  topics: ['testing', 'automation', 'captions'],
  keyPoints: [
    'Automated testing demonstration',
    'Caption extraction functionality',
    'Text processing capabilities'
  ]
};

/**
 * Test configurations
 */
export const TEST_CONFIG = {
  timeouts: {
    sidebarLoad: 10000,      // 10 seconds
    contentLoad: 5000,       // 5 seconds
    aiProcessing: 3000,      // 3 seconds
    downloadWait: 5000       // 5 seconds
  },

  retries: {
    flakyTests: 2,
    networkRequests: 3
  },

  browsers: {
    chrome: {
      headless: false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    }
  }
};

/**
 * Error messages for testing
 */
export const ERROR_MESSAGES = {
  noCaptions: 'No captions found for this video',
  networkError: 'Network error occurred',
  aiError: 'AI processing failed',
  invalidVideoId: 'Invalid video ID'
};

/**
 * Test selectors for YouTube elements
 */
export const YOUTUBE_SELECTORS = {
  videoPlayer: 'ytd-player',
  videoTitle: 'h1.ytd-video-primary-info-renderer',
  sidebar: '#zentala-youtube-sidebar',
  downloadButton: '#download-captions-btn',
  processAIButton: '#process-ai-btn',
  sendToAIButton: '#send-to-ai-btn',
  aiPromptInput: '#ai-prompt',
  settingsButton: '#open-settings-btn',
  closeButton: '#zentala-sidebar-toggle',
  videoInfo: '#video-info',
  aiResponse: '.ai-response'
};

/**
 * Test assertions
 */
export const ASSERTIONS = {
  sidebar: {
    shouldBeVisible: true,
    shouldHaveHeader: true,
    shouldHaveButtons: ['download', 'process', 'send', 'settings'],
    shouldShowVideoId: true
  },

  buttons: {
    download: {
      text: 'Download Captions',
      shouldBeEnabled: true
    },
    processAI: {
      text: 'Process with AI',
      shouldBeEnabled: true
    },
    sendToAI: {
      text: 'Send to AI',
      shouldBeEnabled: true
    }
  },

  captions: {
    shouldDownload: true,
    shouldExtractText: true,
    shouldHandleVTT: true
  },

  ai: {
    shouldProcess: true,
    shouldReturnResults: true,
    shouldHandleErrors: true
  }
};
