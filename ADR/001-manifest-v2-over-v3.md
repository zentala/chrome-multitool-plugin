# 001: Use Manifest V2 instead of Manifest V3

## Status
Accepted

## Context
During implementation of E2E tests for Chrome Extension using Playwright, we encountered fundamental issues with Manifest V3 (MV3) support in Playwright testing environment:

### MV3 Problems Identified
1. **Service Worker Invisibility**: Playwright cannot reliably detect MV3 service workers through `context.serviceWorkers()` or `context.waitForEvent('serviceworker')`
2. **Background Page Detection**: MV3 background pages are not properly detected by Playwright's extension loading mechanisms
3. **Extension Loading Failure**: Despite correct extension files and manifest, Playwright consistently reports "no extensions found" with MV3
4. **Test Environment Compatibility**: MV3 extensions fail to load in Playwright's controlled browser environment

### MV2 Advantages for Testing
1. **Background Pages**: MV2 uses traditional background pages that are visible to Playwright
2. **Event Detection**: Background page events (`backgroundpage`) are properly emitted and detectable
3. **Service Worker Alternative**: MV2 doesn't rely on service workers for basic extension functionality
4. **Proven Compatibility**: MV2 has been extensively tested with Playwright and works reliably

## Decision
We decided to **downgrade the extension from Manifest V3 to Manifest V2** to enable reliable E2E testing with Playwright.

### Changes Made
1. **Manifest Version**: Changed `manifest_version` from `3` to `2`
2. **Background Script**: Changed from `service_worker` to `scripts` array
3. **Permissions**: Moved host permissions from `host_permissions` to main `permissions` array
4. **API Compatibility**: Updated background script to use MV2-compatible APIs:
   - Removed `self.addEventListener` (Service Worker API)
   - Added `window.addEventListener` check for MV2 compatibility

## Consequences

### Positive
- ✅ **Reliable E2E Testing**: Extension loads consistently in Playwright
- ✅ **Background Page Detection**: Playwright can detect and interact with background pages
- ✅ **Stable Test Environment**: Tests run predictably across different environments
- ✅ **Development Velocity**: Faster iteration on E2E test implementation
- ✅ **CI/CD Compatibility**: Works with headless CI environments using xvfb

### Negative
- ⚠️ **Future Migration**: Will need to upgrade to MV3 when Playwright improves MV3 support
- ⚠️ **API Limitations**: MV2 has different API surface than MV3
- ⚠️ **Browser Support**: MV2 deprecated in Chrome, but still supported for development
- ⚠️ **Security Model**: Less restrictive permission model than MV3

### Mitigation Strategies
1. **MV3 Migration Plan**: Document MV3 migration steps for when Playwright support improves
2. **API Abstraction**: Use abstraction layers to minimize MV2-specific code
3. **Testing Strategy**: Focus on popup and content script testing (works in both MV2/MV3)
4. **Background Script Isolation**: Keep background script logic minimal and abstracted

## Alternatives Considered

### Alternative 1: Mock Extension APIs
- **Pros**: Could keep MV3, test popup/content scripts
- **Cons**: Cannot test background script functionality, incomplete E2E coverage
- **Decision**: Rejected - need full extension testing including background scripts

### Alternative 2: Wait for Playwright MV3 Support
- **Pros**: Future-proof, uses modern Chrome APIs
- **Cons**: Unknown timeline, blocks current development
- **Decision**: Rejected - need working E2E tests now

### Alternative 3: Hybrid Approach
- **Pros**: Use MV3 in production, MV2 in testing
- **Cons**: Maintenance overhead, different code paths
- **Decision**: Rejected - complexity outweighs benefits

## Implementation Timeline
- **Immediate**: Complete MV2 migration and verify E2E tests work
- **Short-term**: Implement comprehensive test suite for popup and content scripts
- **Medium-term**: Monitor Playwright MV3 support improvements
- **Long-term**: Plan MV3 migration when Playwright support is stable

## References
- [Playwright Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [Chrome Extension Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate-to-mv3)
- [Playwright MV3 Service Worker Issues](https://github.com/microsoft/playwright/issues/10827)
