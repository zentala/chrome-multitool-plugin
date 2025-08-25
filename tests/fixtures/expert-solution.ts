import { chromium, BrowserContext } from "@playwright/test";
import path from "path";

export async function launchWithExtension() {
  // CRITICAL: Use forward slashes for Windows!
  const pathToExtension = path.resolve("dist").replace(/\\/g, "/");
  console.log(`Loading extension from: ${pathToExtension}`);

  // Use empty string for userDataDir to create temporary profile
  const context: BrowserContext = await chromium.launchPersistentContext("", {
    headless: false, // 🚨 Extensions wymagają headful mode!
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for service worker to start
  console.log("Waiting for service worker...");
  const serviceWorkers = context.serviceWorkers();
  
  if (serviceWorkers.length === 0) {
    console.log("No service worker yet, waiting for event...");
    await context.waitForEvent("serviceworker", { timeout: 10000 });
  }
  
  // Get the extension ID from service worker
  const worker = context.serviceWorkers()[0];
  console.log("Service worker found:", worker?.url());
  
  // Extract extension ID
  let extensionId = "unknown";
  if (worker) {
    const match = worker.url().match(/chrome-extension:\/\/([^\/]+)\//);
    if (match) {
      extensionId = match[1];
      console.log("Extension ID:", extensionId);
    }
  }

  return { context, extensionId };
}
