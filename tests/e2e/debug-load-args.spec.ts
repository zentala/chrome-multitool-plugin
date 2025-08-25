import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';

test.describe('Debug Load Extension Args', () => {
  test('test different load extension arguments', async () => {
    console.log('🔍 Testing different --load-extension arguments...');

    const extensionPath = path.resolve('dist').replace(/\\/g, '/');
    console.log(`Extension path: ${extensionPath}`);

    // Test different argument combinations
    const testCases = [
      {
        name: 'Basic args',
        args: [
          `--load-extension=${extensionPath}`,
        ]
      },
      {
        name: 'With disable-extensions-except',
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ]
      },
      {
        name: 'With additional flags',
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          `--no-sandbox`,
          `--disable-dev-shm-usage`,
        ]
      },
      {
        name: 'With user data dir',
        args: [
          `--load-extension=${extensionPath}`,
        ],
        userDataDir: path.join('test-results', 'chrome-profile')
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);

      try {
        let context;

        if (testCase.userDataDir) {
          context = await chromium.launchPersistentContext(testCase.userDataDir, {
            headless: false,
            args: testCase.args,
          });
        } else {
          context = await chromium.launchPersistentContext('', {
            headless: false,
            args: testCase.args,
          });
        }

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

          // If we found extensions, test popup
          const extension = extensionInfo.extensions[0];
          const popupUrl = `chrome-extension://${extension.id}/popup.html`;
          console.log(`Testing popup: ${popupUrl}`);

          const popupPage = await context.newPage();
          try {
            await popupPage.goto(popupUrl, { timeout: 5000 });
            console.log('✅ Popup loaded successfully!');
            await popupPage.screenshot({ path: `test-results/popup-${testCase.name.replace(/\s+/g, '-').toLowerCase()}.png` });
          } catch (popupError) {
            console.log(`❌ Popup failed: ${popupError.message}`);
          }
          await popupPage.close();

        } else {
          console.log('❌ No extensions found');
        }

        // Check service workers
        const serviceWorkers = context.serviceWorkers();
        console.log(`Service workers: ${serviceWorkers.length}`);
        serviceWorkers.forEach((sw, i) => {
          console.log(`  SW ${i}: ${sw.url()}`);
        });

        await page.close();
        await context.close();

      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
      }
    }
  });
});
