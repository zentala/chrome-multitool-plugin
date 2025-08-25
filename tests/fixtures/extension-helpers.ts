import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import os from 'os';

export async function loadExtension(): Promise<{ 
  context: BrowserContext; 
  extensionId: string;
  popupPage: Page;
}> {
  // Normalize path to use forward slashes (critical for Windows)
  const pathToExtension = path.resolve('dist').replace(/\\/g, '/');
  
  console.log(`🔧 Loading extension from: ${pathToExtension}`);
  
  // Create a temporary user data directory
  const userDataDir = path.join(os.tmpdir(), `playwright-chrome-ext-${Date.now()}`);
  console.log(`📁 User data dir: ${userDataDir}`);

  const context: BrowserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // 🚨 Extensions wymagają headful mode!
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for extension to initialize
  console.log('⏳ Waiting for extension to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000)); // Give more time
  
  // Method 1: Try to get extension ID via chrome.management API
  let extensionId: string | null = null;
  
  const managementPage = await context.newPage();
  try {
    // Navigate to a chrome:// page where we can access chrome APIs
    await managementPage.goto('chrome://extensions/');
    
    // Inject script to get extension info
    extensionId = await managementPage.evaluate(async () => {
      // Wait a bit for extensions to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to access chrome.management if available
      if (typeof chrome !== 'undefined' && chrome.management) {
        const extensions = await chrome.management.getAll();
        const ourExtension = extensions.find(ext => 
          ext.name.includes('Zentala') || ext.name.includes('Multitool')
        );
        return ourExtension?.id || null;
      }
      return null;
    }).catch(() => null);
    
    if (extensionId) {
      console.log(`🆔 Extension ID found via chrome.management: ${extensionId}`);
    }
  } catch (e) {
    console.log('Could not use chrome.management API');
  } finally {
    await managementPage.close();
  }
  
  // Method 2: Check service workers
  if (!extensionId) {
    const serviceWorkers = context.serviceWorkers();
    console.log(`📊 Found ${serviceWorkers.length} service workers`);
    
    for (const worker of serviceWorkers) {
      const url = worker.url();
      console.log(`  - Worker URL: ${url}`);
      
      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          extensionId = match[1];
          console.log(`🆔 Extension ID found from service worker: ${extensionId}`);
          break;
        }
      }
    }
  }
  
  // Method 3: Try to access extension pages and see which one works
  if (!extensionId) {
    console.log('⚠️ No service worker found, trying to probe for extension...');
    
    // Create a page to probe extensions
    const probePage = await context.newPage();
    
    // Try to trigger extension loading by navigating to a regular page first
    await probePage.goto('https://example.com');
    await probePage.waitForTimeout(2000);
    
    // Check service workers again
    const workers = context.serviceWorkers();
    for (const worker of workers) {
      const url = worker.url();
      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          extensionId = match[1];
          console.log(`🆔 Extension ID found after navigation: ${extensionId}`);
          break;
        }
      }
    }
    
    await probePage.close();
  }
  
  // Method 4: Last resort - check background pages
  if (!extensionId) {
    const pages = context.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
        if (match) {
          extensionId = match[1];
          console.log(`🆔 Extension ID found from page: ${extensionId}`);
          break;
        }
      }
    }
  }
  
  if (!extensionId) {
    console.error('❌ Could not find extension ID by any method');
    
    // List all pages and workers for debugging
    console.log('Current pages:');
    for (const page of context.pages()) {
      console.log(`  - ${page.url()}`);
    }
    
    console.log('Current workers:');
    for (const worker of context.serviceWorkers()) {
      console.log(`  - ${worker.url()}`);
    }
    
    throw new Error('Extension not loaded properly - no extension ID found');
  }

  // Open extension popup
  const popupPage = await context.newPage();
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  
  console.log(`🎯 Opening popup at: ${popupUrl}`);
  
  try {
    await popupPage.goto(popupUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    console.log('✅ Popup loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load popup:', error.message);
    
    // Try without .html extension
    const popupUrlAlt = `chrome-extension://${extensionId}/popup`;
    console.log(`🔄 Trying alternative URL: ${popupUrlAlt}`);
    
    try {
      await popupPage.goto(popupUrlAlt, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      console.log('✅ Popup loaded with alternative URL');
    } catch (error2) {
      // Take a screenshot for debugging
      await popupPage.screenshot({ path: 'test-popup-error.png' });
      throw error2;
    }
  }
  
  return { 
    context, 
    extensionId,
    popupPage 
  };
}

export async function getExtensionId(context: BrowserContext): Promise<string> {
  // Check service workers first
  const serviceWorkers = context.serviceWorkers();
  for (const worker of serviceWorkers) {
    const url = worker.url();
    if (url.includes('chrome-extension://')) {
      const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
      if (match) {
        return match[1];
      }
    }
  }
  
  // Check pages
  const pages = context.pages();
  for (const page of pages) {
    const url = page.url();
    if (url.includes('chrome-extension://')) {
      const match = url.match(/chrome-extension:\/\/([^\/]+)\//);
      if (match) {
        return match[1];
      }
    }
  }
  
  throw new Error('Could not find extension ID');
}

export async function openExtensionPopup(context: BrowserContext): Promise<Page> {
  const extensionId = await getExtensionId(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('networkidle');
  return page;
}

export async function waitForServiceWorker(context: BrowserContext): Promise<void> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      console.log('Service worker found:', serviceWorkers[0].url());
      return;
    }
    
    attempts++;
    console.log(`Waiting for service worker... (attempt ${attempts}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn('No service worker found after waiting');
}

export async function sendMessageToExtension(
  page: Page, 
  message: any
): Promise<any> {
  // Inject script to send message to extension
  return await page.evaluate((msg) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        resolve(response);
      });
    });
  }, message);
}

export async function getExtensionStorage(
  page: Page,
  keys?: string[]
): Promise<any> {
  return await page.evaluate((storageKeys) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(storageKeys || null, (result) => {
        resolve(result);
      });
    });
  }, keys);
}

export async function setExtensionStorage(
  page: Page,
  data: Record<string, any>
): Promise<void> {
  await page.evaluate((storageData) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set(storageData, () => {
        resolve();
      });
    });
  }, data);
}

export async function clearExtensionStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  });
}