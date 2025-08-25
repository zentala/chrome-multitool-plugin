import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Debug MV2 Manifest', () => {
  test('validate MV2 manifest structure', async () => {
    console.log('🔍 Validating MV2 manifest...');

    const manifestPath = path.join('dist', 'manifest.json');

    // Check if file exists
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    console.log('Manifest version:', manifest.manifest_version);
    console.log('Name:', manifest.name);
    console.log('Background:', manifest.background);
    console.log('Permissions:', manifest.permissions);

    // Validate MV2 specific structure
    expect(manifest.manifest_version).toBe(2);
    expect(manifest.background).toHaveProperty('scripts');
    expect(manifest.background).toHaveProperty('persistent');
    expect(manifest.background.scripts).toContain('background.js');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('storage');

    // Check that MV3 fields are not present
    expect(manifest.background).not.toHaveProperty('service_worker');
    expect(manifest).not.toHaveProperty('host_permissions');

    // Check that all required MV2 fields are present
    expect(manifest).toHaveProperty('action');
    expect(manifest.action).toHaveProperty('default_popup');

    console.log('✅ MV2 manifest validation passed');
  });

  test('check extension files exist', async () => {
    console.log('🔍 Checking extension files...');

    const distDir = 'dist';
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'popup.html',
      'popup.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      console.log(`✅ ${file} exists`);
    }

    // Check file sizes (should not be empty)
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifestSize = fs.statSync(manifestPath).size;
    expect(manifestSize).toBeGreaterThan(100); // Manifest should be substantial

    const backgroundPath = path.join(distDir, 'background.js');
    const backgroundSize = fs.statSync(backgroundPath).size;
    expect(backgroundSize).toBeGreaterThan(1000); // Background should be compiled JS

    console.log(`📊 File sizes - Manifest: ${manifestSize} bytes, Background: ${backgroundSize} bytes`);
  });

  test('validate background script compatibility', async () => {
    console.log('🔍 Validating background script...');

    const backgroundPath = path.join('dist', 'background.js');
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

    // Check for MV2 compatible APIs
    expect(backgroundContent).toContain('chrome.runtime.onInstalled');
    expect(backgroundContent).toContain('chrome.runtime.onMessage');

    // Check that MV3 service worker APIs are not present
    expect(backgroundContent).not.toContain('chrome.serviceWorker');
    // Note: self.addEventListener may be added by bundler, but check our source code doesn't use it
    const sourceContent = fs.readFileSync('src/background/index.ts', 'utf8');
    expect(sourceContent).not.toContain('self.addEventListener');

    console.log('✅ Background script uses MV2 compatible APIs');
  });
});
