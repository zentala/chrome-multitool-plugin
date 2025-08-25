import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Debug Manifest Issues', () => {
  test('validate manifest.json structure', async () => {
    console.log('🔍 Validating manifest.json...');

    const manifestPath = path.join('dist', 'manifest.json');

    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    console.log('Manifest raw content length:', manifestContent.length);

    // Check for BOM or special characters
    const hasBOM = manifestContent.charCodeAt(0) === 0xFEFF;
    console.log('Has BOM:', hasBOM);

    // Check encoding
    const firstChars = manifestContent.substring(0, 100);
    console.log('First 100 chars:', firstChars);

    // Parse JSON
    let manifest;
    try {
      manifest = JSON.parse(manifestContent);
      console.log('✅ Manifest parsed successfully');
    } catch (error) {
      console.error('❌ Manifest parsing error:', error);
      throw error;
    }

    // Validate required fields for MV3
    console.log('Manifest version:', manifest.manifest_version);
    console.log('Name:', manifest.name);
    console.log('Background:', manifest.background);
    console.log('Action:', manifest.action);

    // Check if all required files exist
    if (manifest.background?.service_worker) {
      const bgPath = path.join('dist', manifest.background.service_worker);
      console.log('Background file exists:', fs.existsSync(bgPath));
    }

    if (manifest.action?.default_popup) {
      const popupPath = path.join('dist', manifest.action.default_popup);
      console.log('Popup file exists:', fs.existsSync(popupPath));
    }

    // Check content scripts
    if (manifest.content_scripts) {
      console.log('Content scripts:', manifest.content_scripts.length);
      manifest.content_scripts.forEach((script, i) => {
        console.log(`  Script ${i}:`, script.js?.[0], 'exists:', fs.existsSync(path.join('dist', script.js?.[0])));
      });
    }

    // Try to create a minimal test extension
    console.log('\n🧪 Creating minimal test extension...');

    const testExtensionDir = path.join('test-results', 'minimal-extension');
    if (!fs.existsSync(testExtensionDir)) {
      fs.mkdirSync(testExtensionDir, { recursive: true });
    }

    // Create minimal manifest
    const minimalManifest = {
      manifest_version: 3,
      name: 'Test Extension',
      version: '1.0',
      action: {
        default_title: 'Test Extension'
      }
    };

    fs.writeFileSync(
      path.join(testExtensionDir, 'manifest.json'),
      JSON.stringify(minimalManifest, null, 2)
    );

    console.log('✅ Minimal extension created');

    // Test loading minimal extension
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${testExtensionDir}`,
        `--load-extension=${testExtensionDir}`,
      ],
    });

    console.log('✅ Minimal extension context created');

    await new Promise(resolve => setTimeout(resolve, 3000));

    const page = await context.newPage();
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);

    const minimalExtensions = await page.evaluate(() => {
      const extensions = document.querySelectorAll('extensions-item');
      return {
        count: extensions.length,
        extensions: Array.from(extensions).map(ext => ({
          name: ext.getAttribute('name'),
          id: ext.getAttribute('id'),
        }))
      };
    });

    console.log('Minimal extension test:', minimalExtensions);

    await page.close();
    await context.close();

    if (minimalExtensions.count > 0) {
      console.log('✅ Minimal extension loads successfully');
    } else {
      console.log('❌ Even minimal extension does not load');
    }
  });
});
