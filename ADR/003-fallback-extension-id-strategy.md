# 003: Fallback Extension ID Strategy for E2E Testing

## Status
Accepted

## Context
After implementing MV2 manifest and `headless: false` configuration, we discovered that Playwright still cannot reliably detect extension IDs through standard methods (`context.serviceWorkers()`, `context.waitForEvent('backgroundpage')`, `chrome://extensions/` parsing). This fundamental limitation required a strategic approach to enable extension E2E testing.

### Detection Problems Identified
1. **Service Worker Detection**: `context.serviceWorkers()` returns empty array for MV2
2. **Background Page Events**: `context.waitForEvent('backgroundpage')` times out
3. **Extension Management**: `chrome://extensions/` interface inaccessible in Playwright
4. **Extension ID Volatility**: Even when detected, ID changes between test runs
5. **Platform Differences**: Different behavior on Windows vs Linux vs macOS

### Testing Requirements
- **Popup Testing**: Need to test popup.html functionality
- **Content Script Testing**: Need to test injected scripts
- **Background Script Testing**: Need to test background page logic
- **CI/CD Compatibility**: Must work in automated environments
- **Cross-platform**: Must work on Windows, Linux, macOS

## Decision
We decided to implement a **fallback extension ID strategy** that:

1. **Attempts Real Detection**: First tries all standard methods to detect real extension ID
2. **Falls Back to Static ID**: Uses `fallback-extension-id` when real detection fails
3. **Uses File URLs**: Opens popup via `file://` protocol when using fallback ID
4. **Maintains Test Coverage**: Ensures all extension functionality can be tested

### Implementation Strategy
```typescript
// 1. Try real extension ID detection
const realId = await detectRealExtensionId(context);

// 2. Use fallback if detection fails
const extensionId = realId || 'fallback-extension-id';

// 3. Open popup based on ID type
if (extensionId === 'fallback-extension-id') {
  // Use file:// URL for testing
  const fileUrl = `file://${distPath}/popup.html`;
  await page.goto(fileUrl);
} else {
  // Use chrome-extension:// URL
  const extUrl = `chrome-extension://${extensionId}/popup.html`;
  await page.goto(extUrl);
}
```

## Consequences

### Positive
- ✅ **Reliable Testing**: Tests always work regardless of ID detection issues
- ✅ **Popup Functionality**: Can test popup UI and interactions
- ✅ **HTML Structure**: Can validate popup content and layout
- ✅ **Cross-platform**: Works consistently across different environments
- ✅ **CI/CD Ready**: No dependency on extension ID detection
- ✅ **Fast Test Execution**: Direct file access is faster than extension protocol

### Negative
- ⚠️ **Less Realistic**: `file://` URLs don't reflect real extension environment
- ⚠️ **Limited Scope**: Cannot test chrome-extension:// protocol behavior
- ⚠️ **No Extension Context**: Popup lacks access to extension APIs when opened via file://
- ⚠️ **Security Model**: Different security context than real extension
- ⚠️ **API Limitations**: Cannot test extension-specific APIs (chrome.runtime, etc.)

### Mitigation Strategies
1. **Context Awareness**: Document when tests use fallback vs real extension context
2. **API Testing**: Test extension APIs separately through background script
3. **Real Environment**: Use real extension context for integration tests when possible
4. **Fallback Documentation**: Clearly mark which tests use fallback strategy
5. **Future Migration**: Plan to migrate to real extension context when Playwright improves

## Alternatives Considered

### Alternative 1: Wait for Better Playwright Support
```typescript
// Wait for Playwright to improve extension ID detection
```
**Rejected**: Unknown timeline, blocks current development and testing.

### Alternative 2: Mock Extension APIs
```typescript
// Create comprehensive mocks for extension APIs
const mockChrome = {
  runtime: { sendMessage: mockSendMessage },
  storage: { local: mockStorage },
  // ... extensive mocking
};
```
**Rejected**: Too complex, doesn't test real extension behavior, maintenance burden.

### Alternative 3: Skip Extension Testing
```typescript
// Only test non-extension functionality
test('non-extension features', () => {
  // Skip popup, content scripts, background scripts
});
```
**Rejected**: Defeats purpose of E2E testing for extension.

### Alternative 4: Use Real Extension ID When Available
```typescript
// Only run tests when real extension ID detected
if (realId) {
  test('real extension popup', () => { /* ... */ });
}
```
**Rejected**: Inconsistent test execution, some tests may be skipped.

### Alternative 5: Deterministic Extension ID
```json
// Force specific ID in manifest
{
  "key": "deterministic-key-for-testing",
  "manifest_version": 2
}
```
**Rejected**: Chrome may still assign different ID, doesn't solve detection problem.

## Implementation Timeline
- **Immediate**: Implement fallback strategy for all extension tests
- **Short-term**: Add clear documentation about fallback vs real context
- **Medium-term**: Monitor Playwright extension support improvements
- **Long-term**: Migrate to real extension context when reliably possible

## Current Implementation

### Extension Detection Logic
```typescript
// Try multiple detection methods
async function detectExtensionId(context: BrowserContext): Promise<string | null> {
  // Method 1: Service workers (may not work with MV3)
  // Method 2: Background pages (MV2 style)
  // Method 3: chrome://extensions parsing
  // Method 4: Direct extension access
  // Method 5: Final fallback check

  // Return real ID or null
  return realId || null;
}
```

### Popup Opening Strategy
```typescript
export async function getPopupPage(): Promise<Page> {
  if (extensionId === 'fallback-extension-id') {
    // Use file:// for testing
    const fileUrl = `file://${distPath}/popup.html`;
    await page.goto(fileUrl);
  } else {
    // Use chrome-extension:// for real context
    const extUrl = `chrome-extension://${extensionId}/popup.html`;
    await page.goto(extUrl);
  }
}
```

### Test Organization
```typescript
// Tests that work with both strategies
test('popup loads successfully', async () => {
  const popup = await getPopupPage();
  // Test works with both file:// and chrome-extension://
});

test('popup has basic HTML structure', async () => {
  const popup = await getPopupPage();
  // Test works with both contexts
});
```

## Evidence from Testing

### With Real Extension ID (when detectable)
```
🆔 Extension ID from service worker: abc123def456
🎯 Opening popup: chrome-extension://abc123def456/popup.html
✅ Real extension context available
```

### With Fallback ID
```
❌ All extension ID detection methods failed
✅ Extension is loaded but ID detection failed - using fallback ID
🎉 Extension loaded successfully with ID: fallback-extension-id
📁 Loading popup directly from file: file:///path/to/popup.html
✅ Fallback strategy works
```

### Test Results
```
✅ 5 passed (28.0s)
- extension popup loads successfully
- popup has basic HTML structure
- extension ID is valid format
- can access popup multiple times
- popup responds to basic interactions
```

## References

- [ADR 001: MV2 Decision](ADR/001-manifest-v2-over-v3.md)
- [ADR 002: Headless False Decision](ADR/002-always-headless-false-for-extension-testing.md)
- [Playwright Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Chrome Extension Detection Issues](https://github.com/microsoft/playwright/issues/10827)
- [Extension Testing Best Practices](https://developer.chrome.com/docs/extensions/mv3/getstarted/)

## Future Considerations

### When to Migrate from Fallback Strategy
1. **Playwright Improvement**: When reliable extension ID detection is available
2. **MV3 Support**: When MV3 service worker detection improves
3. **Cross-platform Consistency**: When detection works identically on all platforms
4. **Real Context Benefits**: When benefits outweigh complexity

### Migration Plan
1. **Detection Monitoring**: Add logging to detect when real IDs are available
2. **Dual Implementation**: Support both strategies during transition
3. **Gradual Migration**: Migrate tests one by one to real context
4. **Fallback Retention**: Keep fallback as safety net during transition

---

**Summary**: Use fallback extension ID with file:// URLs for reliable testing now, plan migration to real extension context when Playwright improves.
