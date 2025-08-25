/**
 * YouTube Content Script
 * Handles YouTube page integration and sidebar injection
 */

// Purpose: This script runs on YouTube pages and provides the transcription
// functionality by injecting a sidebar and communicating with the main extension

import { youtubeTranscriptionService } from '../../services/youtube/youtube.service';

/**
 * Interface for YouTube caption tracks
 */
interface YouTubeCaptionTrack {
  baseUrl: string;
  kind?: string;
  languageCode?: string;
  name?: {
    simpleText: string;
  };
}

/**
 * YouTube content script class
 */
class YouTubeContentScript {
  private sidebarInjected = false;
  private currentVideoId: string | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the content script
   */
  private initialize(): void {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageLoad());
    } else {
      this.onPageLoad();
    }

    // Listen for navigation changes (YouTube uses SPA)
    this.observeNavigation();
  }

  /**
   * Handle page load
   */
  private onPageLoad(): void {
    console.log('Zentala-YT: YouTube page loaded');

    // Inject sidebar after a short delay to ensure page is fully loaded
    setTimeout(() => {
      this.injectSidebar();
    }, 2000);

    // Extract video ID if on a watch page
    this.extractCurrentVideoId();
  }

  /**
   * Observe YouTube navigation changes
   */
  private observeNavigation(): void {
    // YouTube uses history API for navigation
    let currentUrl = window.location.href;

    const checkUrlChange = () => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        console.log('Zentala-YT: URL changed, reinitializing');
        this.onPageLoad();
      }
    };

    // Check for URL changes periodically
    setInterval(checkUrlChange, 1000);
  }

  /**
   * Extract video ID from current URL
   */
  private extractCurrentVideoId(): void {
    const videoId = youtubeTranscriptionService.extractVideoId(window.location.href);
    if (videoId !== this.currentVideoId) {
      this.currentVideoId = videoId;
      console.log('Zentala-YT: Current video ID:', videoId);
    }
  }

  /**
   * Inject the YouTube sidebar
   */
  private injectSidebar(): void {
    if (this.sidebarInjected) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'zentala-youtube-sidebar';
    sidebar.innerHTML = `
      <div class="zentala-sidebar-header">
        <h3>🎬 YouTube AI</h3>
        <button id="zentala-sidebar-toggle" class="zentala-sidebar-btn">×</button>
      </div>
      <div class="zentala-sidebar-content">
        <div class="zentala-section">
          <h4>Video Info</h4>
          <div id="video-info">
            ${this.currentVideoId ? `Video ID: ${this.currentVideoId}` : 'No video detected'}
          </div>
        </div>
        <div class="zentala-section">
          <h4>Captions</h4>
          <button id="download-captions-btn" class="zentala-btn">
            Download Captions
          </button>
          <button id="process-ai-btn" class="zentala-btn">
            Process with AI
          </button>
        </div>
        <div class="zentala-section">
          <h4>AI Analysis</h4>
          <textarea id="ai-prompt" placeholder="Enter prompt for AI analysis..." rows="4"></textarea>
          <button id="send-to-ai-btn" class="zentala-btn">Send to AI</button>
        </div>
        <div class="zentala-section">
          <h4>Settings</h4>
          <button id="open-settings-btn" class="zentala-btn secondary">
            Open Extension Settings
          </button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #zentala-youtube-sidebar {
        position: fixed;
        top: 60px;
        right: 0;
        width: 320px;
        height: calc(100vh - 60px);
        background: #fff;
        box-shadow: 0 0 16px rgba(0,0,0,0.13);
        z-index: 9999;
        border-left: 1px solid #eee;
        display: flex;
        flex-direction: column;
        font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
        overflow-y: auto;
      }

      .zentala-sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f9f9f9;
      }

      .zentala-sidebar-content {
        flex: 1;
        padding: 16px;
      }

      .zentala-section {
        margin-bottom: 20px;
      }

      .zentala-section h4 {
        margin: 0 0 12px 0;
        color: #030303;
        font-size: 14px;
        font-weight: 500;
      }

      .zentala-btn {
        width: 100%;
        padding: 8px 16px;
        margin-bottom: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #fff;
        color: #030303;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .zentala-btn:hover {
        background: #f0f0f0;
      }

      .zentala-btn.secondary {
        background: #f9f9f9;
        border-color: #ccc;
      }

      .zentala-sidebar-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #606060;
        padding: 4px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .zentala-sidebar-btn:hover {
        background: #e0e0e0;
      }

      #ai-prompt {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        font-family: inherit;
        margin-bottom: 8px;
      }

      #video-info {
        font-size: 12px;
        color: #606060;
        word-break: break-all;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(sidebar);

    this.sidebarInjected = true;
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to sidebar elements
   */
  private attachEventListeners(): void {
    // Close sidebar button
    const closeBtn = document.getElementById('zentala-sidebar-toggle');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('zentala-youtube-sidebar');
        if (sidebar) {
          sidebar.style.display = 'none';
        }
      });
    }

    // Download captions button
    const downloadBtn = document.getElementById('download-captions-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleDownloadCaptions());
    }

    // Process with AI button
    const processBtn = document.getElementById('process-ai-btn');
    if (processBtn) {
      processBtn.addEventListener('click', () => this.handleProcessWithAI());
    }

    // Send to AI button
    const sendToAIBtn = document.getElementById('send-to-ai-btn');
    if (sendToAIBtn) {
      sendToAIBtn.addEventListener('click', () => this.handleSendToAI());
    }

    // Open settings button
    const settingsBtn = document.getElementById('open-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleOpenSettings());
    }
  }

  /**
   * Handle download captions
   */
  private async handleDownloadCaptions(): Promise<void> {
    if (!this.currentVideoId) {
      alert('No video detected');
      return;
    }

    try {
      // Find caption URL using the improved logic from the old plugin
      const captionUrl = await this.findCaptionUrl();
      if (!captionUrl) {
        alert('No captions found for this video');
        return;
      }

      // Download the captions
      const vttUrl = captionUrl + '&fmt=vtt';
      const a = document.createElement('a');
      a.href = vttUrl;
      a.download = `captions_${this.currentVideoId}.vtt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('Zentala-YT: Captions downloaded successfully');
    } catch (error) {
      console.error('Error downloading captions:', error);
      alert('Error downloading captions: ' + error);
    }
  }

  /**
   * Handle process with AI
   */
  private async handleProcessWithAI(): Promise<void> {
    if (!this.currentVideoId) {
      alert('No video detected');
      return;
    }

    try {
      // First, get the captions
      const captionUrl = await this.findCaptionUrl();
      if (!captionUrl) {
        alert('No captions found for this video to process with AI');
        return;
      }

      // Download the VTT content
      const vttUrl = captionUrl + '&fmt=vtt';
      const response = await fetch(vttUrl);
      const vttContent = await response.text();

      if (!vttContent || vttContent.trim().length === 0) {
        alert('No caption content found');
        return;
      }

      // Extract text content from VTT (remove timestamps and formatting)
      const textContent = this.extractTextFromVTT(vttContent);

      if (textContent.length < 50) {
        alert('Caption content too short for meaningful AI analysis');
        return;
      }

      // Send message to extension popup to process with AI
      chrome.runtime.sendMessage({
        type: 'PROCESS_YOUTUBE_WITH_AI',
        videoId: this.currentVideoId,
        transcript: textContent
      });

      console.log('Zentala-YT: Sent transcript to AI processing');
    } catch (error) {
      console.error('Error processing with AI:', error);
      alert('Error processing with AI: ' + error);
    }
  }

  /**
   * Handle send to AI
   */
  private handleSendToAI(): void {
    const promptElement = document.getElementById('ai-prompt') as HTMLTextAreaElement;
    const prompt = promptElement?.value?.trim();

    if (!prompt) {
      alert('Please enter a prompt');
      return;
    }

    // Store prompt and open extension popup
    chrome.runtime.sendMessage({
      type: 'OPEN_YOUTUBE_AI',
      prompt: prompt,
      videoId: this.currentVideoId
    });
  }

  /**
   * Handle open settings
   */
  private handleOpenSettings(): void {
    chrome.runtime.sendMessage({
      type: 'OPEN_YOUTUBE_SETTINGS'
    });
  }

  /**
   * Extract text content from VTT format
   */
  private extractTextFromVTT(vttContent: string): string {
    const lines = vttContent.split('\n');
    const textLines: string[] = [];

    // Skip the first line (WEBVTT header) and process each cue
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, timestamps, and cue numbers
      if (line === '' || line.includes('-->') || /^\d+$/.test(line)) {
        continue;
      }

      // Add non-empty text lines
      if (line.length > 0) {
        textLines.push(line);
      }
    }

    return textLines.join(' ').trim();
  }

  /**
   * Find caption URL (enhanced version with better error handling)
   */
  private async findCaptionUrl(): Promise<string | null> {
    try {
      // @ts-expect-error - YouTube's window object has dynamic properties
      let playerResponse = window.ytInitialPlayerResponse;

      if (!playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
        console.log('Zentala-YT: ytInitialPlayerResponse not found on window, fetching page source...');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) {
          console.error('Zentala-YT: Could not get video ID from URL.');
          return null;
        }

        try {
          const pageSource = await fetch(`https://www.youtube.com/watch?v=${videoId}`).then(res => res.text());
          const playerResponseMatch = pageSource.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);

          if (playerResponseMatch && playerResponseMatch[1]) {
            playerResponse = JSON.parse(playerResponseMatch[1]);
          } else {
            console.error('Zentala-YT: Could not find ytInitialPlayerResponse in page source.');
            return null;
          }
        } catch (fetchError) {
          console.error('Zentala-YT: Failed to fetch page source:', fetchError);
          return null;
        }
      }

      const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || !Array.isArray(tracks)) {
        console.error('Zentala-YT: Caption tracks not found or not an array in playerResponse.');
        return null;
      }

      console.log('Zentala-YT: Found', tracks.length, 'caption tracks');

      // First, try to find auto-generated captions (ASR)
      let selectedTrack = tracks.find((t: YouTubeCaptionTrack) =>
        t.kind === 'asr' ||
        t.name?.simpleText?.toLowerCase().includes('auto') ||
        t.name?.simpleText?.toLowerCase().includes('automatic')
      );

      // If no auto captions, try to find English captions
      if (!selectedTrack) {
        selectedTrack = tracks.find((t: YouTubeCaptionTrack) =>
          t.languageCode === 'en' ||
          t.name?.simpleText?.toLowerCase().includes('english')
        );
      }

      // If still no captions, use the first available track
      if (!selectedTrack && tracks.length > 0) {
        selectedTrack = tracks[0];
        console.log('Zentala-YT: Using first available caption track:', selectedTrack.name?.simpleText);
      }

      if (!selectedTrack || !selectedTrack.baseUrl) {
        console.error('Zentala-YT: No suitable caption track found');
        return null;
      }

      console.log('Zentala-YT: Selected caption track:', selectedTrack.name?.simpleText, '(', selectedTrack.languageCode, ')');
      return selectedTrack.baseUrl;

    } catch (error) {
      console.error('Zentala-YT: An error occurred while finding the caption URL:', error);
      return null;
    }
  }
}

// Initialize the content script
new YouTubeContentScript();
