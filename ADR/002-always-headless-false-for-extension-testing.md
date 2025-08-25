# 002: Always Use headless: false for Extension E2E Tests

## Status
Accepted

## Context
During E2E test implementation for Chrome Extension, we encountered fundamental limitations with headless browser mode when loading extensions. The testing framework initially attempted to use `headless: true` but consistently failed with `net::ERR_BLOCKED_BY_CLIENT` errors and extension loading failures.

### Headless Mode Problems Identified
1. **Extension Loading Failure**: `--load-extension` flag is ignored or fails silently in headless mode
2. **No Extension Context**: Extension APIs are not available without full browser UI
3. **Service Workers Don't Start**: Both MV3 service workers and MV2 background pages fail to initialize
4. **Background Pages Invisible**: MV2 background pages don't load in headless mode
5. **chrome://extensions Inaccessible**: Extension management interface unavailable

### CI/CD Challenges
- **Containerized Environments**: CI environments typically require headless mode
- **No Display Servers**: Most CI platforms don't have GUI support
- **Performance Optimization**: Headless mode is preferred for speed
- **Resource Constraints**: Headless uses fewer resources

## Decision
We decided to **always use `headless: false`** for extension E2E tests and solve CI challenges with `xvfb-run`.

### Implementation Strategy
1. **Local Development**: Always `headless: false` with GUI browser
2. **CI Environments**: Use `xvfb-run` to provide virtual display
3. **Cross-platform**: Works on Windows, Linux, and macOS with appropriate tools

## Consequences

### Positive
- ✅ **Reliable Extension Loading**: Extensions load consistently in headful mode
- ✅ **Full Browser API Access**: All extension APIs available during testing
- ✅ **Background Page Detection**: MV2 background pages detectable and testable
- ✅ **Service Worker Support**: MV3 service workers work when supported
- ✅ **Real Browser Behavior**: Tests reflect actual user experience
- ✅ **CI Compatible**: `xvfb-run` enables headless CI with headful browser

### Negative
- ⚠️ **Slower Test Execution**: GUI browser slower than headless
- ⚠️ **Resource Usage**: Higher memory and CPU usage
- ⚠️ **CI Setup Complexity**: Requires `xvfb` installation and configuration
- ⚠️ **Display Requirements**: Local development needs display server
- ⚠️ **Platform Dependencies**: Different setup for Windows vs Linux

### Mitigation Strategies
1. **Local Development**: Accept GUI browser as development cost
2. **CI Optimization**: Use `xvfb-run` for virtual display in containers
3. **Parallel Execution**: Run tests in parallel to offset speed penalty
4. **Selective Testing**: Use headless for non-extension tests when possible

## Alternatives Considered

### Alternative 1: Hybrid Headless/Headful
```typescript
// Load extension in headful, test in headless
const context = await chromium.launchPersistentContext('', {
  headless: false,  // Load extension
  args: ['--load-extension=/path']
});

const page = await context.newPage();
// page.setHeadless(true); // ← Doesn't exist
```
**Rejected**: Playwright doesn't support switching modes.

### Alternative 2: Extension Mocking
```typescript
// Mock extension APIs for headless testing
test.describe('Mock Extension Tests', () => {
  test.beforeAll(() => {
    // Mock chrome.runtime, chrome.storage, etc.
  });
});
```
**Rejected**: Cannot test real extension behavior, incomplete coverage.

### Alternative 3: Wait for Headless Extension Support
```typescript
// Wait for Chromium/Playwright to support extensions in headless
```
**Rejected**: Unknown timeline, blocks current development.

### Alternative 4: Background Script Isolation
```typescript
// Test background script logic in isolation
test('background script logic', () => {
  // Test without browser context
});
```
**Rejected**: Cannot test real browser integration and user flows.

## Implementation Timeline
- **Immediate**: All extension tests use `headless: false`
- **Short-term**: Setup `xvfb-run` for CI pipelines
- **Medium-term**: Optimize test execution time
- **Long-term**: Monitor headless extension support in future Playwright versions

## Current Implementation

### Local Development
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    headless: false,  // Required for extension loading
  },
});
```

### CI Pipeline
```yaml
# GitHub Actions
- name: Run E2E Tests
  run: xvfb-run -a pnpm test:e2e
  env:
    EXTENSION_PATH: ${{ github.workspace }}/dist
```

### Windows Development
```bash
# Direct execution with GUI
pnpm test:e2e
```

### Linux Development
```bash
# With virtual display if needed
xvfb-run -a pnpm test:e2e
```

## Testing Evidence

### Headless Mode Results
```
❌ Extension loading failed - no extension ID detected
🔧 Loading extension from: C:/code/chrome-multitool-plugin/dist
📊 Service workers found: 0
❌ Could not find extension ID by any method
```

### Headful Mode Results
```
✅ Extension loaded successfully with ID: abc123def456
🔧 Launching stable extension from: C:/code/chrome-multitool-plugin/dist
📊 Service workers found: 1
🆔 Extension ID from service worker: abc123def456
🎉 Extension loaded successfully with ID: abc123def456
```

## References

- [Playwright Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Chrome Extension Headless Issues](https://github.com/microsoft/playwright/issues/7259)
- [xvfb Documentation](https://www.x.org/releases/X11R7.6/doc/man/man1/xvfb.1.xhtml)
- [GitHub Actions xvfb](https://github.com/marketplace/actions/setup-xvfb)
- [ADR 001: MV2 Decision](ADR/001-manifest-v2-over-v3.md)

---

**Summary**: Use `headless: false` + `xvfb-run` for CI. This is a fundamental requirement for Chrome Extension testing in Playwright.
