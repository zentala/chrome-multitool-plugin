# Chrome Extension Testing Usage Guide

## Why MV2 for E2E Testing

This project uses **Manifest V2** instead of MV3 because:

1. **Playwright Limitation**: MV3 service workers are not reliably detectable
2. **Background Pages**: MV2 background pages work consistently with E2E tests
3. **Future Migration**: Will upgrade to MV3 when Playwright support improves

See [ADR 001](ADR/001-manifest-v2-over-v3.md) for detailed decision rationale.

## Overview
This project uses **Manifest V2** for reliable E2E testing with Playwright. All tests run in **headful mode** (`headless: false`).

## Quick Start

### 1. Build Extension
```bash
pnpm build:test  # Builds with MV2 manifest
```

### 2. Run E2E Tests
```bash
# Local development (Windows)
pnpm test:e2e

# CI/Linux with xvfb
pnpm test:e2e:ci
```

### 3. Run Specific Tests
```bash
# Test popup functionality
pnpm test:e2e:stable

# Test currency converter
pnpm test:e2e:currency
```

## Architecture

### Manifest V2 Decision
- **Why MV2?** Playwright has limited MV3 service worker support
- **Background Pages** instead of service workers (visible to Playwright)
- **Traditional permissions** model
- **Will migrate to MV3** when Playwright support improves

### Headless Mode
- **Always `headless: false`** for extension loading
- **Use `xvfb-run`** for CI environments
- **Chrome requirement**: Extensions need full browser UI

## Testing Patterns

### 1. Stable Extension Loading
```typescript
import { launchStableExtension, getPopupPage } from './fixtures/stable-extension';

test('popup test', async () => {
  const { context, extensionId } = await launchStableExtension();
  const popup = await getPopupPage();

  // Test popup functionality
  await expect(popup.locator('body')).toBeVisible();

  await context.close();
});
```

### 2. Background Script Testing
```typescript
// MV2 background pages are visible to Playwright
const pages = context.pages();
const backgroundPage = pages.find(p => p.url().includes('background'));

// Can send messages to background
await backgroundPage.evaluate(() => {
  chrome.runtime.sendMessage({ action: 'test' });
});
```

### 3. Content Script Testing
```typescript
// Test content scripts on real pages
const page = await context.newPage();
await page.goto('https://example.com');

// Content script should inject elements
await expect(page.locator('.extension-element')).toBeVisible();
```

## CI/CD Configuration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install

    - name: Build extension
      run: pnpm build:test

    - name: Install Playwright
      run: pnpm dlx playwright install chromium

    - name: Run E2E tests
      run: pnpm test:e2e:ci
      env:
        EXTENSION_PATH: ${{ github.workspace }}/dist
```

### Local Development
```bash
# Windows - direct execution
pnpm test:e2e

# Linux - with xvfb for headless CI simulation
xvfb-run -a pnpm test:e2e
```

## Debugging

### Extension Loading Issues
```bash
# Check if extension loads
npx playwright test tests/e2e/debug-mv2-manifest.spec.ts

# Debug extension detection
npx playwright test tests/e2e/debug-simple.spec.ts --headed
```

### Common Issues

#### 1. Extension Not Found
```bash
❌ Could not detect extension ID
```
**Solution**: Check if `headless: false` is set, verify extension builds correctly.

#### 2. Background Page Not Found
```bash
⚠️ Background page detection failed
```
**Solution**: Extension uses MV2, background pages should be available.

#### 3. CI Test Failures
```bash
xvfb-run: command not found
```
**Solution**: Install xvfb package in CI environment.

## File Structure

```
tests/
├── fixtures/
│   ├── stable-extension.ts    # Main extension loading (MV2)
│   ├── extension.ts           # Alternative approach
│   └── shared-browser.ts      # Multi-browser setup
├── e2e/
│   ├── stable-popup.spec.ts   # Popup tests
│   ├── debug-*.spec.ts        # Debug utilities
│   └── *-integration.spec.ts  # Integration tests
└── global-setup.ts            # Global test setup
```

## Migration Notes

### Future MV3 Migration
When Playwright improves MV3 support:

1. **Update Manifest**: Change `manifest_version` from 2 to 3
2. **Background Script**: Change `scripts` to `service_worker`
3. **API Updates**: Update to service worker APIs
4. **Test Updates**: Update extension detection logic
5. **Permission Updates**: Move host permissions to `host_permissions`

### Compatibility Checklist
- [ ] MV3 service worker detection works
- [ ] Background page events work
- [ ] Extension loading is reliable
- [ ] All popup/content script tests pass
- [ ] CI environment supports MV3

## References

- [ADR 001: MV2 Decision](ADR/001-manifest-v2-over-v3.md)
- [Headless Mode Explanation](.cursor/HEADLESS_FALSE_EXPLANATION.md)
- [Playwright Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Chrome MV2 to MV3 Migration](https://developer.chrome.com/docs/extensions/develop/migrate-to-mv3)
