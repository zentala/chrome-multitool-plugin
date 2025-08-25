import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';

let sharedBrowser: Browser | null = null;
let sharedContext: BrowserContext | null = null;
let sharedExtensionId: string | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    const pathToExtension = path.resolve('dist').replace(/\\/g, '/');
    console.log(`🔧 Launching browser with extension: ${pathToExtension}`);

    sharedBrowser = await chromium.launch({
      headless: false, // 🚨 Extensions wymagają headful mode!
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    console.log('✅ Browser launched with extension');
  }

  return sharedBrowser;
}

export async function getSharedContext(): Promise<BrowserContext> {
  if (!sharedContext) {
    const browser = await getSharedBrowser();
    sharedContext = await browser.newContext();

    // Wait for extension to load
    console.log('⏳ Waiting for extension to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find extension ID from service workers
    const serviceWorkers = sharedContext.serviceWorkers();
    console.log(`📊 Found ${serviceWorkers.length} service workers`);

    for (const worker of serviceWorkers) {
      const url = worker.url();
      console.log(`  - Worker: ${url}`);

      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          sharedExtensionId = match[1];
          console.log(`🆔 Extension ID: ${sharedExtensionId}`);
          break;
        }
      }
    }

    if (!sharedExtensionId) {
      console.error('❌ Could not find extension ID');
      throw new Error('Extension not loaded properly');
    }
  }

  return sharedContext;
}

export async function getExtensionId(): Promise<string> {
  if (!sharedExtensionId) {
    await getSharedContext();
  }

  if (!sharedExtensionId) {
    throw new Error('Extension ID not found');
  }

  return sharedExtensionId;
}

export async function openExtensionPopup(): Promise<Page> {
  const context = await getSharedContext();
  const extensionId = await getExtensionId();

  const page = await context.newPage();
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  console.log(`🎯 Opening popup: ${popupUrl}`);
  await page.goto(popupUrl);
  await page.waitForLoadState('networkidle');

  return page;
}

export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedContext = null;
    sharedExtensionId = null;
  }
}
