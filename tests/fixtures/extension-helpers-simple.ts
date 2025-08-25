import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import path from 'path';

let sharedBrowser: Browser | null = null;
let sharedContext: BrowserContext | null = null;
let sharedExtensionId: string | null = null;

export async function setupBrowser(): Promise<void> {
  if (sharedBrowser) return;
  
  const pathToExtension = path.resolve('dist').replace(/\\/g, '/');
  console.log(`🔧 Setting up browser with extension from: ${pathToExtension}`);
  
  sharedBrowser = await chromium.launch({
    headless: false, // 🚨 Extensions wymagają headful mode!
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  
  sharedContext = await sharedBrowser.newContext();
  
  // Wait for extension to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Find extension ID
  const page = await sharedContext.newPage();
  await page.goto('chrome://extensions/');
  await page.waitForTimeout(2000);
  
  // Get all service workers from browser
  const workers = sharedContext.serviceWorkers();
  console.log(`Found ${workers.length} service workers`);
  
  for (const worker of workers) {
    const url = worker.url();
    console.log(`Worker: ${url}`);
    if (url.includes('chrome-extension://')) {
      const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
      if (match) {
        sharedExtensionId = match[1];
        console.log(`🆔 Extension ID: ${sharedExtensionId}`);
        break;
      }
    }
  }
  
  await page.close();
  
  if (!sharedExtensionId) {
    throw new Error('Could not find extension ID');
  }
}

export async function getSharedContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  if (!sharedContext || !sharedExtensionId) {
    await setupBrowser();
  }
  
  if (!sharedContext || !sharedExtensionId) {
    throw new Error('Browser not initialized');
  }
  
  return {
    context: sharedContext,
    extensionId: sharedExtensionId,
  };
}

export async function openPopup(): Promise<Page> {
  const { context, extensionId } = await getSharedContext();
  const page = await context.newPage();
  const url = `chrome-extension://${extensionId}/popup.html`;
  console.log(`Opening popup: ${url}`);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedContext = null;
    sharedExtensionId = null;
  }
}
