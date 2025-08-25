import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Debug Path Permissions', () => {
  test('test extension loading from different directories', async () => {
    console.log('🔍 Testing extension loading from different directories...');

    // Get different directory paths
    const originalPath = path.resolve('dist');
    const tempDir = os.tmpdir();
    const testDir = path.join(tempDir, 'playwright-extension-test');

    console.log(`Original path: ${originalPath}`);
    console.log(`Temp dir: ${tempDir}`);
    console.log(`Test dir: ${testDir}`);

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Copy minimal extension to test directory
    const manifestPath = path.join(originalPath, 'manifest.json');
    const backgroundPath = path.join(originalPath, 'background.js');
    const popupPath = path.join(originalPath, 'popup.html');

    console.log('Copying files to test directory...');
    fs.copyFileSync(manifestPath, path.join(testDir, 'manifest.json'));
    fs.copyFileSync(backgroundPath, path.join(testDir, 'background.js'));
    fs.copyFileSync(popupPath, path.join(testDir, 'popup.html'));

    // Test loading from different paths
    const testPaths = [
      { name: 'Original dist', path: originalPath.replace(/\\/g, '/') },
      { name: 'Temp directory', path: testDir.replace(/\\/g, '/') },
    ];

    for (const testPath of testPaths) {
      console.log(`\n🧪 Testing path: ${testPath.name} (${testPath.path})`);

      try {
        const context = await chromium.launchPersistentContext('', {
          headless: false,
          args: [
            `--load-extension=${testPath.path}`,
          ],
        });

        console.log('✅ Context created');

        // Wait for extension to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check extensions page
        const page = await context.newPage();
        await page.goto('chrome://extensions/');
        await page.waitForTimeout(3000);

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
          console.log('✅ SUCCESS! Extensions loaded:', extensionInfo.extensions);
        } else {
          console.log('❌ No extensions found');
        }

        // Check service workers
        const serviceWorkers = context.serviceWorkers();
        console.log(`Service workers: ${serviceWorkers.length}`);

        // Take screenshot
        await page.screenshot({ path: `test-results/extensions-${testPath.name.replace(/\s+/g, '-').toLowerCase()}.png` });

        await page.close();
        await context.close();

      } catch (error) {
        console.log(`❌ Test failed for ${testPath.name}: ${error.message}`);
      }
    }

    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test directory');
    } catch (e) {
      console.log('Could not clean up test directory');
    }
  });
});
