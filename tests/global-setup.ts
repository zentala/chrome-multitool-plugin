import { chromium } from '@playwright/test';
import path from 'path';

async function globalSetup() {
  // Verify extension build exists
  const distPath = path.resolve('dist');
  console.log('🔍 Checking extension build at:', distPath);
  
  // Normalize path for Windows
  const extensionPath = distPath.replace(/\\/g, '/');
  console.log('📁 Extension path (normalized):', extensionPath);
  
  // Quick check that manifest exists
  try {
    const fs = require('fs');
    const manifestPath = path.join(distPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      console.log('✅ manifest.json found');
      
      // Read manifest to verify key is present
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.key) {
        console.log('✅ Extension key found in manifest');
        console.log('🆔 Expected extension ID: mfgccidlmgmcellpkjhepnhmfgdmnhae');
      } else {
        console.warn('⚠️ No key found in manifest - extension ID will be random!');
      }
    } else {
      console.error('❌ manifest.json not found! Run "pnpm build:test" first');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking manifest:', error);
  }
  
  // Test that we can launch browser with extension
  console.log('🚀 Testing browser launch with extension...');
  try {
    const browser = await chromium.launchPersistentContext('', {
      headless: false, // 🚨 Extensions wymagają headful mode!
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    
    // Wait a moment for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for service workers
    const serviceWorkers = browser.serviceWorkers();
    console.log(`📊 Service workers found: ${serviceWorkers.length}`);
    
    if (serviceWorkers.length > 0) {
      console.log('✅ Extension loaded successfully');
      serviceWorkers.forEach(sw => {
        console.log(`  - Service worker: ${sw.url()}`);
      });
    } else {
      console.warn('⚠️ No service workers found - extension may not be loaded properly');
    }
    
    await browser.close();
  } catch (error) {
    console.error('❌ Failed to launch browser with extension:', error);
    throw error;
  }
  
  console.log('✅ Global setup complete');
}

export default globalSetup;