import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Debug Simple Extension', () => {
  test('check extension files and path', async () => {
    console.log('🔍 Checking extension files...');

    const extensionPath = path.resolve('dist');
    console.log(`Extension directory: ${extensionPath}`);

    // Check if directory exists
    const exists = fs.existsSync(extensionPath);
    console.log(`Directory exists: ${exists}`);

    if (exists) {
      // List files
      const files = fs.readdirSync(extensionPath);
      console.log('Files in extension directory:', files);

      // Check key files
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const backgroundPath = path.join(extensionPath, 'background.js');
      const popupPath = path.join(extensionPath, 'popup.html');

      console.log('Manifest exists:', fs.existsSync(manifestPath));
      console.log('Background exists:', fs.existsSync(backgroundPath));
      console.log('Popup exists:', fs.existsSync(popupPath));

      // Try to read manifest
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log('Manifest version:', manifest.manifest_version);
        console.log('Manifest name:', manifest.name);
        console.log('Has background:', !!manifest.background);
        console.log('Has action:', !!manifest.action);
      }
    }

    // Test different path formats
    const pathsToTest = [
      extensionPath,
      extensionPath.replace(/\\/g, '/'),
      `file://${extensionPath}`,
    ];

    for (const testPath of pathsToTest) {
      console.log(`\n🧪 Testing path: ${testPath}`);

      // Use persistent context as recommended by expert
      const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--disable-extensions-except=${testPath}`,
          `--load-extension=${testPath}`,
        ],
      });

      console.log('✅ Persistent context created');

      // Wait for extension to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check extensions page
      const page = await context.newPage();
      await page.goto('chrome://extensions/');
      await page.waitForTimeout(2000);

      const extensionInfo = await page.evaluate(() => {
        const extensions = document.querySelectorAll('extensions-item');
        return {
          count: extensions.length,
          extensions: Array.from(extensions).map(ext => ({
            name: ext.getAttribute('name'),
            id: ext.getAttribute('id'),
          }))
        };
      });

      console.log(`Extensions found: ${extensionInfo.count}`);
      if (extensionInfo.extensions.length > 0) {
        console.log('Extensions:', extensionInfo.extensions);
      } else {
        console.log('❌ No extensions found on chrome://extensions/');
      }

      // Check service workers
      const serviceWorkers = context.serviceWorkers();
      console.log(`Service workers: ${serviceWorkers.length}`);
      serviceWorkers.forEach((sw, i) => {
        console.log(`  SW ${i}: ${sw.url()}`);
      });

      await page.close();
      await context.close();
    }
  });
});
